use std::collections::HashMap;

use serde::{Deserialize, Serialize};

pub type TierId = i64;
pub type ItemId = i64;

#[derive(Debug, Serialize, Deserialize)]
pub struct TierList {
    pub title: String,
    pub tiers: Vec<Tier>,
    pub tier_max_id: TierId,
    pub items: HashMap<ItemId, Item>,
    pub items_pool: Vec<ItemId>,
    pub item_max_id: ItemId,
}

impl TierList {
    pub fn empty() -> Self {
        TierList {
            title: "Untitled".to_owned(),
            tiers: vec![],
            tier_max_id: 0,
            items: HashMap::new(),
            items_pool: vec![],
            item_max_id: 0,
        }
    }

    // 新しいアイテムを全体集合に追加する
    pub fn add_new_item(&mut self, name: String, url: String, thumb: Option<String>) -> ItemId {
        let id: ItemId = self.item_max_id + 1;
        self.items.insert(
            id,
            Item {
                id,
                name,
                url,
                thumb,
            },
        );
        self.add_item(id, None, self.items_pool.len());
        self.item_max_id = id;
        id
    }

    // アイテムを完全に (全体集合からも) 削除する
    pub fn delete_item(&mut self, id: ItemId) {
        self.remove_item(id);
        self.items.remove(&id);
    }

    fn tier_idx(&self, tier_id: TierId) -> usize {
        self.tiers.iter().position(|t| t.id == tier_id).unwrap()
    }

    fn item_tier(&self, id: ItemId) -> (Option<TierId>, usize) {
        if let Some(tier) = self.tiers.iter().find(|&t| t.items.contains(&id)) {
            let pos = tier.items.iter().position(|&it| it == id).unwrap();
            (Some(tier.id), pos)
        } else {
            let pos = self.items_pool.iter().position(|&it| it == id).unwrap();
            (None, pos)
        }
    }

    // アイテムをリストから取り除く (全体集合には残る)
    pub fn remove_item(&mut self, id: ItemId) {
        let (cur_tier, cur_pos) = self.item_tier(id);
        if let Some(cur_tier) = cur_tier {
            let tier_idx = self.tier_idx(cur_tier);
            self.tiers[tier_idx].items.remove(cur_pos);
        } else {
            self.items_pool.remove(cur_pos);
        }
    }

    // (全体集合にすでに存在する) アイテムをリストに加える
    pub fn add_item(&mut self, id: ItemId, tier_id: Option<TierId>, pos: usize) {
        if let Some(tier_id) = tier_id {
            let tier_idx = self.tier_idx(tier_id);
            self.tiers[tier_idx].items.insert(pos, id);
        } else {
            self.items_pool.insert(pos, id);
        }
    }

    // 新しい tier を追加する
    pub fn add_new_tier(&mut self, title: String, pos: usize) -> TierId {
        let id = self.tier_max_id + 1;
        self.tiers.insert(
            pos,
            Tier {
                id,
                title,
                items: vec![],
            },
        );
        self.tier_max_id += 1;
        id
    }

    // tier を削除する
    pub fn delete_tier(&mut self, id: TierId) {
        let tier_idx = self.tier_idx(id);
        for &it in self.tiers[tier_idx].items.iter() {
            self.items_pool.push(it);
        }
        self.tiers.remove(tier_idx);
    }

    // tier を移動する (その tier に属するアイテムは保存される)
    pub fn move_tier(&mut self, id: TierId, pos: usize) {
        let cur_pos = self.tier_idx(id);
        let tier = self.tiers.remove(cur_pos);
        self.tiers.insert(pos, tier);
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tier {
    pub id: TierId,
    pub title: String,
    pub items: Vec<ItemId>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Item {
    pub id: ItemId,
    pub name: String,
    pub url: String,
    pub thumb: Option<String>,
}

pub mod commands {
    use super::*;
    use tauri::async_runtime::Mutex;
    use tauri::State;

    #[tauri::command]
    pub async fn add_new_item(
        tierlist: State<'_, Mutex<TierList>>,
        name: String,
        url: String,
        thumb: Option<String>,
    ) -> Result<ItemId, ()> {
        let mut tierlist = tierlist.lock().await;
        Ok(tierlist.add_new_item(name, url, thumb))
    }

    #[tauri::command]
    pub async fn delete_item(tierlist: State<'_, Mutex<TierList>>, id: ItemId) -> Result<(), ()> {
        let mut tierlist = tierlist.lock().await;
        tierlist.delete_item(id);
        Ok(())
    }

    #[tauri::command]
    pub async fn move_item(
        tierlist: State<'_, Mutex<TierList>>,
        id: ItemId,
        tier_id: Option<TierId>,
        pos: usize,
    ) -> Result<(), ()> {
        let mut tierlist = tierlist.lock().await;
        tierlist.remove_item(id);
        tierlist.add_item(id, tier_id, pos);
        Ok(())
    }

    #[tauri::command]
    pub async fn add_new_tier(
        tierlist: State<'_, Mutex<TierList>>,
        title: String,
        pos: usize,
    ) -> Result<TierId, ()> {
        let mut tierlist = tierlist.lock().await;
        Ok(tierlist.add_new_tier(title, pos))
    }

    #[tauri::command]
    pub async fn delete_tier(tierlist: State<'_, Mutex<TierList>>, id: TierId) -> Result<(), ()> {
        let mut tierlist = tierlist.lock().await;
        tierlist.delete_tier(id);
        Ok(())
    }

    #[tauri::command]
    pub async fn move_tier(
        tierlist: State<'_, Mutex<TierList>>,
        id: TierId,
        pos: usize,
    ) -> Result<(), ()> {
        let mut tierlist = tierlist.lock().await;
        tierlist.move_tier(id, pos);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn tierlist_manip() {
        let mut tierlist = TierList::empty();
        assert!(tierlist.items.is_empty());

        let id1 = tierlist.add_new_item("it1".to_owned(), "url1".to_owned(), None);
        let id2 = tierlist.add_new_item("it2".to_owned(), "url2".to_owned(), None);
        let id3 = tierlist.add_new_item("it3".to_owned(), "url3".to_owned(), None);
        assert!(tierlist.items.contains_key(&id1));
        assert!(tierlist.items.contains_key(&id2));
        assert!(tierlist.items.contains_key(&id3));
        assert_eq!(tierlist.items_pool, vec![id1, id2, id3]);

        let tier1 = tierlist.add_new_tier("tier1".to_owned(), 0);
        let tier2 = tierlist.add_new_tier("tier2".to_owned(), 1);
        tierlist.remove_item(id1);
        tierlist.add_item(id1, Some(tier1), 0);
        tierlist.remove_item(id2);
        tierlist.add_item(id2, Some(tier1), 0);
        tierlist.remove_item(id3);
        tierlist.add_item(id3, Some(tier2), 0);
        assert!(tierlist.items_pool.is_empty());
        assert_eq!(tierlist.tiers[0].items, vec![id2, id1]);
        assert_eq!(tierlist.tiers[1].items, vec![id3]);

        let tier3 = tierlist.add_new_tier("tier3".to_owned(), 1);
        assert_eq!(tierlist.tiers[1].id, tier3);
        assert_eq!(tierlist.tiers[2].id, tier2);

        tierlist.delete_tier(tier2);
        assert_eq!(tierlist.items_pool, vec![id3]);

        tierlist.remove_item(id2);
        tierlist.add_item(id2, None, 1);
        assert_eq!(tierlist.items_pool, vec![id3, id2]);
        assert_eq!(tierlist.tiers[0].items, vec![id1]);

        tierlist.delete_item(id1);
        assert!(tierlist.tiers[0].items.is_empty());
    }
}
