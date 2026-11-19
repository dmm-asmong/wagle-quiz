import type { AudienceId, Level, Question } from "./types";

export interface CustomQ {
  id: string;
  q: string;
  a: string;
  e: string;
  l: Level;
  big?: string;
  h?: string;
  /** 진진가 문제면 "jjg". 없으면 일반 문제(예전 파일과 호환) */
  kind?: "jjg";
  /** 진진가: 세 문장 */
  stmts?: string[];
  /** 진진가: 가짜 문장 위치 0~2 */
  fake?: number;
}

export const CUSTOM_TYPE_ID = "custom";
export const CUSTOM_JJG_TYPE_ID = "custom-jjg";

export const isJjg = (c: Pick<CustomQ, "kind">) => c.kind === "jjg";

/** 진진가 문제 하나 만들기: 문장 3개와 가짜 위치로 a(가짜 문장)까지 채움 */
export function makeJjg(p: { q?: string; stmts: string[]; fake: number; e?: string; l: Level; h?: string; id?: string }): CustomQ {
  const stmts = p.stmts.map((x) => x.trim());
  const fake = Math.min(2, Math.max(0, Math.round(p.fake)));
  return { id: p.id ?? newId(), kind: "jjg", q: (p.q || "").trim() || "진진가", a: stmts[fake], e: (p.e || "").trim(), l: p.l, h: p.h?.trim() || undefined, stmts, fake };
}
const key = (aud: AudienceId) => `wagle-quiz:v1:custom:${aud}`;

export function loadCustom(aud: AudienceId): CustomQ[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(aud));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(isCustomQ) : [];
  } catch {
    return [];
  }
}

export function saveCustom(aud: AudienceId, list: CustomQ[]) {
  localStorage.setItem(key(aud), JSON.stringify(list));
}

function isCustomQ(x: unknown): x is CustomQ {
  const o = x as CustomQ;
  if (o && o.kind === "jjg") return isJjgShape(o);
  return !!o && typeof o.q === "string" && typeof o.a === "string" && o.q.trim() !== "" && o.a.trim() !== "";
}

function isJjgShape(o: Partial<CustomQ>) {
  return Array.isArray(o.stmts) && o.stmts.length === 3 && o.stmts.every((t) => typeof t === "string" && t.trim() !== "") && [0, 1, 2].includes(Number(o.fake));
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function toQuestion(c: CustomQ): Question {
  if (isJjg(c) && c.stmts) {
    const fake = Number(c.fake);
    return { id: `custom-${c.id}`, q: c.q, a: c.stmts[fake], e: c.e || "", l: c.l, h: c.h || undefined, mode: "jjg", typeId: CUSTOM_JJG_TYPE_ID, stmts: [...c.stmts], fake };
  }
  return { id: `custom-${c.id}`, q: c.q, a: c.a, e: c.e || "", l: c.l, big: c.big || undefined, h: c.h || undefined, mode: c.big ? "term" : "text", typeId: CUSTOM_TYPE_ID };
}

export function parseLevel(s: string | undefined): Level {
  const t = (s || "").trim();
  if (/^(3|도전|어려움|상)$/.test(t)) return 3;
  if (/^(1|쉬움|하)$/.test(t)) return 1;
  return 2;
}

/** CSV 한 줄을 따옴표까지 고려해 나누기 */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** "가짜" 칸 읽기: 1~3, ①②③, A~C 모두 받기 → 0~2 */
export function parseFake(s: string | undefined): number | null {
  const t = (s || "").trim().replace(/번$/, "");
  const m: Record<string, number> = { "1": 0, "2": 1, "3": 2, "①": 0, "②": 1, "③": 2, a: 0, b: 1, c: 2 };
  const v = m[t.toLowerCase()];
  return v == null ? null : v;
}

/**
 * 붙여넣기 가져오기. 한 줄에 문제 하나.
 * 일반: 문제 | 정답 | 해설 | 난이도 | 크게 보일 글자 | 힌트
 * 진진가: 진진가 | 문장1 | 문장2 | 문장3 | 가짜 번호(1~3) | 해설 | 난이도 | 주제 | 힌트
 * 구분자: 탭(엑셀·구글시트 복사), | , 쉼표(CSV)
 */
export function parsePasted(text: string): { items: CustomQ[]; skipped: number } {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const items: CustomQ[] = [];
  let skipped = 0;
  for (const line of lines) {
    let cols: string[];
    if (line.includes("\t")) cols = line.split("\t");
    else if (line.includes("|")) cols = line.split("|");
    else cols = splitCsv(line);
    cols = cols.map((c) => c.trim());
    if (/^(문제|question|종류|kind)$/i.test(cols[0])) continue; // 머리글
    if (/^(진진가|jjg)$/i.test(cols[0])) {
      const [, s1, s2, s3, f, e, l, topic, h] = cols;
      const fake = parseFake(f);
      if (!s1 || !s2 || !s3 || fake == null) {
        skipped++;
        continue;
      }
      items.push(makeJjg({ q: topic, stmts: [s1, s2, s3], fake, e, l: parseLevel(l), h }));
      continue;
    }
    const [q, a, e, l, big, h] = cols;
    if (!q || !a) {
      skipped++;
      continue;
    }
    items.push({ id: newId(), q, a, e: e || "", l: parseLevel(l), big: big || undefined, h: h || undefined });
  }
  return { items, skipped };
}

export function exportJson(aud: AudienceId, list: CustomQ[]) {
  return JSON.stringify({ app: "wagle-quiz", version: 2, audience: aud, exportedAt: new Date().toISOString(), questions: list }, null, 2);
}

export function parseJson(text: string): CustomQ[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data?.questions;
  if (!Array.isArray(arr)) throw new Error("questions 배열을 찾지 못했어요.");
  // version 1(일반 문제만) 파일도 그대로 읽힘. kind:"jjg"면 진진가로 읽음
  return arr.filter(isCustomQ).map((c: CustomQ) =>
    c.kind === "jjg"
      ? makeJjg({ q: c.q ? String(c.q) : "", stmts: c.stmts!.map(String), fake: Number(c.fake), e: String(c.e ?? ""), l: parseLevel(String(c.l ?? "2")), h: c.h ? String(c.h) : undefined })
      : {
          id: newId(),
          q: String(c.q),
          a: String(c.a),
          e: String(c.e ?? ""),
          l: parseLevel(String(c.l ?? "2")),
          big: c.big ? String(c.big) : undefined,
          h: c.h ? String(c.h) : undefined,
        },
  );
}
