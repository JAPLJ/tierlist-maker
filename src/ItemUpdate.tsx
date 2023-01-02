import { useState } from "react";
import { Item } from "./TierlistData";

export function useItemDeletion(onDeleteItem: (id: number) => void) {
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const handleItemDeleteButtonClick = (item: Item) => {
    setItemToDelete(item);
    setDeleteItemDialogOpen(true);
  };
  const handleDeleteDialogClose = (agree: boolean, item: Item) => {
    if (agree) {
      onDeleteItem(item.id);
    }
    setDeleteItemDialogOpen(false);
  };
  return {
    itemToDelete,
    deleteItemDialogOpen,
    handleItemDeleteButtonClick,
    handleDeleteDialogClose,
  };
}

export function useItemEdit(onEditItem: (item: Item) => void) {
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const handleItemEditButtonClick = (item: Item) => {
    setItemToEdit(item);
    setEditDialogOpen(true);
  };
  const handleEditDialogClose = (update: boolean, item: Item) => {
    if (update) {
      onEditItem(item);
    }
    setEditDialogOpen(false);
  };
  return {
    itemToEdit,
    editDialogOpen,
    handleItemEditButtonClick,
    handleEditDialogClose,
  };
}
