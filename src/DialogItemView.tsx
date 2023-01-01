import {
  Box,
  Button,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";
import { Radio, TailSpin } from "react-loader-spinner";
import { fileSrc } from "./FileSrcUtil";
import { ItemData } from "./TierlistData";

const DialogItemView: React.FC<{
  itemData: ItemData | null;
  onChange: (itemData: ItemData) => void;
}> = (props) => {
  const curData = props.itemData ?? { name: "", url: "", thumb: "" };
  const { name: productName, url: amazonUrl, thumb: imagePath } = curData;

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
    props.onChange({ ...curData, name: title, thumb: imgPath });
  }

  return (
    <DialogContent dividers>
      <Stack spacing={2}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TextField
            fullWidth
            variant="standard"
            label="Amazon URL"
            value={amazonUrl}
            onChange={(e) =>
              props.onChange({ ...curData, url: e.target.value })
            }
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
          onChange={(e) => props.onChange({ ...curData, name: e.target.value })}
        />
        <Typography variant="h6">Front Image</Typography>
        {imagePath?.trim() === "" || nowLoading ? (
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
              src={fileSrc(imagePath!)}
              sx={{ width: 244 }}
            ></Box>
          </Box>
        )}
      </Stack>
    </DialogContent>
  );
};

export default DialogItemView;
