export type Part = 5 | 6 | 7;

export type Passage = {
  id: string;
  part: Part;
  text: string;
};

export type Question = {
  id: string;
  part: Part;
  passageId: string | null;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string | null;
  createdAt: number;
};

export type QuestionWithPassage = Question & { passageText: string | null };

export type SessionMode = "normal" | "bookmark_review";
export type SessionStatus = "in_progress" | "completed" | "abandoned";

export type QuizSession = {
  id: string;
  mode: SessionMode;
  selectedParts: number[];
  questionOrder: string[];
  currentIndex: number;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
};

export type AnswerLog = {
  id: string;
  questionId: string;
  sessionId: string | null;
  isCorrect: boolean;
  answeredAt: number;
};
