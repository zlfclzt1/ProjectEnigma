use crate::save_store::{SaveError, SaveStore, MAX_SAVE_BYTES};
use std::{io::Read, sync::Arc, thread};
use tauri::{AssetResolver, Runtime};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

const CSP: &str = "default-src 'self'; img-src 'self' data:; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

pub struct LocalServer {
    pub url: String,
}

pub fn start<R: Runtime>(
    assets: AssetResolver<R>,
    saves: SaveStore,
    token: String,
) -> Result<LocalServer, String> {
    let server = Server::http("127.0.0.1:0").map_err(|error| error.to_string())?;
    let address = server
        .server_addr()
        .to_ip()
        .ok_or("server did not bind an IP address")?;
    let url = format!("http://127.0.0.1:{}", address.port());
    thread::Builder::new()
        .name("azeroth-local-server".into())
        .spawn(move || {
            let assets = Arc::new(assets);
            for request in server.incoming_requests() {
                handle_request(request, &assets, &saves, &token);
            }
        })
        .map_err(|error| error.to_string())?;
    Ok(LocalServer { url })
}

fn handle_request<R: Runtime>(
    mut request: Request,
    assets: &AssetResolver<R>,
    saves: &SaveStore,
    token: &str,
) {
    let raw_url = request.url().to_string();
    let (path, query) = raw_url
        .split_once('?')
        .map_or((raw_url.as_str(), ""), |parts| parts);

    if let Some(slot) = path.strip_prefix("/api/save/") {
        let response = if !token_matches(&request, token) {
            json_response(
                StatusCode(403),
                &serde_json::json!({ "error": "forbidden" }),
            )
        } else {
            handle_save_request(&mut request, saves, slot, query)
        };
        let _ = request.respond(response);
        return;
    }

    if request.method() != &Method::Get && request.method() != &Method::Head {
        let _ = request.respond(text_response(StatusCode(405), "method not allowed"));
        return;
    }

    let response = static_response(assets, path, token);
    let _ = request.respond(response);
}

fn handle_save_request(
    request: &mut Request,
    saves: &SaveStore,
    slot: &str,
    query: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    match request.method() {
        Method::Get => match saves.load(slot) {
            Ok(Some(state)) => json_response(StatusCode(200), &state),
            Ok(None) => json_response(
                StatusCode(404),
                &serde_json::json!({ "error": "not found" }),
            ),
            Err(error) => save_error_response(error),
        },
        Method::Post => match read_body(request).and_then(|body| saves.create(slot, &body)) {
            Ok(state) => json_response(StatusCode(201), &state),
            Err(error) => save_error_response(error),
        },
        Method::Put => {
            let expected = query
                .split('&')
                .find_map(|pair| pair.strip_prefix("expectedRevision="))
                .and_then(|value| value.parse::<u64>().ok());
            let Some(expected) = expected else {
                return json_response(
                    StatusCode(400),
                    &serde_json::json!({ "error": "missing expectedRevision" }),
                );
            };
            match read_body(request).and_then(|body| saves.update(slot, expected, &body)) {
                Ok(state) => json_response(StatusCode(200), &state),
                Err(error) => save_error_response(error),
            }
        }
        _ => json_response(
            StatusCode(405),
            &serde_json::json!({ "error": "method not allowed" }),
        ),
    }
}

fn read_body(request: &mut Request) -> Result<Vec<u8>, SaveError> {
    if request
        .body_length()
        .is_some_and(|length| length as u64 > MAX_SAVE_BYTES)
    {
        return Err(SaveError::TooLarge);
    }
    let mut body = Vec::new();
    request
        .as_reader()
        .take(MAX_SAVE_BYTES + 1)
        .read_to_end(&mut body)
        .map_err(|error| SaveError::Io(error.to_string()))?;
    if body.len() as u64 > MAX_SAVE_BYTES {
        return Err(SaveError::TooLarge);
    }
    Ok(body)
}

fn token_matches(request: &Request, expected: &str) -> bool {
    request
        .headers()
        .iter()
        .any(|header| header.field.equiv("X-Azeroth-Token") && header.value.as_str() == expected)
}

fn static_response<R: Runtime>(
    assets: &AssetResolver<R>,
    request_path: &str,
    token: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let clean_path = match sanitize_asset_path(request_path) {
        Some(path) => path,
        None => return text_response(StatusCode(400), "invalid path"),
    };
    let requested = if clean_path.is_empty() {
        "index.html"
    } else {
        &clean_path
    };
    let asset = assets
        .get(requested.to_string())
        .or_else(|| assets.get("index.html".to_string()));
    let Some(asset) = asset else {
        return text_response(StatusCode(404), "asset not found");
    };

    let mut bytes = asset.bytes;
    let mut mime = asset.mime_type;
    if requested == "index.html" || mime.starts_with("text/html") {
        let html = String::from_utf8_lossy(&bytes);
        let runtime = format!(
            "<script>window.__AZEROTH_DESKTOP__={{token:{}}}</script>",
            serde_json::to_string(token).unwrap()
        );
        bytes = html
            .replacen("</head>", &format!("{runtime}</head>"), 1)
            .into_bytes();
        mime = "text/html; charset=utf-8".into();
    }
    response(StatusCode(200), bytes, &mime)
}

fn sanitize_asset_path(path: &str) -> Option<String> {
    let decoded = percent_decode(path.strip_prefix('/').unwrap_or(path))?;
    if decoded
        .split('/')
        .any(|part| part == ".." || part.contains('\\'))
    {
        return None;
    }
    Some(decoded)
}

fn percent_decode(value: &str) -> Option<String> {
    let bytes = value.as_bytes();
    let mut result = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return None;
            }
            let high = (bytes[index + 1] as char).to_digit(16)?;
            let low = (bytes[index + 2] as char).to_digit(16)?;
            result.push((high * 16 + low) as u8);
            index += 3;
        } else {
            result.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(result).ok()
}

fn save_error_response(error: SaveError) -> Response<std::io::Cursor<Vec<u8>>> {
    match error {
        SaveError::NotFound => json_response(
            StatusCode(404),
            &serde_json::json!({ "error": "not found" }),
        ),
        SaveError::AlreadyExists => json_response(
            StatusCode(409),
            &serde_json::json!({ "error": "already exists" }),
        ),
        SaveError::Conflict { actual_revision } => json_response(
            StatusCode(409),
            &serde_json::json!({ "error": "revision conflict", "actualRevision": actual_revision }),
        ),
        SaveError::InvalidSlot | SaveError::InvalidJson(_) => json_response(
            StatusCode(400),
            &serde_json::json!({ "error": error_message(&error) }),
        ),
        SaveError::TooLarge => json_response(
            StatusCode(413),
            &serde_json::json!({ "error": "save too large" }),
        ),
        SaveError::Io(_) => json_response(
            StatusCode(500),
            &serde_json::json!({ "error": "save storage failure" }),
        ),
    }
}

fn error_message(error: &SaveError) -> String {
    match error {
        SaveError::InvalidSlot => "invalid slot".into(),
        SaveError::InvalidJson(message) => message.clone(),
        _ => "invalid save".into(),
    }
}

fn json_response(
    status: StatusCode,
    value: &serde_json::Value,
) -> Response<std::io::Cursor<Vec<u8>>> {
    response(
        status,
        serde_json::to_vec(value).unwrap(),
        "application/json; charset=utf-8",
    )
}

fn text_response(status: StatusCode, value: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    response(
        status,
        value.as_bytes().to_vec(),
        "text/plain; charset=utf-8",
    )
}

fn response(
    status: StatusCode,
    bytes: Vec<u8>,
    content_type: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let mut response = Response::from_data(bytes).with_status_code(status);
    for (name, value) in [
        ("Content-Type", content_type),
        ("Content-Security-Policy", CSP),
        ("Cache-Control", "no-store"),
        ("X-Content-Type-Options", "nosniff"),
        ("Referrer-Policy", "no-referrer"),
    ] {
        response.add_header(Header::from_bytes(name, value).unwrap());
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_traversal_and_decodes_normal_paths() {
        assert_eq!(
            sanitize_asset_path("/assets/app.js"),
            Some("assets/app.js".into())
        );
        assert_eq!(sanitize_asset_path("/%2e%2e/secrets"), None);
        assert_eq!(sanitize_asset_path("/..%2fsecrets"), None);
    }
}
