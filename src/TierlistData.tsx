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

  public tierId(): string {
    return `t${this.id}`;
  }

  constructor(numericId: number, title: string, items: Item[]) {
    this.id = `t${numericId}`;
    this.numericId = numericId;
    this.title = title;
    this.items = items;
  }
}

export interface ItemList {
  id: string;
  items: Item[];
}
