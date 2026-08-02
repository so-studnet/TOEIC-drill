import { get, push, ref, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { getAllQuestions, getQuestionById } from "@/lib/questions";
import { addBookmark, getAllBookmarkQuestionIds, removeBookmark } from "@/lib/bookmarks";
import type { QuizSession, SessionStatus } from "@/lib/types";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function getInProgressSession(): Promise<QuizSession | null> {
  const snap = await get(ref(db, "sessions"));
  if (!snap.exists()) return null;
  const val = snap.val() as Record<string, Omit<QuizSession, "id">>;
  const inProgress = Object.entries(val)
    .map(([id, s]) => ({ id, ...s }))
    .filter((s) => s.status === "in_progress")
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return inProgress[0] ?? null;
}

export async function startNormalSession(parts: number[]): Promise<QuizSession> {
  const questions = await getAllQuestions();
  const order = shuffle(questions.filter((q) => parts.includes(q.part)).map((q) => q.id));
  const newRef = push(ref(db, "sessions"));
  const id = newRef.key as string;
  const now = Date.now();
  const session: Omit<QuizSession, "id"> = {
    mode: "normal",
    selectedParts: parts,
    questionOrder: order,
    currentIndex: 0,
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
  };
  await set(newRef, session);
  return { id, ...session };
}

export async function startBookmarkReviewSession(): Promise<QuizSession> {
  const order = shuffle(await getAllBookmarkQuestionIds());
  const newRef = push(ref(db, "sessions"));
  const id = newRef.key as string;
  const now = Date.now();
  const session: Omit<QuizSession, "id"> = {
    mode: "bookmark_review",
    selectedParts: [],
    questionOrder: order,
    currentIndex: 0,
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
  };
  await set(newRef, session);
  return { id, ...session };
}

export async function getSessionById(sessionId: string): Promise<QuizSession> {
  const snap = await get(ref(db, `sessions/${sessionId}`));
  if (!snap.exists()) throw new Error("session not found");
  return { id: sessionId, ...(snap.val() as Omit<QuizSession, "id">) };
}

export async function getCurrentQuestion(sessionId: string) {
  const session = await getSessionById(sessionId);
  if (session.currentIndex >= session.questionOrder.length) return null;
  const questionId = session.questionOrder[session.currentIndex];
  return getQuestionById(questionId);
}

export async function submitAnswer(sessionId: string, selectedAnswer: string) {
  const session = await getSessionById(sessionId);
  const questionId = session.questionOrder[session.currentIndex];
  const question = await getQuestionById(questionId);
  if (!question) throw new Error("question not found");
  const isCorrect = selectedAnswer === question.correctAnswer;

  const logRef = push(ref(db, "answerLogs"));
  await set(logRef, {
    questionId,
    sessionId,
    isCorrect,
    answeredAt: Date.now(),
  });

  if (isCorrect) {
    await removeBookmark(questionId);
  } else {
    await addBookmark(questionId);
  }

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  };
}

export async function advanceSession(sessionId: string): Promise<QuizSession> {
  const session = await getSessionById(sessionId);
  const nextIndex = session.currentIndex + 1;
  const status: SessionStatus = nextIndex >= session.questionOrder.length ? "completed" : "in_progress";
  const patch = { currentIndex: nextIndex, status, updatedAt: Date.now() };
  await update(ref(db, `sessions/${sessionId}`), patch);
  return { ...session, ...patch };
}

export async function abandonSession(sessionId: string): Promise<void> {
  await update(ref(db, `sessions/${sessionId}`), { status: "abandoned", updatedAt: Date.now() });
}

export async function getSessionSummary(sessionId: string) {
  const snap = await get(ref(db, "answerLogs"));
  if (!snap.exists()) return { correctCount: 0, incorrectCount: 0, totalCount: 0 };
  const logs = Object.values(
    snap.val() as Record<string, { sessionId: string | null; isCorrect: boolean }>
  ).filter((l) => l.sessionId === sessionId);
  const correctCount = logs.filter((l) => l.isCorrect).length;
  return { correctCount, incorrectCount: logs.length - correctCount, totalCount: logs.length };
}
