"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitAnswerAction,
  goToNextQuestionAction,
  abandonSessionAction,
} from "@/app/quiz/actions";

type QuestionView = {
  id: string;
  part: number;
  passageText: string | null;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
};

type AnswerResult = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
};

const CHOICE_KEYS = ["A", "B", "C", "D"] as const;

export function QuizPlayer({
  sessionId,
  initialQuestion,
  currentIndex,
  total,
}: {
  sessionId: string;
  initialQuestion: QuestionView;
  currentIndex: number;
  total: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [question, setQuestion] = useState(initialQuestion);
  const [index, setIndex] = useState(currentIndex);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const choices = {
    A: question.choiceA,
    B: question.choiceB,
    C: question.choiceC,
    D: question.choiceD,
  };

  function handleSelect(choice: string) {
    if (result) return;
    setSelected(choice);
    startTransition(async () => {
      const res = await submitAnswerAction(sessionId, choice);
      setResult(res);
    });
  }

  function handleNext() {
    startTransition(async () => {
      const next = await goToNextQuestionAction(sessionId);
      if (!next) {
        router.push(`/quiz/result?session=${sessionId}`);
        return;
      }
      setQuestion({
        id: next.id,
        part: next.part,
        passageText: next.passage?.text ?? null,
        questionText: next.questionText,
        choiceA: next.choiceA,
        choiceB: next.choiceB,
        choiceC: next.choiceC,
        choiceD: next.choiceD,
      });
      setIndex((i) => i + 1);
      setSelected(null);
      setResult(null);
    });
  }

  function handleAbandon() {
    startTransition(async () => {
      await abandonSessionAction(sessionId);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold sm:text-lg">
          Part{question.part} 第{index + 1}問 / 全{total}問
        </h1>
        <button
          onClick={handleAbandon}
          disabled={isPending}
          className="shrink-0 py-2 text-sm text-neutral-500 underline hover:text-neutral-800"
        >
          中断する
        </button>
      </div>

      {question.passageText && (
        <div className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-white p-4 text-sm leading-relaxed">
          {question.passageText}
        </div>
      )}

      <p className="font-medium">{question.questionText}</p>

      <div className="flex flex-col gap-2">
        {CHOICE_KEYS.map((key) => {
          const isSelected = selected === key;
          const isCorrectChoice = result && result.correctAnswer === key;
          const isWrongSelected = result && isSelected && !result.isCorrect;
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={!!result || isPending}
              className={[
                "min-h-11 rounded-md border px-4 py-3 text-left text-sm transition-colors active:bg-neutral-100",
                isCorrectChoice
                  ? "border-green-500 bg-green-50"
                  : isWrongSelected
                    ? "border-red-500 bg-red-50"
                    : "border-neutral-300 bg-white hover:bg-neutral-50",
              ].join(" ")}
            >
              <span className="font-semibold">{key}.</span> {choices[key]}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className={result.isCorrect ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
            {result.isCorrect ? "正解" : `不正解(正解: ${result.correctAnswer})`}
          </p>
          {result.explanation && (
            <p className="whitespace-pre-wrap text-sm text-neutral-700">{result.explanation}</p>
          )}
          <button
            onClick={handleNext}
            disabled={isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 sm:w-fit"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
