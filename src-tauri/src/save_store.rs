use serde_json::Value;
use std::{
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub const MAX_SAVE_BYTES: u64 = 16 * 1024 * 1024;

#[derive(Debug, PartialEq)]
pub enum SaveError {
    InvalidSlot,
    InvalidJson(String),
    TooLarge,
    NotFound,
    AlreadyExists,
    Conflict { actual_revision: u64 },
    Io(String),
}

impl From<io::Error> for SaveError {
    fn from(error: io::Error) -> Self {
        Self::Io(error.to_string())
    }
}

#[derive(Clone)]
pub struct SaveStore {
    root: PathBuf,
}

impl SaveStore {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn load(&self, slot: &str) -> Result<Option<Value>, SaveError> {
        let path = self.slot_path(slot)?;
        if !path.exists() {
            return Ok(None);
        }
        let metadata = fs::metadata(&path)?;
        if metadata.len() > MAX_SAVE_BYTES {
            return Err(SaveError::TooLarge);
        }
        let bytes = fs::read(path)?;
        Ok(Some(parse_state(&bytes, slot)?))
    }

    pub fn create(&self, slot: &str, bytes: &[u8]) -> Result<Value, SaveError> {
        if bytes.len() as u64 > MAX_SAVE_BYTES {
            return Err(SaveError::TooLarge);
        }
        let path = self.slot_path(slot)?;
        if path.exists() {
            return Err(SaveError::AlreadyExists);
        }
        let state = parse_state(bytes, slot)?;
        if revision(&state)? != 0 {
            return Err(SaveError::InvalidJson(
                "new saves must start at revision 0".into(),
            ));
        }
        atomic_write(&path, &serde_json::to_vec_pretty(&state).unwrap())?;
        Ok(state)
    }

    pub fn update(
        &self,
        slot: &str,
        expected_revision: u64,
        bytes: &[u8],
    ) -> Result<Value, SaveError> {
        if bytes.len() as u64 > MAX_SAVE_BYTES {
            return Err(SaveError::TooLarge);
        }
        let path = self.slot_path(slot)?;
        let current = self.load(slot)?.ok_or(SaveError::NotFound)?;
        let actual_revision = revision(&current)?;
        if actual_revision != expected_revision {
            return Err(SaveError::Conflict { actual_revision });
        }

        let mut state = parse_state(bytes, slot)?;
        let object = state
            .as_object_mut()
            .ok_or_else(|| SaveError::InvalidJson("save must be a JSON object".into()))?;
        object.insert("revision".into(), Value::from(expected_revision + 1));

        let backup = self.backup_path(slot)?;
        fs::create_dir_all(&self.root)?;
        fs::copy(&path, backup)?;
        atomic_write(&path, &serde_json::to_vec_pretty(&state).unwrap())?;
        Ok(state)
    }

    pub fn archive(&self, slot: &str) -> Result<Option<PathBuf>, SaveError> {
        let path = self.slot_path(slot)?;
        if !path.exists() {
            return Ok(None);
        }
        let archives = self.root.join("archives");
        fs::create_dir_all(&archives)?;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|error| SaveError::Io(error.to_string()))?
            .as_secs();
        let archive = archives.join(format!("{slot}-{timestamp}.json"));
        fs::rename(path, &archive)?;
        Ok(Some(archive))
    }

    fn slot_path(&self, slot: &str) -> Result<PathBuf, SaveError> {
        validate_slot(slot)?;
        Ok(self.root.join(format!("{slot}.json")))
    }

    fn backup_path(&self, slot: &str) -> Result<PathBuf, SaveError> {
        validate_slot(slot)?;
        Ok(self.root.join(format!("{slot}.last-good.json")))
    }
}

pub fn validate_slot(slot: &str) -> Result<(), SaveError> {
    if slot.is_empty()
        || slot.len() > 64
        || !slot
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
    {
        return Err(SaveError::InvalidSlot);
    }
    Ok(())
}

fn parse_state(bytes: &[u8], slot: &str) -> Result<Value, SaveError> {
    let state: Value =
        serde_json::from_slice(bytes).map_err(|error| SaveError::InvalidJson(error.to_string()))?;
    let object = state
        .as_object()
        .ok_or_else(|| SaveError::InvalidJson("save must be a JSON object".into()))?;
    if object.get("slotId").and_then(Value::as_str) != Some(slot) {
        return Err(SaveError::InvalidJson(
            "slotId does not match request path".into(),
        ));
    }
    revision(&state)?;
    Ok(state)
}

fn revision(state: &Value) -> Result<u64, SaveError> {
    state
        .get("revision")
        .and_then(Value::as_u64)
        .ok_or_else(|| SaveError::InvalidJson("revision must be a non-negative integer".into()))
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), SaveError> {
    let parent = path
        .parent()
        .ok_or_else(|| SaveError::Io("save path has no parent".into()))?;
    fs::create_dir_all(parent)?;
    let temporary = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("save"),
        uuid::Uuid::new_v4()
    ));
    let write_result = (|| -> Result<(), SaveError> {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        fs::rename(&temporary, path)?;
        if let Ok(directory) = fs::File::open(parent) {
            let _ = directory.sync_all();
        }
        Ok(())
    })();
    if write_result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    write_result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_store() -> SaveStore {
        let root = std::env::temp_dir().join(format!("azeroth-save-test-{}", uuid::Uuid::new_v4()));
        SaveStore::new(root)
    }

    fn state(revision: u64) -> Vec<u8> {
        serde_json::to_vec(&serde_json::json!({ "slotId": "primary", "revision": revision }))
            .unwrap()
    }

    #[test]
    fn rejects_path_traversal_slots() {
        assert_eq!(validate_slot("../primary"), Err(SaveError::InvalidSlot));
        assert_eq!(validate_slot("primary/other"), Err(SaveError::InvalidSlot));
    }

    #[test]
    fn creates_and_updates_atomically_with_backup() {
        let store = temp_store();
        store.create("primary", &state(0)).unwrap();
        let saved = store.update("primary", 0, &state(0)).unwrap();
        assert_eq!(saved["revision"], 1);
        assert_eq!(store.load("primary").unwrap().unwrap()["revision"], 1);
        assert!(store.root().join("primary.last-good.json").exists());
        let _ = fs::remove_dir_all(store.root());
    }

    #[test]
    fn reports_revision_conflicts_without_overwriting() {
        let store = temp_store();
        store.create("primary", &state(0)).unwrap();
        assert_eq!(
            store.update("primary", 3, &state(3)),
            Err(SaveError::Conflict { actual_revision: 0 })
        );
        assert_eq!(store.load("primary").unwrap().unwrap()["revision"], 0);
        let _ = fs::remove_dir_all(store.root());
    }
}
