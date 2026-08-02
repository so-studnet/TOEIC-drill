import Papa from "papaparse";
import { push, ref, update } from "firebase/database";
import { db } from "@/lib/firebase";

const EXPECTED_HEADERS = [
  "part",
  "passage_id",
  "passage_text",
  "question_text",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "correct_answer",
  "explanation",
] as const;

export type ParsedQuestionRow = {
  part: 5 | 6 | 7;
  passageId: string | null;
  passageText: string | null;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string | null;
};

export type CsvValidationError = {
  row: number;
  message: string;
};

export type CsvValidationResult =
  | { success: true; rows: ParsedQuestionRow[] }
  | { success: false; errors: CsvValidationError[] };

export function parseAndValidateCsv(csvText: string): CsvValidationResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: CsvValidationError[] = [];

  const actualHeaders = parsed.meta.fields ?? [];
  const missingHeaders = EXPECTED_HEADERS.filter(
    (h) => !actualHeaders.includes(h)
  );
  if (missingHeaders.length > 0) {
    return {
      success: false,
      errors: [
        {
          row: 1,
          message: `ヘッダー行に必要な列が不足しています: ${missingHeaders.join(", ")}`,
        },
      ],
    };
  }

  parsed.errors.forEach((e) => {
    errors.push({ row: (e.row ?? 0) + 2, message: e.message });
  });

  const rows: ParsedQuestionRow[] = [];
  const passageTextById = new Map<string, { text: string; firstRow: number }>();

  parsed.data.forEach((raw, index) => {
    const row = index + 2; // header is row 1, data starts at row 2
    const part = raw.part?.trim();
    const passageId = raw.passage_id?.trim() || null;
    const passageText = raw.passage_text?.trim() || null;
    const questionText = raw.question_text?.trim() || "";
    const choiceA = raw.choice_a?.trim() || "";
    const choiceB = raw.choice_b?.trim() || "";
    const choiceC = raw.choice_c?.trim() || "";
    const choiceD = raw.choice_d?.trim() || "";
    const correctAnswer = raw.correct_answer?.trim().toUpperCase() || "";
    const explanation = raw.explanation?.trim() || null;

    if (!["5", "6", "7"].includes(part)) {
      errors.push({ row, message: `partは5/6/7のいずれかである必要があります(値: "${raw.part}")` });
      return;
    }
    const partNum = Number(part) as 5 | 6 | 7;

    if (!questionText) errors.push({ row, message: "question_textが空です" });
    if (!choiceA) errors.push({ row, message: "choice_aが空です" });
    if (!choiceB) errors.push({ row, message: "choice_bが空です" });
    if (!choiceC) errors.push({ row, message: "choice_cが空です" });
    if (!choiceD) errors.push({ row, message: "choice_dが空です" });

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      errors.push({ row, message: `correct_answerはA/B/C/Dのいずれかである必要があります(値: "${raw.correct_answer}")` });
    }

    if (partNum === 6 || partNum === 7) {
      if (!passageId) errors.push({ row, message: "Part6/7ではpassage_idが必須です" });
      if (!passageText) errors.push({ row, message: "Part6/7ではpassage_textが必須です" });

      if (passageId && passageText) {
        const existing = passageTextById.get(passageId);
        if (!existing) {
          passageTextById.set(passageId, { text: passageText, firstRow: row });
        } else if (existing.text !== passageText) {
          errors.push({
            row,
            message: `passage_id "${passageId}" のpassage_textが${existing.firstRow}行目と一致しません`,
          });
        }
      }
    }

    if (errors.some((e) => e.row === row)) return;

    rows.push({
      part: partNum,
      passageId,
      passageText,
      questionText,
      choiceA,
      choiceB,
      choiceC,
      choiceD,
      correctAnswer: correctAnswer as "A" | "B" | "C" | "D",
      explanation,
    });
  });

  if (errors.length > 0) {
    return { success: false, errors: errors.sort((a, b) => a.row - b.row) };
  }

  return { success: true, rows };
}

export async function importQuestions(rows: ParsedQuestionRow[]) {
  const updates: Record<string, unknown> = {};
  const passageIdMap = new Map<string, string>(); // csv passage_id -> db id

  for (const row of rows) {
    if (row.passageId && !passageIdMap.has(row.passageId)) {
      const newRef = push(ref(db, "passages"));
      const dbId = newRef.key as string;
      passageIdMap.set(row.passageId, dbId);
      updates[`passages/${dbId}`] = { part: row.part, text: row.passageText ?? "" };
    }
  }

  let insertedCount = 0;
  const partCounts: Record<number, number> = {};

  for (const row of rows) {
    const newRef = push(ref(db, "questions"));
    const dbId = newRef.key as string;
    updates[`questions/${dbId}`] = {
      part: row.part,
      passageId: row.passageId ? (passageIdMap.get(row.passageId) ?? null) : null,
      questionText: row.questionText,
      choiceA: row.choiceA,
      choiceB: row.choiceB,
      choiceC: row.choiceC,
      choiceD: row.choiceD,
      correctAnswer: row.correctAnswer,
      explanation: row.explanation,
      createdAt: Date.now(),
    };
    insertedCount += 1;
    partCounts[row.part] = (partCounts[row.part] ?? 0) + 1;
  }

  await update(ref(db), updates);

  return { insertedCount, partCounts };
}
