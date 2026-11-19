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

// 아주 단순한 반복 배경음악 (펜타토닉 멜로디 + 베이스)
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let bgmGain: GainNode | null = null;
const MELODY = [0, 2, 4, 7, 4, 2, 9, 7, 4, 7, 9, 12, 9, 7, 4, 2];
const BASS = [0, 0, 5, 5, 7, 7, 5, 5];

export function startBgm() {
  const c = ac();
  if (!c || !master || bgmTimer) return;
  bgmGain = c.createGain();
  bgmGain.gain.value = 0.35;
  bgmGain.connect(master);
  let step = 0;
  const base = 392; // G4
  const beat = 0.3;
  const tick = () => {
    const m = MELODY[step % MELODY.length];
    tone(base * Math.pow(2, m / 12), 0, beat * 0.9, "triangle", 0.07, bgmGain!);
    if (step % 2 === 0) {
      const b = BASS[(step / 2) % BASS.length];
      tone((base / 4) * Math.pow(2, b / 12), 0, beat * 1.8, "sine", 0.09, bgmGain!);
    }
    step++;
  };
  tick();
  bgmTimer = setInterval(tick, beat * 1000);
}

export function stopBgm() {
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
  if (bgmGain) {
    try {
      bgmGain.disconnect();
    } catch {}
  }
  bgmGain = null;
}
