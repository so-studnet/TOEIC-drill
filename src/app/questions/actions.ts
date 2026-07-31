"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { parseAndValidateCsv, importQuestions, type CsvValidationError } from "@/lib/csv-import";

export type UploadState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: CsvValidationError[];
  insertedCount?: number;
  partCounts?: Record<number, number>;
};

export async function uploadCsvAction(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "ファイルを選択してください" };
  }

  const text = await file.text();
  const validation = parseAndValidateCsv(text);

  if (!validation.success) {
    return { status: "error", message: "CSVにエラーがあるため、登録を中止しました。", errors: validation.errors };
  }

  const { insertedCount, partCounts } = await importQuestions(validation.rows);
  revalidatePath("/questions/manage");
  revalidatePath("/questions");
  revalidatePath("/");

  return { status: "success", insertedCount, partCounts };
}

export async function deleteQuestionAction(questionId: string) {
  const question = await db.question.findUniqueOrThrow({ where: { id: questionId } });
  await db.question.delete({ where: { id: questionId } });

  if (question.passageId) {
    const remaining = await db.question.count({ where: { passageId: question.passageId } });
    if (remaining === 0) {
      await db.passage.delete({ where: { id: question.passageId } });
    }
  }

  revalidatePath("/questions");
  revalidatePath("/questions/manage");
  revalidatePath("/");
}

export async function deletePartAction(part: number) {
  const passageIds = (
    await db.question.findMany({
      where: { part, passageId: { not: null } },
      select: { passageId: true },
      distinct: ["passageId"],
    })
  )
    .map((q) => q.passageId)
    .filter((id): id is string => id !== null);

  await db.question.deleteMany({ where: { part } });

  for (const passageId of passageIds) {
    const remaining = await db.question.count({ where: { passageId } });
    if (remaining === 0) {
      await db.passage.delete({ where: { id: passageId } });
    }
  }

  revalidatePath("/questions");
  revalidatePath("/questions/manage");
  revalidatePath("/");
}

export async function updateQuestionAction(questionId: string, formData: FormData) {
  const part = Number(formData.get("part"));
  const passageText = String(formData.get("passageText") ?? "").trim();
  const questionText = String(formData.get("questionText") ?? "").trim();
  const choiceA = String(formData.get("choiceA") ?? "").trim();
  const choiceB = String(formData.get("choiceB") ?? "").trim();
  const choiceC = String(formData.get("choiceC") ?? "").trim();
  const choiceD = String(formData.get("choiceD") ?? "").trim();
  const correctAnswer = String(formData.get("correctAnswer") ?? "").trim().toUpperCase();
  const explanation = String(formData.get("explanation") ?? "").trim() || null;

  if (![5, 6, 7].includes(part)) throw new Error("partは5/6/7のいずれかである必要があります");
  if (!questionText || !choiceA || !choiceB || !choiceC || !choiceD) {
    throw new Error("問題文・選択肢は必須です");
  }
  if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    throw new Error("correctAnswerはA/B/C/Dのいずれかである必要があります");
  }
  if ((part === 6 || part === 7) && !passageText) {
    throw new Error("Part6/7では長文が必須です");
  }

  const existing = await db.question.findUniqueOrThrow({ where: { id: questionId } });

  await db.$transaction(async (tx) => {
    let passageId: string | null = existing.passageId;

    if (part === 5) {
      passageId = null;
    } else if (passageId) {
      await tx.passage.update({ where: { id: passageId }, data: { part, text: passageText } });
    } else {
      const passage = await tx.passage.create({ data: { part, text: passageText } });
      passageId = passage.id;
    }

    await tx.question.update({
      where: { id: questionId },
      data: {
        part,
        passageId,
        questionText,
        choiceA,
        choiceB,
        choiceC,
        choiceD,
        correctAnswer,
        explanation,
      },
    });

    if (existing.passageId && existing.passageId !== passageId) {
      const remaining = await tx.question.count({ where: { passageId: existing.passageId } });
      if (remaining === 0) {
        await tx.passage.delete({ where: { id: existing.passageId } });
      }
    }
  });

  revalidatePath("/questions");
  revalidatePath("/");
  redirect("/questions");
}
