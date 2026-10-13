//! The outline layer's one command: `outline.draw` replaces the layer's `paths`. The tool in the
//! webview works out the corners (hex geometry stays out of Rust) and sends the whole value; the
//! kind's shape refuses a malformed path.

use rhizome_core::Value;
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::Value as Json;

use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

#[derive(Deserialize)]
struct DrawArgs {
    at: String,
    paths: Json,
}

fn is_outline(d: &Doc, at: &str) -> bool {
    d.tree().at(at).is_some_and(|n| n.type_name() == "outline")
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "outline.draw",
        |_| "Draw Outline".into(),
        |d: &Doc, p: &Json| payload::<DrawArgs>(p).is_ok_and(|a| is_outline(d, &a.at)),
        |d: &mut Doc, p: &Json| {
            let a: DrawArgs = payload(p)?;
            let layer = match d.tree().at(&a.at) {
                Some(n) if n.type_name() == "outline" => n.id(),
                _ => return Err(Error::Payload(format!("{} isn't an outline layer", a.at))),
            };
            Ok(Outcome::from(
                d.edit("Draw Outline", |tx| {
                    tx.set_value(layer, "paths", Value::Shaped(a.paths))
                })?
                .1,
            ))
        },
    );
}
