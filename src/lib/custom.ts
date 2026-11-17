import type { AudienceId, Level, Question } from "./types";

export interface CustomQ {
  id: string;
  q: string;
  a: string;
  e: string;
  l: Level;
  big?: string;
  h?: string;
}

export const CUSTOM_TYPE_ID = "custom";
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
  return !!o && typeof o.q === "string" && typeof o.a === "string" && o.q.trim() !== "" && o.a.trim() !== "";
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function toQuestion(c: CustomQ): Question {
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

/**
 * 붙여넣기 가져오기. 한 줄에 문제 하나.
 * 순서: 문제 | 정답 | 해설 | 난이도 | 크게 보일 글자 | 힌트
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
    if (/^(문제|question)$/i.test(cols[0])) continue; // 머리글
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
  return JSON.stringify({ app: "wagle-quiz", version: 1, audience: aud, exportedAt: new Date().toISOString(), questions: list }, null, 2);
}

export function parseJson(text: string): CustomQ[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data?.questions;
  if (!Array.isArray(arr)) throw new Error("questions 배열을 찾지 못했어요.");
  return arr.filter(isCustomQ).map((c: CustomQ) => ({
    id: newId(),
    q: String(c.q),
    a: String(c.a),
    e: String(c.e ?? ""),
    l: parseLevel(String(c.l ?? "2")),
    big: c.big ? String(c.big) : undefined,
    h: c.h ? String(c.h) : undefined,
  }));
}
