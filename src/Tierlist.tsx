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
  EditOutlined,
  MoveDownOutlined,
  MoveUpOutlined,
} from "@mui/icons-material";
import { Button, IconButton, List, ListItem, Stack } from "@mui/material";
import { useState } from "react";
import DialogDeleteItem from "./DialogDeleteItem";
import DialogDeleteTier from "./DialogDeleteTier";
import DialogEdit from "./DialogEdit";
import { fileSrc } from "./FileSrcUtil";
import { useItemDeletion, useItemEdit } from "./ItemUpdate";
import "./Tierlist.css";
import { Item, Tier } from "./TierlistData";

const TierItem: React.FC<{
  item: Item;
  isActive: boolean;
  onEditButtonClick: (item: Item) => void;
  onDeleteButtonClick: (item: Item) => void;
}> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.item.id, transition: null });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: props.isActive ? 0.33 : 1.0,
  };

  const [isHovering, setIsHovering] = useState(false);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ListItem
        disablePadding
        onMouseOver={() => setIsHovering(true)}
        onMouseOut={() => setIsHovering(false)}
      >
        <img
          src={`${fileSrc(props.item.thumb ?? "")}`}
          width="80px"
          alt={props.item.name}
          loading="lazy"
        />
        {isHovering ? (
          <IconButton
            sx={{ position: "absolute", right: 0, top: 0 }}
            data-no-dnd
            onClick={() => props.onDeleteButtonClick(props.item)}
          >
            <DeleteOutlined color="primary" />
          </IconButton>
        ) : null}
        {isHovering ? (
          <IconButton
            sx={{ position: "absolute", right: 0, bottom: 0 }}
            data-no-dnd
            onClick={() => props.onEditButtonClick(props.item)}
          >
            <EditOutlined color="primary" />
          </IconButton>
        ) : null}
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
  onEditButtonClick: (item: Item) => void;
  onDeleteButtonClick: (item: Item) => void;
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
                onEditButtonClick={props.onEditButtonClick}
                onDeleteButtonClick={props.onDeleteButtonClick}
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
  onDeleteItem: (id: number) => void;
  onEditItem: (item: Item) => void;
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

  const {
    itemToDelete,
    deleteItemDialogOpen,
    handleItemDeleteButtonClick,
    handleDeleteDialogClose,
  } = useItemDeletion(props.onDeleteItem);

  const {
    itemToEdit,
    editDialogOpen,
    handleItemEditButtonClick,
    handleEditDialogClose,
  } = useItemEdit(props.onEditItem);

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
            onEditButtonClick={handleItemEditButtonClick}
            onDeleteButtonClick={handleItemDeleteButtonClick}
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
      <DialogDeleteItem
        open={deleteItemDialogOpen}
        item={itemToDelete!}
        onClose={handleDeleteDialogClose}
      />
      <DialogEdit
        open={editDialogOpen}
        item={itemToEdit}
        onClose={handleEditDialogClose}
      />
    </div>
  );
};

export default Tierlist;
