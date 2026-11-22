// WebAudio로 직접 만드는 효과음과 배경음악 (저작권 걱정 없는 합성음)
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.25, dest?: AudioNode) {
  const c = ac();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest ?? master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export type Sfx = "click" | "hint" | "reveal" | "tick" | "score" | "finish" | "start" | "pick" | "stamp";

export function playSfx(kind: Sfx) {
  switch (kind) {
    case "click":
      tone(660, 0, 0.08, "triangle", 0.15);
      break;
    case "start":
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.18, "triangle", 0.2));
      break;
    case "hint":
      tone(988, 0, 0.25, "sine", 0.18);
      tone(1319, 0.12, 0.35, "sine", 0.14);
      break;
    case "tick":
      tone(1200, 0, 0.05, "square", 0.06);
      break;
    case "reveal":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.3, "triangle", 0.22));
      tone(1568, 0.34, 0.5, "sine", 0.12);
      break;
    case "score":
      tone(880, 0, 0.09, "square", 0.08);
      tone(1175, 0.07, 0.14, "square", 0.08);
      break;
    case "pick": // 진진가: 문장 고를 때 톡
      tone(740, 0, 0.07, "sine", 0.16);
      tone(990, 0.05, 0.09, "sine", 0.1);
      break;
    case "stamp": // 진진가: 가짜 도장 쾅
      tone(160, 0, 0.18, "triangle", 0.3);
      tone(120, 0.02, 0.22, "sine", 0.22);
      [784, 988].forEach((f, i) => tone(f, 0.2 + i * 0.09, 0.22, "triangle", 0.16));
      break;
    case "finish":
      [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.28, "triangle", 0.2));
      break;
  }
}

// ───────── 배경음악 ─────────
// 1순위: public/audio/quiz-bgm.mp3 (직접 넣은 무료 음원). 파일이 없으면 2순위: 긴장감 있는 합성 BGM.
export const BGM_FILE = "/audio/quiz-bgm.mp3";
const BGM_VOLUME = 0.45; // 파일 음원 볼륨 (0~1)

let bgmToken = 0; // 시작/중지 경쟁 상태 방지용
let bgmEl: HTMLAudioElement | null = null;
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let bgmGain: GainNode | null = null;
let bgmFilter: BiquadFilterNode | null = null;
let urgent = false;

// 합성 BGM: 가온음 A 단조, 약 112BPM. 반음 위(B♭)·트라이톤(E♭) 으로 불안한 느낌을 냄.
const BPM = 112;
const STEP = 60 / BPM / 2; // 8분음표
const A1 = 55;
const semi = (base: number, n: number) => base * Math.pow(2, n / 12);
// 4마디(32스텝) 베이스 진행: A - A(♭2) - F - E   (-1 = 쉼)
const BASS: number[] = [
  0, 0, 0, 0, 0, 0, 12, 0, //   A
  0, 0, 0, 0, 0, 1, 0, 0, //    A (B♭ 로 살짝 흔들기)
  -4, -4, -4, -4, -4, -4, 8, -4, //  F
  -5, -5, -5, -5, -5, -5, -4, -5, //  E
];
// 마디 2·4 에서 가끔 울리는 불길한 멜로디 (A 기준 반음 수, null = 쉼)
const MOTIF: (number | null)[] = [
  null, null, null, null, null, null, null, null,
  null, null, 24, null, 27, null, 26, null,
  null, null, null, null, null, null, null, null,
  23, null, null, 22, null, null, 19, null,
];

function kick(t: number, vol: number) {
  const c = ctx;
  if (!c || !bgmGain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g);
  g.connect(bgmGain);
  o.start(t);
  o.stop(t + 0.25);
}

function bgmNote(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
  const c = ctx;
  if (!c || !bgmGain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(bgmGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function scheduleStep(step: number, t: number) {
  const n = step % 32;
  const inBar = n % 8;
  // 심장 박동: 4스텝(한 박)마다 쿵, 마디 첫 박은 더 강하게
  if (inBar % 2 === 0) kick(t, inBar === 0 ? 0.55 : 0.32);
  // 베이스: 톱니파(필터로 둥글게) + 한 옥타브 아래 사인
  const b = BASS[n];
  bgmNote(semi(A1, b), t, STEP * 0.85, "sawtooth", 0.16);
  bgmNote(semi(A1, b - 12), t, STEP * 1.6, "sine", 0.2);
  // 시계 초침: 8분음표마다 짧은 틱 (마지막 5초 긴박 모드에서는 16분음표로 2배)
  bgmNote(2400, t, 0.025, "square", 0.025);
  if (urgent) bgmNote(2400, t + STEP / 2, 0.025, "square", 0.02);
  // 마디 시작마다 낮은 트라이톤 드론 (불안한 울림)
  if (inBar === 0) {
    bgmNote(semi(A1, 24), t, STEP * 8, "sine", 0.07);
    bgmNote(semi(A1, 30), t, STEP * 8, "sine", 0.05);
  }
  const m = MOTIF[n];
  if (m != null) bgmNote(semi(A1, m), t, STEP * 1.8, "triangle", 0.08);
}

function startSynthBgm(token: number) {
  const c = ac();
  if (!c || !master || bgmTimer || token !== bgmToken) return;
  bgmFilter = c.createBiquadFilter();
  bgmFilter.type = "lowpass";
  bgmFilter.frequency.value = 2600;
  bgmGain = c.createGain();
  bgmGain.gain.value = 0.5;
  bgmGain.connect(bgmFilter);
  bgmFilter.connect(master);
  let step = 0;
  let next = c.currentTime + 0.08;
  const pump = () => {
    // 0.4초 앞까지 미리 예약해서 타이머가 흔들려도 박자가 안 어긋나게
    while (next < c.currentTime + 0.4) {
      scheduleStep(step++, next);
      next += STEP;
    }
  };
  pump();
  bgmTimer = setInterval(pump, 100);
}

export function startBgm() {
  if (typeof window === "undefined" || bgmTimer || bgmEl) return;
  const token = ++bgmToken;
  const el = new Audio(BGM_FILE);
  el.loop = true;
  el.volume = BGM_VOLUME;
  bgmEl = el;
  const fallback = () => {
    if (bgmEl === el) {
      el.pause();
      bgmEl = null;
    }
    startSynthBgm(token);
  };
  el.addEventListener("error", fallback, { once: true }); // 파일이 없을 때(404)
  el.play().catch((e: unknown) => {
    // 브라우저 자동재생 차단이면 합성음도 소용없으니 조용히 포기, 파일 문제일 때만 합성음으로
    if ((e as DOMException)?.name !== "NotAllowedError") fallback();
  });
}

export function stopBgm() {
  bgmToken++;
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
  if (bgmEl) {
    bgmEl.pause();
    bgmEl.removeAttribute("src");
    bgmEl.load();
    bgmEl = null;
  }
  const g = bgmGain;
  const f = bgmFilter;
  bgmGain = null;
  bgmFilter = null;
  if (g && ctx) {
    // 이미 예약된 음이 뚝 끊기지 않도록 짧게 줄인 뒤 연결 해제
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    setTimeout(() => {
      try {
        g.disconnect();
        f?.disconnect();
      } catch {}
    }, 400);
  }
}

// 힌트 직전 5초 등 긴박한 순간에 틱이 빨라짐 (합성 BGM 한정)
export function setBgmUrgent(on: boolean) {
  urgent = on;
}
