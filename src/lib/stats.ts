import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";

export type DashboardStats = {
  totalAnswers: number;
  correctAnswers: number;
  lastAnsweredAt: number | null;
  bookmarkCount: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [logsSnap, bookmarksSnap] = await Promise.all([
    get(ref(db, "answerLogs")),
    get(ref(db, "bookmarks")),
  ]);

  const logs = logsSnap.exists()
    ? Object.values(logsSnap.val() as Record<string, { isCorrect: boolean; answeredAt: number }>)
    : [];

  const totalAnswers = logs.length;
  const correctAnswers = logs.filter((l) => l.isCorrect).length;
  const lastAnsweredAt = logs.reduce<number | null>(
    (max, l) => (max === null || l.answeredAt > max ? l.answeredAt : max),
    null
  );
  const bookmarkCount = bookmarksSnap.exists()
    ? Object.keys(bookmarksSnap.val() as Record<string, unknown>).length
    : 0;

  return { totalAnswers, correctAnswers, lastAnsweredAt, bookmarkCount };
}
