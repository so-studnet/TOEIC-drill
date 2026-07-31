"use client";

import { useActionState } from "react";
import { uploadCsvAction, type UploadState } from "@/app/questions/actions";

const initialState: UploadState = { status: "idle" };

export function UploadForm() {
  const [state, formAction, isPending] = useActionState(uploadCsvAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">問題データCSVファイル</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "アップロード中..." : "アップロード"}
      </button>

      {state.status === "success" && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {state.insertedCount}件の問題を登録しました。
          {state.partCounts && (
            <span className="ml-2">
              (
              {Object.entries(state.partCounts)
                .map(([part, count]) => `Part${part}: ${count}件`)
                .join(" / ")}
              )
            </span>
          )}
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">{state.message}</p>
          {state.errors && state.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {state.errors.map((e, i) => (
                <li key={i}>
                  {e.row}行目: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
