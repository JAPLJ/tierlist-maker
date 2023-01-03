import { Button, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import DialogItemView from "./DialogItemView";
import { ItemData } from "./TierlistData";

const DialogAddNew: React.FC<{
  open: boolean;
  onClose: (itemData: ItemData | null) => void;
}> = (props) => {
  const clearForm = () => {
    setAmazonUrl("");
    setProductName("");
    setImagePath("");
    setItemMemo("");
  };
  const handleCancel = () => {
    clearForm();
    props.onClose(null);
  };
  const handleOk = () => {
    clearForm();
    props.onClose({
      url: amazonUrl,
      name: productName,
      thumb: imagePath,
      memo: itemMemo,
    });
  };

  const onChange = (itemData: ItemData) => {
    setAmazonUrl(itemData.url);
    setProductName(itemData.name);
    setImagePath(itemData.thumb ?? "");
    setItemMemo(itemData.memo);
    setSuccessfullyLoaded(itemData.thumb !== null && itemData.thumb !== "");
  };

  const [amazonUrl, setAmazonUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [itemMemo, setItemMemo] = useState("");
  const [successfullyLoaded, setSuccessfullyLoaded] = useState(false);

  return (
    <Dialog open={props.open} keepMounted fullWidth maxWidth="md">
      <DialogTitle>Add New Item</DialogTitle>
      <DialogItemView
        itemData={{
          name: productName,
          url: amazonUrl,
          thumb: imagePath,
          memo: itemMemo,
        }}
        onChange={onChange}
      />
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleOk}
          disabled={!successfullyLoaded}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogAddNew;
