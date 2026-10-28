//! `compass.set-style`: a compass's style and the label set that goes with it, in one step
//! (epic 24, The cut). Changing the style resets `labels` to the style's own, so one undo puts
//! both back; the four word overrides are kept.

use rhizome_core::Value;
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::Value as Json;

use super::kinds::{compass_default_labels, COMPASS, COMPASS_STYLES};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

#[derive(Deserialize)]
struct Args {
    at: String,
    style: String,
}

fn is_compass(d: &Doc, at: &str) -> bool {
    d.tree().at(at).is_some_and(|n| n.type_name() == COMPASS.id)
}

fn check(d: &Doc, a: &Args) -> Result<(), String> {
    if !is_compass(d, &a.at) {
        return Err(format!("{} isn't a compass", a.at));
    }
    if !COMPASS_STYLES.contains(&a.style.as_str()) {
        return Err(format!("`{}` isn't a compass style", a.style));
    }
    Ok(())
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "compass.set-style",
        |_| "Set Style".into(),
        |d: &Doc, p: &Json| payload::<Args>(p).is_ok_and(|a| check(d, &a).is_ok()),
        |d: &mut Doc, p: &Json| {
            let a: Args = payload(p)?;
            check(d, &a).map_err(Error::Payload)?;
            let labels = compass_default_labels(&a.style);
            Ok(Outcome::from(
                d.edit("Set Style", |tx| {
                    tx.set_value(a.at.as_str(), "labels", Value::Choice(labels.into()))?;
                    tx.set_value(a.at.as_str(), "style", Value::Choice(a.style))
                })?
                .1,
            ))
        },
    );
}
