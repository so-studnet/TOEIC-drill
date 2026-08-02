# TOEIC-drill

TOEICリーディング(Part5〜7)の問題を演習できる個人学習用Webアプリです。

要件定義から詳細設計までの経緯は [docs/](docs/) を参照してください。

- [01_requirements.md](docs/01_requirements.md) - 要件定義書
- [02_basic_design.md](docs/02_basic_design.md) - 基本設計書
- [03_detailed_design.md](docs/03_detailed_design.md) - 詳細設計書
- [04_deployment.md](docs/04_deployment.md) - デプロイ

## 主な機能

- Part別・ランダム出題、続きから再開
- 1問1答形式での解答・正誤判定・解説表示
- 誤答の自動ブックマークと復習モード
- 問題データのCSVアップロード・一覧編集・削除

## 技術スタック

Next.js(App Router) / TypeScript / Firebase Realtime Database / Tailwind CSS

## セットアップ

```bash
npm install
cp .env.example .env  # FIREBASE_DATABASE_URLを自分のRealtime DatabaseのURLに書き換える
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いてください。

## 問題データの登録

「問題データ管理」画面からCSVファイルをアップロードします。列構成は [docs/03_detailed_design.md](docs/03_detailed_design.md) の「1. 問題データCSVファイル仕様」を参照してください。
