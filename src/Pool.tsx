import { UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import {
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import Highlighter from "react-highlight-words";
import DialogAddNew from "./DialogAddNew";
import "./Pool.css";
import { Item, ItemData } from "./TierlistData";

const PoolItem: React.FC<{
  item: Item;
  isActive: boolean;
  highlight: string;
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
        <ListItemText>
          <Highlighter
            highlightClassName="highlight"
            highlightTag="span"
            searchWords={props.highlight === "" ? [] : [props.highlight]}
            autoEscape={true}
            textToHighlight={props.item.name}
          />
        </ListItemText>
      </ListItemButton>
    </div>
  );
};

const Pool: React.FC<{
  items: Item[];
  activeId: UniqueIdentifier | null;
  onAddNewItem: (item: Item) => void;
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

  // TODO: call add_new_item command
  const [tmpNewItemId, setTmpNewItemId] = useState(1000);
  const handleAddNewDialogClose = (itemData: ItemData) => {
    props.onAddNewItem(
      new Item(tmpNewItemId, itemData.name, itemData.url, itemData.thumb)
    );
    setTmpNewItemId((prev) => prev + 1);
    setAddNewDialogOpen(false);
  };

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
              item={item}
              isActive={item.id === props.activeId}
              highlight={searchText.trim()}
            />
          ))}
        </List>
      </SortableContext>
    </div>
  );
};

export default Pool;
