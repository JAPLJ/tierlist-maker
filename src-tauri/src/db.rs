use std::{
    collections::{HashMap, HashSet},
    error, fmt,
    path::Path,
};

use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    QueryBuilder, Row, Sqlite, SqlitePool,
};
use tokio::{
    fs::File,
    io::{AsyncReadExt, AsyncWriteExt},
};
use tokio_stream::StreamExt;

use crate::tierlist::{Item, ItemId, Tier, TierId, TierList};

type DbResult<T> = Result<T, Box<dyn std::error::Error>>;

#[derive(Debug, Clone)]
struct ReadError {
    msg: String,
}

impl fmt::Display for ReadError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "could not read tierlist: {}", self.msg)
    }
}

impl error::Error for ReadError {}

pub async fn connect(url: &str) -> DbResult<SqlitePool> {
    let opt = SqliteConnectOptions::new()
        .filename(url)
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new().connect_with(opt).await?;
    Ok(pool)
}

async fn read_tierlist(pool: &SqlitePool, thumb_dir: &Path) -> DbResult<TierList> {
    let mut tierlist = TierList::empty();

    const SQL_TITLE: &str = "SELECT * FROM tierlist";
    let res = sqlx::query(SQL_TITLE).fetch_one(pool).await?;
    tierlist.title = res.try_get("title")?;

    const SQL_TIERS: &str = "SELECT id, title FROM tiers ORDER BY pos ASC";
    let mut res = sqlx::query(SQL_TIERS).fetch(pool);
    let mut tier_pos = HashMap::new();
    while let Some(row) = res.try_next().await? {
        let tier_id: TierId = row.try_get("id")?;
        let title: &str = row.try_get("title")?;
        tierlist.tiers.push(Tier {
            id: tier_id,
            title: title.to_owned(),
            items: vec![],
        });
        tierlist.tier_max_id = tierlist.tier_max_id.max(tier_id);
        tier_pos.insert(tier_id, tierlist.tiers.len() - 1);
    }

    const SQL_ITEMS: &str = "SELECT * FROM items";
    let mut res = sqlx::query(SQL_ITEMS).fetch(pool);
    while let Some(row) = res.try_next().await? {
        let item_id: ItemId = row.try_get("id")?;
        let name: &str = row.try_get("name")?;
        let url: &str = row.try_get("url")?;
        let thumb: Option<Vec<u8>> = row.try_get("thumb")?;

        let thumb_path = if let Some(thumb) = thumb {
            let thumb_path = thumb_dir.join(format!("_indb_{}", item_id));
            let mut thumb_file = File::create(&thumb_path).await?;
            thumb_file.write(&thumb).await?;
            Some(thumb_path.to_string_lossy().to_string())
        } else {
            None
        };

        tierlist.items.push(Item {
            id: item_id,
            name: name.to_owned(),
            url: url.to_owned(),
            thumb: thumb_path,
        });
        tierlist.item_max_id = tierlist.item_max_id.max(item_id);
    }

    const SQL_POS: &str = "SELECT item_id, tier_id FROM items_pos ORDER BY pos ASC";
    let mut res = sqlx::query(SQL_POS).fetch(pool);
    let mut items_in_list = HashSet::new();
    while let Some(row) = res.try_next().await? {
        let item_id: ItemId = row.try_get("item_id")?;
        let tier_id: TierId = row.try_get("tier_id")?;

        let &tier_idx = tier_pos.get(&tier_id).ok_or_else(|| ReadError {
            msg: format!("invalid tier id {}", tier_id),
        })?;
        tierlist.tiers[tier_idx].items.push(item_id);
        items_in_list.insert(item_id);
    }
    for item in tierlist.items.iter() {
        if !items_in_list.contains(&item.id) {
            tierlist.items_pool.push(item.id);
        }
    }

    Ok(tierlist)
}

async fn write_tierlist(pool: &SqlitePool, tierlist: &TierList) -> DbResult<()> {
    sqlx::migrate!("./sql").run(pool).await?;
    let mut tx = pool.begin().await?;

    // cleanup
    sqlx::query("DELETE FROM tierlist;")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM tiers;").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM items;").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM items_pos;")
        .execute(&mut *tx)
        .await?;

    const SQL_TIERLIST: &str = "INSERT INTO tierlist(title) VALUES (?)";
    sqlx::query(SQL_TIERLIST)
        .bind(&tierlist.title)
        .execute(&mut *tx)
        .await?;

    const SQL_TIERS: &str = "INSERT INTO tiers(id, pos, title) ";
    let mut qbuilder: QueryBuilder<Sqlite> = QueryBuilder::new(SQL_TIERS);
    qbuilder.push_values(tierlist.tiers.iter().enumerate(), |mut b, (pos, tier)| {
        b.push_bind(tier.id)
            .push_bind(pos as i64)
            .push_bind(&tier.title);
    });
    qbuilder.build().execute(&mut *tx).await?;

    const SQL_ITEMS: &str = "INSERT INTO items(id, name, url, thumb) ";
    let mut images = HashMap::new();
    for item in tierlist.items.iter() {
        if let Some(thumb_file) = &item.thumb {
            let mut thumb_file = File::open(thumb_file).await?;
            let mut buf = vec![];
            thumb_file.read_to_end(&mut buf).await?;
            images.insert(item.id, buf);
        }
    }
    let mut qbuilder: QueryBuilder<Sqlite> = QueryBuilder::new(SQL_ITEMS);
    qbuilder.push_values(tierlist.items.iter(), |mut b, item| {
        b.push_bind(item.id)
            .push_bind(&item.name)
            .push_bind(&item.url)
            .push_bind(images.get(&item.id));
    });
    qbuilder.build().execute(&mut *tx).await?;

    const SQL_POS: &str = "INSERT INTO items_pos(item_id, tier_id, pos) ";
    let mut pos_list = vec![];
    for tier in tierlist.tiers.iter() {
        for (pos, &item_id) in tier.items.iter().enumerate() {
            pos_list.push((item_id, tier.id, pos));
        }
    }
    let mut qbuilder: QueryBuilder<Sqlite> = QueryBuilder::new(SQL_POS);
    qbuilder.push_values(pos_list.iter(), |mut b, (item_id, tier_id, pos)| {
        b.push_bind(item_id)
            .push_bind(tier_id)
            .push_bind(*pos as i64);
    });
    qbuilder.build().execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(())
}

async fn open_db(cur_pool: &mut Option<SqlitePool>, path: &Path) -> DbResult<SqlitePool> {
    if let Some(cur_pool) = cur_pool {
        cur_pool.close().await;
    }
    connect(&path.to_string_lossy().to_string()).await
}

pub mod commands {
    use super::*;
    use tauri::{api::dialog::blocking::FileDialogBuilder, async_runtime::Mutex, State};
    use tempdir::TempDir;

    #[tauri::command]
    pub async fn read_tierlist_from_db(
        pool: State<'_, Mutex<Option<SqlitePool>>>,
        thumb_dir: State<'_, TempDir>,
    ) -> Result<TierList, String> {
        let mut pool = pool.lock().await;
        let path = FileDialogBuilder::new()
            .pick_file()
            .ok_or("DB not opened".to_owned())?;
        *pool = Some(
            open_db(&mut *pool, &path)
                .await
                .map_err(|e| e.to_string())?,
        );
        if let Some(pool) = &*pool {
            read_tierlist(pool, thumb_dir.path())
                .await
                .map_err(|e| e.to_string())
        } else {
            Err("DB not opened".to_owned())
        }
    }

    #[tauri::command]
    pub async fn write_tierlist_to_db(
        pool: State<'_, Mutex<Option<SqlitePool>>>,
        tierlist: TierList,
    ) -> Result<(), String> {
        let mut pool = pool.lock().await;
        if pool.is_none() {
            let path = FileDialogBuilder::new()
                .save_file()
                .ok_or("DB not opened".to_owned())?;
            *pool = Some(
                open_db(&mut *pool, &path)
                    .await
                    .map_err(|e| e.to_string())?,
            );
        }
        if let Some(pool) = &*pool {
            write_tierlist(pool, &tierlist)
                .await
                .map_err(|e| e.to_string())
        } else {
            Err("DB not opened".to_owned())
        }
    }
}

#[cfg(test)]
mod tests {
    use tempdir::TempDir;

    use super::*;

    #[tokio::test]
    async fn read_tierlist_test() {
        let dir = TempDir::new("db_test").unwrap();
        let db_url = dir.path().join("test.db3").to_string_lossy().to_string();
        let pool = connect(&db_url).await.unwrap();
        sqlx::migrate!("./sql").run(&pool).await.unwrap();

        let tierlist_title = "list";
        const SQL_TIERLIST: &str = "INSERT INTO tierlist(title) VALUES (?)";
        sqlx::query(SQL_TIERLIST)
            .bind(tierlist_title)
            .execute(&pool)
            .await
            .unwrap();

        let tiers = vec![(1, 0, "tier1"), (2, 1, "tier2"), (5, 2, "tier3")];
        const SQL_TIERS: &str = "INSERT INTO tiers(id, pos, title) ";
        let mut qbuilder: QueryBuilder<Sqlite> = QueryBuilder::new(SQL_TIERS);
        qbuilder.push_values(tiers.iter(), |mut b, (id, pos, title)| {
            b.push_bind(id).push_bind(pos).push_bind(*title);
        });
        qbuilder.build().execute(&pool).await.unwrap();

        let items = vec![
            (1, "item1", "url1", Some(vec![0u8, 1, 2])),
            (2, "item2", "url2", None),
            (3, "item3", "url3", Some(vec![3u8, 4, 5])),
        ];
        const SQL_ITEMS: &str = "INSERT INTO items(id, name, url, thumb) ";
        let mut qbuilder: QueryBuilder<Sqlite> = QueryBuilder::new(SQL_ITEMS);
        qbuilder.push_values(items.iter(), |mut b, (id, name, url, thumb)| {
            b.push_bind(id)
                .push_bind(*name)
                .push_bind(*url)
                .push_bind(thumb);
        });
        qbuilder.build().execute(&pool).await.unwrap();

        let items_pos = vec![(1, 2, 1), (2, 2, 0)];
        const SQL_POS: &str = "INSERT INTO items_pos(item_id, tier_id, pos) ";
        let mut qbuilder: QueryBuilder<Sqlite> = QueryBuilder::new(SQL_POS);
        qbuilder.push_values(items_pos.iter(), |mut b, (item_id, tier_id, pos)| {
            b.push_bind(item_id).push_bind(tier_id).push_bind(pos);
        });
        qbuilder.build().execute(&pool).await.unwrap();

        let thumb_dir = TempDir::new("test_thumb").unwrap();
        let tierlist = read_tierlist(&pool, thumb_dir.path()).await.unwrap();

        pool.close().await;

        assert_eq!(tierlist.title, tierlist_title);
        assert_eq!(tierlist.tiers.len(), 3);
        assert!(tierlist.items.iter().any(|it| it.id == 1));
        assert!(tierlist.items.iter().any(|it| it.id == 2));
        assert!(tierlist.items.iter().any(|it| it.id == 3));
        assert_eq!(tierlist.items_pool, vec![3]);

        let tier2 = &tierlist.tiers[1];
        assert_eq!(tier2.id, 2);
        assert_eq!(tier2.title, tiers[1].2);
        assert_eq!(tier2.items, vec![2, 1]);

        let item1 = tierlist.items.iter().find(|it| it.id == 1).unwrap();
        assert_eq!(item1.id, 1);
        assert_eq!(item1.name, "item1");
        assert_eq!(item1.url, "url1");

        let mut thumb1_file = File::open(item1.thumb.as_ref().unwrap()).await.unwrap();
        let mut thumb1 = vec![];
        thumb1_file.read_to_end(&mut thumb1).await.unwrap();
        assert_eq!(thumb1, vec![0, 1, 2]);
    }

    #[tokio::test]
    async fn write_tierlist_test() {
        let img_dir = TempDir::new("test_thumb").unwrap();
        let thumb1_path = img_dir.path().join("thumb1");
        {
            let mut thumb1_file = File::create(&thumb1_path).await.unwrap();
            thumb1_file.write_all(&[0, 1, 2]).await.unwrap();
        }

        let tierlist = TierList {
            title: "list".to_owned(),
            tiers: vec![
                Tier {
                    id: 1,
                    title: "tier1".to_owned(),
                    items: vec![],
                },
                Tier {
                    id: 2,
                    title: "tier2".to_owned(),
                    items: vec![2, 1],
                },
            ],
            tier_max_id: 2,
            items: vec![
                Item {
                    id: 1,
                    name: "item1".to_owned(),
                    url: "url1".to_owned(),
                    thumb: Some(thumb1_path.to_string_lossy().to_string()),
                },
                Item {
                    id: 2,
                    name: "item2".to_owned(),
                    url: "url2".to_owned(),
                    thumb: None,
                },
                Item {
                    id: 3,
                    name: "item3".to_owned(),
                    url: "url3".to_owned(),
                    thumb: None,
                },
            ],
            items_pool: vec![3],
            item_max_id: 3,
        };

        let dir = TempDir::new("db_test").unwrap();
        let db_url = dir.path().join("test.db3").to_string_lossy().to_string();
        let pool = connect(&db_url).await.unwrap();
        write_tierlist(&pool, &tierlist).await.unwrap();

        assert_eq!(
            sqlx::query("SELECT * FROM tierlist")
                .fetch_one(&pool)
                .await
                .unwrap()
                .get::<String, &str>("title"),
            tierlist.title
        );

        let rows = sqlx::query("SELECT * FROM tiers ORDER BY id ASC")
            .fetch_all(&pool)
            .await
            .unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[1].get::<String, &str>("title"), "tier2");

        let rows = sqlx::query("SELECT * FROM items ORDER BY id ASC")
            .fetch_all(&pool)
            .await
            .unwrap();
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0].get::<Vec<u8>, &str>("thumb"), vec![0, 1, 2]);

        let rows = sqlx::query("SELECT * FROM items_pos ORDER BY item_id ASC")
            .fetch_all(&pool)
            .await
            .unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[1].get::<i64, &str>("tier_id"), 2);
        assert_eq!(rows[1].get::<i64, &str>("pos"), 0);
    }
}
