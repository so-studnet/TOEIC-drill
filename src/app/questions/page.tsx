import Link from "next/link";
import { db } from "@/lib/db";
import { DeleteQuestionButton, DeletePartButton } from "./DeleteButtons";

export default async function QuestionListPage() {
  const [questions, questionCounts] = await Promise.all([
    db.question.findMany({ orderBy: [{ part: "asc" }, { createdAt: "asc" }] }),
    db.question.groupBy({ by: ["part"], _count: { _all: true } }),
  ]);
  const partCountMap = new Map(questionCounts.map((c) => [c.part, c._count._all]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">問題一覧</h1>
        <Link href="/questions/manage" className="text-sm text-blue-600 underline">
          問題データ管理に戻る
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[5, 6, 7].map((part) => (
          <DeletePartButton key={part} part={part} count={partCountMap.get(part) ?? 0} />
        ))}
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-neutral-500">登録されている問題がありません。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">Part</th>
                <th className="px-3 py-2">問題文</th>
                <th className="whitespace-nowrap px-3 py-2">正解</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 align-top">{q.part}</td>
                  <td className="px-3 py-2 align-top">
                    {q.questionText.length > 60 ? `${q.questionText.slice(0, 60)}...` : q.questionText}
                  </td>
                  <td className="px-3 py-2 align-top">{q.correctAnswer}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right align-top">
                    <div className="flex justify-end gap-4">
                      <Link
                        href={`/questions/${q.id}/edit`}
                        className="py-1 text-sm text-blue-600 underline"
                      >
                        編集
                      </Link>
                      <DeleteQuestionButton questionId={q.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
