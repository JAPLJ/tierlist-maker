import { UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { List, ListItem, ListItemText, Stack } from "@mui/material";
import "./Tierlist.css";
import { Item, Tier } from "./TierlistData";

const TierItem: React.FC<{ item: Item; isActive: boolean }> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.item.id, transition: null });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: props.isActive ? 0.33 : 1.0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ListItem
        disablePadding
        style={{ backgroundColor: "#fff", textAlign: "center" }}
      >
        <ListItemText
          primary={`[${props.item.id}]`}
          secondary={`${props.item.name}`}
        />
      </ListItem>
    </div>
  );
};

const TierContainer: React.FC<{
  id: string;
  title: string;
  items: Item[];
  activeId: UniqueIdentifier | null;
}> = (props) => {
  const { setNodeRef } = useDroppable({ id: props.id });

  return (
    <div className="tier-container">
      <div className="tier-title-box">
        <span className="tier-title">{props.title}</span>
      </div>
      <SortableContext
        id={props.id}
        items={props.items}
        strategy={rectSortingStrategy}
      >
        <div ref={setNodeRef}>
          <List
            component={Stack}
            direction="row"
            sx={{ flexWrap: "wrap", gap: 0 }}
            spacing={0}
          >
            {props.items.map((item) => (
              <TierItem item={item} isActive={item.id === props.activeId} />
            ))}
          </List>
        </div>
      </SortableContext>
    </div>
  );
};

const Tierlist: React.FC<{
  title: string;
  tiers: Tier[];
  activeId: UniqueIdentifier | null;
}> = (props) => {
  return (
    <div id="tierlist-pane">
      <h2>{props.title}</h2>
      <div id="tierlist">
        {props.tiers.map((tier) => (
          <TierContainer
            id={tier.id}
            title={tier.title}
            items={tier.items}
            activeId={props.activeId}
          />
        ))}
      </div>{" "}
    </div>
  );
};

export default Tierlist;
