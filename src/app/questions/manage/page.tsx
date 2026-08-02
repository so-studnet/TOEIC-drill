import Link from "next/link";
import { getQuestionCountsByPart } from "@/lib/questions";
import { UploadForm } from "./UploadForm";

export const dynamic = "force-dynamic";

export default async function QuestionsManagePage() {
  const partCountMap = await getQuestionCountsByPart();
  const totalQuestions = Object.values(partCountMap).reduce((sum, c) => sum + c, 0);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">問題データ管理</h1>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">CSVアップロード</h2>
        <UploadForm />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">登録済み問題数</h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <li>Part5: {partCountMap[5] ?? 0}問</li>
          <li>Part6: {partCountMap[6] ?? 0}問</li>
          <li>Part7: {partCountMap[7] ?? 0}問</li>
          <li className="font-semibold">合計: {totalQuestions}問</li>
        </ul>
        <Link
          href="/questions"
          className="mt-4 block w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-center text-sm font-medium hover:bg-neutral-100 sm:inline-block sm:w-fit sm:py-2 sm:text-left"
        >
          問題一覧を見る
        </Link>
      </section>
    </div>
  );
}
