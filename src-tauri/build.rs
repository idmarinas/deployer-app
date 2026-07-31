use std::env;
use std::fs;
use std::path::PathBuf;

fn manifest_dir() -> PathBuf {
    PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
}

fn package_json() -> PathBuf {
    manifest_dir().join("../package.json")
}

fn resolved_version(package: &str) -> Option<String> {
    let version = fs::read_to_string(manifest_dir().join(format!("../node_modules/{package}/package.json")))
        .ok()?;
    let json: serde_json::Value = serde_json::from_str(&version).ok()?;
    json.get("version").and_then(serde_json::Value::as_str).map(String::from)
}

fn declared_version(package_json_key: &str) -> Option<String> {
    let content = fs::read_to_string(package_json()).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    let version = json.get("dependencies")?.get(package_json_key)?.as_str()?;
    Some(version.trim_start_matches(['^', '~']).to_string())
}

fn version(package: &str, package_json_key: &str, env_name: &str) {
    let version = resolved_version(package)
        .or_else(|| declared_version(package_json_key))
        .unwrap_or_default();

    println!("cargo:rustc-env={env_name}={version}");
}

fn main() {
    tauri_build::build();

    println!("cargo:rerun-if-changed=../package.json");
    println!("cargo:rerun-if-changed=../node_modules/vue/package.json");
    println!("cargo:rerun-if-changed=../node_modules/@nuxt/ui/package.json");

    version("vue", "vue", "DEPLOYER_VUE_VERSION");
    version("@nuxt/ui", "@nuxt/ui", "DEPLOYER_NUXT_UI_VERSION");
}
