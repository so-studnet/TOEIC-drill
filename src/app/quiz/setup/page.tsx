import Link from "next/link";
import { db } from "@/lib/db";
import { getInProgressSession } from "@/lib/session";
import { startNormalSessionAction } from "@/app/quiz/actions";

export default async function QuizSetupPage() {
  const [questionCounts, inProgressSession] = await Promise.all([
    db.question.groupBy({ by: ["part"], _count: { _all: true } }),
    getInProgressSession(),
  ]);
  const partCountMap = new Map(questionCounts.map((c) => [c.part, c._count._all]));
  const hasAnyQuestion = questionCounts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">出題設定</h1>

      {inProgressSession && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="mb-2">進行中のセッションがあります。</p>
          <Link
            href={`/quiz/play?session=${inProgressSession.id}`}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700"
          >
            続きから再開する
          </Link>
        </div>
      )}

      {!hasAnyQuestion ? (
        <p className="text-sm text-neutral-500">
          問題データが登録されていません。先に
          <Link href="/questions/manage" className="text-blue-600 underline">
            問題データ管理
          </Link>
          からファイルをアップロードしてください。
        </p>
      ) : (
        <form action={startNormalSessionAction} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">出題するPartを選択(複数選択可)</legend>
            {[5, 6, 7].map((part) => {
              const count = partCountMap.get(part) ?? 0;
              return (
                <label key={part} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="parts"
                    value={part}
                    defaultChecked
                    disabled={count === 0}
                  />
                  Part{part}({count}問)
                </label>
              );
            })}
          </fieldset>
          <button
            type="submit"
            className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            出題開始
          </button>
        </form>
      )}
    </div>
  );
}
