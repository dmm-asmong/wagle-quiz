export type Level = 1 | 2 | 3; // 1 쉬움, 2 보통, 3 도전
export type AudienceId = "elem" | "teen" | "adult" | "work";

/** 화면에 보여 줄 방식 */
export type QuizMode =
  | "chosung" // 정답의 초성을 크게 보여 줌 (자동 계산)
  | "emoji" // big 에 이모지를 크게
  | "term" // big 에 용어를 크게
  | "blank" // 빈칸 채우기 (q 안에 ___)
  | "text" // 문제 글만
  | "jjg"; // 진진가: 세 문장 중 가짜 하나 고르기

export interface Question {
  id: string;
  q: string; // 문제(설명)
  big?: string; // 크게 보여 줄 부분
  a: string; // 정답
  e: string; // 해설
  l: Level;
  h?: string; // 직접 정한 힌트
  mode: QuizMode;
  typeId: string;
  /** 진진가 전용: 보여 줄 세 문장과 가짜 문장의 위치(0~2) */
  stmts?: string[];
  fake?: number;
}

export interface QuizType {
  id: string;
  name: string;
  desc: string;
  icon: string; // 이모지 아이콘
  tone: "lavender" | "mint" | "butter" | "peach" | "pink" | "sky";
  mode: QuizMode;
  prompt: string; // 문제 위 안내 문구
  hintText?: string; // 타입 공통 힌트 (정답 초성 대신)
  questions: Question[];
}

export interface Audience {
  id: AudienceId;
  name: string;
  short: string;
  tagline: string;
  tone: "lavender" | "mint" | "butter" | "peach";
  mascot: "owl" | "fox" | "bear" | "cat";
  kicker: string; // 대상 카드·홈에 붙는 테마 라벨
  cheer: { correct: string; hint: string; start: string; end: string };
  types: QuizType[];
}
