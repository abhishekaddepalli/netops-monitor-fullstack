/**
 * Sound Synthesizer & Audio Engine
 * Uses pre-added audio assets with zero-dependency Web Audio API synthesis fallback.
 * Works 100% reliably in all modern browsers with no remote CDN dependencies.
 */

let audioCtx = null;
let currentLoopTimer = null;
let activeSourceNodes = [];
let currentHtmlAudio = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Ensure AudioContext is unlocked on first user gesture
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);
}

/** Stop all currently playing sounds and active loop timers */
export function stopAllSounds() {
  if (currentLoopTimer) {
    clearInterval(currentLoopTimer);
    clearTimeout(currentLoopTimer);
    currentLoopTimer = null;
  }
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
    } catch {}
    currentHtmlAudio = null;
  }
  activeSourceNodes.forEach(node => {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch {}
  });
  activeSourceNodes = [];
}

/** Web Audio API synthesizers for instant, pristine sound */
function synthesizeSound(soundId, volume = 0.8) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume)), ctx.currentTime);
  masterGain.connect(ctx.destination);

  const t0 = ctx.currentTime;

  switch (soundId) {
    case 'siren': {
      // Oscillating emergency sweep (800Hz +- 300Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      // Sweep modulation
      osc.frequency.setValueAtTime(800, t0);
      osc.frequency.linearRampToValueAtTime(1150, t0 + 0.4);
      osc.frequency.linearRampToValueAtTime(650, t0 + 0.8);
      osc.frequency.linearRampToValueAtTime(1150, t0 + 1.2);
      osc.frequency.linearRampToValueAtTime(800, t0 + 1.6);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + 0.05);
      gain.gain.setValueAtTime(0.5, t0 + 1.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 1.6);
      activeSourceNodes.push(osc);
      break;
    }

    case 'klaxon': {
      // Dual-tone rapid warning horn
      [850, 550].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t0);

        gain.gain.setValueAtTime(0.01, t0);
        gain.gain.linearRampToValueAtTime(0.35, t0 + 0.04);
        gain.gain.setValueAtTime(0.35, t0 + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);

        // Second pulse
        gain.gain.setValueAtTime(0.01, t0 + 0.65);
        gain.gain.linearRampToValueAtTime(0.35, t0 + 0.69);
        gain.gain.setValueAtTime(0.35, t0 + 1.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0);
        osc.stop(t0 + 1.2);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'beep': {
      // Fast triple warning beep
      [0, 0.28, 0.56].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(920, t0 + delay);

        gain.gain.setValueAtTime(0.01, t0 + delay);
        gain.gain.linearRampToValueAtTime(0.5, t0 + delay + 0.02);
        gain.gain.setValueAtTime(0.5, t0 + delay + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.22);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0 + delay);
        osc.stop(t0 + delay + 0.22);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'alarm': {
      // Rising frequency alarm pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t0);
      osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.8);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.linearRampToValueAtTime(0.4, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.85);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.85);
      activeSourceNodes.push(osc);
      break;
    }

    case 'chime': {
      // 3-tone ascending harmony chime (C5 -> E5 -> G5)
      const notes = [
        { f: 523.25, start: 0, dur: 1.2 },
        { f: 659.25, start: 0.18, dur: 1.2 },
        { f: 783.99, start: 0.36, dur: 1.5 },
      ];
      notes.forEach(({ f, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t0 + start);

        gain.gain.setValueAtTime(0.01, t0 + start);
        gain.gain.linearRampToValueAtTime(0.45, t0 + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + dur);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0 + start);
        osc.stop(t0 + start + dur);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'bell': {
      // Crystal elevator bell ding (1200Hz + overtone)
      [1174.66, 2349.32].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t0);

        const amp = i === 0 ? 0.5 : 0.2;
        gain.gain.setValueAtTime(0.01, t0);
        gain.gain.linearRampToValueAtTime(amp, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0);
        osc.stop(t0 + 1.4);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'ding': {
      // Warm acoustic resolution ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t0); // D5

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 1.2);
      activeSourceNodes.push(osc);
      break;
    }

    default:
      break;
  }
}

/**
 * Play a sound preset once.
 * Tries the pre-added WAV audio file in /sounds/{soundId}.wav,
 * with instant fallback to Web Audio API synthesis.
 */
export function playPresetSound(soundId, volume = 0.8) {
  try {
    const audio = new Audio(`/sounds/${soundId}.wav`);
    audio.volume = Math.max(0, Math.min(1, volume));
    currentHtmlAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to Web Audio API synthesizer
        synthesizeSound(soundId, volume);
      });
    }
  } catch {
    synthesizeSound(soundId, volume);
  }
}

/**
 * Start repeating/looping an alarm sound until stopped.
 * Interval defaults to 3 seconds.
 */
export function startAlarmLoop(soundId, volume = 0.8, intervalMs = 2800) {
  stopAllSounds();
  playPresetSound(soundId, volume);
  currentLoopTimer = setInterval(() => {
    playPresetSound(soundId, volume);
  }, intervalMs);
}
