# TOEIC-drill デプロイ(Firebase App Hosting + Realtime Database)

- 文書ステータス: 確定
- 作成日: 2026-08-01
- 更新日: 2026-08-02(データベースをSQLite+seed復元方式からFirebase Realtime Databaseに変更。これによりホスト環境のステートレス問題が解消された)

## 1. 方針

Firebase App Hostingにデプロイし、データベースは既存のFirebaseアカウントで作成したRealtime Database(`https://toeic-drill-default-rtdb.asia-southeast1.firebasedatabase.app/`)を使う。新規の外部サービスアカウント登録は行わない。

Firebase App HostingはCloud Build上でビルドし、Cloud Run上で実行される。GitHubリポジトリと連携し、`main`ブランチへのpushで自動デプロイされる。

## 2. データ永続化について

Firebase App Hosting(Cloud Run)自体のファイルシステムはステートレスで、インスタンスの再起動のたびにリセットされる。しかし本アプリのデータはローカルファイルではなく**外部のFirebase Realtime Databaseに保存される**ため、この制約の影響を受けない。**解答履歴・ブックマークもRender/旧SQLite構成時とは異なり、恒久的に保持される。**

（過去の経緯: 当初はRender、次にFirebase App Hosting上でSQLiteファイルを使う設計だったが、いずれも無料枠のホスト環境に永続ディスクがなく、再起動のたびにデータが消える制約があった。Realtime Databaseへの移行によりこの問題は解消された。）

## 3. セキュリティルール

個人利用のシングルユーザーアプリのため、認証機構(サービスアカウント等)は導入せず、Realtime Databaseのセキュリティルールを全公開にしている。

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Firebase Console → 対象プロジェクト → Realtime Database → Rulesタブ で設定・確認できる。URLを知っている第三者が理論上読み書き可能な点は許容している(問題データと解答の正誤以外の機微情報は扱わない)。

## 4. `apphosting.yaml`

リポジトリ直下の[apphosting.yaml](../apphosting.yaml)でビルド・起動コマンドと環境変数を定義している。

```yaml
runConfig:
  minInstances: 0
  maxInstances: 1

scripts:
  buildCommand: npm install && npm run build
  runCommand: npm start

env:
  - variable: FIREBASE_DATABASE_URL
    value: https://toeic-drill-default-rtdb.asia-southeast1.firebasedatabase.app/
    availability: [RUNTIME]
```

## 5. Firebaseコンソールでのセットアップ手順

1. [Firebase console](https://console.firebase.google.com/)で対象プロジェクトを開く
2. 「Hosting」→「App Hosting」からバックエンドを新規作成
3. GitHubリポジトリ `so-studnet/TOEIC-drill` を連携・選択
4. ライブブランチを `main` に設定
5. リポジトリ直下の`apphosting.yaml`が自動的に読み込まれる
6. デプロイ完了後に発行されるURLで動作確認する

## 6. 既存データの移行

移行時点でローカルのSQLiteに保存されていた問題30問・解答履歴15件・ブックマーク1件は、一度JSONにエクスポートしてRealtime Databaseに投入した。ブックマークについては移行作業中の動作確認で件数を復元しきれず、1件分の「復習フラグ」情報のみ失われている(問題データ自体への影響はない)。
