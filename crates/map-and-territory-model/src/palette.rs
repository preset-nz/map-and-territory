//! Palettes as themes (design: "Themes: terrain palettes"). A theme is a `palette` node under
//! `/themes`; followers (the campaign, each map) hold a `palette` reference to one. The nine
//! 2025 settings are the kind's POM preset catalogue. Resolving the cascade (map, then
//! campaign, then the code fallback) is the webview's.

use rhizome_core::{Edit, Node, NodeId, Ref, Value};
use rhizome_pom::{payload, Aggregate, Commands, Document, Error, Outcome, PresetRef, Report};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as Json};

use super::settings_2025::{Setting, SETTINGS};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

/// The reference key on followers.
pub const REF: &str = "palette";
pub const THEMES: &str = "/themes";
/// The theme a new document starts with, and the campaign follows.
pub const DEFAULT_SETTING: &str = "doom-forge";

/// `#RRGGBB` as rhizome RGBA (0 to 1, opaque). The one conversion; a test checks the table
/// against the 2025 source.
pub fn rgba(hex: &str) -> [f64; 4] {
    let h = hex.strip_prefix('#').expect("a #RRGGBB colour");
    assert_eq!(h.len(), 6, "{hex} isn't #RRGGBB");
    let c = |i: usize| f64::from(u8::from_str_radix(&h[i..i + 2], 16).expect("hex digits")) / 255.0;
    [c(0), c(2), c(4), 1.0]
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerrainState {
    pub id: String,
    pub base_type: String,
    pub traits: Vec<String>,
    pub name: String,
    pub colour: [f64; 4],
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// What a theme holds, and what a catalogue preset is.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaletteState {
    pub name: String,
    pub description: String,
    pub grid_line: [f64; 4],
    pub primary: [f64; 4],
    pub secondary: [f64; 4],
    pub accent: [f64; 4],
    pub background: [f64; 4],
    pub terrains: Vec<TerrainState>,
}

impl PaletteState {
    pub fn from_setting(s: &Setting) -> Self {
        PaletteState {
            name: s.name.into(),
            description: s.description.into(),
            grid_line: rgba(s.grid_line),
            primary: rgba(s.primary),
            secondary: rgba(s.secondary),
            accent: rgba(s.accent),
            background: rgba(s.background),
            terrains: s
                .terrains
                .iter()
                .map(|t| TerrainState {
                    id: t.id.into(),
                    base_type: t.base_type.into(),
                    traits: t.traits.iter().map(|x| x.to_string()).collect(),
                    name: t.name.into(),
                    colour: rgba(t.colour),
                    description: t.description.map(Into::into),
                })
                .collect(),
        }
    }
}

/// The built-in presets, in menu order, named as the 2025 settings are.
pub fn catalogue() -> Vec<(&'static str, PaletteState)> {
    SETTINGS
        .iter()
        .map(|s| (s.name, PaletteState::from_setting(s)))
        .collect()
}

fn setting_named(name: &str) -> Option<&'static Setting> {
    SETTINGS.iter().find(|s| s.name == name)
}

fn colour_of(n: &Node<'_>, key: &str) -> [f64; 4] {
    match n.value(key) {
        Some(Value::Colour(c)) => c,
        _ => [0.0, 0.0, 0.0, 1.0],
    }
}

fn text_of(n: &Node<'_>, key: &str) -> String {
    match n.value(key) {
        Some(Value::Text(t)) => t,
        _ => String::new(),
    }
}

/// Writes a palette's state onto a node, inside one edit.
pub fn write(tx: &mut Edit<'_>, node: NodeId, s: &PaletteState) -> rhizome_core::Result<Report> {
    tx.set_value(node, "name", Value::Text(s.name.clone()))?;
    tx.set_value(node, "description", Value::Text(s.description.clone()))?;
    for (key, c) in [
        ("gridLine", s.grid_line),
        ("primary", s.primary),
        ("secondary", s.secondary),
        ("accent", s.accent),
        ("background", s.background),
    ] {
        tx.set_value(node, key, Value::Colour(c))?;
    }
    let terrains = serde_json::to_value(&s.terrains).expect("terrains serialise");
    tx.set_value(node, "terrains", Value::Shaped(terrains))?;
    Ok(Report {
        applied: 8,
        skipped: vec![],
    })
}

/// Makes a theme from a built-in setting, named by its id (`doom-forge`, `doom-forge-2`).
fn add_theme(tx: &mut Edit<'_>, s: &Setting) -> rhizome_core::Result<NodeId> {
    let node = tx.add_unique(THEMES, "palette", s.id)?;
    write(tx, node, &PaletteState::from_setting(s))?;
    Ok(node)
}

/// The new-document seed: Doom Forge under `/themes`, and the campaign following it.
pub fn seed(tx: &mut Edit<'_>, campaign: NodeId) -> rhizome_core::Result<()> {
    let s = setting_named("Doom Forge").expect("Doom Forge is built in");
    debug_assert_eq!(s.id, DEFAULT_SETTING);
    let theme = add_theme(tx, s)?;
    tx.set_ref(campaign, REF, Ref::here(theme))
}

pub struct PaletteAggregate;

impl Aggregate for PaletteAggregate {
    type State = PaletteState;

    fn get(&self, n: Node<'_>) -> PaletteState {
        let terrains = match n.value("terrains") {
            Some(Value::Shaped(j)) => serde_json::from_value(j).unwrap_or_default(),
            _ => Vec::new(),
        };
        PaletteState {
            name: text_of(&n, "name"),
            description: text_of(&n, "description"),
            grid_line: colour_of(&n, "gridLine"),
            primary: colour_of(&n, "primary"),
            secondary: colour_of(&n, "secondary"),
            accent: colour_of(&n, "accent"),
            background: colour_of(&n, "background"),
            terrains,
        }
    }

    fn set(
        &self,
        tx: &mut Edit<'_>,
        node: NodeId,
        state: &PaletteState,
    ) -> rhizome_core::Result<Report> {
        write(tx, node, state)
    }
}

#[derive(Deserialize)]
struct UseArgs {
    at: String,
    #[serde(default)]
    preset: Option<String>,
    #[serde(default)]
    theme: Option<String>,
}

/// Why `palette.use` can't run with these arguments, or what it would do.
enum Use {
    Theme(NodeId),
    Preset(&'static Setting),
    Follow,
}

fn plan(d: &Doc, a: &UseArgs) -> Result<Use, String> {
    let at = d
        .tree()
        .at(a.at.as_str())
        .ok_or_else(|| format!("no node at {}", a.at))?;
    if !matches!(at.type_name(), "campaign" | "map") {
        return Err("only a campaign or a map follows a palette".into());
    }
    match (&a.preset, &a.theme) {
        (Some(_), Some(_)) => Err("give a preset or a theme, not both".into()),
        (Some(p), None) => setting_named(p)
            .map(Use::Preset)
            .ok_or_else(|| format!("no built-in palette `{p}`")),
        (None, Some(t)) => match d.tree().at(t.as_str()) {
            Some(n) if n.type_name() == "palette" => Ok(Use::Theme(n.id())),
            _ => Err(format!("{t} isn't a palette")),
        },
        (None, None) if at.type_name() == "map" => Ok(Use::Follow),
        (None, None) => Err("the campaign needs a preset or a theme".into()),
    }
}

/// An existing theme that is the built-in `setting` as it stands.
fn matching_theme(d: &Doc, setting: &Setting) -> Option<NodeId> {
    let themes = d.tree().at(THEMES)?;
    themes
        .children()
        .filter(|n| n.type_name() == "palette")
        .find(|n| {
            d.current_preset(n.id()).ok().flatten()
                == Some(PresetRef::Catalogue(setting.name.into()))
        })
        .map(|n| n.id())
}

/// The built-ins for a picker: name, description and the colours to show.
fn catalogue_json() -> Json {
    Json::Array(
        SETTINGS
            .iter()
            .map(|s| {
                let mut swatches =
                    vec![s.grid_line, s.primary, s.secondary, s.accent, s.background];
                swatches.extend(s.terrains.iter().map(|t| t.colour));
                json!({ "name": s.name, "description": s.description, "swatches": swatches })
            })
            .collect(),
    )
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "palette.use",
        |_| "Use Palette".into(),
        |d: &Doc, p: &Json| payload::<UseArgs>(p).is_ok_and(|a| plan(d, &a).is_ok()),
        |d: &mut Doc, p: &Json| {
            let a: UseArgs = payload(p)?;
            let plan = plan(d, &a).map_err(Error::Payload)?;
            // read first: a reusable theme is found before the edit opens
            let reuse = match &plan {
                Use::Preset(s) => matching_theme(d, s),
                _ => None,
            };
            let commit = d
                .edit("Use Palette", |tx| match plan {
                    Use::Theme(id) => tx.set_ref(a.at.as_str(), REF, Ref::here(id)),
                    Use::Preset(s) => {
                        let id = match reuse {
                            Some(id) => id,
                            None => add_theme(tx, s)?,
                        };
                        tx.set_ref(a.at.as_str(), REF, Ref::here(id))
                    }
                    Use::Follow => tx.clear_ref(a.at.as_str(), REF),
                })?
                .1;
            Ok(Outcome::from(commit))
        },
    );
    c.add(
        "palette.catalogue",
        |_| "Palette Catalogue".into(),
        |_, _| true,
        |_, _| Ok(Outcome::Text(catalogue_json().to_string())),
    );
}
