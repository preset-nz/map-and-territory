//! A chunk's `voxels` value: a palette and a run-length string (design: object-model.md,
//! "Chunk voxels").
//!
//! ```json
//! { "palette": [{ "terrainId": "water" }], "cells": "1 0*2 1 0*252" }
//! ```
//!
//! `cells` is space-separated tokens, `i` or `i*n` (`n` >= 2), over the 256 slots row-major.
//! `0` is empty, `k` is `palette[k-1]`. There is one encoding per grid: the palette is in order
//! of first use by slot, holds no unused or repeated entry, and runs are maximal. Writes decode,
//! change the grid and encode again, never patch the string, so equal grids give equal values.
//!
//! The same fixtures (`voxels_fixtures.json`) run against `src/app/scene/voxels.ts`.

use serde_json::{json, Value as Json};

use super::freeform::CHUNK_CELLS;

/// One slot: empty, or a whole voxel (`{terrainId, color?}`).
pub type Grid = Vec<Option<Json>>;

/// A grid with nothing in it.
pub fn empty_grid() -> Grid {
    vec![None; CHUNK_CELLS]
}

/// The encoding of 256 empty slots: a new chunk's default.
pub fn empty() -> Json {
    json!({ "palette": [], "cells": format!("0*{CHUNK_CELLS}") })
}

/// One parsed token: palette index (0 = empty) and run length.
fn token(t: &str) -> Result<(usize, usize), String> {
    fn number(s: &str) -> Option<usize> {
        // digits only, no sign, no leading zero: the canonical spelling
        let ok = !s.is_empty()
            && s.len() <= 6
            && s.bytes().all(|b| b.is_ascii_digit())
            && (s == "0" || !s.starts_with('0'));
        if ok {
            s.parse().ok()
        } else {
            None
        }
    }
    match t.split_once('*') {
        None => number(t).map(|i| (i, 1)),
        Some((i, n)) => match (number(i), number(n)) {
            (Some(i), Some(n)) if n >= 2 => Some((i, n)),
            _ => None,
        },
    }
    .ok_or_else(|| format!("`{t}` isn't a run like 3 or 0*12"))
}

/// The palette and cells strings of a `voxels` value.
fn parts(v: &Json) -> Result<(&Vec<Json>, &str), String> {
    let o = v.as_object().ok_or("voxels is a record")?;
    if o.len() != 2 {
        return Err("voxels holds a palette and cells, nothing else".into());
    }
    let palette = o
        .get("palette")
        .and_then(Json::as_array)
        .ok_or("voxels needs a palette list")?;
    let cells = o
        .get("cells")
        .and_then(Json::as_str)
        .ok_or("voxels needs a cells string")?;
    Ok((palette, cells))
}

fn voxel_ok(v: &Json) -> bool {
    v.get("terrainId").is_some_and(Json::is_string)
}

/// Walks the tokens once, handing each `(index, run)` to `f` after the format checks that need
/// no palette: shape of a token, runs summing to exactly 256, adjacent runs merged.
fn runs(cells: &str, mut f: impl FnMut(usize, usize) -> Result<(), String>) -> Result<(), String> {
    let mut total = 0usize;
    let mut prev: Option<usize> = None;
    for t in cells.split(' ') {
        let (i, n) = token(t)?;
        if prev == Some(i) {
            return Err(format!("runs of {i} next to each other must be one run"));
        }
        prev = Some(i);
        total += n;
        if total > CHUNK_CELLS {
            return Err(format!("cells cover more than {CHUNK_CELLS} slots"));
        }
        f(i, n)?;
    }
    if total != CHUNK_CELLS {
        return Err(format!("cells cover {total} slots, not {CHUNK_CELLS}"));
    }
    Ok(())
}

/// Decodes into the 256 slots. Rejects anything that is not the canonical encoding of a grid.
pub fn decode(v: &Json) -> Result<Grid, String> {
    validate(v)?;
    let (palette, cells) = parts(v)?;
    let mut grid = Vec::with_capacity(CHUNK_CELLS);
    runs(cells, |i, n| {
        let slot = if i == 0 {
            None
        } else {
            Some(palette[i - 1].clone())
        };
        grid.extend(std::iter::repeat_n(slot, n));
        Ok(())
    })?;
    Ok(grid)
}

/// Encodes a grid (256 slots) canonically.
pub fn encode(grid: &[Option<Json>]) -> Json {
    debug_assert_eq!(grid.len(), CHUNK_CELLS);
    let mut palette: Vec<&Json> = Vec::new();
    let mut out = String::new();
    // (index, run so far)
    let mut run: Option<(usize, usize)> = None;
    let mut last: Option<(&Option<Json>, usize)> = None;
    let flush = |out: &mut String, run: (usize, usize)| {
        if !out.is_empty() {
            out.push(' ');
        }
        out.push_str(&run.0.to_string());
        if run.1 > 1 {
            out.push('*');
            out.push_str(&run.1.to_string());
        }
    };
    for slot in grid {
        let i = match (slot, last) {
            (None, _) => 0,
            // the common case is a run of the same voxel: skip the palette search
            (Some(_), Some((l, i))) if l == slot => i,
            (Some(v), _) => match palette.iter().position(|p| *p == v) {
                Some(p) => p + 1,
                None => {
                    palette.push(v);
                    palette.len()
                }
            },
        };
        last = Some((slot, i));
        match &mut run {
            Some((ri, n)) if *ri == i => *n += 1,
            _ => {
                if let Some(r) = run.take() {
                    flush(&mut out, r);
                }
                run = Some((i, 1));
            }
        }
    }
    if let Some(r) = run {
        flush(&mut out, r);
    }
    json!({ "palette": palette, "cells": out })
}

/// One pass over the value: well formed and canonical, without building a grid. This is the
/// chunk check, which runs for every chunk on every edit.
pub fn validate(v: &Json) -> Result<(), String> {
    let (palette, cells) = parts(v)?;
    if !palette.iter().all(voxel_ok) {
        return Err("a palette entry is a record with a terrainId".into());
    }
    // first use by slot: each new index must be the next one along
    let mut used = 0usize;
    runs(cells, |i, _| {
        if i > palette.len() {
            return Err(format!("{i} isn't in a palette of {}", palette.len()));
        }
        if i > used {
            if i != used + 1 {
                return Err(format!("palette entry {i} is used before {}", used + 1));
            }
            used = i;
        }
        Ok(())
    })?;
    if used != palette.len() {
        return Err("the palette holds an entry no cell uses".into());
    }
    // with in-order first use and no unused entry, only a repeated entry is left to refuse
    for (k, p) in palette.iter().enumerate() {
        if palette[..k].contains(p) {
            return Err("the palette holds the same voxel twice".into());
        }
    }
    Ok(())
}

/// `decode` then `encode` gives the input back. `validate` is the cheap form of the same test.
#[cfg(test)]
pub fn is_canonical(v: &Json) -> bool {
    decode(v).is_ok_and(|g| encode(&g) == *v)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(serde::Deserialize)]
    struct Case {
        name: String,
        /// slot -> voxel
        grid: std::collections::BTreeMap<usize, Json>,
        encoded: Json,
    }

    fn fixtures() -> Vec<Case> {
        serde_json::from_str(include_str!("voxels_fixtures.json")).unwrap()
    }

    fn grid_of(sparse: &std::collections::BTreeMap<usize, Json>) -> Grid {
        let mut g = empty_grid();
        for (s, v) in sparse {
            g[*s] = Some(v.clone());
        }
        g
    }

    #[test]
    fn the_shared_fixtures_encode_and_decode() {
        let cases = fixtures();
        assert!(cases.len() >= 6);
        for c in cases {
            let g = grid_of(&c.grid);
            assert_eq!(encode(&g), c.encoded, "{}: encode", c.name);
            assert_eq!(decode(&c.encoded).unwrap(), g, "{}: decode", c.name);
            assert!(is_canonical(&c.encoded), "{}", c.name);
            assert_eq!(validate(&c.encoded), Ok(()), "{}", c.name);
        }
    }

    #[test]
    fn an_empty_grid_is_the_default() {
        assert_eq!(encode(&empty_grid()), empty());
        assert_eq!(decode(&empty()).unwrap(), empty_grid());
    }

    #[test]
    fn the_palette_is_in_order_of_first_use_with_maximal_runs() {
        let mut g = empty_grid();
        g[0] = Some(json!({ "terrainId": "b" }));
        g[1] = Some(json!({ "terrainId": "b" }));
        g[2] = Some(json!({ "terrainId": "a" }));
        g[3] = Some(json!({ "terrainId": "b" }));
        let v = encode(&g);
        assert_eq!(
            v["palette"],
            json!([{ "terrainId": "b" }, { "terrainId": "a" }])
        );
        assert_eq!(v["cells"], "1*2 2 1 0*252");
        // the same terrain with a colour override is a different voxel
        g[3] = Some(json!({ "terrainId": "b", "color": [1.0, 0.0, 0.0, 1.0] }));
        assert_eq!(encode(&g)["palette"].as_array().unwrap().len(), 3);
    }

    #[test]
    fn a_full_chunk_of_one_voxel_is_one_run() {
        let g = vec![Some(json!({ "terrainId": "a" })); CHUNK_CELLS];
        assert_eq!(encode(&g)["cells"], "1*256");
    }

    fn v(palette: Json, cells: &str) -> Json {
        json!({ "palette": palette, "cells": cells })
    }

    #[test]
    fn bad_input_is_refused() {
        let a = json!([{ "terrainId": "a" }]);
        let ab = json!([{ "terrainId": "a" }, { "terrainId": "b" }]);
        let bad = [
            ("too few", v(a.clone(), "1 0*254")),
            ("too many", v(a.clone(), "1 0*256")),
            ("index out of range", v(a.clone(), "2 0*255")),
            ("unused entry", v(ab.clone(), "1 0*255")),
            ("i*1", v(a.clone(), "1*1 0*255")),
            ("n of 0", v(a.clone(), "1 0*0 0*255")),
            ("unmerged runs", v(a.clone(), "1 1 0*254")),
            (
                "unmerged runs of the same index",
                v(a.clone(), "1 0*100 0*155"),
            ),
            ("garbage", v(a.clone(), "1 x 0*254")),
            ("empty token", v(a.clone(), "1  0*254")),
            ("leading space", v(a.clone(), " 1 0*255")),
            ("empty string", v(a.clone(), "")),
            ("leading zero", v(a.clone(), "01 0*255")),
            ("negative", v(a.clone(), "-1 0*256")),
            ("double star", v(a.clone(), "1*2*3 0*253")),
            ("first use out of order", v(ab.clone(), "2 1 0*254")),
            (
                "repeated palette entry",
                v(
                    json!([{ "terrainId": "a" }, { "terrainId": "a" }]),
                    "1 2 0*254",
                ),
            ),
            ("palette entry without terrainId", v(json!([{}]), "1 0*255")),
            ("cells not a string", json!({ "palette": [], "cells": 3 })),
            (
                "extra field",
                json!({ "palette": [], "cells": "0*256", "x": 1 }),
            ),
            ("an old list", Json::Array(vec![Json::Null; CHUNK_CELLS])),
        ];
        for (what, value) in bad {
            assert!(validate(&value).is_err(), "validate accepted {what}");
            assert!(decode(&value).is_err(), "decode accepted {what}");
            assert!(!is_canonical(&value), "{what}");
        }
    }

    #[test]
    fn validate_agrees_with_decode_then_encode_on_noise() {
        // a small deterministic generator: every grid it makes round-trips, and every
        // single-character change to its string either fails or is still canonical
        let mut s = 0x2545_f491_4f6c_dd1du64;
        let mut next = move |m: u64| {
            s ^= s << 13;
            s ^= s >> 7;
            s ^= s << 17;
            s % m
        };
        for _ in 0..200 {
            let mut g = empty_grid();
            for _ in 0..next(60) {
                let at = next(256) as usize;
                let len = 1 + next(20) as usize;
                let t = format!("t{}", next(4));
                for slot in g.iter_mut().skip(at).take(len) {
                    *slot = Some(json!({ "terrainId": t }));
                }
            }
            let e = encode(&g);
            assert_eq!(decode(&e).unwrap(), g);
            assert_eq!(validate(&e), Ok(()));
            let cells = e["cells"].as_str().unwrap();
            for k in 0..cells.len() {
                for c in ['0', '1', '2', '*', ' ', 'x'] {
                    let mut m = cells.to_string();
                    m.replace_range(k..=k, &c.to_string());
                    let value = json!({ "palette": e["palette"], "cells": m });
                    assert_eq!(validate(&value).is_ok(), is_canonical(&value), "{m}");
                }
            }
        }
    }
}
