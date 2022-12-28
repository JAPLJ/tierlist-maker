use std::collections::HashMap;

use serde::{Deserialize, Serialize};

type TierId = i64;
type ItemId = i64;

#[derive(Debug, Serialize, Deserialize)]
pub struct TierList {
    title: String,
    tiers: Vec<Tier>,
    items: HashMap<ItemId, Item>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tier {
    id: TierId,
    pos: usize,
    title: String,
    items: Vec<ItemId>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Item {
    id: ItemId,
    name: String,
    url: String,
    thumb: Option<String>,
}
