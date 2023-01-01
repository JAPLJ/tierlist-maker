import { UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AddCircleOutline,
  DeleteOutlined,
  MoveDownOutlined,
  MoveUpOutlined,
} from "@mui/icons-material";
import { Button, IconButton, List, ListItem, Stack } from "@mui/material";
import { useState } from "react";
import DialogDeleteTier from "./DialogDeleteTier";
import { fileSrc } from "./FileSrcUtil";
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
      <ListItem disablePadding>
        <img
          src={`${fileSrc(props.item.thumb ?? "")}`}
          width="80px"
          alt={props.item.name}
          loading="lazy"
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
  onTierMove: (id: string, direction: "up" | "down") => void;
  onTierDelete: (id: string) => void;
}> = (props) => {
  const { setNodeRef } = useDroppable({ id: props.id });

  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="tier-container">
      <div
        className="tier-title-box"
        onMouseOver={() => setIsHovering(true)}
        onMouseOut={() => setIsHovering(false)}
      >
        <span className="tier-title">{props.title}</span>
        {isHovering ? (
          <IconButton
            sx={{ position: "absolute", top: 0, left: 0 }}
            onClick={() => props.onTierMove(props.id, "up")}
          >
            <MoveUpOutlined color="primary" />
          </IconButton>
        ) : null}
        {isHovering ? (
          <IconButton
            sx={{ position: "absolute", bottom: 0, left: 0 }}
            onClick={() => props.onTierMove(props.id, "down")}
          >
            <MoveDownOutlined color="primary" />
          </IconButton>
        ) : null}
        {isHovering ? (
          <IconButton
            sx={{ position: "absolute", top: 0, right: 0 }}
            onClick={() => props.onTierDelete(props.id)}
          >
            <DeleteOutlined color="primary" />
          </IconButton>
        ) : null}
      </div>
      <SortableContext
        id={props.id}
        items={props.items}
        strategy={rectSortingStrategy}
      >
        <div ref={setNodeRef} style={{ width: "100%" }}>
          <List
            disablePadding
            component={Stack}
            direction="row"
            sx={{ flexWrap: "wrap", gap: 0 }}
            spacing={0}
          >
            {props.items.map((item) => (
              <TierItem
                item={item}
                key={`in_t_${item.id}`}
                isActive={item.id === props.activeId}
              />
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
  onTierMove: (id: string, direction: "up" | "down") => void;
  onTierAdd: () => void;
  onTierDelete: (id: string) => void;
}> = (props) => {
  const [deleteTierDialogOpen, setDeleteTierDialogOpen] = useState(false);
  const [tierIdToDelete, setTierIdToDelete] = useState("");

  const openDeleteTierDialog = (id: string) => {
    setTierIdToDelete(id);
    setDeleteTierDialogOpen(true);
  };
  const handleDeleteTierDialogClose = (agree: boolean, tierId: string) => {
    if (agree) {
      props.onTierDelete(tierId);
    }
    setDeleteTierDialogOpen(false);
  };

  return (
    <div id="tierlist-pane">
      <h2>{props.title}</h2>
      <div id="tierlist">
        {props.tiers.map((tier) => (
          <TierContainer
            id={tier.id}
            key={tier.id}
            title={tier.title}
            items={tier.items}
            activeId={props.activeId}
            onTierMove={props.onTierMove}
            onTierDelete={(id) => openDeleteTierDialog(id)}
          />
        ))}
      </div>
      <Button
        variant="outlined"
        startIcon={<AddCircleOutline />}
        onClick={() => props.onTierAdd()}
      >
        Add Tier
      </Button>
      <DialogDeleteTier
        open={deleteTierDialogOpen}
        id={tierIdToDelete}
        onClose={handleDeleteTierDialogClose}
      />
    </div>
  );
};

export default Tierlist;
