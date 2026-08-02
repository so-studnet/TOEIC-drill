# TOEIC-drill 詳細設計書(内部設計)

- 文書ステータス: 確定
- 作成日: 2026-07-31
- 更新日: 2026-08-02(データベース設計をPrisma+SQLiteからFirebase Realtime Databaseに全面変更)
- 前提: [01_requirements.md](./01_requirements.md) / [02_basic_design.md](./02_basic_design.md) の内容に基づく

## 1. 問題データCSVファイル仕様

### 1.1 基本仕様

| 項目 | 内容 |
|---|---|
| 拡張子 | `.csv` |
| 文字コード | UTF-8(BOM付き・BOMなし両方許容。ExcelはBOM付きで保存されることが多い) |
| 区切り文字 | カンマ(`,`) |
| 改行・カンマを含む値 | ダブルクォート `"` で囲む(標準CSVエスケープ) |
| ヘッダー行 | 必須(1行目は列名) |
| 問題ID | ファイルには含めない。アップロード時にシステムが自動採番する |

### 1.2 列(カラム)定義

| 列名 | 必須 | 内容 | 例 |
|---|---|---|---|
| `part` | ○ | Part番号。`5` / `6` / `7` のいずれか | `5` |
| `passage_id` | Part6/7のみ | 長文を共有する設問に同じ値を入れる。Part5は空欄。同じ長文内で一意であればよい(例: `p1`, `p2`...重複しなければ形式自由) | `p1` |
| `passage_text` | Part6/7のみ | 長文本文。同じ`passage_id`の行にはすべて同じ内容を入力する(繰り返し入力) | `Dear Mr. Smith, ...` |
| `question_text` | ○ | 設問文 | `What is the purpose of the letter?` |
| `choice_a` | ○ | 選択肢A | `To request a refund` |
| `choice_b` | ○ | 選択肢B | |
| `choice_c` | ○ | 選択肢C | |
| `choice_d` | ○ | 選択肢D | |
| `correct_answer` | ○ | 正解。`A`/`B`/`C`/`D`のいずれか(大文字) | `B` |
| `explanation` | 任意 | 解説。空欄可 | `本文2文目に...とあるため正解はB` |

### 1.3 サンプル(Part5・Part7混在の例)

```csv
part,passage_id,passage_text,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation
5,,,"The manager asked staff to ------ the new policy immediately.","follow","following","followed","follows",A,"命令文の動詞の後は原形が入るためA"
7,p1,"Dear Mr. Smith, Thank you for your inquiry about our new product line...","What is the main purpose of this letter?","To confirm an order","To respond to an inquiry","To apologize for a delay","To request payment",B,
7,p1,"Dear Mr. Smith, Thank you for your inquiry about our new product line...","What will Mr. Smith probably receive next week?","A refund","A catalog","An invoice","A discount coupon",B,
```

### 1.4 アップロード時のバリデーションルール

1. ヘッダー行の列名が仕様通りであること(過不足があればエラー)
2. `part` は `5`/`6`/`7` のいずれかであること
3. `question_text`・`choice_a`〜`choice_d`・`correct_answer` が空でないこと
4. `correct_answer` は `A`/`B`/`C`/`D` のいずれかであること
5. `part` が `6` または `7` の場合、`passage_id` と `passage_text` が空でないこと
6. 同じ `passage_id` を持つ行同士は `passage_text` が一致していること(不一致の場合はエラーとし、行番号を提示する)
7. ファイル内に1件でもエラー行があった場合、ファイル全体を登録しない(1行も登録せず、全件ロールバックする)。画面にはエラーがあった行番号と理由を一覧表示し、ユーザーがファイルを修正して再アップロードする

## 2. データベース設計(Firebase Realtime Database)

Realtime DatabaseはJSONツリー1本の構造で、テーブル間の外部キー制約やトランザクション境界はPrismaのようには存在しない。ルート直下に4つのコレクション(トップレベルキー)を持つ。

### 2.1 キー構造

```
/passages/{passageId}
  part: number
  text: string

/questions/{questionId}
  part: number                       // 5 | 6 | 7
  passageId: string | null           // Part6/7のみ。/passages/{passageId} への参照
  questionText: string
  choiceA: string
  choiceB: string
  choiceC: string
  choiceD: string
  correctAnswer: "A" | "B" | "C" | "D"
  explanation: string | null
  createdAt: number                  // epoch ms

/bookmarks/{questionId}              // キー自体が問題IDなので1問1件に自然と一意化される
  createdAt: number

/sessions/{sessionId}
  mode: "normal" | "bookmark_review"
  selectedParts: number[]
  questionOrder: string[]            // 出題順の問題ID配列(ネイティブ配列。JSON文字列化は不要)
  currentIndex: number
  status: "in_progress" | "completed" | "abandoned"
  createdAt: number
  updatedAt: number

/answerLogs/{logId}
  questionId: string
  sessionId: string | null
  isCorrect: boolean
  answeredAt: number
```

- 各`{xxxId}`はFirebaseの`push()`が生成する一意キー(時系列でソート可能)
- `Passage`はPart6/7で複数の`Question`が共有するため独立コレクションとして残す。Part5の`Question`は`passageId: null`
- `Bookmark`はProduction上「不正解になった問題」を表す。復習セッションで正解すると該当キーを削除する。キーを`questionId`そのものにしているため「1問につき最大1ブックマーク」が自然に保証される
- `questionOrder`・`selectedParts`はPrisma版ではJSON文字列としてTEXT列に保存していたが、RTDBはネイティブに配列を保存できるため文字列化・パースが不要になった

### 2.2 集計・絞り込みの方針

RTDBには`GROUP BY`や`JOIN`に相当する機能がなく、複雑なインデックスクエリも個人利用規模(問題数百件程度)では不要と判断し、**該当コレクションを丸ごと取得してアプリ側(Node.js)で集計・フィルタする**方針とする(`src/lib/questions.ts`・`src/lib/stats.ts`)。

- Part別問題数・出題対象の絞り込み: `/questions`を全件取得し`part`でフィルタ
- ダッシュボード集計: `/answerLogs`・`/bookmarks`を全件取得し件数・正答率を計算
- カスケード削除(問題削除時の関連ブックマーク・解答履歴・孤立した長文の削除): 削除対象を洗い出した上で、複数パスをまとめた1回の`update()`呼び出しで原子的に反映する(Firebase RTDBの複数パス更新はアトミック)

### 2.3 認証・アクセス制御

サーバー側(Server Actions/Server Components)からFirebase JS SDKで直接読み書きする。セキュリティルールは以下の通り全公開とし、サービスアカウント等の認証情報は使わない(個人利用アプリのため)。

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 3. 問題データの編集・削除仕様

### 3.1 編集(S-08 問題編集画面)
- `Question`の全項目(`part`・`questionText`・`choiceA`〜`choiceD`・`correctAnswer`・`explanation`)を編集可能とする
- `passageText`(長文)を編集した場合は、紐づく`/passages/{passageId}`を更新する。これにより同じ`passageId`を共有する他の設問にも変更が反映される
- `part`をPart5に変更した場合は`passageId`を`null`にし、それまで参照していた`Passage`が他の`Question`から参照されていなければ削除する

### 3.2 削除(S-07 問題一覧画面)
- **個別削除**: 対象の`Question`、および紐づく`/bookmarks/{questionId}`・関連する`/answerLogs`エントリを1回の多重パス更新で削除する。紐づく`Passage`は、他に参照している`Question`が存在しなければあわせて削除し、存在すれば残す
- **Part単位一括削除**: 指定した`part`に属するすべての`Question`を対象に、個別削除と同じ連動削除ルールを一括適用する。実行前に確認ダイアログで対象件数を表示する
- 削除は取り消せないため、実行前に必ず確認ダイアログを表示する

## 4. ダッシュボード表示項目の算出ロジック

| 表示項目 | 算出方法 |
|---|---|
| 累計回答数 | `AnswerLog` の件数 |
| 累計正答率 | `AnswerLog` のうち `isCorrect=true` の件数 ÷ 全件数 |
| ブックマーク数(未解決の誤答数) | `Bookmark` の件数 |
| 直近の学習日 | `AnswerLog.answeredAt` の最大値 |
| 登録問題数(Part別内訳) | `Question` を `part` でグループ化して件数集計 |
| 進行中セッションの有無 | `Session.status = "in_progress"` のレコードが存在するか |

## 5. ディレクトリ構成(実装イメージ)

```
toeic-drill/
├─ docs/                      # ウォーターフォール各工程のドキュメント
├─ apphosting.yaml            # Firebase App Hostingの設定
├─ src/
│  ├─ app/
│  │  ├─ page.tsx             # S-01 ダッシュボード
│  │  ├─ quiz/
│  │  │  ├─ setup/page.tsx    # S-02 出題設定
│  │  │  ├─ play/page.tsx     # S-03 出題画面
│  │  │  └─ result/page.tsx   # S-04 セッション終了
│  │  ├─ bookmarks/page.tsx   # S-05 ブックマーク一覧・復習
│  │  └─ questions/
│  │     ├─ manage/page.tsx   # S-06 問題データ管理
│  │     ├─ page.tsx          # S-07 問題一覧
│  │     └─ [id]/edit/page.tsx  # S-08 問題編集
│  ├─ lib/
│  │  ├─ firebase.ts          # Firebase App/Databaseの初期化
│  │  ├─ types.ts             # Question/Passage/Session等の型定義
│  │  ├─ questions.ts         # 問題・長文の読み書き(CRUD)
│  │  ├─ bookmarks.ts         # ブックマークの読み書き
│  │  ├─ session.ts           # 出題セッションのロジック
│  │  ├─ stats.ts             # ダッシュボード集計
│  │  └─ csv-import.ts        # CSVパース・バリデーション・登録
├─ package.json
└─ tsconfig.json
```

## 6. 未確定事項

現時点で残っている未確定事項はなし。実装を進める中で新たな論点が出た場合はここに追記する。
