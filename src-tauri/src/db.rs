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

pub async fn read_tierlist(pool: &SqlitePool, thumb_dir: &Path) -> DbResult<TierList> {
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

        tierlist.items.insert(
            item_id,
            Item {
                id: item_id,
                name: name.to_owned(),
                url: url.to_owned(),
                thumb: thumb_path,
            },
        );
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
    for (&item_id, _) in tierlist.items.iter() {
        if !items_in_list.contains(&item_id) {
            tierlist.items_pool.push(item_id);
        }
    }

    Ok(tierlist)
}

pub async fn write_tierlist(
    pool: &SqlitePool,
    thumb_dir: &Path,
    tierlist: &TierList,
) -> DbResult<()> {
    sqlx::migrate!("./sql").run(pool).await?;
    let mut tx = pool.begin().await?;

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
    for (_, item) in tierlist.items.iter() {
        if let Some(thumb_file) = &item.thumb {
            let thumb_path = thumb_dir.join(thumb_file);
            let mut thumb_file = File::open(thumb_path).await?;
            let mut buf = vec![];
            thumb_file.read_to_end(&mut buf).await?;
            images.insert(item.id, buf);
        }
    }
    let mut qbuilder: QueryBuilder<Sqlite> = QueryBuilder::new(SQL_ITEMS);
    qbuilder.push_values(tierlist.items.iter(), |mut b, (_, item)| {
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

pub mod commands {
    use super::*;
    use tauri::{async_runtime::Mutex, State};
    use tempdir::TempDir;

    #[tauri::command]
    pub async fn open_db(
        pool: State<'_, Mutex<Option<SqlitePool>>>,
        path: String,
    ) -> Result<(), String> {
        let mut pool = pool.lock().await;
        if let Some(cur_pool) = &*pool {
            cur_pool.close().await;
        }
        *pool = Some(connect(&path).await.map_err(|e| e.to_string())?);
        Ok(())
    }

    #[tauri::command]
    pub async fn read_tierlist_from_db(
        pool: State<'_, Mutex<Option<SqlitePool>>>,
        tierlist: State<'_, Mutex<TierList>>,
        thumb_dir: State<'_, TempDir>,
    ) -> Result<(), String> {
        let pool = pool.lock().await;
        let mut tierlist = tierlist.lock().await;
        if let Some(pool) = &*pool {
            *tierlist = read_tierlist(pool, thumb_dir.path())
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("DB not opened".to_owned())
        }
    }

    #[tauri::command]
    pub async fn write_tierlist_to_db(
        pool: State<'_, Mutex<Option<SqlitePool>>>,
        tierlist: State<'_, Mutex<TierList>>,
        thumb_dir: State<'_, TempDir>,
    ) -> Result<(), String> {
        let pool = pool.lock().await;
        let tierlist = tierlist.lock().await;
        if let Some(pool) = &*pool {
            write_tierlist(pool, thumb_dir.path(), &tierlist)
                .await
                .map_err(|e| e.to_string())
        } else {
            Err("DB not opened".to_owned())
        }
    }
}
