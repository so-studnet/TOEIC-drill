import { redirect } from "next/navigation";
import { getSessionById, getCurrentQuestion } from "@/lib/session";
import { QuizPlayer } from "./QuizPlayer";

export default async function QuizPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionId } = await searchParams;
  if (!sessionId) redirect("/quiz/setup");

  const session = await getSessionById(sessionId);
  if (session.status !== "in_progress") {
    redirect(`/quiz/result?session=${sessionId}`);
  }

  const question = await getCurrentQuestion(sessionId);
  if (!question) {
    redirect(`/quiz/result?session=${sessionId}`);
  }

  const order: string[] = JSON.parse(session.questionOrder);

  return (
    <QuizPlayer
      sessionId={sessionId}
      initialQuestion={{
        id: question.id,
        part: question.part,
        passageText: question.passage?.text ?? null,
        questionText: question.questionText,
        choiceA: question.choiceA,
        choiceB: question.choiceB,
        choiceC: question.choiceC,
        choiceD: question.choiceD,
      }}
      currentIndex={session.currentIndex}
      total={order.length}
    />
  );
}
