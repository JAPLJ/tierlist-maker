# tierlist-maker

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## ビルド・開発方法

必要なもの:

* Rust のツールチェイン
* Node.js, yarn
* WebView

↑詳細は [Tauri の Guide](https://tauri.app/v1/guides/getting-started/prerequisites) を参照。

```
$ yarn
```

で Javascript 側のパッケージをダウンロード。

```
$ yarn tauri dev
```

でビルドされて開発モードで起動。Rust 側と Typescript 側どちらもホットリロードに対応している (初回は Rust の crate をダウンロード・コンパイルするので時間がかかる)。
