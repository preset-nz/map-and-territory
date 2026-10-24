//! `freeform.set-texture` and `paper.set-texture`: a layer's texture is a reference to an image on disk.
//! Nothing is copied or embedded, and the path keeps the form it was written in (family
//! requirement "No embedded assets"): a relative one resolves against the `.campaign` file,
//! an absolute one stays absolute. The command checks the file so a bad one never lands.

use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};

use rhizome_core::Ref;
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::Value as Json;

use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

/// Largest file taken as a texture.
pub const MAX_BYTES: u64 = 16 * 1024 * 1024;
/// Largest side, in pixels.
pub const MAX_SIDE: u32 = 4096;

#[derive(Deserialize)]
struct Args {
    at: String,
    /// The path as written; `null` clears the texture.
    file: Option<String>,
}

/// Where a reference's file is on disk: absolute as it is, relative against the document's
/// folder. `None` when it is relative and the document has no file yet.
pub fn resolve(document: Option<&Path>, file: &str) -> Option<PathBuf> {
    let p = Path::new(file);
    if p.is_absolute() {
        return Some(p.to_path_buf());
    }
    Some(document?.parent()?.join(p))
}

/// What the first bytes say the file is, and its size in pixels.
pub fn image_size(head: &[u8]) -> Option<(&'static str, u32, u32)> {
    if head.len() >= 24 && head.starts_with(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]) {
        let w = u32::from_be_bytes(head[16..20].try_into().ok()?);
        let h = u32::from_be_bytes(head[20..24].try_into().ok()?);
        return Some(("PNG", w, h));
    }
    if head.starts_with(&[0xff, 0xd8, 0xff]) {
        // walk the marker segments to the first frame header
        let mut i = 2;
        while i + 9 < head.len() {
            if head[i] != 0xff {
                i += 1;
                continue;
            }
            let m = head[i + 1];
            if m == 0xff {
                i += 1;
                continue;
            }
            if (0xc0..=0xcf).contains(&m) && !matches!(m, 0xc4 | 0xc8 | 0xcc) {
                let h = u32::from(u16::from_be_bytes([head[i + 5], head[i + 6]]));
                let w = u32::from(u16::from_be_bytes([head[i + 7], head[i + 8]]));
                return Some(("JPEG", w, h));
            }
            if (0xd0..=0xd9).contains(&m) || m == 0x01 {
                i += 2;
                continue;
            }
            i += 2 + usize::from(u16::from_be_bytes([head[i + 2], head[i + 3]]));
        }
        return None;
    }
    if head.len() >= 30 && &head[0..4] == b"RIFF" && &head[8..12] == b"WEBP" {
        let le24 = |a: usize| {
            u32::from(head[a]) | u32::from(head[a + 1]) << 8 | u32::from(head[a + 2]) << 16
        };
        return match &head[12..16] {
            b"VP8X" => Some(("WebP", 1 + le24(24), 1 + le24(27))),
            b"VP8L" if head[20] == 0x2f => {
                let b = u32::from_le_bytes(head[21..25].try_into().ok()?);
                Some(("WebP", 1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)))
            }
            b"VP8 " => {
                let w = u32::from(u16::from_le_bytes([head[26], head[27]]) & 0x3fff);
                let h = u32::from(u16::from_le_bytes([head[28], head[29]]) & 0x3fff);
                Some(("WebP", w, h))
            }
            _ => None,
        };
    }
    None
}

/// Checks a texture file: it exists, is small enough, is a PNG, JPEG or WebP by its first
/// bytes (not its extension), and is no more than [`MAX_SIDE`] on a side.
pub fn check_file(path: &Path) -> Result<(), String> {
    let meta =
        std::fs::metadata(path).map_err(|e| format!("can't read {}: {e}", path.display()))?;
    if !meta.is_file() {
        return Err(format!("{} isn't a file", path.display()));
    }
    if meta.len() > MAX_BYTES {
        return Err(format!("{} is over {} MB", path.display(), MAX_BYTES >> 20));
    }
    // JPEG frame headers can sit after large metadata, so read a generous head
    let mut head = Vec::new();
    File::open(path)
        .and_then(|f| f.take(64 * 1024).read_to_end(&mut head))
        .map_err(|e| format!("can't read {}: {e}", path.display()))?;
    let (kind, w, h) = image_size(&head)
        .ok_or_else(|| format!("{} isn't a PNG, JPEG or WebP image", path.display()))?;
    if w == 0 || h == 0 || w > MAX_SIDE || h > MAX_SIDE {
        return Err(format!(
            "the {kind} is {w} by {h} pixels; the most is {MAX_SIDE} on a side"
        ));
    }
    Ok(())
}

fn is_kind(d: &Doc, at: &str, kind: &str) -> bool {
    d.tree().at(at).is_some_and(|n| n.type_name() == kind)
}

/// What a command sets: the node kind, how to name it in a refusal, the reference value and
/// the undo labels.
struct Target {
    kind: &'static str,
    noun: &'static str,
    reference: &'static str,
    clear: &'static str,
    set: &'static str,
}

const fn texture_of(kind: &'static str, noun: &'static str) -> Target {
    Target {
        kind,
        noun,
        reference: "texture",
        clear: "Clear Texture",
        set: "Set Texture",
    }
}

/// Sets or clears a file reference (`texture`, or the image layer's `file`) on a node of `kind`. The one validator behind
/// every command that takes a texture: the file is resolved and checked before anything
/// changes, and the edit is one undo step.
fn set_texture(d: &mut Doc, p: &Json, target: Target) -> rhizome_pom::Result<Outcome> {
    let Target {
        kind,
        noun,
        reference,
        clear,
        set,
    } = target;
    let a: Args = payload(p)?;
    if !is_kind(d, &a.at, kind) {
        return Err(Error::Payload(format!("{} isn't a {noun}", a.at)));
    }
    let Some(file) = a.file else {
        return Ok(Outcome::from(
            d.edit(clear, |tx| tx.clear_ref(a.at.as_str(), reference))?
                .1,
        ));
    };
    let on_disk = resolve(d.path(), &file).ok_or_else(|| {
        Error::Payload("save the campaign first, or choose the image by its full path".into())
    })?;
    check_file(&on_disk).map_err(Error::Payload)?;
    Ok(Outcome::from(
        d.edit(set, |tx| {
            tx.set_ref(a.at.as_str(), reference, Ref::file(file))
        })?
        .1,
    ))
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "freeform.set-texture",
        |_| "Set Texture".into(),
        |d: &Doc, p: &Json| payload::<Args>(p).is_ok_and(|a| is_kind(d, &a.at, "freeform")),
        |d: &mut Doc, p: &Json| set_texture(d, p, texture_of("freeform", "freeform layer")),
    );
    c.add(
        "paper.set-texture",
        |_| "Set Texture".into(),
        |d: &Doc, p: &Json| payload::<Args>(p).is_ok_and(|a| is_kind(d, &a.at, "paper")),
        |d: &mut Doc, p: &Json| set_texture(d, p, texture_of("paper", "paper layer")),
    );
    c.add(
        "image.set-file",
        |_| "Set Image".into(),
        |d: &Doc, p: &Json| payload::<Args>(p).is_ok_and(|a| is_kind(d, &a.at, "image")),
        |d: &mut Doc, p: &Json| {
            set_texture(
                d,
                p,
                Target {
                    kind: "image",
                    noun: "image layer",
                    reference: "file",
                    clear: "Clear Image",
                    set: "Set Image",
                },
            )
        },
    );
}
