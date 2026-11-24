// 문제 뽑기: 고른 난이도 우선, 모자라면 가까운 난이도로 채우기 (node --experimental-strip-types)
import assert from "node:assert/strict";
import { levelGroups, pickQuestions } from "../src/lib/build.ts";
import type { Level, Question, QuizType } from "../src/lib/types.ts";

assert.deepEqual(levelGroups("all"), [[1, 2, 3]]);
assert.deepEqual(levelGroups(1), [[1], [2], [3]]);
assert.deepEqual(levelGroups(2), [[2], [1, 3]]);
assert.deepEqual(levelGroups(3), [[3], [2], [1]]);

// 종류당 22문제, 난이도 분포 12/7/3 (실제 데이터와 비슷)
function type(id: string, dist: [number, number, number]): QuizType {
  const questions: Question[] = [];
  dist.forEach((n, i) => {
    for (let k = 0; k < n; k++) questions.push({ id: `${id}-${i + 1}-${k}`, q: "q", a: "a", e: "", l: (i + 1) as Level, mode: "text", typeId: id });
  });
  return { id, name: id, desc: "", icon: "", tone: "mint", mode: "text", prompt: "", questions };
}
const A = type("A", [12, 7, 3]);
const B = type("B", [8, 9, 5]);

for (const diff of ["all", 1, 2, 3] as const) {
  for (const count of [5, 10, 15, 20]) {
    for (const types of [[A], [B], [A, B]]) {
      const { picked, fromOther } = pickQuestions(types, diff, count);
      const total = types.reduce((n, t) => n + t.questions.length, 0);
      assert.equal(picked.length, Math.min(count, total), `${diff}/${count}/${types.length}`);
      assert.equal(new Set(picked.map((q) => q.id)).size, picked.length, "중복 없음");
      if (diff !== "all") {
        const exact = types.reduce((n, t) => n + t.questions.filter((q) => q.l === diff).length, 0);
        assert.equal(picked.filter((q) => q.l === diff).length, Math.min(count, exact), "고른 난이도가 먼저");
        assert.equal(fromOther, picked.length - Math.min(picked.length, exact));
      } else assert.equal(fromOther, 0);
    }
  }
}

// 도전 3개뿐인 종류에서 5문제 → 도전 3 + 인접(보통) 2
const r = pickQuestions([A], 3, 5);
assert.equal(r.picked.filter((q) => q.l === 3).length, 3);
assert.equal(r.picked.filter((q) => q.l === 2).length, 2);
assert.equal(r.picked.filter((q) => q.l === 1).length, 0);
assert.equal(r.fromOther, 2);

// 총 문제 수보다 많이 요청하면 있는 만큼만
assert.equal(pickQuestions([A], "all", 50).picked.length, 22);
console.log("pick tests ok");
