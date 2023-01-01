import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";

const DialogDeleteTier: React.FC<{
  open: boolean;
  id: string;
  onClose: (agree: boolean, tierId: string) => void;
}> = (props) => {
  return (
    <Dialog open={props.open} keepMounted>
      <DialogContent>
        <DialogContentText>Delete this tier?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onClose(false, props.id)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => props.onClose(true, props.id)}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogDeleteTier;
