import { convertFileSrc } from "@tauri-apps/api/tauri";

export function fileSrc(path: string): string {
  return convertFileSrc(path);
}
