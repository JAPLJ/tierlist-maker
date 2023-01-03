use serde::{Deserialize, Serialize};

pub type TierId = i64;
pub type ItemId = i64;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TierList {
    pub title: String,
    pub tiers: Vec<Tier>,
    pub tier_max_id: TierId,
    pub items: Vec<Item>,
    pub items_pool: Vec<ItemId>,
    pub item_max_id: ItemId,
}

impl TierList {
    pub fn empty() -> Self {
        TierList {
            title: "Untitled".to_owned(),
            tiers: vec![],
            tier_max_id: 0,
            items: vec![],
            items_pool: vec![],
            item_max_id: 0,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tier {
    pub id: TierId,
    pub title: String,
    pub items: Vec<ItemId>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: ItemId,
    pub name: String,
    pub url: String,
    pub thumb: Option<String>,
    pub memo: String,
}
