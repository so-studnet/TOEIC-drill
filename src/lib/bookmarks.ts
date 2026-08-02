import { get, ref, remove, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { getQuestionById } from "@/lib/questions";
import type { QuestionWithPassage } from "@/lib/types";

export type BookmarkWithQuestion = {
  questionId: string;
  createdAt: number;
  question: QuestionWithPassage;
};

export async function getAllBookmarkQuestionIds(): Promise<string[]> {
  const snap = await get(ref(db, "bookmarks"));
  if (!snap.exists()) return [];
  return Object.keys(snap.val() as Record<string, unknown>);
}

export async function getBookmarkCount(): Promise<number> {
  const ids = await getAllBookmarkQuestionIds();
  return ids.length;
}

export async function getAllBookmarksWithQuestions(): Promise<BookmarkWithQuestion[]> {
  const snap = await get(ref(db, "bookmarks"));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<string, { createdAt: number }>;

  const results = await Promise.all(
    Object.entries(val).map(async ([questionId, b]) => {
      const question = await getQuestionById(questionId);
      if (!question) return null;
      return { questionId, createdAt: b.createdAt, question };
    })
  );

  return results
    .filter((r): r is BookmarkWithQuestion => r !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addBookmark(questionId: string): Promise<void> {
  await set(ref(db, `bookmarks/${questionId}`), { createdAt: Date.now() });
}

export async function removeBookmark(questionId: string): Promise<void> {
  await remove(ref(db, `bookmarks/${questionId}`));
}
