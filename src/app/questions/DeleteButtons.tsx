"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteQuestionAction, deletePartAction } from "@/app/questions/actions";

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("この問題を削除しますか?この操作は取り消せません。")) return;
    startTransition(async () => {
      await deleteQuestionAction(questionId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="py-1 text-sm text-red-600 underline hover:text-red-800 disabled:opacity-50"
    >
      削除
    </button>
  );
}

export function DeletePartButton({ part, count }: { part: number; count: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm(`Part${part}の問題を全て削除しますか?(${count}問) この操作は取り消せません。`)) return;
    startTransition(async () => {
      await deletePartAction(part);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || count === 0}
      className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      Part{part}を一括削除({count}問)
    </button>
  );
}
