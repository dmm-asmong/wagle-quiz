"use client";

import { useRef, useState } from "react";
import { AUDIENCES } from "@/lib/audiences";
import { exportJson, loadCustom, newId, parseJson, parsePasted, saveCustom, type CustomQ } from "@/lib/custom";
import { makeHint } from "@/lib/build";
import type { Audience, AudienceId, Level } from "@/lib/types";

type Tab = "mine" | "paste" | "backup" | "preview";
const LV: Record<Level, string> = { 1: "쉬움", 2: "보통", 3: "도전" };
const EMPTY: Omit<CustomQ, "id"> = { q: "", a: "", e: "", l: 2, big: "", h: "" };

const SAMPLE = `문제\t정답\t해설\t난이도\t크게 보일 글자\t힌트
우리 반 반장 이름의 초성은?\t김하늘\t이번 학기 반장이에요\t쉬움\tㄱㅎㄴ\t
이번 주 배운 단원 이름은?\t생태계와 환경\t3단원이에요\t보통\t\t생태계`;

export default function Editor({ audience, onBack, onChange, onSwitchAudience }: { audience: Audience; onBack: () => void; onChange: (l: CustomQ[]) => void; onSwitchAudience: (id: AudienceId) => void }) {
  const [tab, setTab] = useState<Tab>("mine");
  const [list, setList] = useState<CustomQ[]>(() => loadCustom(audience.id));
  const [form, setForm] = useState<Omit<CustomQ, "id">>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [previewType, setPreviewType] = useState(audience.types[0].id);
  const [showAns, setShowAns] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const commit = (next: CustomQ[], note?: string) => {
    setList(next);
    saveCustom(audience.id, next);
    onChange(next);
    if (note) setMsg(note);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.q.trim() || !form.a.trim()) {
      setMsg("문제와 정답은 꼭 적어 주세요.");
      return;
    }
    const clean = { ...form, q: form.q.trim(), a: form.a.trim(), e: form.e.trim(), big: form.big?.trim() || undefined, h: form.h?.trim() || undefined };
    if (editId) commit(list.map((x) => (x.id === editId ? { ...clean, id: editId } : x)), "문제를 고쳤어요.");
    else commit([...list, { ...clean, id: newId() }], "문제를 추가했어요.");
    setForm(EMPTY);
    setEditId(null);
  };

  const download = () => {
    const blob = new Blob([exportJson(audience.id, list)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `와글퀴즈-${audience.short}-우리반문제.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ptype = audience.types.find((t) => t.id === previewType) ?? audience.types[0];

  return (
    <section className="editor">
      <div className="editor-head">
        <div>
          <button className="back" onClick={onBack}>← 퀴즈 홈으로</button>
          <h1 className="display-sm">문제 관리 · 정답 미리보기</h1>
          <p className="muted">수업 전에 정답을 미리 보고, 우리 반만의 문제도 만들어요. 이 브라우저에 저장돼요.</p>
        </div>
        <div className="seg">
          {AUDIENCES.map((a) => (
            <button key={a.id} className={a.id === audience.id ? "on" : ""} onClick={() => onSwitchAudience(a.id)}>
              {a.short}
            </button>
          ))}
        </div>
      </div>

      <div className="tabs" role="tablist">
        {([
          ["mine", `✏️ 우리 반 문제 (${list.length})`],
          ["paste", "📋 붙여넣기 가져오기"],
          ["backup", "💾 JSON 백업"],
          ["preview", "👀 기본 문제 정답 미리보기"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setMsg(""); }}>
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="note">{msg}</p>}

      {tab === "mine" && (
        <div className="mine">
          <form ref={formRef} className="q-form" onSubmit={submit}>
            <h3>{editId ? "문제 고치기" : "새 문제 추가"}</h3>
            <label>문제 <textarea value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} rows={2} placeholder="예: 우리 학교 개교기념일은 몇 월?" /></label>
            <label>정답 <input value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} placeholder="예: 5월" /></label>
            <label>해설 (선택) <input value={form.e} onChange={(e) => setForm({ ...form, e: e.target.value })} placeholder="정답 뒤에 보여 줄 한 줄 설명" /></label>
            <div className="form-row">
              <label>크게 보일 글자 (선택) <input value={form.big ?? ""} onChange={(e) => setForm({ ...form, big: e.target.value })} placeholder="예: 초성·이모지·용어" /></label>
              <label>힌트 (선택) <input value={form.h ?? ""} onChange={(e) => setForm({ ...form, h: e.target.value })} placeholder="비우면 정답 초성으로" /></label>
            </div>
            <div className="form-row">
              <div className="seg">
                {([1, 2, 3] as Level[]).map((l) => (
                  <button type="button" key={l} className={form.l === l ? "on" : ""} onClick={() => setForm({ ...form, l })}>{LV[l]}</button>
                ))}
              </div>
              <div className="form-btns">
                {editId && <button type="button" className="ghost" onClick={() => { setEditId(null); setForm(EMPTY); }}>취소</button>}
                <button className="pill" type="submit">{editId ? "고친 내용 저장" : "+ 추가하기"}</button>
              </div>
            </div>
          </form>

          <div className="q-list">
            {list.length === 0 ? (
              <div className="empty">아직 만든 문제가 없어요. 왼쪽에서 하나씩 넣거나, ‘붙여넣기 가져오기’로 한 번에 넣어 보세요.</div>
            ) : (
              <>
                <div className="list-head">
                  <span>{list.length}문제 · 퀴즈 홈에 ‘우리 반 문제’ 카드로 나와요</span>
                  <button className="ghost small danger" onClick={() => { if (confirm(`${audience.name} 문제 ${list.length}개를 모두 지울까요?`)) commit([], "모두 지웠어요."); }}>모두 지우기</button>
                </div>
                <ol>
                  {list.map((c) => (
                    <li key={c.id} className={editId === c.id ? "editing" : ""}>
                      <div className="li-main">
                        <span className={`badge lv-${c.l}`}>{LV[c.l]}</span>
                        <span className="li-q">{c.big ? <b className="li-big">{c.big}</b> : null}{c.q}</span>
                        <span className="li-a">정답: <b>{c.a}</b>{c.e ? ` · ${c.e}` : ""}</span>
                      </div>
                      <div className="li-btns">
                        <button className="ghost small" onClick={() => { setEditId(c.id); setForm({ q: c.q, a: c.a, e: c.e, l: c.l, big: c.big ?? "", h: c.h ?? "" }); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>고치기</button>
                        <button className="ghost small danger" onClick={() => commit(list.filter((x) => x.id !== c.id), "지웠어요.")}>지우기</button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "paste" && (
        <div className="paste">
          <p>
            엑셀·구글 시트에서 칸을 복사해 붙여넣거나, 한 줄에 하나씩 <code>문제 | 정답 | 해설 | 난이도 | 크게 보일 글자 | 힌트</code> 순서로 적어 주세요.
            쉼표(CSV)로 나눠도 돼요. 문제와 정답만 있어도 괜찮아요.
          </p>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={10} placeholder={SAMPLE} />
          <div className="form-btns">
            <button className="ghost" onClick={() => setPaste(SAMPLE)}>예시 채우기</button>
            <button
              className="pill"
              onClick={() => {
                const { items, skipped } = parsePasted(paste);
                if (!items.length) return setMsg("가져올 문제를 찾지 못했어요. 문제와 정답 칸이 있는지 확인해 주세요.");
                commit([...list, ...items], `${items.length}문제를 가져왔어요.${skipped ? ` (형식이 맞지 않은 ${skipped}줄은 건너뛰었어요)` : ""}`);
                setPaste("");
                setTab("mine");
              }}
            >
              가져오기
            </button>
          </div>
        </div>
      )}

      {tab === "backup" && (
        <div className="backup">
          <div className="backup-card">
            <h3>내보내기</h3>
            <p>{audience.name} ‘우리 반 문제’ {list.length}개를 JSON 파일로 저장해요. 다른 컴퓨터나 교실 PC로 옮길 때 써요.</p>
            <button className="pill" onClick={download} disabled={!list.length}>JSON 파일 받기</button>
          </div>
          <div className="backup-card">
            <h3>가져오기</h3>
            <p>내보낸 JSON 파일을 고르면 지금 문제 뒤에 이어 붙여요.</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const items = parseJson(await f.text());
                  commit([...list, ...items], `${items.length}문제를 가져왔어요.`);
                } catch (err) {
                  setMsg(`가져오지 못했어요: ${(err as Error).message}`);
                }
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="preview">
          <div className="preview-bar">
            <div className="seg">
              {audience.types.map((t) => (
                <button key={t.id} className={t.id === ptype.id ? "on" : ""} onClick={() => setPreviewType(t.id)}>
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
            <label className="switch">
              <input type="checkbox" checked={showAns} onChange={(e) => setShowAns(e.target.checked)} />
              <span>정답 보이기</span>
            </label>
          </div>
          <table className="preview-table">
            <thead>
              <tr><th>#</th><th>난이도</th><th>문제</th><th>정답</th><th>힌트</th><th>해설</th></tr>
            </thead>
            <tbody>
              {ptype.questions.map((q, i) => (
                <tr key={q.id}>
                  <td>{i + 1}</td>
                  <td><span className={`badge lv-${q.l}`}>{LV[q.l]}</span></td>
                  <td>{q.big ? <b className="li-big">{q.big}</b> : null}{q.q}</td>
                  <td className="ans">{showAns ? q.a : "••••"}</td>
                  <td className="muted">{showAns ? makeHint(q, ptype.hintText) : "••"}</td>
                  <td className="muted">{showAns ? q.e : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
