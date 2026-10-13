//! `freeform.set-texture`: the file checks, the path kept as written, and undo.

use std::path::{Path, PathBuf};

use rhizome_core::IdSource;
use rhizome_pom::{Document, MemoryStore};
use serde_json::{json, Value as Json};

use super::texture::{check_file, image_size, resolve, MAX_SIDE};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

const LAYER: &str = "/maps/map/freeform";

fn doc() -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    d.run("node.add", &json!({ "parent": "/maps", "type": "map" }))
        .unwrap();
    d.run(
        "node.add",
        &json!({ "parent": "/maps/map", "type": "freeform" }),
    )
    .unwrap();
    d
}

fn dir(name: &str) -> PathBuf {
    let p = std::env::temp_dir().join(format!("mt-texture-{}-{name}", std::process::id()));
    std::fs::create_dir_all(&p).unwrap();
    p
}

fn png(w: u32, h: u32) -> Vec<u8> {
    let mut b = vec![0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
    b.extend_from_slice(b"IHDR");
    b.extend_from_slice(&w.to_be_bytes());
    b.extend_from_slice(&h.to_be_bytes());
    b.extend_from_slice(&[8, 6, 0, 0, 0]);
    b
}

fn set(d: &mut Doc, file: Json) -> rhizome_pom::Result<rhizome_pom::Outcome> {
    d.run(
        "freeform.set-texture",
        &json!({ "at": LAYER, "file": file }),
    )
}

fn texture(d: &Doc) -> Option<String> {
    d.tree()
        .at(LAYER)
        .and_then(|n| n.reference("texture").and_then(|r| r.file.clone()))
}

#[test]
fn sizes_are_read_from_the_first_bytes() {
    assert_eq!(image_size(&png(640, 480)), Some(("PNG", 640, 480)));
    let jpeg = [
        0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x01, 0xe0, 0x02, 0x80, 1, 0, 0,
        0, 0,
    ];
    assert_eq!(image_size(&jpeg), Some(("JPEG", 640, 480)));
    let mut webp = b"RIFF\0\0\0\0WEBPVP8X\x0a\0\0\0\0\0\0\0".to_vec();
    webp.extend_from_slice(&[0x7f, 0x02, 0, 0xdf, 0x01, 0]);
    assert_eq!(image_size(&webp), Some(("WebP", 640, 480)));
    assert_eq!(image_size(b"GIF89a plenty of other bytes here"), None);
}

#[test]
fn a_good_image_is_set_as_written_and_undo_takes_it_back() {
    let dir = dir("good");
    let file = dir.join("paper.png");
    std::fs::write(&file, png(512, 512)).unwrap();
    let mut d = doc();
    set(&mut d, json!(file.to_str().unwrap())).unwrap();
    // an absolute path stays absolute; nothing is copied
    assert_eq!(texture(&d).as_deref(), file.to_str());
    d.undo().unwrap();
    assert_eq!(texture(&d), None);
}

#[test]
fn the_extension_does_not_decide() {
    let dir = dir("ext");
    let liar = dir.join("not-an-image.png");
    std::fs::write(&liar, b"just some text, not a picture at all").unwrap();
    let mut d = doc();
    let e = set(&mut d, json!(liar.to_str().unwrap())).unwrap_err();
    assert!(e.to_string().contains("isn't a PNG, JPEG or WebP"), "{e}");
    assert_eq!(texture(&d), None);
}

#[test]
fn limits_and_missing_files_are_refused() {
    let dir = dir("limits");
    let big = dir.join("big.png");
    std::fs::write(&big, png(MAX_SIDE + 1, 10)).unwrap();
    assert!(check_file(&big).unwrap_err().contains("pixels"));
    assert!(check_file(&dir.join("nope.png")).is_err());
    assert!(check_file(&dir).is_err());
}

#[test]
fn only_a_freeform_layer_takes_one_and_null_clears() {
    let dir = dir("clear");
    let file = dir.join("t.png");
    std::fs::write(&file, png(8, 8)).unwrap();
    let mut d = doc();
    let bad = d.run(
        "freeform.set-texture",
        &json!({ "at": "/maps/map", "file": file.to_str().unwrap() }),
    );
    assert!(bad.is_err());
    set(&mut d, json!(file.to_str().unwrap())).unwrap();
    set(&mut d, Json::Null).unwrap();
    assert_eq!(texture(&d), None);
    assert_eq!(d.label("freeform.set-texture").unwrap(), "Set Texture");
}

#[test]
fn a_relative_path_resolves_against_the_document_and_stays_relative() {
    assert_eq!(
        resolve(Some(Path::new("/a/b/map.campaign")), "img/t.png"),
        Some(PathBuf::from("/a/b/img/t.png"))
    );
    assert_eq!(
        resolve(Some(Path::new("/a/b/map.campaign")), "/x/t.png"),
        Some(PathBuf::from("/x/t.png"))
    );
    // an unsaved document can't resolve a relative path, so the command refuses it
    assert_eq!(resolve(None, "t.png"), None);
    let mut d = doc();
    let e = set(&mut d, json!("t.png")).unwrap_err();
    assert!(e.to_string().contains("save the campaign first"), "{e}");
}
