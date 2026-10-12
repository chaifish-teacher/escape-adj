let context: AudioContext | undefined;
let musicTimer: ReturnType<typeof setInterval> | undefined;
let speechActive = false;
function ctx() {
  context ??= new AudioContext();
  void context.resume();
  return context;
}
export function sound(
  kind: "correct" | "wrong" | "click" | "victory" = "click",
) {
  try {
    const c = ctx();
    const notes =
      kind === "wrong"
        ? [180, 130]
        : kind === "victory"
          ? [392, 494, 587, 784]
          : kind === "correct"
            ? [523, 659, 784]
            : [440];
    notes.forEach((f, i) => {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      g.connect(c.destination);
      const t = c.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      o.start(t);
      o.stop(t + 0.25);
    });
  } catch {
    /* Silent play remains possible. */
  }
}
export function speak(text: string, onUnavailable?: () => void) {
  if (
    !window.speechSynthesis ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    onUnavailable?.();
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.85;
  u.voice = speechSynthesis.getVoices().find((v) => v.lang === "en-US") ?? null;
  u.onstart = () => {
    speechActive = true;
  };
  u.onend = () => {
    speechActive = false;
  };
  u.onerror = () => {
    speechActive = false;
    onUnavailable?.();
  };
  speechSynthesis.speak(u);
}
export function music(on: boolean) {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = undefined;
  if (!on) return;
  let i = 0;
  try {
    ctx();
    musicTimer = setInterval(() => {
      if (speechActive || document.hidden) return;
      const c = ctx(),
        o = c.createOscillator(),
        g = c.createGain();
      o.type = "triangle";
      o.frequency.value = [
        196, 246.94, 293.66, 246.94, 220, 261.63, 329.63, 261.63,
      ][i++ % 8];
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0.017, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.75);
      o.start();
      o.stop(c.currentTime + 0.8);
    }, 800);
  } catch {
    /* optional music */
  }
}
