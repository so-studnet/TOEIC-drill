"use server";

import { redirect } from "next/navigation";
import {
  startNormalSession,
  startBookmarkReviewSession,
  submitAnswer,
  advanceSession,
  abandonSession,
  getCurrentQuestion,
} from "@/lib/session";

export async function startNormalSessionAction(formData: FormData) {
  const parts = formData.getAll("parts").map(Number).filter((p) => [5, 6, 7].includes(p));
  if (parts.length === 0) {
    throw new Error("Partを1つ以上選択してください");
  }
  const session = await startNormalSession(parts);
  redirect(`/quiz/play?session=${session.id}`);
}

export async function startBookmarkReviewSessionAction() {
  const session = await startBookmarkReviewSession();
  redirect(`/quiz/play?session=${session.id}`);
}

export async function submitAnswerAction(sessionId: string, selectedAnswer: string) {
  return submitAnswer(sessionId, selectedAnswer);
}

export async function goToNextQuestionAction(sessionId: string) {
  const session = await advanceSession(sessionId);
  if (session.status !== "in_progress") {
    return null;
  }
  return getCurrentQuestion(sessionId);
}

export async function abandonSessionAction(sessionId: string) {
  await abandonSession(sessionId);
  redirect(`/quiz/result?session=${sessionId}`);
}
