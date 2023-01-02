import { UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DeleteOutlined, EditOutlined } from "@mui/icons-material";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import {
  Avatar,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import Highlighter from "react-highlight-words";
import DialogAddNew from "./DialogAddNew";
import DialogDeleteItem from "./DialogDeleteItem";
import DialogEdit from "./DialogEdit";
import { fileSrc } from "./FileSrcUtil";
import { useItemDeletion, useItemEdit } from "./ItemUpdate";
import "./Pool.css";
import { Item, ItemData } from "./TierlistData";

const PoolItem: React.FC<{
  item: Item;
  isActive: boolean;
  highlight: string;
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

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ListItemButton>
        {props.item.thumb ? (
          <ListItemAvatar>
            <Avatar variant="square" src={fileSrc(props.item.thumb)} alt="p" />
          </ListItemAvatar>
        ) : null}
        <ListItemText>
          <Highlighter
            highlightClassName="highlight"
            highlightTag="span"
            searchWords={props.highlight === "" ? [] : [props.highlight]}
            autoEscape={true}
            textToHighlight={props.item.name}
          />
        </ListItemText>
        <IconButton
          sx={{ position: "aboslute", right: 0, top: 0 }}
          data-no-dnd
          onClick={() => props.onEditButtonClick(props.item)}
        >
          <EditOutlined color="primary" />
        </IconButton>
        <IconButton
          sx={{ position: "aboslute", right: 0, top: 0 }}
          data-no-dnd
          onClick={() => props.onDeleteButtonClick(props.item)}
        >
          <DeleteOutlined color="primary" />
        </IconButton>
      </ListItemButton>
    </div>
  );
};

const Pool: React.FC<{
  items: Item[];
  activeId: UniqueIdentifier | null;
  onAddNewItem: (itemData: ItemData) => void;
  onDeleteItem: (id: number) => void;
  onEditItem: (item: Item) => void;
}> = (props) => {
  const { setNodeRef } = useDroppable({ id: "pool" });

  const [searchText, setSearchText] = useState("");
  const [filteredItems, setFilteredItems] = useState(props.items);

  useEffect(() => {
    const keyword = searchText.trim();
    if (keyword === "") {
      setFilteredItems(props.items);
    } else {
      setFilteredItems(
        props.items.filter((it) => it.name.indexOf(keyword) !== -1)
      );
    }
  }, [searchText, props.items]);

  const [addNewDialogOpen, setAddNewDialogOpen] = useState(false);
  const handleClickAddButton = () => {
    setAddNewDialogOpen(true);
  };

  const handleAddNewDialogClose = (itemData: ItemData | null) => {
    if (itemData) {
      props.onAddNewItem(itemData);
    }
    setAddNewDialogOpen(false);
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
    <div ref={setNodeRef} id="pool">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconButton color="primary" onClick={handleClickAddButton}>
          <AddCircleOutlineOutlinedIcon sx={{ fontSize: 32 }} />
        </IconButton>
        <TextField
          id="pool-search-field"
          label="Filter"
          variant="standard"
          fullWidth
          onChange={(e) => setSearchText(e.target.value)}
        />
        <DialogAddNew
          open={addNewDialogOpen}
          onClose={handleAddNewDialogClose}
        />
      </div>
      <SortableContext
        id="pool"
        items={props.items}
        strategy={rectSortingStrategy}
      >
        <List>
          {filteredItems.map((item) => (
            <PoolItem
              key={item.id}
              item={item}
              isActive={item.id === props.activeId}
              highlight={searchText.trim()}
              onEditButtonClick={handleItemEditButtonClick}
              onDeleteButtonClick={handleItemDeleteButtonClick}
            />
          ))}
        </List>
      </SortableContext>
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

export default Pool;
