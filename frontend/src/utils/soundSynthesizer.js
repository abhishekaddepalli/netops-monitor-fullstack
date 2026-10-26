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

    case 'radar': {
      // Submarine Sonar ping (880Hz -> 440Hz ping + 220Hz sub)
      const osc = ctx.createOscillator();
      const oscSub = ctx.createOscillator();
      const gain = ctx.createGain();
      const gainSub = ctx.createGain();

      osc.type = 'sine';
      oscSub.type = 'sine';

      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.8);
      oscSub.frequency.setValueAtTime(220, t0);

      gain.gain.setValueAtTime(0.65, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);

      gainSub.gain.setValueAtTime(0.3, t0);
      gainSub.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

      osc.connect(gain);
      oscSub.connect(gainSub);
      gain.connect(masterGain);
      gainSub.connect(masterGain);

      osc.start(t0);
      oscSub.start(t0);
      osc.stop(t0 + 1.6);
      oscSub.stop(t0 + 1.6);
      activeSourceNodes.push(osc, oscSub);
      break;
    }

    case 'critical': {
      // Sci-Fi 4-pulse red alert klaxon
      const pulses = [
        { f: 650, start: 0, dur: 0.16 },
        { f: 920, start: 0.22, dur: 0.16 },
        { f: 650, start: 0.44, dur: 0.16 },
        { f: 920, start: 0.66, dur: 0.25 },
      ];
      pulses.forEach(({ f, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t0 + start);

        gain.gain.setValueAtTime(0.01, t0 + start);
        gain.gain.linearRampToValueAtTime(0.4, t0 + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + dur);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0 + start);
        osc.stop(t0 + start + dur);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'cyber': {
      // Fast cybernetic strobe arpeggio
      const notes = [1046.5, 1318.5, 1568, 2093, 1046.5, 1318.5, 1568, 2093];
      notes.forEach((f, idx) => {
        const start = idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t0 + start);

        gain.gain.setValueAtTime(0.01, t0 + start);
        gain.gain.linearRampToValueAtTime(0.35, t0 + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + 0.09);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0 + start);
        osc.stop(t0 + start + 0.09);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'buzzer': {
      // Industrial low-frequency hazard buzzer (110Hz + 220Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(110, t0);
      osc2.frequency.setValueAtTime(220, t0);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + 0.03);
      gain.gain.setValueAtTime(0.5, t0 + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + 0.7);
      osc2.stop(t0 + 0.7);
      activeSourceNodes.push(osc1, osc2);
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

    case 'marimba': {
      // Warm woody percussive marimba sequence: F5 -> A5 -> C6 -> E6
      const notes = [
        { f: 698.46, start: 0 },
        { f: 880.00, start: 0.1 },
        { f: 1046.50, start: 0.2 },
        { f: 1318.51, start: 0.3 },
      ];
      notes.forEach(({ f, start }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t0 + start);

        gain.gain.setValueAtTime(0.01, t0 + start);
        gain.gain.linearRampToValueAtTime(0.45, t0 + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + 0.5);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0 + start);
        osc.stop(t0 + start + 0.5);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'success': {
      // Majestic fanfare chord triad: C5 + E5 + G5 + C6
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t0);

        gain.gain.setValueAtTime(0.01, t0);
        gain.gain.linearRampToValueAtTime(0.3, t0 + 0.04);
        gain.gain.setValueAtTime(0.25, t0 + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0);
        osc.stop(t0 + 1.6);
        activeSourceNodes.push(osc);
      });
      break;
    }

    case 'harp': {
      // Celestial cascading harp: C5 -> E5 -> G5 -> B5 -> C6
      const notes = [
        { f: 523.25, start: 0 },
        { f: 659.25, start: 0.08 },
        { f: 783.99, start: 0.16 },
        { f: 987.77, start: 0.24 },
        { f: 1046.50, start: 0.32 },
      ];
      notes.forEach(({ f, start }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t0 + start);

        gain.gain.setValueAtTime(0.01, t0 + start);
        gain.gain.linearRampToValueAtTime(0.35, t0 + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + 1.2);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0 + start);
        osc.stop(t0 + start + 1.2);
        activeSourceNodes.push(osc);
      });
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
