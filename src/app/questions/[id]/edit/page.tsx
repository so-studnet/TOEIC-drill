import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateQuestionAction } from "@/app/questions/actions";

export default async function QuestionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await db.question.findUnique({ where: { id }, include: { passage: true } });
  if (!question) notFound();

  const updateWithId = updateQuestionAction.bind(null, question.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">問題編集</h1>

      <form action={updateWithId} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Part</span>
          <select name="part" defaultValue={question.part} className="w-32 rounded-md border border-neutral-300 p-2">
            <option value={5}>Part5</option>
            <option value={6}>Part6</option>
            <option value={7}>Part7</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">長文(Part6/7のみ必須)</span>
          <textarea
            name="passageText"
            defaultValue={question.passage?.text ?? ""}
            rows={5}
            className="rounded-md border border-neutral-300 p-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">問題文</span>
          <textarea
            name="questionText"
            defaultValue={question.questionText}
            rows={2}
            required
            className="rounded-md border border-neutral-300 p-2"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">選択肢A</span>
            <input
              name="choiceA"
              defaultValue={question.choiceA}
              required
              className="rounded-md border border-neutral-300 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">選択肢B</span>
            <input
              name="choiceB"
              defaultValue={question.choiceB}
              required
              className="rounded-md border border-neutral-300 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">選択肢C</span>
            <input
              name="choiceC"
              defaultValue={question.choiceC}
              required
              className="rounded-md border border-neutral-300 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">選択肢D</span>
            <input
              name="choiceD"
              defaultValue={question.choiceD}
              required
              className="rounded-md border border-neutral-300 p-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">正解</span>
          <select
            name="correctAnswer"
            defaultValue={question.correctAnswer}
            className="w-32 rounded-md border border-neutral-300 p-2"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">解説(任意)</span>
          <textarea
            name="explanation"
            defaultValue={question.explanation ?? ""}
            rows={3}
            className="rounded-md border border-neutral-300 p-2"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            保存
          </button>
          <Link
            href="/questions"
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
