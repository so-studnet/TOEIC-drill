import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionSummary } from "@/lib/session";

export default async function QuizResultPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionId } = await searchParams;
  if (!sessionId) redirect("/quiz/setup");

  const summary = await getSessionSummary(sessionId);
  const rate =
    summary.totalCount > 0 ? Math.round((summary.correctCount / summary.totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">セッション終了</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-500">今回の結果</p>
        <p className="mt-2 text-3xl font-bold">
          {summary.correctCount} / {summary.totalCount} 問正解
          <span className="ml-2 text-lg font-normal text-neutral-500">({rate}%)</span>
        </p>
        <p className="mt-1 text-sm text-neutral-600">誤答: {summary.incorrectCount}問</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/quiz/setup"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          もう一度出題する
        </Link>
        <Link
          href="/"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          ダッシュボードへ
        </Link>
      </div>
    </div>
  );
}
