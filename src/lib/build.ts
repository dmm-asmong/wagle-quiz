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
