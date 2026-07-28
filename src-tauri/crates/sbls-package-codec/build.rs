use flate2::read::GzDecoder;
use sha2::{Digest, Sha256};
use std::env;
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Component, Path, PathBuf};
use tar::Archive;

const JPEG_ARCHIVE_SHA256: &str =
    "ecae8008e2cc9ade2f2c1bb9d5e6d4fb73e7c433866a056bd82980741571a022";
const WEBP_ARCHIVE_SHA256: &str =
    "e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564";
const JPEG_ALLOCATOR_UPSTREAM_SHA256: &str =
    "328ff841f437fa7c2de846c4e295e9145cc628b9041aed718a06eb087c55786c";
const JPEG_ALLOCATOR_OVERLAY_SHA256: &str =
    "4670e58975779b5a423ac6a796d8d22e162aab3e5cb7725e806ff3054f55e4c8";
const WEBP_ALLOCATOR_UPSTREAM_SHA256: &str =
    "c8d90b4ccd536136ac710321c2632912a1f6ee2492a423e14ab9deb159490a56";
const WEBP_ALLOCATOR_OVERLAY_SHA256: &str =
    "31e838dba1b69e2ef0de0df455298a12cedaf75bec33ab54658db4819a7a1469";
const WEBP_CPU_UPSTREAM_SHA256: &str =
    "272cb2a8aa81d6355afecdea7ea344c90c2df58e6f51e01aa8bc4bf866d0be59";
const WEBP_CPU_OVERLAY_SHA256: &str =
    "8f077d3bb09747cd796aa94b2be789d04a881a116b044a579ce4fed0d710d369";
const JPEG_PATCH_SHA256: &str = "afedbb8b44eb9594f3aa05adac3c3c84032c7a14100e64b0ef84768e5ab272f3";
const WEBP_PATCH_SHA256: &str = "419bc50edfb90dda1db4194fa06ff1b2ccdf1ea3add06556a6786be744a4a0cf";
const WEBP_CPU_PATCH_SHA256: &str =
    "7dda5f0cd8ab1555471f0bdaebeecd6bd8e5754d94cfaf67d77b74e9c3f52c56";
const JPEG_LICENSE_SHA256: &str =
    "e10114e6e40f3d0311c401ca25245ac5ef459a43c20f976fd63f03e816f5741f";
const JPEG_IJG_README_SHA256: &str =
    "75815e3bf6484201a3c3d17a1bbf10f2e8e3237f84df10a2357ea896db2a81d6";
const WEBP_COPYING_UPSTREAM_SHA256: &str =
    "5aec868f669e384a22372a4e8a1a6cd7d44c64cd451f960ca69cc170d1e13acf";
const WEBP_COPYING_NOTICE_SHA256: &str =
    "e293d1dddc9785200b1f58a4f5293543cf8566d9e0b8a3c02fad955035b19f42";
const WEBP_PATENTS_SHA256: &str =
    "cc3273e0694ea5896145e0677699b53471b03ea43021ddc50e7923fbb9f5023c";

const JPEG_DECODER_SOURCES: &[&str] = &[
    "src/jcomapi.c",
    "src/jdapimin.c",
    "src/wrapper/jdapistd-8.c",
    "src/wrapper/jdcoefct-8.c",
    "src/wrapper/jdcolor-8.c",
    "src/wrapper/jddctmgr-8.c",
    "src/wrapper/jddiffct-8.c",
    "src/jdhuff.c",
    "src/jdinput.c",
    "src/jdlhuff.c",
    "src/wrapper/jdlossls-8.c",
    "src/wrapper/jdmainct-8.c",
    "src/jdmarker.c",
    "src/jdmaster.c",
    "src/wrapper/jdmerge-8.c",
    "src/jdphuff.c",
    "src/wrapper/jdpostct-8.c",
    "src/wrapper/jdsample-8.c",
    "src/wrapper/jidctflt-8.c",
    "src/wrapper/jidctfst-8.c",
    "src/wrapper/jidctint-8.c",
    "src/wrapper/jidctred-8.c",
    "src/jmemmgr.c",
    "src/jpeg_nbits.c",
    "src/wrapper/jquant1-8.c",
    "src/wrapper/jquant2-8.c",
    "src/wrapper/jutils-8.c",
];

const WEBP_DECODER_SOURCES: &[&str] = &[
    "src/dec/alpha_dec.c",
    "src/dec/buffer_dec.c",
    "src/dec/frame_dec.c",
    "src/dec/idec_dec.c",
    "src/dec/io_dec.c",
    "src/dec/quant_dec.c",
    "src/dec/tree_dec.c",
    "src/dec/vp8_dec.c",
    "src/dec/vp8l_dec.c",
    "src/dec/webp_dec.c",
    "src/dsp/alpha_processing.c",
    "src/dsp/cpu.c",
    "src/dsp/dec.c",
    "src/dsp/dec_clip_tables.c",
    "src/dsp/filters.c",
    "src/dsp/lossless.c",
    "src/dsp/rescaler.c",
    "src/dsp/upsampling.c",
    "src/dsp/yuv.c",
    "src/utils/bit_reader_utils.c",
    "src/utils/color_cache_utils.c",
    "src/utils/filters_utils.c",
    "src/utils/huffman_utils.c",
    "src/utils/quant_levels_dec_utils.c",
    "src/utils/rescaler_utils.c",
    "src/utils/random_utils.c",
];

const PACKAGE_NATIVE_SOURCES: &[&str] = &[
    "allocation_ledger.c",
    "jpeg_validator.c",
    "jpeg_rejected_precision_guards.c",
    "webp_validator.c",
    "webp_single_thread_worker.c",
];

fn main() {
    let manifest_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    let extracted_root = out_dir.join("sbls-pinned-native-codecs");
    let vendor = manifest_dir.join("vendor");
    let jpeg_archive = vendor.join("upstream").join("libjpeg-turbo-3.1.4.1.tar.gz");
    let webp_archive = vendor.join("upstream").join("libwebp-1.6.0.tar.gz");

    emit_rerun_tree(&manifest_dir.join("native"));
    emit_rerun_tree(&vendor);
    println!("cargo:rerun-if-changed=build.rs");

    verify_sha256(&jpeg_archive, JPEG_ARCHIVE_SHA256);
    verify_sha256(&webp_archive, WEBP_ARCHIVE_SHA256);
    verify_sha256(
        &vendor
            .join("patches")
            .join("0001-libjpeg-turbo-operation-ledger.patch"),
        JPEG_PATCH_SHA256,
    );
    verify_sha256(
        &vendor
            .join("patches")
            .join("0002-libwebp-operation-ledger.patch"),
        WEBP_PATCH_SHA256,
    );
    verify_sha256(
        &vendor
            .join("patches")
            .join("0003-libwebp-generic-c-only.patch"),
        WEBP_CPU_PATCH_SHA256,
    );
    verify_sha256(
        &vendor.join("LICENSES").join("libjpeg-turbo-LICENSE.md"),
        JPEG_LICENSE_SHA256,
    );
    verify_sha256(
        &vendor.join("LICENSES").join("libjpeg-turbo-README.ijg"),
        JPEG_IJG_README_SHA256,
    );
    verify_sha256(
        &vendor.join("LICENSES").join("libwebp-COPYING"),
        WEBP_COPYING_NOTICE_SHA256,
    );
    verify_sha256(
        &vendor.join("LICENSES").join("libwebp-PATENTS"),
        WEBP_PATENTS_SHA256,
    );

    recreate_directory(&out_dir, &extracted_root)
        .expect("recreate contained native extraction root");
    extract_archive(&jpeg_archive, &extracted_root).expect("extract pinned libjpeg-turbo");
    extract_archive(&webp_archive, &extracted_root).expect("extract pinned libwebp");

    let jpeg_root = extracted_root.join("libjpeg-turbo-3.1.4.1");
    let webp_root = extracted_root.join("libwebp-1.6.0");
    assert!(jpeg_root.is_dir(), "pinned JPEG archive root is missing");
    assert!(webp_root.is_dir(), "pinned WebP archive root is missing");
    verify_sha256(&jpeg_root.join("LICENSE.md"), JPEG_LICENSE_SHA256);
    verify_sha256(&jpeg_root.join("README.ijg"), JPEG_IJG_README_SHA256);
    verify_sha256(&webp_root.join("COPYING"), WEBP_COPYING_UPSTREAM_SHA256);
    verify_sha256(&webp_root.join("PATENTS"), WEBP_PATENTS_SHA256);

    let jpeg_overlay = vendor
        .join("overlays")
        .join("libjpeg-turbo")
        .join("src")
        .join("jmemnobs.c");
    let webp_overlay_root = vendor.join("overlays").join("libwebp");
    let webp_overlay = webp_overlay_root.join("src").join("utils").join("utils.c");
    let webp_cpu_overlay = webp_overlay_root.join("src").join("dsp").join("cpu.h");
    verify_sha256(
        &jpeg_root.join("src").join("jmemnobs.c"),
        JPEG_ALLOCATOR_UPSTREAM_SHA256,
    );
    verify_sha256(&jpeg_overlay, JPEG_ALLOCATOR_OVERLAY_SHA256);
    verify_sha256(
        &webp_root.join("src").join("utils").join("utils.c"),
        WEBP_ALLOCATOR_UPSTREAM_SHA256,
    );
    verify_sha256(&webp_overlay, WEBP_ALLOCATOR_OVERLAY_SHA256);
    verify_sha256(
        &webp_root.join("src").join("dsp").join("cpu.h"),
        WEBP_CPU_UPSTREAM_SHA256,
    );
    verify_sha256(&webp_cpu_overlay, WEBP_CPU_OVERLAY_SHA256);

    /*
     * Compile package-owned C once under warnings-as-errors before building the
     * self-contained archive. Keeping the linked codec in one archive avoids
     * cyclic static-library ordering failures on GNU and Apple linkers.
     */
    let mut warning_check = cc::Build::new();
    configure_native_build(
        &mut warning_check,
        &manifest_dir,
        &jpeg_root,
        &webp_root,
        &webp_overlay_root,
    );
    warning_check
        .cargo_metadata(false)
        .warnings(true)
        .warnings_into_errors(true);
    if env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        warning_check.flag("/sdl");
    }
    add_package_native_sources(&mut warning_check, &manifest_dir);
    warning_check.compile("sbls_package_codec_shim_warning_check");

    let mut build = cc::Build::new();
    configure_native_build(
        &mut build,
        &manifest_dir,
        &jpeg_root,
        &webp_root,
        &webp_overlay_root,
    );
    build.warnings(false).file(jpeg_overlay).file(webp_overlay);
    add_package_native_sources(&mut build, &manifest_dir);

    for source in JPEG_DECODER_SOURCES {
        build.file(jpeg_root.join(source));
    }
    for source in WEBP_DECODER_SOURCES {
        build.file(webp_root.join(source));
    }

    build.compile("sbls_project_package_codecs");
}

fn configure_native_build(
    build: &mut cc::Build,
    manifest_dir: &Path,
    jpeg_root: &Path,
    webp_root: &Path,
    webp_overlay_root: &Path,
) {
    build
        .std("c11")
        .define("NDEBUG", Some("1"))
        .define("BITTRACE", Some("0"))
        .define("HAVE_CONFIG_H", Some("1"))
        .define("SBLS_WEBP_GENERIC_ONLY", Some("1"))
        .define("WEBP_EXTERN", Some("extern"))
        .include(manifest_dir.join("native").join("include"))
        .include(manifest_dir.join("native").join("config").join("libwebp"))
        .include(
            manifest_dir
                .join("native")
                .join("config")
                .join("libjpeg-turbo"),
        )
        /* This precedes webp_root so the verified cpu.h overlay is selected. */
        .include(webp_overlay_root)
        .include(jpeg_root.join("src"))
        .include(webp_root);

    if env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        build
            .define("_CRT_SECURE_NO_WARNINGS", Some("1"))
            .define("WIN32_LEAN_AND_MEAN", Some("1"))
            .flag("/UWEBP_USE_THREAD")
            .flag("/UWEBP_USE_SSE2")
            .flag("/UWEBP_USE_SSE41")
            .flag("/UWEBP_USE_AVX2")
            .flag("/UWEBP_USE_NEON")
            .flag("/UWEBP_USE_MSA")
            .flag("/UWEBP_USE_MIPS32")
            .flag("/UWEBP_USE_MIPS_DSP_R2");
    } else {
        build
            .flag_if_supported("-fvisibility=hidden")
            .flag("-UWEBP_USE_THREAD")
            .flag("-UWEBP_USE_SSE2")
            .flag("-UWEBP_USE_SSE41")
            .flag("-UWEBP_USE_AVX2")
            .flag("-UWEBP_USE_NEON")
            .flag("-UWEBP_USE_MSA")
            .flag("-UWEBP_USE_MIPS32")
            .flag("-UWEBP_USE_MIPS_DSP_R2");
    }
}

fn add_package_native_sources(build: &mut cc::Build, manifest_dir: &Path) {
    for source in PACKAGE_NATIVE_SOURCES {
        build.file(manifest_dir.join("native").join("src").join(source));
    }
}

fn recreate_directory(root: &Path, path: &Path) -> io::Result<()> {
    let canonical_root = fs::canonicalize(root)?;
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "missing extraction parent"))?;
    if fs::canonicalize(parent)? != canonical_root {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "native extraction root is not a direct child of Cargo OUT_DIR",
        ));
    }

    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "native extraction root is not a real directory",
                ));
            }
            let canonical_path = fs::canonicalize(path)?;
            if canonical_path.parent() != Some(canonical_root.as_path()) {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "native extraction root resolves outside Cargo OUT_DIR",
                ));
            }
            fs::remove_dir_all(path)?;
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => return Err(error),
    }
    fs::create_dir(path)
}

fn extract_archive(archive_path: &Path, destination: &Path) -> io::Result<()> {
    let archive_file = File::open(archive_path)?;
    let decoder = GzDecoder::new(archive_file);
    let mut archive = Archive::new(decoder);
    for entry in archive.entries()? {
        let mut entry = entry?;
        let entry_path = entry.path()?.into_owned();
        if entry_path.as_os_str().is_empty()
            || entry_path
                .components()
                .any(|component| !matches!(component, Component::Normal(_)))
        {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "pinned native archive contains a non-relative path",
            ));
        }
        let entry_type = entry.header().entry_type();
        if matches!(entry_type.as_byte(), b'g' | b'x') {
            /* PAX metadata affects following headers but creates no path. */
            continue;
        }
        if !entry_type.is_file() && !entry_type.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "pinned native archive contains disallowed entry type {:?} at {}",
                    entry_type.as_byte(),
                    entry_path.display()
                ),
            ));
        }
        if !entry.unpack_in(destination)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "pinned native archive entry escaped the extraction root",
            ));
        }
    }
    Ok(())
}

fn verify_sha256(path: &Path, expected: &str) {
    let actual = sha256(path).unwrap_or_else(|error| {
        panic!("failed to hash {}: {error}", path.display());
    });
    assert_eq!(
        actual,
        expected,
        "pinned native input digest mismatch for {}",
        path.display()
    );
}

fn sha256(path: &Path) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}

fn emit_rerun_tree(root: &Path) {
    if !root.exists() {
        return;
    }
    let mut pending = vec![root.to_path_buf()];
    while let Some(path) = pending.pop() {
        if path.is_dir() {
            let mut children = fs::read_dir(&path)
                .unwrap_or_else(|error| panic!("read {}: {error}", path.display()))
                .map(|entry| entry.expect("read vendor entry").path())
                .collect::<Vec<_>>();
            children.sort();
            pending.extend(children.into_iter().rev());
        } else {
            println!("cargo:rerun-if-changed={}", path.display());
        }
    }
}
