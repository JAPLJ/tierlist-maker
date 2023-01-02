import { convertFileSrc } from "@tauri-apps/api/tauri";

export function fileSrc(path: string): string {
  if (path.startsWith("/tmp")) {
    return convertFileSrc(path);
  } else {
    // for testing purpose
    return convertFileSrc(path);
  }
}
