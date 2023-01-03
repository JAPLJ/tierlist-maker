import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  rectIntersection,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { FolderOpenOutlined, Save } from "@mui/icons-material";
import {
  Box,
  Card,
  CardMedia,
  IconButton,
  Paper,
  Unstable_Grid2 as Grid,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { KeyboardSensor, MouseSensor } from "./CustomSensor";
import { fileSrc } from "./FileSrcUtil";
import Pool from "./Pool";
import Tierlist from "./Tierlist";
import {
  BackendTierlist,
  fromBackendTierlist,
  Item,
  ItemData,
  ItemList,
  ItemPool,
  Tier,
  toBackendTierlist,
} from "./TierlistData";

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
        image={fileSrc(props.item.thumb ?? "")}
      />
    </Card>
  ) : null;
};

const App: React.FC = (_) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const [listTitle, setListTitle] = useState<string>("Untitled Tierlist");
  const handleListTitleChange = (text: string) => {
    setListTitle(text);
  };

  const [pool, setPool] = useState<ItemPool>(new ItemPool([]));
  const [tiers, setTiers] = useState<Tier[]>([]);

  const saveTierlist = async () => {
    // TODO: Error notification
    await invoke("write_tierlist_to_db", {
      tierlist: toBackendTierlist(listTitle, pool, tiers),
    });
  };

  const openTierlist = async () => {
    const tierlist = await invoke<BackendTierlist>("read_tierlist_from_db");
    const {
      title: newTitle,
      pool: newPool,
      tiers: newTiers,
    } = fromBackendTierlist(tierlist);
    setListTitle(newTitle);
    setPool(newPool);
    setTiers(newTiers);

    let maxItemId = Math.max(...newPool.items.map((it) => it.id));
    newTiers.forEach((t) => {
      maxItemId = Math.max(maxItemId, ...t.items.map((it) => it.id));
    });
    setNewItemId(maxItemId + 1);
    setNewTierId(Math.max(...tiers.map((it) => it.numericId)) + 1);
  };

  const [newTierId, setNewTierId] = useState(1);
  const handleTierAdd = () => {
    setTiers((prev) => {
      return [...prev, new Tier(newTierId, "Untitled Tier", [])];
    });
    setNewTierId(newTierId + 1);
  };

  const handleTierMove = (id: string, direction: "up" | "down") => {
    const tierIdx = tiers.findIndex((t) => t.id === id);
    const nextIdx = tierIdx + (direction === "up" ? -1 : +1);
    console.log(`tier move: ${id}, ${direction}, ${tierIdx}, ${nextIdx}`);
    if (0 <= nextIdx && nextIdx < tiers.length) {
      setTiers((prev) => {
        let ts = [...prev];
        [ts[tierIdx], ts[nextIdx]] = [ts[nextIdx], ts[tierIdx]];
        return ts;
      });
    }
  };

  const handleTierDelete = (id: string) => {
    setPool((prev) => {
      const tier = tiers.find((t) => t.id === id);
      if (!tier) {
        return prev;
      } else {
        return { ...prev, items: [...prev.items, ...tier.items] };
      }
    });
    setTiers((prev) => {
      return prev.filter((t) => t.id !== id);
    });
  };

  const handleTierTitleChange = (id: string, title: string) => {
    setTiers((prev) => {
      return prev.map((t) => {
        if (t.id === id) {
          return { ...t, title: title } as Tier;
        } else {
          return t;
        }
      });
    });
  };

  const [newItemId, setNewItemId] = useState(1);
  const handleAddNewItem = (itemData: ItemData) => {
    const item = new Item(
      newItemId,
      itemData.name,
      itemData.url,
      itemData.thumb ?? "",
      itemData.memo
    );
    setNewItemId(newItemId + 1);
    setPool((prev) => {
      return {
        ...prev,
        items: [...prev.items, item],
      };
    });
  };

  const handleDeleteItem = (id: number) => {
    const list = findContainingList(id);
    if (!list) {
      return;
    }
    if (list.id === "pool") {
      setPool((prev) => {
        return { ...prev, items: prev.items.filter((it) => it.id !== id) };
      });
    } else {
      setTiers((prev) => {
        return prev.map((t) => {
          if (t.id === list.id) {
            return {
              ...t,
              items: t.items.filter((it) => it.id !== id),
            } as Tier;
          } else {
            return t;
          }
        });
      });
    }
  };

  const handleEditItem = (item: Item) => {
    const list = findContainingList(item.id);
    if (!list) {
      return;
    }
    if (list.id === "pool") {
      setPool((prev) => {
        return {
          ...prev,
          items: prev.items.map((it) => {
            if (it.id === item.id) {
              return item;
            } else {
              return it;
            }
          }),
        };
      });
    } else {
      setTiers((prev) => {
        return prev.map((t) => {
          if (t.id === list.id) {
            return {
              ...t,
              items: t.items.map((it) => {
                if (it.id === item.id) {
                  return item;
                } else {
                  return it;
                }
              }),
            } as Tier;
          } else {
            return t;
          }
        });
      });
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor),
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
        <Grid container spacing={1}>
          <Grid xs={8}>
            <Pane sx={{ position: "relative" }}>
              <Tierlist
                title={listTitle}
                tiers={tiers}
                activeId={activeId}
                onListTitleChange={handleListTitleChange}
                onTierTitleChange={handleTierTitleChange}
                onTierAdd={handleTierAdd}
                onTierMove={handleTierMove}
                onTierDelete={handleTierDelete}
                onDeleteItem={handleDeleteItem}
                onEditItem={handleEditItem}
              />
              <div style={{ position: "absolute", left: 2, bottom: 2 }}>
                <IconButton
                  sx={{
                    border: "1px solid #aaa",
                    margin: "2px",
                  }}
                  onClick={() => openTierlist()}
                >
                  <FolderOpenOutlined color="primary" sx={{ fontSize: 32 }} />
                </IconButton>
                <IconButton
                  sx={{
                    border: "1px solid #aaa",
                    margin: "2px",
                  }}
                  onClick={() => saveTierlist()}
                >
                  <Save color="primary" sx={{ fontSize: 32 }} />
                </IconButton>
              </div>{" "}
            </Pane>
          </Grid>
          <Grid xs={4}>
            <Pane>
              <Pool
                items={pool.items}
                activeId={activeId}
                onAddNewItem={handleAddNewItem}
                onDeleteItem={handleDeleteItem}
                onEditItem={handleEditItem}
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
