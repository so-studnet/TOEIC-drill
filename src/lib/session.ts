import { db } from "@/lib/db";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function getInProgressSession() {
  return db.session.findFirst({
    where: { status: "in_progress" },
    orderBy: { updatedAt: "desc" },
  });
}

export async function startNormalSession(parts: number[]) {
  const questions = await db.question.findMany({
    where: { part: { in: parts } },
    select: { id: true },
  });
  const order = shuffle(questions.map((q) => q.id));
  return db.session.create({
    data: {
      mode: "normal",
      selectedParts: JSON.stringify(parts),
      questionOrder: JSON.stringify(order),
      currentIndex: 0,
      status: "in_progress",
    },
  });
}

export async function startBookmarkReviewSession() {
  const bookmarks = await db.bookmark.findMany({
    select: { questionId: true },
  });
  const order = shuffle(bookmarks.map((b) => b.questionId));
  return db.session.create({
    data: {
      mode: "bookmark_review",
      selectedParts: JSON.stringify([]),
      questionOrder: JSON.stringify(order),
      currentIndex: 0,
      status: "in_progress",
    },
  });
}

export async function getSessionById(sessionId: string) {
  return db.session.findUniqueOrThrow({ where: { id: sessionId } });
}

export async function getCurrentQuestion(sessionId: string) {
  const session = await getSessionById(sessionId);
  const order: string[] = JSON.parse(session.questionOrder);
  if (session.currentIndex >= order.length) return null;
  const questionId = order[session.currentIndex];
  const question = await db.question.findUnique({
    where: { id: questionId },
    include: { passage: true },
  });
  return question;
}

export async function submitAnswer(sessionId: string, selectedAnswer: string) {
  const session = await getSessionById(sessionId);
  const order: string[] = JSON.parse(session.questionOrder);
  const questionId = order[session.currentIndex];
  const question = await db.question.findUniqueOrThrow({ where: { id: questionId } });
  const isCorrect = selectedAnswer === question.correctAnswer;

  await db.answerLog.create({
    data: { questionId, sessionId, isCorrect },
  });

  if (isCorrect) {
    await db.bookmark.deleteMany({ where: { questionId } });
  } else {
    await db.bookmark.upsert({
      where: { questionId },
      update: {},
      create: { questionId },
    });
  }

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  };
}

export async function advanceSession(sessionId: string) {
  const session = await getSessionById(sessionId);
  const order: string[] = JSON.parse(session.questionOrder);
  const nextIndex = session.currentIndex + 1;
  const status = nextIndex >= order.length ? "completed" : "in_progress";
  return db.session.update({
    where: { id: sessionId },
    data: { currentIndex: nextIndex, status },
  });
}

export async function abandonSession(sessionId: string) {
  return db.session.update({
    where: { id: sessionId },
    data: { status: "abandoned" },
  });
}

export async function getSessionSummary(sessionId: string) {
  const [correctCount, totalCount] = await Promise.all([
    db.answerLog.count({ where: { sessionId, isCorrect: true } }),
    db.answerLog.count({ where: { sessionId } }),
  ]);
  return { correctCount, incorrectCount: totalCount - correctCount, totalCount };
}
