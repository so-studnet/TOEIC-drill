import { get, push, ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import type { Part, Passage, Question, QuestionWithPassage } from "@/lib/types";

export async function getAllQuestions(): Promise<Question[]> {
  const snap = await get(ref(db, "questions"));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<string, Omit<Question, "id">>;
  return Object.entries(val).map(([id, q]) => ({ id, ...q }));
}

export async function getAllPassages(): Promise<Record<string, Passage>> {
  const snap = await get(ref(db, "passages"));
  if (!snap.exists()) return {};
  const val = snap.val() as Record<string, Omit<Passage, "id">>;
  const result: Record<string, Passage> = {};
  for (const [id, p] of Object.entries(val)) result[id] = { id, ...p };
  return result;
}

export async function getQuestionsWithPassages(): Promise<QuestionWithPassage[]> {
  const [questions, passages] = await Promise.all([getAllQuestions(), getAllPassages()]);
  return questions.map((q) => ({
    ...q,
    passageText: q.passageId ? (passages[q.passageId]?.text ?? null) : null,
  }));
}

export async function getQuestionById(id: string): Promise<QuestionWithPassage | null> {
  const snap = await get(ref(db, `questions/${id}`));
  if (!snap.exists()) return null;
  const q: Question = { id, ...(snap.val() as Omit<Question, "id">) };
  let passageText: string | null = null;
  if (q.passageId) {
    const pSnap = await get(ref(db, `passages/${q.passageId}`));
    passageText = pSnap.exists() ? ((pSnap.val() as Passage).text ?? null) : null;
  }
  return { ...q, passageText };
}

export async function getQuestionCountsByPart(): Promise<Record<number, number>> {
  const questions = await getAllQuestions();
  const counts: Record<number, number> = {};
  for (const q of questions) counts[q.part] = (counts[q.part] ?? 0) + 1;
  return counts;
}

async function isPassageUsedByOtherQuestion(
  questions: Question[],
  passageId: string,
  excludeIds: Set<string>
): Promise<boolean> {
  return questions.some((q) => q.passageId === passageId && !excludeIds.has(q.id));
}

async function findAnswerLogIdsForQuestions(questionIds: Set<string>): Promise<string[]> {
  const snap = await get(ref(db, "answerLogs"));
  if (!snap.exists()) return [];
  const logs = snap.val() as Record<string, { questionId: string }>;
  return Object.entries(logs)
    .filter(([, log]) => questionIds.has(log.questionId))
    .map(([id]) => id);
}

export type UpdateQuestionInput = {
  part: Part;
  passageText: string;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string | null;
};

export async function updateQuestion(id: string, data: UpdateQuestionInput): Promise<void> {
  const [existing, allQuestions] = await Promise.all([getQuestionById(id), getAllQuestions()]);
  if (!existing) throw new Error("question not found");

  const updates: Record<string, unknown> = {};
  let passageId: string | null = existing.passageId;

  if (data.part === 5) {
    passageId = null;
  } else if (passageId) {
    updates[`passages/${passageId}`] = { part: data.part, text: data.passageText };
  } else {
    const newRef = push(ref(db, "passages"));
    passageId = newRef.key;
    updates[`passages/${passageId}`] = { part: data.part, text: data.passageText };
  }

  updates[`questions/${id}`] = {
    part: data.part,
    passageId,
    questionText: data.questionText,
    choiceA: data.choiceA,
    choiceB: data.choiceB,
    choiceC: data.choiceC,
    choiceD: data.choiceD,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
    createdAt: existing.createdAt,
  };

  if (existing.passageId && existing.passageId !== passageId) {
    const stillUsed = await isPassageUsedByOtherQuestion(allQuestions, existing.passageId, new Set([id]));
    if (!stillUsed) updates[`passages/${existing.passageId}`] = null;
  }

  await update(ref(db), updates);
}

export async function deleteQuestion(id: string): Promise<void> {
  const [existing, allQuestions] = await Promise.all([getQuestionById(id), getAllQuestions()]);
  if (!existing) return;

  const excludeIds = new Set([id]);
  const updates: Record<string, unknown> = {
    [`questions/${id}`]: null,
    [`bookmarks/${id}`]: null,
  };

  if (existing.passageId) {
    const stillUsed = await isPassageUsedByOtherQuestion(allQuestions, existing.passageId, excludeIds);
    if (!stillUsed) updates[`passages/${existing.passageId}`] = null;
  }

  const logIds = await findAnswerLogIdsForQuestions(excludeIds);
  for (const logId of logIds) updates[`answerLogs/${logId}`] = null;

  await update(ref(db), updates);
}

export async function deletePart(part: Part): Promise<void> {
  const allQuestions = await getAllQuestions();
  const target = allQuestions.filter((q) => q.part === part);
  if (target.length === 0) return;

  const targetIds = new Set(target.map((q) => q.id));
  const updates: Record<string, unknown> = {};
  const passageIdsToCheck = new Set<string>();

  for (const q of target) {
    updates[`questions/${q.id}`] = null;
    updates[`bookmarks/${q.id}`] = null;
    if (q.passageId) passageIdsToCheck.add(q.passageId);
  }

  for (const passageId of passageIdsToCheck) {
    const stillUsed = await isPassageUsedByOtherQuestion(allQuestions, passageId, targetIds);
    if (!stillUsed) updates[`passages/${passageId}`] = null;
  }

  const logIds = await findAnswerLogIdsForQuestions(targetIds);
  for (const logId of logIds) updates[`answerLogs/${logId}`] = null;

  await update(ref(db), updates);
}
