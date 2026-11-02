//! Opt-in measurements, never an app launch or a CI performance threshold.
use super::*;
use std::fs;
use std::io::Write;
use std::time::Instant;
use tauri::http::HeaderValue;
use tauri::ipc::{InvokeResponseBody, IpcResponse};

fn headers_for(path: &Path) -> HeaderMap {
    let mut encoded = String::new();
    for byte in path.to_str().unwrap().as_bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(char::from(*byte));
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    let mut headers = HeaderMap::new();
    headers.insert(
        crate::commands::project_files::PROJECT_PATH_HEADER_NAME,
        HeaderValue::from_str(&encoded).unwrap(),
    );
    headers
}

fn measure<T>(mut run: impl FnMut() -> T) -> (Vec<f64>, T) {
    drop(run()); // One warm-up, including filesystem/cache effects.
    let mut samples = Vec::new();
    let mut last = None;
    for _ in 0..5 {
        let start = Instant::now();
        let value = run();
        samples.push(start.elapsed().as_secs_f64() * 1000.0);
        last = Some(value);
    }
    (samples, last.unwrap())
}

#[test]
#[ignore = "opt-in #368 benchmark: requires generated SBLS_PERFORMANCE_DIR fixtures"]
fn project_package_performance_baseline() {
    let directory = std::path::PathBuf::from(
        std::env::var_os("SBLS_PERFORMANCE_DIR")
            .expect("Generate fixtures with project-baseline.mjs first"),
    );
    let creator = PackageCreator::steam_backup_label_studio(env!("CARGO_PKG_VERSION")).unwrap();
    let mut rows = Vec::new();
    for kind in ["disc", "case"] {
        for size in ["small", "normal", "large"] {
            let id = format!("{kind}-{size}");
            let fixture = directory.join(&id);
            let bytes = fs::read(fixture.join("request.bin")).unwrap();
            let (framing_ms, parsed) = measure(|| parse_write_request(&bytes).unwrap());
            let (encode_ms, package) = measure(|| {
                encode_project_package_from_borrowed(
                    parsed.project_json,
                    &creator,
                    &parsed.captures,
                )
                .unwrap()
            });
            let (decode_ms, decoded) = measure(|| decode_project_package(&package).unwrap());
            let (hydrated, _) = decoded.into_parts();
            // Normalize object key order through JSON values, not raw bytes.
            let input: serde_json::Value = serde_json::from_slice(parsed.project_json).unwrap();
            let output: serde_json::Value = serde_json::from_slice(&hydrated).unwrap();
            // Qualified built-in leaves are intentionally omitted by packaging;
            // verify actual repeated asset bytes and schema/kind survive.
            assert_eq!(input["schemaVersion"], output["schemaVersion"]);
            assert_eq!(input["projectType"], output["projectType"]);
            let owners = if kind == "disc" {
                vec!["/background/imageDataUrl", "/titleArtwork/imageDataUrl"]
            } else {
                vec![
                    "/caseInsert/templates/cover/background/imageDataUrl",
                    "/caseInsert/templates/cover/titleArtwork/imageDataUrl",
                ]
            };
            for owner in owners {
                assert_eq!(input.pointer(owner), output.pointer(owner));
            }
            drop(parsed);
            let destination = fixture.join("native-output.sbls");
            assert!(
                !destination.exists(),
                "Use a freshly generated fixture run directory"
            );
            let headers = headers_for(&destination);
            let body = InvokeBody::Raw(bytes);
            let (save_ms, _) = measure(|| encode_and_write_request(&headers, &body).unwrap());
            let (open_ms, response) = measure(|| {
                decode_request_with(
                    &headers,
                    &InvokeBody::Raw(Vec::new()),
                    |path| project_binary_io::read(path),
                    |bytes| decode_project_package(bytes).map(|decoded| decoded.into_parts().0),
                )
                .unwrap()
            });
            match response.body().unwrap() {
                InvokeResponseBody::Raw(bytes) => assert_eq!(bytes, hydrated),
                InvokeResponseBody::Json(_) => panic!("Expected raw hydrated bytes"),
            }
            rows.push(serde_json::json!({
                "id": id, "packageBytes": package.len(), "hydratedJsonBytes": hydrated.len(),
                "timingMs": { "parseFrame": framing_ms, "codecEncode": encode_ms,
                    "codecDecode": decode_ms, "nativeSaveWithAtomicWrite": save_ms,
                    "nativeOpenWithReadDecode": open_ms },
            }));
        }
    }
    let report = serde_json::json!({
        "formatVersion": 1, "profile": if cfg!(debug_assertions) { "debug" } else { "release" },
        "warmup": 1, "samples": 5, "results": rows,
        "limitations": ["No WebView IPC, dialog, UI or lifecycle timing",
            "Native process peak memory not collected", "Warm filesystem caches; no cold-storage claim"],
    });
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(directory.join("native-baseline.json"))
        .unwrap();
    file.write_all(&serde_json::to_vec_pretty(&report).unwrap())
        .unwrap();
    println!("Measured six accepted Disc/Case fixtures through production package framing, codec and atomic I/O.");
}
