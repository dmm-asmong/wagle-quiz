// 진진가: 가져오기 호환성·섞기·문제 수 점검 (node --experimental-strip-types)
import assert from "node:assert/strict";
import { exportJson, parseJson, parsePasted, toQuestion } from "../src/lib/custom.ts";
import { buildJjg, shuffleJjg } from "../src/lib/build.ts";
import * as D from "../src/lib/data-jjg.ts";

// 예전(version 1) JSON 파일이 그대로 읽히는지
const v1 = JSON.stringify({ app: "wagle-quiz", version: 1, audience: "elem", questions: [{ id: "x", q: "옛 문제", a: "답", e: "", l: 2 }] });
const old = parseJson(v1);
assert.equal(old.length, 1);
assert.equal(old[0].kind, undefined);
assert.equal(toQuestion(old[0]).mode, "text");

// 붙여넣기: 진진가 줄 + 일반 줄 + 잘못된 진진가 줄
const p = parsePasted("진진가\tA 진짜\tB 진짜\tC 가짜\t3\t이유\t쉬움\t주제\n옛 문제|답|해설|보통\n진진가|a|b||2\n");
assert.equal(p.items.length, 2);
assert.equal(p.skipped, 1);
assert.equal(p.items[0].kind, "jjg");
assert.equal(p.items[0].fake, 2);
assert.equal(p.items[0].a, "C 가짜");

// 내보내기 → 가져오기 왕복
const back = parseJson(exportJson("elem", p.items));
assert.equal(back.length, 2);
const q = toQuestion(back[0]);
assert.equal(q.mode, "jjg");
assert.deepEqual(q.stmts, ["A 진짜", "B 진짜", "C 가짜"]);

// 섞어도 가짜 문장이 그대로 따라가고, 위치는 고르게 바뀌는지
const base = buildJjg(D.elemJjg).questions[0];
const seen = [0, 0, 0];
for (let i = 0; i < 3000; i++) {
  const s = shuffleJjg(base);
  assert.equal(s.stmts![s.fake!], base.a);
  seen[s.fake!]++;
}
assert.ok(seen.every((n) => n > 800), `가짜 위치 분포: ${seen}`);

// 대상마다 22문제, 문장 3개 모두 채움
for (const t of [D.elemJjg, D.teenJjg, D.adultJjg, D.workJjg]) {
  assert.equal(t.items.length, 22, t.id);
  for (const it of t.items) for (const k of [0, 1, 2, 3, 4]) assert.ok(String(it[k]).trim(), `${t.id}: ${it[0]}`);
}
console.log("jjg tests ok", seen);
