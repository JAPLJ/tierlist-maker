import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";
import { Radio, TailSpin } from "react-loader-spinner";
import { ItemData } from "./TierlistData";

const DialogAddNew: React.FC<{
  open: boolean;
  onClose: (itemData: ItemData | null) => void;
}> = (props) => {
  const clearForm = () => {
    setAmazonUrl("");
    setProductName("");
    setImagePath("");
  };
  const handleCancel = () => {
    clearForm();
    props.onClose(null);
  };
  const handleOk = () => {
    clearForm();
    props.onClose({ url: amazonUrl, name: productName, thumb: imagePath });
  };

  const [amazonUrl, setAmazonUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [nowLoading, setNowLoading] = useState(false);
  const [successfullyLoaded, setSuccessfullyLoaded] = useState(false);

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
    setSuccessfullyLoaded(imgPath !== "");
  }

  return (
    <Dialog open={props.open} keepMounted fullWidth maxWidth="md">
      <DialogTitle>Add New Item</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              {nowLoading ? (
                <Radio
                  colors={["#8C5E58", "#2B061E", "#361134"]}
                  width="32"
                  height="32"
                />
              ) : (
                "Scrape"
              )}
            </Button>
          </div>
          <TextField
            fullWidth
            variant="standard"
            label="Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <Typography variant="h6">Front Image</Typography>
          {imagePath.trim() === "" || nowLoading ? (
            <Box display="flex" justifyContent="center">
              {nowLoading ? (
                <TailSpin />
              ) : (
                <Typography align="center" variant="body1">
                  No Image
                </Typography>
              )}
            </Box>
          ) : (
            <Box display="flex" justifyContent="center">
              <Box
                component="img"
                src={convertFileSrc(imagePath)}
                sx={{ width: 244 }}
              ></Box>
            </Box>
          )}
        </Stack>
      </DialogContent>
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
