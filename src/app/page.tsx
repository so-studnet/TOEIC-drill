import Link from "next/link";
import { getQuestionCountsByPart } from "@/lib/questions";
import { getInProgressSession } from "@/lib/session";
import { getDashboardStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, partCountMap, inProgressSession] = await Promise.all([
    getDashboardStats(),
    getQuestionCountsByPart(),
    getInProgressSession(),
  ]);

  const { totalAnswers, correctAnswers, lastAnsweredAt, bookmarkCount } = stats;
  const correctRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : null;
  const totalQuestions = Object.values(partCountMap).reduce((sum, c) => sum + c, 0);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="累計回答数" value={`${totalAnswers}問`} />
        <StatCard label="累計正答率" value={correctRate !== null ? `${correctRate}%` : "-"} />
        <StatCard label="ブックマーク数" value={`${bookmarkCount}問`} />
        <StatCard
          label="直近の学習日"
          value={lastAnsweredAt ? new Date(lastAnsweredAt).toLocaleDateString("ja-JP") : "-"}
        />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">登録問題数</h2>
        {totalQuestions === 0 ? (
          <p className="text-sm text-neutral-500">
            問題データが登録されていません。「問題データ管理」からアップロードしてください。
          </p>
        ) : (
          <ul className="flex gap-6 text-sm">
            <li>Part5: {partCountMap[5] ?? 0}問</li>
            <li>Part6: {partCountMap[6] ?? 0}問</li>
            <li>Part7: {partCountMap[7] ?? 0}問</li>
            <li className="font-semibold">合計: {totalQuestions}問</li>
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        {inProgressSession && (
          <Link
            href={`/quiz/play?session=${inProgressSession.id}`}
            className="rounded-md bg-amber-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-amber-700 sm:py-2 sm:text-left"
          >
            続きから再開する
          </Link>
        )}
        <Link
          href="/quiz/setup"
          className="rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700 sm:py-2 sm:text-left"
        >
          出題を始める
        </Link>
        <Link
          href="/bookmarks"
          className="rounded-md border border-neutral-300 bg-white px-4 py-3 text-center text-sm font-medium hover:bg-neutral-100 sm:py-2 sm:text-left"
        >
          ブックマーク復習
        </Link>
        <Link
          href="/questions/manage"
          className="rounded-md border border-neutral-300 bg-white px-4 py-3 text-center text-sm font-medium hover:bg-neutral-100 sm:py-2 sm:text-left"
        >
          問題データ管理
        </Link>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
