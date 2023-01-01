import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";
import { Item } from "./TierlistData";

const DialogDeleteItem: React.FC<{
  open: boolean;
  item: Item;
  onClose: (agree: boolean, item: Item) => void;
}> = (props) => {
  return (
    <Dialog open={props.open} keepMounted>
      <DialogContent>
        <DialogContentText>Delete this item?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onClose(false, props.item)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => props.onClose(true, props.item)}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogDeleteItem;
