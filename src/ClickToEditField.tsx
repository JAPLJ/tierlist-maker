import { TextField } from "@mui/material";
import { ReactNode, useState } from "react";

const ClickToEditField: React.FC<{
  text: string;
  renderText: (text: string) => ReactNode;
  onChange: (text: string) => void;
}> = (props) => {
  const [edit, setEdit] = useState(false);
  return edit ? (
    <TextField
      variant="standard"
      defaultValue={props.text}
      onBlur={(e) => {
        props.onChange(e.target.value);
        setEdit(false);
      }}
    />
  ) : (
    <span onClick={() => setEdit(true)}>{props.renderText(props.text)}</span>
  );
};

export default ClickToEditField;
