const GameAudio = (() => {
  let ctx = null;
  let muted = false;

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, duration, type, gainValue, slide) {
    if (muted) return;
    const audio = ac();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(slide, audio.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainValue || 0.05, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  return {
    unlock() {
      ac();
    },
    shoot() {
      beep(420, 0.08, "square", 0.04, 180);
    },
    explode() {
      beep(90, 0.28, "sawtooth", 0.07, 40);
    },
    hit() {
      beep(160, 0.07, "triangle", 0.05);
    },
    pickup() {
      beep(520, 0.08, "square", 0.05);
      setTimeout(() => beep(720, 0.1, "square", 0.04), 70);
    },
    start() {
      beep(260, 0.12, "square", 0.05);
      setTimeout(() => beep(330, 0.12, "square", 0.05), 100);
      setTimeout(() => beep(390, 0.18, "square", 0.05), 200);
    },
    lose() {
      beep(220, 0.2, "sawtooth", 0.05, 80);
    },
    win() {
      beep(330, 0.12, "square", 0.05);
      setTimeout(() => beep(440, 0.16, "square", 0.05), 120);
    },
  };
})();
