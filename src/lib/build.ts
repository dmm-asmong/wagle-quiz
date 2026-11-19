import type { Audience, Level, Question, QuizMode, QuizType } from "./types";

export type RawItem = [q: string, a: string, e: string, l: Level, big?: string, h?: string];
export interface RawType {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tone: QuizType["tone"];
  mode: QuizMode;
  prompt: string;
  hintText?: string;
  items: RawItem[];
}

const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

export function chosung(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) out += CHO[Math.floor((c - 0xac00) / 588)];
    else out += ch;
  }
  return out;
}

/** 괄호 속 한자·영문 풀이를 떼어 낸 핵심 정답 */
export function coreAnswer(a: string) {
  return a.replace(/\s*\(.*?\)\s*/g, "").trim() || a;
}

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 힌트 만들기: 정답이 보이지 않게, 초성이나 일부만 */
export function makeHint(q: Pick<Question, "a" | "h" | "mode">, typeHint?: string): string {
  if (q.h) return q.h;
  if (q.mode === "jjg") return JJG_HINT;
  const core = coreAnswer(q.a);
  if (q.mode === "chosung") {
    // 초성은 이미 보이니 첫 글자를 공개
    const chars = [...core];
    return chars.map((c, i) => (i === 0 ? c : chosung(c))).join("");
  }
  if (typeHint) return typeHint;
  const hasHangul = /[가-힣]/.test(core);
  if (hasHangul) return chosung(core);
  // 영문·숫자: 각 덩어리의 첫 글자만
  return core
    .split(/(\s+|\+|\/|-)/)
    .map((tok) => (/^[A-Za-z0-9₀-₉]+$/.test(tok) ? tok[0] + "•".repeat(Math.max(0, [...tok].length - 1)) : tok))
    .join("");
}

/** 진진가 한 줄: 주제, 진짜1, 진짜2, 가짜, 해설, 난이도, (선택) 힌트 */
export type JjgItem = [topic: string, true1: string, true2: string, fake: string, e: string, l: Level, h?: string];
export interface RawJjgType {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tone: QuizType["tone"];
  prompt: string;
  items: JjgItem[];
}

export const JJG_HINT = "진짜 문장 하나를 먼저 알려 줘요";

/** 진진가 문장 순서를 섞어 가짜 위치가 매번 달라지게 */
export function shuffleJjg(q: Question, rand: () => number = Math.random): Question {
  if (q.mode !== "jjg" || !q.stmts || q.fake == null) return q;
  const order = [0, 1, 2];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, stmts: order.map((i) => q.stmts![i]), fake: order.indexOf(q.fake) };
}

export function buildJjg(raw: RawJjgType): QuizType {
  const questions: Question[] = raw.items.map(([topic, t1, t2, f, e, l, h], i) => ({
    id: `${raw.id}-${i + 1}`,
    q: topic,
    a: f,
    e,
    l,
    h,
    mode: "jjg",
    typeId: raw.id,
    stmts: [t1, t2, f],
    fake: 2,
  }));
  return { id: raw.id, name: raw.name, desc: raw.desc, icon: raw.icon, tone: raw.tone, mode: "jjg", prompt: raw.prompt, hintText: JJG_HINT, questions };
}

export function buildType(raw: RawType): QuizType {
  const questions: Question[] = raw.items.map(([q, a, e, l, big, h], i) => {
    let b = big;
    if (raw.mode === "chosung") b = chosung(coreAnswer(a));
    if (b && b.includes(" / ")) {
      // 보기 순서가 늘 정답 먼저 나오지 않게 섞기
      const parts = b.split(" / ");
      if (hash(raw.id + i) % 2 === 1) parts.reverse();
      b = parts.join(" / ");
    }
    return { id: `${raw.id}-${i + 1}`, q, a, e, l, big: b, h, mode: raw.mode, typeId: raw.id };
  });
  return { id: raw.id, name: raw.name, desc: raw.desc, icon: raw.icon, tone: raw.tone, mode: raw.mode, prompt: raw.prompt, hintText: raw.hintText, questions };
}

export type BuiltAudience = Audience;
