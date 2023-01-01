import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import {
  Box,
  Card,
  CardMedia,
  Paper,
  Unstable_Grid2 as Grid,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import Pool from "./Pool";
import Tierlist from "./Tierlist";
import { Item, ItemList, ItemPool, Tier } from "./TierlistData";

const Pane = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "darkgray" : "white",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

const OverlayItem: React.FC<{ item: Item | null }> = (props) => {
  return props.item ? (
    <Card
      elevation={12}
      square
      sx={{ display: "flex", alignItems: "center", width: 60, opacity: 0.66 }}
    >
      <CardMedia
        component="img"
        sx={{ width: 60 }}
        image={props.item.thumb ?? undefined}
      />
    </Card>
  ) : null;
};

const App: React.FC = (_) => {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }

  function tmpImgSrc(k: number): string {
    return `test${(k % 3) + 1}.png`;
  }

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [listTitle, setListTitle] = useState<string>("Untitled Tierlist");
  const [pool, setPool] = useState<ItemPool>(
    new ItemPool(
      Array.from({ length: 20 }, (_, k) => k).map(
        (k) => new Item(k + 1, `name-${k + 1}`, `url-${k + 1}`, tmpImgSrc(k))
      )
    )
  );
  const [tiers, setTiers] = useState<Tier[]>([
    new Tier(
      1,
      "tier1",
      Array.from({ length: 15 }, (_, k) => k).map(
        (k) =>
          new Item(100 + k, `name-${100 + k}`, `url-${100 + k}`, tmpImgSrc(k))
      )
    ),
    new Tier(
      2,
      "tier2",
      Array.from({ length: 5 }, (_, k) => k).map(
        (k) =>
          new Item(200 + k, `name-${200 + k}`, `url-${200 + k}`, tmpImgSrc(k))
      )
    ),
  ]);

  const handleAddNewItem = (item: Item) => {
    setPool((prev) => {
      // TODO: convertFileSrc / test images
      prev.items.push({ ...item, thumb: convertFileSrc(item.thumb ?? "") });
      return prev;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over, delta } = event;
      const activeId = active.id;
      const overId = over?.id ?? null;
      const activeList = findContainingList(activeId);
      const overList = findContainingList(overId);
      if (!activeList || !overList || activeList.id === overList.id) {
        return;
      }

      const activeIdx = activeList.items.findIndex((it) => it.id == activeId);
      const overIdx = overList.items.findIndex((it) => it.id == overId);
      const insertIdx = (() => {
        const last = overIdx === overList.items.length - 1 && delta.y > 0;
        if (overIdx >= 0) {
          return overIdx + (last ? 1 : 0);
        } else {
          return overList.items.length;
        }
      })();

      setPool((prev) => {
        if (activeList.id === "pool") {
          return {
            id: prev.id,
            items: prev.items.filter((it) => it.id !== activeId),
          };
        } else if (overList.id === "pool") {
          return {
            id: prev.id,
            items: [
              ...overList.items.slice(0, insertIdx),
              activeList.items[activeIdx],
              ...overList.items.slice(insertIdx, overList.items.length),
            ],
          };
        } else {
          return prev;
        }
      });

      setTiers((prev) => {
        return prev.map((t) => {
          if (activeList.id == t.id) {
            return {
              ...t,
              items: t.items.filter((it) => it.id !== activeId),
            } as Tier;
          } else if (overList.id === t.id) {
            return {
              ...t,
              items: [
                ...overList.items.slice(0, insertIdx),
                activeList.items[activeIdx],
                ...overList.items.slice(insertIdx, overList.items.length),
              ],
            } as Tier;
          } else {
            return t;
          }
        });
      });
    },
    [pool, tiers]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = active.id;
      const overId = over?.id ?? null;
      const activeList = findContainingList(activeId);
      const overList = findContainingList(overId);
      setActiveId(null);

      if (!activeList || !overList || activeList !== overList) {
        return;
      }

      const activeIdx = activeList.items.findIndex((it) => it.id == activeId);
      const overIdx = overList.items.findIndex((it) => it.id == overId);
      if (activeIdx !== overIdx) {
        if (activeList.id === "pool") {
          setPool((prev) => {
            return {
              id: prev.id,
              items: arrayMove(overList.items, activeIdx, overIdx),
            };
          });
        } else {
          setTiers((prev) => {
            return prev.map((t) => {
              if (t.id === activeList.id) {
                return {
                  ...t,
                  items: arrayMove(overList.items, activeIdx, overIdx),
                } as Tier;
              } else {
                return t;
              }
            });
          });
        }
      }
    },
    [pool, tiers]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={2}>
          <Grid xs={8}>
            <Pane>
              <Tierlist title={listTitle} tiers={tiers} activeId={activeId} />
            </Pane>
          </Grid>
          <Grid xs={4}>
            <Pane>
              <Pool
                items={pool.items}
                activeId={activeId}
                onAddNewItem={handleAddNewItem}
              />
            </Pane>
          </Grid>
        </Grid>
      </Box>
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeId ? <OverlayItem item={findItemById(activeId)} /> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );

  function findItemById(id: UniqueIdentifier): Item | null {
    const poolRes = pool.items.find((p) => p.id == id);
    if (poolRes) {
      return poolRes;
    }
    for (let i = 0; i < tiers.length; ++i) {
      const tierRes = tiers[i].items.find((p) => p.id == id);
      if (tierRes) {
        return tierRes;
      }
    }
    return null;
  }

  function findContainingList(id: UniqueIdentifier | null): ItemList | null {
    if (!id) {
      return null;
    }

    if (id == "pool") {
      return pool;
    } else if (tiers.some((t) => t.id == id)) {
      return tiers.find((t) => t.id == id) ?? null;
    }

    if (pool.items.some((it) => it.id == id)) {
      return pool;
    } else {
      return tiers.find((t) => t.items.some((it) => it.id == id)) ?? null;
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(active.id);
  }
};

export default App;
