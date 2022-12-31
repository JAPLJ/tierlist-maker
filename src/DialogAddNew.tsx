import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";
import { ItemData } from "./TierlistData";

const DialogAddNew: React.FC<{
  open: boolean;
  onClose: (itemData: ItemData) => void;
}> = (props) => {
  const handleOk = () => {
    setAmazonUrl("");
    setProductName("");
    setImagePath("");
    props.onClose({ url: amazonUrl, name: productName, thumb: imagePath });
  };

  const [amazonUrl, setAmazonUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [nowLoading, setNowLoading] = useState(false);

  async function getProductInfo(amazonUrl: string) {
    setNowLoading(true);
    const [imgPath, title] = await invoke<string[]>("scrape_amazon", {
      amazonUrl,
    }).catch((e) => {
      console.log(e);
      // TODO: Error Notification
      return ["", ""];
    });
    setNowLoading(false);
    setProductName(title);
    setImagePath(imgPath);
  }

  return (
    <Dialog open={props.open} keepMounted>
      <DialogTitle>Add New Item</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <TextField
              fullWidth
              variant="standard"
              label="Amazon URL"
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={() => getProductInfo(amazonUrl)}
              disabled={nowLoading}
            >
              {nowLoading ? "LOADING" : "GET"}
            </Button>
          </div>
          <TextField
            fullWidth
            variant="standard"
            label="Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleOk}>Add</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogAddNew;
