import { Button, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useEffect, useState } from "react";
import DialogItemView from "./DialogItemView";
import { Item, ItemData } from "./TierlistData";

const DialogEdit: React.FC<{
  open: boolean;
  item: Item | null;
  onClose: (update: boolean, item: Item) => void;
}> = (props) => {
  const handleCancel = () => {
    props.onClose(false, props.item!);
  };
  const handleOk = () => {
    props.onClose(true, {
      id: props.item!.id,
      url: amazonUrl,
      name: productName,
      thumb: imagePath,
    });
  };

  const onChange = (itemData: ItemData) => {
    setAmazonUrl(itemData.url);
    setProductName(itemData.name);
    setImagePath(itemData.thumb ?? "");
    setSuccessfullyLoaded(itemData.thumb !== null && itemData.thumb !== "");
  };

  const [amazonUrl, setAmazonUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [successfullyLoaded, setSuccessfullyLoaded] = useState(false);

  useEffect(() => {
    onChange(props.item ?? { url: "", name: "", thumb: "" });
  }, [props.item]);

  return (
    <Dialog open={props.open} keepMounted fullWidth maxWidth="md">
      <DialogTitle>Edit Item</DialogTitle>
      <DialogItemView
        itemData={{ name: productName, url: amazonUrl, thumb: imagePath }}
        onChange={onChange}
      />
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleOk}
          disabled={!successfullyLoaded}
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogEdit;
