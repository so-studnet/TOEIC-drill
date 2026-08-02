import { getAllBookmarksWithQuestions } from "@/lib/bookmarks";
import { startBookmarkReviewSessionAction } from "@/app/quiz/actions";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const bookmarks = await getAllBookmarksWithQuestions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ブックマーク一覧・復習</h1>

      {bookmarks.length === 0 ? (
        <p className="text-sm text-neutral-500">
          ブックマークされた問題はありません。出題中に不正解だった問題は自動的にここに追加されます。
        </p>
      ) : (
        <>
          <form action={startBookmarkReviewSessionAction}>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 sm:w-fit sm:py-2"
            >
              復習を始める({bookmarks.length}問)
            </button>
          </form>

          <ul className="flex flex-col gap-2">
            {bookmarks.map((b) => (
              <li
                key={b.questionId}
                className="rounded-md border border-neutral-200 bg-white p-3 text-sm"
              >
                <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium">
                  Part{b.question.part}
                </span>
                {b.question.questionText.length > 80
                  ? `${b.question.questionText.slice(0, 80)}...`
                  : b.question.questionText}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
