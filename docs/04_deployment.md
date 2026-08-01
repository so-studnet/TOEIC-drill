# TOEIC-drill デプロイ(Firebase App Hosting)

- 文書ステータス: 確定
- 作成日: 2026-08-01
- 更新日: 2026-08-01(デプロイ先をRenderからFirebase App Hostingに変更。既存のFirebaseアカウントを利用するため)

## 1. 方針

Firebase App Hostingにデプロイする。新規の外部サービスアカウント登録([Prisma Postgres](https://console.prisma.io)や[Neon](https://neon.tech)等)は行わず、既存のSQLite構成のまま乗せる。

Firebase App HostingはCloud Build上でビルドし、Cloud Run上で実行される。GitHubリポジトリと連携し、`main`ブランチへのpushで自動デプロイされる。

## 2. 制約と割り切り

Firebase App Hosting(Cloud Run)にはRenderの無料枠同様に永続ディスクがない。インスタンスはステートレスで、スケールイン(0台になる)・再起動のたびにファイルシステムがビルド時点の状態にリセットされるため、**その間に実行時に書き込まれたデータ(解答履歴・ブックマーク)は消える**。

この制約を受け入れ、以下の方針とした。

- 問題データ(30問)は`prisma/seed.db`としてリポジトリにコミットし、インスタンス起動のたびに複製して使う([scripts/seed-on-boot.js](../scripts/seed-on-boot.js))
- Firebase App Hosting上での解答履歴・ブックマークは長期間の保持を保証しない
- 本格的な学習記録の蓄積は、これまで通りローカル環境(本番ビルド `npm run build && npm run start`)で行う

## 3. 起動時の仕組み

`package.json`の`start`スクリプトを`node scripts/seed-on-boot.js && next start`に変更した。

- `scripts/seed-on-boot.js`は環境変数`SEED_ON_BOOT=true`が設定されている場合のみ動作し、`prisma/seed.db`を`DATABASE_URL`が指すパスに複製する
- `SEED_ON_BOOT`は`apphosting.yaml`で明示的に設定する変数のため、ローカル実行(`npm run dev` / `npm start`)では何もせずスキップされ、ローカルのDBには影響しない

## 4. `apphosting.yaml`

リポジトリ直下の[apphosting.yaml](../apphosting.yaml)でビルド・起動コマンドと環境変数を定義している。

```yaml
runConfig:
  minInstances: 0
  maxInstances: 1

scripts:
  buildCommand: npm install && npx prisma generate && npm run build
  runCommand: npm start

env:
  - variable: DATABASE_URL
    value: file:./dev.db
    availability: [RUNTIME]
  - variable: SEED_ON_BOOT
    value: "true"
    availability: [RUNTIME]
```

## 5. Firebaseコンソールでのセットアップ手順

1. [Firebase console](https://console.firebase.google.com/)で対象プロジェクトを開く(なければ新規作成)
2. 「Hosting」→「App Hosting」からバックエンドを新規作成
3. GitHubリポジトリ `so-studnet/TOEIC-drill` を連携・選択
4. ライブブランチを `main` に設定
5. リポジトリ直下の`apphosting.yaml`が自動的に読み込まれる
6. デプロイ完了後に発行されるURL(`https://<バックエンド名>--<プロジェクトID>.web.app` 等)で動作確認する

## 6. 今後データを永続化したくなった場合

将来的に本格的にFirebase App Hosting上でも学習記録を残したくなった場合は、外部の無料Postgres(Prisma PostgresやNeonなど)、あるいはFirestore等への移行を検討する。Postgres系に移行する場合はPrismaのdatasourceを`postgresql`に変更し、ドライバアダプタを`@prisma/adapter-pg`等に切り替える必要がある。Firestoreに移行する場合はPrisma自体を使わず、データアクセス層を書き換える大掛かりな変更になる。
