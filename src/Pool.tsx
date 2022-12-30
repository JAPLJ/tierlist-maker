import { UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { List, ListItemButton, ListItemText } from "@mui/material";
import "./Pool.css";
import { Item } from "./TierlistData";

const PoolItem: React.FC<{ item: Item; isActive: boolean }> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.item.id, transition: null });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: props.isActive ? 0.33 : 1.0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ListItemButton>
        <ListItemText primary={`${props.item.id}, ${props.item.name}`} />
      </ListItemButton>
    </div>
  );
};

const Pool: React.FC<{ items: Item[]; activeId: UniqueIdentifier | null }> = (
  props
) => {
  const { setNodeRef } = useDroppable({ id: "pool" });
  return (
    <div ref={setNodeRef} id="pool">
      <SortableContext
        id="pool"
        items={props.items}
        strategy={rectSortingStrategy}
      >
        <List>
          {props.items.map((item) => (
            <PoolItem item={item} isActive={item.id === props.activeId} />
          ))}
        </List>
      </SortableContext>
    </div>
  );
};

export default Pool;
