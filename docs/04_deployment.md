# TOEIC-drill デプロイ(Render)

- 文書ステータス: 確定
- 作成日: 2026-08-01

## 1. 方針

Renderの無料Web Serviceにデプロイする。新規の外部サービスアカウント登録([Prisma Postgres](https://console.prisma.io)や[Neon](https://neon.tech)等)は行わず、既存のSQLite構成のまま乗せる。

## 2. 制約と割り切り

Renderの無料Web Serviceには永続ディスクがない。一定時間アクセスがないとコンテナが停止し、次回アクセス時に新しいコンテナとして起動し直されるため、**その間に実行時に書き込まれたデータ(解答履歴・ブックマーク)は消える**。

この制約を受け入れ、以下の方針とした。

- 問題データ(30問)は`prisma/seed.db`としてリポジトリにコミットし、コンテナ起動のたびに複製して使う([scripts/render-seed.js](../scripts/render-seed.js))
- Render上での解答履歴・ブックマークは長期間の保持を保証しない
- 本格的な学習記録の蓄積は、これまで通りローカル環境(本番ビルド `npm run build && npm run start`)で行う

## 3. 起動時の仕組み

`package.json`の`start`スクリプトを`node scripts/render-seed.js && next start`に変更した。

- `scripts/render-seed.js`は環境変数`RENDER`が設定されている場合のみ動作し、`prisma/seed.db`を`DATABASE_URL`が指すパスに複製する
- `RENDER`はRenderのコンテナ環境で自動的に設定される変数のため、ローカル実行(`npm run dev` / `npm start`)では何もせずスキップされ、ローカルのDBには影響しない

## 4. Renderの「New Web Service」設定値

| 項目 | 値 |
|---|---|
| Source | このGitHubリポジトリ(`so-studnet/TOEIC-drill`) |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |
| 永続ディスク(Disk) | 追加しない |
| 環境変数 `DATABASE_URL` | `file:./dev.db` |

## 5. 今後データを永続化したくなった場合

将来的に本格的にRender上でも学習記録を残したくなった場合は、外部の無料Postgres(Prisma PostgresやNeonなど)への移行を検討する。その際はPrismaのdatasourceを`postgresql`に変更し、ドライバアダプタを`@prisma/adapter-pg`等に切り替える必要がある。
