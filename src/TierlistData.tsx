export class Item {
  id: number;
  name: string;
  url: string;
  thumb: string | null;

  constructor(id: number, name: string, url: string, thumb: string | null) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.thumb = thumb;
  }
}

export interface ItemData {
  name: string;
  url: string;
  thumb: string | null;
}

export class ItemPool {
  id: string;
  items: Item[];

  constructor(items: Item[]) {
    this.id = "pool";
    this.items = items;
  }
}

export class Tier {
  id: string;
  numericId: number;
  title: string;
  items: Item[];

  constructor(numericId: number, title: string, items: Item[]) {
    this.id = `t${numericId}`;
    this.numericId = numericId;
    this.title = title;
    this.items = items;
  }
}

function toBackendTier(t: Tier) {
  return { id: t.numericId, title: t.title, items: t.items.map((it) => it.id) };
}

export interface ItemList {
  id: string;
  items: Item[];
}

export interface BackendTier {
  id: number;
  title: string;
  items: number[];
}

export interface BackendTierlist {
  title: string;
  tiers: BackendTier[];
  tierMaxId: number;
  items: Item[];
  itemsPool: number[];
  itemMaxId: number;
}

export function toBackendTierlist(
  title: string,
  pool: ItemPool,
  tiers: Tier[]
): BackendTierlist {
  const items: Item[] = [];
  pool.items.forEach((it) => {
    items.push(it);
  });
  tiers.forEach((t) => {
    t.items.forEach((it) => {
      items.push(it);
    });
  });
  return {
    title,
    tiers: tiers.map((t) => toBackendTier(t)),
    tierMaxId: Math.max(0, ...tiers.map((t) => t.numericId)),
    items,
    itemsPool: pool.items.map((it) => it.id),
    itemMaxId: Math.max(0, ...pool.items.map((it) => it.id)),
  };
}

export function fromBackendTierlist(tierlist: BackendTierlist): {
  title: string;
  pool: ItemPool;
  tiers: Tier[];
} {
  const itemsById: { [id: number]: Item } = {};
  tierlist.items.forEach((it) => {
    itemsById[it.id] = it;
  });
  return {
    title: tierlist.title,
    pool: new ItemPool(tierlist.itemsPool.map((id) => itemsById[id])),
    tiers: tierlist.tiers.map((bt) => {
      return new Tier(
        bt.id,
        bt.title,
        bt.items.map((id) => itemsById[id])
      );
    }),
  };
}
