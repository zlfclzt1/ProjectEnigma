mod save_store;
mod server;

use save_store::SaveStore;
use std::{path::Path, process::Command};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

const RELEASES_URL: &str = "https://github.com/zlfclzt1/ProjectEnigma/releases";

#[derive(Clone)]
struct LauncherState {
    game_url: String,
    save_store: SaveStore,
}

fn open_target(target: &str) {
    let _ = Command::new("/usr/bin/open").arg(target).spawn();
}

fn open_game(app: &AppHandle) {
    if let Some(state) = app.try_state::<LauncherState>() {
        open_target(&state.game_url);
    }
}

fn confirm_reset() -> bool {
    let script = r#"display dialog "这会归档当前存档，并回到公会命名界面。确定重新开始吗？" with title "艾泽拉斯公会志" buttons {"取消", "重新开始"} default button "取消" cancel button "取消" with icon caution"#;
    Command::new("/usr/bin/osascript")
        .args(["-e", script])
        .output()
        .is_ok_and(|output| output.status.success())
}

fn reset_game(app: &AppHandle) {
    if !confirm_reset() {
        return;
    }
    let Some(state) = app.try_state::<LauncherState>() else {
        return;
    };
    match state.save_store.archive("primary") {
        Ok(_) => open_target(&format!(
            "{}?reset={}",
            state.game_url,
            uuid::Uuid::new_v4()
        )),
        Err(error) => {
            let message = format!("无法归档存档：{error:?}");
            let script = format!(
                "display alert {} message {} as critical",
                serde_json::to_string("重新开始失败").unwrap(),
                serde_json::to_string(&message).unwrap()
            );
            let _ = Command::new("/usr/bin/osascript")
                .args(["-e", &script])
                .spawn();
        }
    }
}

fn build_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let open_game_item = MenuItem::with_id(app, "open_game", "打开游戏", true, None::<&str>)?;
    let open_saves_item = MenuItem::with_id(app, "open_saves", "打开存档位置", true, None::<&str>)?;
    let reset_item = MenuItem::with_id(app, "reset", "重新开始……", true, None::<&str>)?;
    let releases_item = MenuItem::with_id(app, "releases", "查看最新版本", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let separator_two = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[
            &open_game_item,
            &open_saves_item,
            &separator_one,
            &reset_item,
            &releases_item,
            &separator_two,
            &quit_item,
        ],
    )?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("艾泽拉斯公会志")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open_game" => open_game(app),
            "open_saves" => {
                if let Some(state) = app.try_state::<LauncherState>() {
                    let _ = std::fs::create_dir_all(state.save_store.root());
                    if let Some(path) = state.save_store.root().to_str() {
                        open_target(path);
                    }
                }
            }
            "reset" => reset_game(app),
            "releases" => open_target(RELEASES_URL),
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

fn ensure_directory(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    std::fs::create_dir_all(path)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(
            |app, _args, _working_directory| {
                open_game(app);
            },
        ))
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_data = app.path().app_data_dir()?;
            let save_directory = app_data.join("saves");
            ensure_directory(&save_directory).map_err(|error| error.to_string())?;
            let save_store = SaveStore::new(save_directory);
            let token = uuid::Uuid::new_v4().to_string();
            let local_server = server::start(app.asset_resolver(), save_store.clone(), token)
                .map_err(|error| format!("failed to start local game server: {error}"))?;

            app.manage(LauncherState {
                game_url: local_server.url.clone(),
                save_store,
            });
            build_tray(app)?;
            open_target(&local_server.url);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running 艾泽拉斯公会志");
}
