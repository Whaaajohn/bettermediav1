let callAudioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  if (!callAudioContext || callAudioContext.state === "closed") {
    callAudioContext = new AudioContext();
  }

  return callAudioContext;
}

function tone(context, { frequency, startAt, duration, volume = 0.055, type = "sine" }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const endAt = startAt + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(startAt + 0.02, endAt - 0.025));

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt);
}

const soundPatterns = {
  incoming: [
    { frequency: 660, offset: 0, duration: 0.15, volume: 0.06 },
    { frequency: 880, offset: 0.18, duration: 0.18, volume: 0.055 },
  ],
  outgoing: [
    { frequency: 430, offset: 0, duration: 0.11, volume: 0.045 },
    { frequency: 540, offset: 0.14, duration: 0.1, volume: 0.04 },
  ],
  connected: [
    { frequency: 520, offset: 0, duration: 0.08, volume: 0.045 },
    { frequency: 760, offset: 0.09, duration: 0.13, volume: 0.05 },
  ],
  ended: [
    { frequency: 540, offset: 0, duration: 0.1, volume: 0.04 },
    { frequency: 330, offset: 0.12, duration: 0.16, volume: 0.04 },
  ],
  error: [
    { frequency: 220, offset: 0, duration: 0.18, volume: 0.045, type: "triangle" },
  ],
  test: [
    { frequency: 600, offset: 0, duration: 0.1, volume: 0.05 },
    { frequency: 840, offset: 0.12, duration: 0.12, volume: 0.05 },
  ],
};

export function primeCallAudio() {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  return true;
}

export function playCallSound(name = "test") {
  try {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const startAt = context.currentTime + 0.01;
    const pattern = soundPatterns[name] || soundPatterns.test;
    pattern.forEach((step) => {
      tone(context, { ...step, startAt: startAt + step.offset });
    });
  } catch {
    // Browsers may block sound until the user interacts with the page.
  }
}
