"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AUDIENCES, getAudience } from "@/lib/audiences";
import { makeHint, shuffleJjg } from "@/lib/build";
import { CUSTOM_JJG_TYPE_ID, CUSTOM_TYPE_ID, isJjg, loadCustom, toQuestion, type CustomQ } from "@/lib/custom";
import { playSfx, setBgmUrgent, startBgm, stopBgm, type Sfx } from "@/lib/sound";
import type { AudienceId, Level, Question, QuizType } from "@/lib/types";
import Mascot from "./Mascot";
import Editor from "./Editor";

type Screen = "pick" | "home" | "play" | "result" | "editor";
type Diff = "all" | Level;
interface Settings {
  diff: Diff;
  count: number;
  timer: number; // 0 = 끄기
}
interface Team {
  name: string;
  score: number;
}

const LEVEL_LABEL: Record<Level, string> = { 1: "쉬움", 2: "보통", 3: "도전" };
const TEAM_NAMES = ["1모둠", "2모둠", "3모둠", "4모둠", "5모둠", "6모둠"];
const TEAM_PALETTES: Record<AudienceId, string[]> = {
  elem: ["#ff4f86", "#7a5cff", "#16b383", "#ff9a1f", "#2f9bff", "#c94fd6"],
  teen: ["#2f5be8", "#ff6b2c", "#1f9e62", "#e0364f", "#8a4fd6", "#3a3f4f"],
  adult: ["#1b2a4a", "#d9622b", "#1f8a7a", "#c98a14", "#5b6b8c", "#9a3f5c"],
  work: ["#1f4a39", "#a77b2b", "#8c3b3b", "#2f4f72", "#4f7a5c", "#6b5a45"],
};
const PREF_KEY = "wagle-quiz:v1:prefs";
// 진진가 문구: 대상별 말투
const JJG_TOPIC: Record<AudienceId, string> = { elem: "오늘의 주제", teen: "단원", adult: "TOPIC", work: "주제" };
const JJG_RIGHT: Record<AudienceId, string> = { elem: "딩동댕! 가짜를 찾았어요!", teen: "정답! 가짜 잡았다!", adult: "정답입니다.", work: "정확히 찾으셨습니다!" };
const JJG_WRONG: Record<AudienceId, string> = { elem: "앗, 그건 진짜였어요!", teen: "아깝다, 그건 진짜였어!", adult: "그 문장은 사실이었습니다.", work: "아쉽지만 그 문장은 사실입니다." };

function readPrefs(): { bgm?: boolean; sfx?: boolean; settings?: Partial<Settings> } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
  } catch {
    return {};
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("pick");
  const [audId, setAudId] = useState<AudienceId>("elem");
  const [custom, setCustom] = useState<CustomQ[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>(() => ({ diff: "all", count: 10, timer: 20, ...readPrefs().settings }));
  const [customTimer, setCustomTimer] = useState("");
  const [bgm, setBgm] = useState(() => readPrefs().bgm !== false); // 기본 켜짐: 퀴즈가 시작되면 자동 재생
  const [sfx, setSfx] = useState(() => readPrefs().sfx !== false);
  const [isFs, setIsFs] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  // 플레이 상태
  const [queue, setQueue] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [left, setLeft] = useState(0);
  const [teamsOn, setTeamsOn] = useState(false);
  const [teams, setTeams] = useState<Team[]>(TEAM_NAMES.slice(0, 4).map((name) => ({ name, score: 0 })));
  const [poolNote, setPoolNote] = useState("");
  const [pick, setPick] = useState<number | null>(null); // 진진가: 우리 반이 고른 문장

  const aud = getAudience(audId);
  const TEAM_COLORS = TEAM_PALETTES[audId];
  const customTypes: QuizType[] = useMemo(() => {
    const plain = custom.filter((c) => !isJjg(c));
    const jjg = custom.filter(isJjg);
    const out: QuizType[] = [];
    if (plain.length) out.push({ id: CUSTOM_TYPE_ID, name: "우리 반 문제", desc: "선생님이 직접 만든 문제", icon: "🏫", tone: "pink", mode: "text", prompt: "선생님이 준비한 문제예요!", questions: plain.map(toQuestion) });
    if (jjg.length) out.push({ id: CUSTOM_JJG_TYPE_ID, name: "우리 반 진진가", desc: "선생님이 만든 진짜 둘·가짜 하나", icon: "🎭", tone: "pink", mode: "jjg", prompt: "선생님이 준비한 진진가! 가짜는 몇 번?", hintText: "진짜 문장 하나를 먼저 알려 줘요", questions: jjg.map(toQuestion) });
    return out;
  }, [custom]);
  const customType = customTypes.length > 0;
  const allTypes = useMemo(() => [...aud.types, ...customTypes], [aud, customTypes]);

  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ bgm, sfx, settings }));
    } catch {}
  }, [bgm, sfx, settings]);

  const fx = useCallback((k: Sfx) => sfx && playSfx(k), [sfx]);

  // 퀴즈를 시작하면(문제 화면) 배경음악이 나오고, 결과·홈·편집 화면으로 나가면 멈춘다
  useEffect(() => {
    if (bgm && screen === "play") startBgm();
    else stopBgm();
    return () => stopBgm();
  }, [bgm, screen]);

  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const pickAudience = (id: AudienceId) => {
    fx("click");
    setAudId(id);
    setCustom(loadCustom(id));
    setSelected([]);
    setScreen("home");
    window.scrollTo({ top: 0 });
  };

  const start = (typeIds: string[]) => {
    const types = allTypes.filter((t) => typeIds.includes(t.id));
    let pool = types.flatMap((t) => t.questions);
    if (settings.diff !== "all") pool = pool.filter((q) => q.l === settings.diff);
    if (!pool.length) {
      setPoolNote("이 조건에 맞는 문제가 없어요. 난이도를 '전체'로 바꿔 보세요.");
      return;
    }
    // 여러 종류를 섞을 때는 종류가 고르게 나오도록 번갈아 뽑기
    const byType = types.map((t) => shuffle(pool.filter((q) => q.typeId === t.id))).filter((a) => a.length);
    const picked: Question[] = [];
    let round = 0;
    while (picked.length < settings.count && byType.some((a) => a.length > round)) {
      for (const arr of shuffle(byType)) if (arr[round] && picked.length < settings.count) picked.push(arr[round]);
      round++;
    }
    setPoolNote(picked.length < settings.count ? `조건에 맞는 문제가 ${picked.length}개라서 ${picked.length}문제로 진행해요.` : "");
    // 진진가는 문장 순서를 매번 섞어 가짜 위치가 달라지게
    setQueue(shuffle(picked).map((q) => shuffleJjg(q)));
    setIdx(0);
    setPick(null);
    setHintOn(false);
    setRevealed(false);
    setLeft(settings.timer);
    setTeams((ts) => ts.map((t) => ({ ...t, score: 0 })));
    fx("start");
    setScreen("play");
    window.scrollTo({ top: 0 });
  };

  const cur = queue[idx];
  const curType = cur ? allTypes.find((t) => t.id === cur.typeId) : undefined;

  // 힌트 타이머: 0이 되면 힌트를 공개할 뿐, 틀림 처리하지 않음
  useEffect(() => {
    if (screen !== "play" || revealed || hintOn || settings.timer === 0) return;
    const t = setTimeout(() => {
      if (left <= 1) {
        setLeft(0);
        setHintOn(true);
        fx("hint");
        return;
      }
      if (left <= 4) fx("tick");
      setLeft(left - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [screen, left, revealed, hintOn, settings.timer, fx]);

  // 힌트가 열리기 직전 5초는 배경음 초침이 빨라져 긴장감을 더한다
  useEffect(() => {
    setBgmUrgent(screen === "play" && !revealed && !hintOn && settings.timer > 0 && left <= 5);
    return () => setBgmUrgent(false);
  }, [screen, revealed, hintOn, settings.timer, left]);

  const showHint = useCallback(() => {
    if (!hintOn) fx("hint");
    setHintOn(true);
  }, [hintOn, fx]);
  const isJjgQ = cur?.mode === "jjg" && !!cur.stmts;
  const reveal = useCallback(() => {
    if (!revealed) fx(isJjgQ ? "stamp" : "reveal");
    setRevealed(true);
  }, [revealed, fx, isJjgQ]);
  const choose = useCallback(
    (i: number) => {
      if (revealed) return;
      fx("pick");
      setPick((p) => (p === i ? null : i));
    },
    [revealed, fx],
  );
  const next = useCallback(() => {
    if (idx + 1 >= queue.length) {
      fx("finish");
      setScreen("result");
      return;
    }
    fx("click");
    setIdx((i) => i + 1);
    setPick(null);
    setHintOn(false);
    setRevealed(false);
    setLeft(settings.timer);
  }, [idx, queue.length, settings.timer, fx]);

  useEffect(() => {
    if (screen !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) reveal();
        else next();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key.toLowerCase() === "h" || e.key === "ㅗ") {
        showHint();
      } else if (isJjgQ && ["1", "2", "3"].includes(e.key)) {
        choose(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, revealed, reveal, next, showHint, isJjgQ, choose]);

  // 진진가 힌트: 가짜가 아닌 문장 하나를 '진짜'로 미리 표시 (문제마다 고정)
  const hintTrue = useMemo(() => {
    if (!cur || cur.fake == null) return -1;
    const trues = [0, 1, 2].filter((i) => i !== cur.fake);
    let h = 0;
    for (const ch of cur.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return trues[h % 2];
  }, [cur]);

  const totalQ = allTypes.reduce((n, t) => n + t.questions.length, 0);
  // 지금 고른 퀴즈 종류·난이도 조건에 맞는 문제 수 (설정 화면에서 미리 알려 주기 위함)
  const poolSize = (selected.length ? allTypes.filter((t) => selected.includes(t.id)) : allTypes).reduce(
    (n, t) => n + t.questions.filter((q) => settings.diff === "all" || q.l === settings.diff).length,
    0,
  );
  const countShort = settings.count > poolSize;
  const timerOptions = [10, 15, 20, 30];
  const timerIsCustom = settings.timer !== 0 && !timerOptions.includes(settings.timer);

  const settingsLabel = `${settings.diff === "all" ? "전체 난이도" : LEVEL_LABEL[settings.diff]} · ${settings.count}문제 · ${settings.timer ? `힌트 ${settings.timer}초` : "힌트 타이머 끔"}`;

  return (
    <div className={`app tone-${aud.tone} screen-${screen} ${screen === "pick" ? "th-pick" : `themed th-${aud.id}`}`}>
      <header className="topbar">
        <button className="brand" onClick={() => { fx("click"); setScreen("pick"); }} aria-label="처음 화면으로">
          <span className="brand-mark">
            <Mascot kind="owl" size={34} />
          </span>
          <span className="brand-name">와글와글 퀴즈놀이터</span>
          <span className="brand-slogan">다 같이 와글와글, 정답은 짜잔!</span>
        </button>
        <div className="toggles">
          <button className={`chip ${bgm ? "on" : ""}`} onClick={() => setBgm((v) => !v)} aria-pressed={bgm} title="퀴즈가 시작되면 배경음악이 나와요">
            <span aria-hidden>{bgm ? "🎵" : "🔇"}</span> 배경음 {bgm ? "켜짐" : "꺼짐"}
          </button>
          <button className={`chip ${sfx ? "on" : ""}`} onClick={() => { setSfx((v) => !v); if (!sfx) playSfx("click"); }} aria-pressed={sfx}>
            <span aria-hidden>✨</span> 효과음 {sfx ? "켜짐" : "꺼짐"}
          </button>
          <button className={`chip ${isFs ? "on" : ""}`} onClick={toggleFs}>
            <span aria-hidden>⛶</span> {isFs ? "전체화면 끄기" : "전체화면"}
          </button>
        </div>
      </header>

      <main className="main">
        {screen === "pick" && (
          <section className="pick">
            <div className="hero hero-pick">
              <div>
                <p className="eyebrow">교실·강의실·연수장에서 다 같이</p>
                <h1 className="display">
                  머리는 <span className="hl-purple">말랑!</span> 교실은 <span className="hl-pink">와글!</span>
                </h1>
                <p className="lead">TV나 프로젝터에 띄우고, 선생님이 진행하는 단체 퀴즈예요. 먼저 누구랑 할지 골라 주세요.</p>
                <p className="meta">대상 4개 · 퀴즈 {AUDIENCES.reduce((n, a) => n + a.types.length, 0)}종 · 기본 문제 {AUDIENCES.reduce((n, a) => n + a.types.reduce((m, t) => m + t.questions.length, 0), 0)}개</p>
              </div>
              <div className="hero-mascots" aria-hidden>
                <Mascot kind="owl" size={130} />
                <Mascot kind="fox" size={112} wink />
                <Mascot kind="cat" size={112} />
                <Mascot kind="bear" size={120} />
              </div>
            </div>
            <h2 className="section-title"><span aria-hidden>👋</span> 오늘 누구랑 퀴즈할까요?</h2>
            <div className="aud-grid">
              {AUDIENCES.map((a) => (
                <button key={a.id} className={`aud-card themed th-${a.id}`} onClick={() => pickAudience(a.id)}>
                  <span className="aud-kicker">{a.kicker}</span>
                  <span className="aud-mascot"><Mascot kind={a.mascot} size={110} /></span>
                  <span className="aud-name">{a.name}</span>
                  <span className="aud-tag">{a.tagline}</span>
                  <span className="aud-count">
                    {a.types.length}종 · {a.types.reduce((n, t) => n + t.questions.length, 0)}문제
                  </span>
                  <span className="pill pill-sm">시작하기 →</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === "home" && (
          <section className="home">
            <div className={`hero hero-home tone-bg-${aud.tone}`}>
              <div>
                <button className="back" onClick={() => setScreen("pick")}>← 대상 다시 고르기</button>
                <p className="eyebrow"><span className="eyebrow-kicker">{aud.kicker}</span> {aud.name} 퀴즈놀이터</p>
                <h1 className="display">{aud.cheer.start}</h1>
                <p className="meta">현재 {allTypes.length}종 · {totalQ}문제</p>
              </div>
              <span className="hero-mascot"><Mascot kind={aud.mascot} size={150} /></span>
            </div>

            <div className="random-card">
              <div className="random-left">
                <span className="random-icon" aria-hidden>🎲</span>
                <div>
                  <p className="eyebrow small">오늘 뭐 할까?</p>
                  <h2 className="display-sm">랜덤 퀴즈</h2>
                  <p className="muted">{allTypes.length}가지 퀴즈가 골고루 섞여 나와요.</p>
                </div>
              </div>
              <div className="random-right">
                <p className="settings-summary">{settingsLabel}</p>
                <button className="pill pill-lg" onClick={() => start(allTypes.map((t) => t.id))}>▶ 랜덤 퀴즈 시작</button>
              </div>
            </div>

            <div className="row-head">
              <h2 className="section-title"><span aria-hidden>⭐</span> 어떤 퀴즈? <small>카드를 눌러 골라요 (여러 개 가능)</small></h2>
              <button className="ghost" onClick={() => { fx("click"); setScreen("editor"); }}>✏️ 문제 관리 · 정답 미리보기</button>
            </div>
            <div className="type-grid">
              {allTypes.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    className={`type-card tone-bg-${t.tone} ${on ? "selected" : ""}`}
                    onClick={() => { fx("click"); setSelected((s) => (on ? s.filter((x) => x !== t.id) : [...s, t.id])); }}
                    aria-pressed={on}
                  >
                    <span className="type-icon" aria-hidden>{t.icon}</span>
                    <span className="type-text">
                      <span className="type-name">{t.name}</span>
                      <span className="type-desc">{t.desc}</span>
                      <span className="type-count">{t.questions.length}문제</span>
                    </span>
                    {on && <span className="check" aria-hidden>✓</span>}
                  </button>
                );
              })}
              {!customType && (
                <button className="type-card type-add" onClick={() => setScreen("editor")}>
                  <span className="type-icon" aria-hidden>➕</span>
                  <span className="type-text">
                    <span className="type-name">우리 반 문제 만들기</span>
                    <span className="type-desc">직접 넣고, 붙여넣고, 저장해요</span>
                  </span>
                </button>
              )}
            </div>

            <details className="howto" open={showHowTo} onToggle={(e) => setShowHowTo((e.target as HTMLDetailsElement).open)}>
              <summary>▶ 이렇게 진행해요 <span>단축키도 있어요</span></summary>
              <ol>
                <li>퀴즈 카드를 고르고(안 고르면 전체) 아래 설정을 정해요.</li>
                <li>문제가 뜨면 다 같이 생각! 시간이 지나면 힌트가 저절로 열려요. 틀림 처리는 없어요.</li>
                <li><b>Space / Enter</b> 정답 확인 → 한 번 더 누르면 다음 문제, <b>→</b> 다음 문제, <b>H</b> 힌트.</li>
                <li>모둠 점수판을 켜면 2~6모둠 점수를 +1로 매길 수 있어요.</li>
                <li><b>🎭 진진가</b>: 세 문장 중 가짜 하나를 찾아요. 다 같이 고른 문장을 누르거나 <b>1·2·3</b> 키로 표시한 뒤 정답을 확인하면, 가짜와 그 이유가 나와요.</li>
              </ol>
            </details>

            <div className="settings">
              <h2 className="section-title"><span aria-hidden>⚙️</span> 퀴즈 설정하고 시작해요!</h2>
              <div className="steps">
                <div className="step">
                  <p className="step-no">STEP 1</p>
                  <p className="step-q">어느 정도로 풀까요?</p>
                  <div className="seg">
                    {([1, 2, 3, "all"] as Diff[]).map((d) => (
                      <button key={d} className={settings.diff === d ? "on" : ""} onClick={() => setSettings((s) => ({ ...s, diff: d }))}>
                        {d === "all" ? "전체" : LEVEL_LABEL[d]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="step">
                  <p className="step-no">STEP 2</p>
                  <p className="step-q">몇 문제 풀까요?</p>
                  <div className="seg">
                    {[5, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        className={`${settings.count === n ? "on" : ""} ${n > poolSize ? "short" : ""}`}
                        onClick={() => setSettings((s) => ({ ...s, count: n }))}
                        title={n > poolSize ? `지금 조건에는 문제가 ${poolSize}개뿐이에요` : undefined}
                      >
                        {n}문제
                      </button>
                    ))}
                  </div>
                  <p className={`step-hint ${countShort ? "warn" : ""}`}>
                    {countShort
                      ? `⚠️ 지금 조건에 맞는 문제가 ${poolSize}개뿐이라 ${poolSize}문제만 나와요. 난이도를 '전체'로 바꾸거나 퀴즈 카드를 더 골라 보세요.`
                      : `지금 조건에 맞는 문제 ${poolSize}개 중에서 뽑아요.`}
                  </p>
                </div>
                <div className="step">
                  <p className="step-no">STEP 3</p>
                  <p className="step-q">막히면 언제 힌트를 줄까요?</p>
                  <div className="seg">
                    {timerOptions.map((n) => (
                      <button key={n} className={settings.timer === n ? "on" : ""} onClick={() => setSettings((s) => ({ ...s, timer: n }))}>
                        {n}초
                      </button>
                    ))}
                    <button className={settings.timer === 0 ? "on" : ""} onClick={() => setSettings((s) => ({ ...s, timer: 0 }))}>끄기</button>
                    <span className={`seg-input ${timerIsCustom ? "on" : ""}`}>
                      <input
                        inputMode="numeric"
                        placeholder="직접"
                        value={timerIsCustom ? String(settings.timer) : customTimer}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                          setCustomTimer(v);
                          const n = Number(v);
                          if (n >= 3 && n <= 300) setSettings((s) => ({ ...s, timer: n }));
                        }}
                        aria-label="힌트 타이머 초 직접 입력 (3~300)"
                      />
                      초
                    </span>
                  </div>
                </div>
              </div>
              <div className="start-row">
                <label className="switch">
                  <input type="checkbox" checked={teamsOn} onChange={(e) => setTeamsOn(e.target.checked)} />
                  <span>모둠 점수판 쓰기</span>
                </label>
                {teamsOn && (
                  <div className="seg seg-sm">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button key={n} className={teams.length === n ? "on" : ""} onClick={() => setTeams(TEAM_NAMES.slice(0, n).map((name, i) => ({ name: teams[i]?.name ?? name, score: 0 })))}>
                        {n}모둠
                      </button>
                    ))}
                  </div>
                )}
                <button className="pill pill-lg pill-pink" onClick={() => start(selected.length ? selected : allTypes.map((t) => t.id))}>
                  {selected.length ? `고른 퀴즈 ${selected.length}종 시작 →` : "전체 퀴즈로 시작 →"}
                </button>
              </div>
              {poolNote && <p className="note">{poolNote}</p>}
            </div>
          </section>
        )}

        {screen === "play" && cur && (
          <section className={`play ${teamsOn ? "with-teams" : ""}`}>
            <div className="play-main">
              <div className="play-top">
                <button className="ghost small" onClick={() => setScreen("home")}>✕ 그만하기</button>
                <div className="progress" aria-label={`${idx + 1} / ${queue.length}`}>
                  <div className="progress-bar" style={{ width: `${((idx + (revealed ? 1 : 0)) / queue.length) * 100}%` }} />
                </div>
                <span className="progress-num">
                  <b>{idx + 1}</b> / {queue.length}
                </span>
              </div>

              {poolNote && <p className="note play-note">{poolNote}</p>}

              <div className={`q-card tone-bg-${curType?.tone ?? "lavender"} ${revealed ? "revealed" : ""} ${isJjgQ ? "mode-jjg" : ""}`}>
                <div className="q-meta">
                  <span className="badge">{curType?.icon} {curType?.name}</span>
                  <span className={`badge lv-${cur.l}`}>{LEVEL_LABEL[cur.l]}</span>
                  {settings.timer > 0 && !revealed && (
                    <span className={`timer ${hintOn ? "done" : left <= 5 ? "warn" : ""}`}>
                      {hintOn ? "힌트 공개!" : `힌트까지 ${left}초`}
                    </span>
                  )}
                </div>
                <p className="q-prompt">{curType?.prompt}</p>
                {isJjgQ ? (
                  <>
                    <p className="jjg-topic"><span>{JJG_TOPIC[aud.id]}</span> {cur.q}</p>
                    <ol className={`jjg-list ${revealed ? "is-revealed" : ""} ${pick != null ? "has-pick" : ""}`} aria-label="세 문장 중 가짜 고르기">
                      {cur.stmts!.map((st, i) => {
                        const isFake = i === cur.fake;
                        const cls = ["jjg-item", `n${i + 1}`, pick === i ? "picked" : "", revealed ? (isFake ? "is-fake" : "is-true") : "", !revealed && hintOn && i === hintTrue ? "hint-true" : ""].join(" ");
                        return (
                          <li key={i}>
                            <button type="button" className={cls} onClick={() => choose(i)} aria-pressed={pick === i} disabled={revealed}>
                              <span className="jjg-no" aria-hidden>{i + 1}</span>
                              <span className="jjg-s">{st}</span>
                              {revealed ? (
                                <span className={`jjg-stamp ${isFake ? "fake" : "true"}`}>{isFake ? "가짜" : "진짜"}</span>
                              ) : hintOn && i === hintTrue ? (
                                <span className="jjg-stamp hint">진짜!</span>
                              ) : pick === i ? (
                                <span className="jjg-pickmark">우리 선택</span>
                              ) : null}
                              <span className="sr-only">{revealed ? (isFake ? " (가짜)" : " (진짜)") : pick === i ? " (선택함)" : ""}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : (
                  <>
                    {cur.big && <p className={`q-big mode-${cur.mode}`}>{cur.big}</p>}
                    <p className={`q-text ${cur.big ? "" : "q-text-lg"}`}>{cur.q}</p>
                  </>
                )}

                <div className="hint-row">
                  {hintOn && !revealed ? (
                    <p className="hint-box">
                      <span className="hint-label">힌트</span> {isJjgQ ? `${hintTrue + 1}번은 진짜예요!${cur.h ? ` ${cur.h}` : ""}` : makeHint(cur, curType?.hintText)}
                    </p>
                  ) : hintOn && !isJjgQ ? (
                    <p className="hint-box">
                      <span className="hint-label">힌트</span> {makeHint(cur, curType?.hintText)}
                    </p>
                  ) : (
                    <span />
                  )}
                </div>

                {revealed && isJjgQ && (
                  <div className="answer answer-jjg">
                    <p className="answer-label">{aud.cheer.correct}</p>
                    <p className="answer-text">{cur.fake! + 1}번이 가짜!</p>
                    {pick != null && (
                      <p className={`jjg-verdict ${pick === cur.fake ? "ok" : "no"}`}>
                        우리 선택 {pick + 1}번 · {pick === cur.fake ? JJG_RIGHT[aud.id] : JJG_WRONG[aud.id]}
                      </p>
                    )}
                    {cur.e && <p className="answer-exp"><b className="why">왜 가짜?</b> {cur.e}</p>}
                    {teamsOn && (
                      <div className="jjg-award">
                        <span>맞힌 모둠</span>
                        {teams.map((t, i) => (
                          <button key={i} type="button" style={{ borderColor: TEAM_COLORS[i], color: TEAM_COLORS[i] }} onClick={() => { fx("score"); setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, score: x.score + 1 } : x))); }}>
                            {t.name} +1
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {revealed && !isJjgQ && (
                  <div className="answer">
                    <p className="answer-label">{aud.cheer.correct}</p>
                    <p className={`answer-text ${[...cur.a].length > 12 ? "long" : ""}`}>{cur.a}</p>
                    {cur.e && <p className="answer-exp">{cur.e}</p>}
                  </div>
                )}
                <Mascot kind={aud.mascot} size={110} wink={revealed} className={`q-mascot ${revealed ? "jump" : ""}`} />
              </div>

              <div className="play-actions">
                <button className="pill pill-outline" onClick={showHint} disabled={hintOn || revealed}>💡 힌트 보기</button>
                {!revealed ? (
                  <button className="pill pill-lg" onClick={reveal}>정답 확인하기</button>
                ) : (
                  <button className="pill pill-lg pill-pink" onClick={next}>{idx + 1 >= queue.length ? "결과 보기 🎉" : "다음 문제 →"}</button>
                )}
              </div>
              <p className="kbd-help">{isJjgQ ? "1·2·3 문장 고르기 · " : ""}Space·Enter 정답/다음 · → 다음 · H 힌트</p>
            </div>

            {teamsOn && (
              <aside className="scoreboard">
                <h3>모둠 점수판</h3>
                {teams.map((t, i) => (
                  <div className="team" key={i} style={{ borderColor: TEAM_COLORS[i] }}>
                    <input
                      className="team-name"
                      value={t.name}
                      onChange={(e) => setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, name: e.target.value.slice(0, 10) } : x)))}
                      aria-label={`${i + 1}번 모둠 이름`}
                    />
                    <div className="team-score" style={{ color: TEAM_COLORS[i] }}>{t.score}</div>
                    <div className="team-btns">
                      <button onClick={() => setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, score: Math.max(0, x.score - 1) } : x)))} aria-label="1점 빼기">−</button>
                      <button className="plus" style={{ background: TEAM_COLORS[i] }} onClick={() => { fx("score"); setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, score: x.score + 1 } : x))); }}>+1</button>
                    </div>
                  </div>
                ))}
              </aside>
            )}
          </section>
        )}

        {screen === "result" && (
          <section className="result">
            <div className="result-frame" aria-hidden />
            <div className="confetti" aria-hidden>
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.25}s`, background: TEAM_COLORS[i % 6] }} />
              ))}
            </div>
            <Mascot kind={aud.mascot} size={170} wink />
            <h1 className="display">{aud.cheer.end}</h1>
            <p className="lead">{queue.length}문제를 함께 풀었어요.</p>
            {teamsOn && (
              <ol className="ranking">
                {[...teams].map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score).map((t, r, arr) => {
                  const rank = arr.findIndex((x) => x.score === t.score) + 1;
                  return (
                    <li key={t.i} className={rank === 1 && t.score > 0 ? "first" : ""}>
                      <span className="rank">{rank === 1 && t.score > 0 ? "🏆" : `${rank}위`}</span>
                      <span className="rname">{t.name}</span>
                      <span className="rscore" style={{ color: TEAM_COLORS[t.i] }}>{t.score}점</span>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="result-btns">
              <button className="pill pill-lg" onClick={() => start(selected.length ? selected : allTypes.map((t) => t.id))}>한 판 더! ↻</button>
              <button className="pill pill-outline" onClick={() => setScreen("home")}>퀴즈 고르기로</button>
            </div>
            <details className="review">
              <summary>오늘 푼 문제와 정답 다시 보기</summary>
              <ol>
                {queue.map((q) => (
                  <li key={q.id}>
                    <span>{q.mode === "jjg" ? `🎭 ${q.q} — 가짜: ` : q.big ? `${q.big} — ` : ""}{q.mode === "jjg" ? "" : q.q}</span> <b>{q.a}</b>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        )}

        {screen === "editor" && (
          <Editor
            key={aud.id}
            audience={aud}
            onBack={() => setScreen("home")}
            onChange={setCustom}
            onSwitchAudience={(id) => { setAudId(id); setCustom(loadCustom(id)); setSelected([]); }}
          />
        )}
      </main>

      <footer className="footer">
        <span>
          만든 사람: 양○○ (애즈몽) · <a href="mailto:asmong.better@gmail.com">asmong.better@gmail.com</a>
        </span>
        <span className="foot-note">문제·캐릭터·효과음은 이 앱을 위해 새로 만들었어요. 직접 넣은 문제는 이 브라우저에만 저장돼요.</span>
      </footer>
    </div>
  );
}
