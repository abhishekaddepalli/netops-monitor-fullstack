import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { playPresetSound, startAlarmLoop, stopAllSounds } from '../utils/soundSynthesizer';

const SoundContext = createContext(null);

export const SOUND_PRESETS = {
  down: [
    { id: 'siren', label: 'Emergency Siren', description: 'Sweeping dual-tone oscillating siren' },
    { id: 'klaxon', label: 'Naval Klaxon', description: 'Rapid dual-pitch naval horn alert' },
    { id: 'beep', label: 'Urgent Triple Beep', description: 'High-priority pulsating triple warning' },
    { id: 'alarm', label: 'Pulsing Alarm', description: 'Classic rising frequency sawtooth alert' },
    { id: 'radar', label: 'Submarine Sonar', description: 'Deep echoing naval ping pulse' },
    { id: 'critical', label: 'Sci-Fi Red Alert', description: '4-phase starship red alert klaxon' },
    { id: 'cyber', label: 'Cyber Strobe', description: 'Fast arpeggiated electronic beacon' },
    { id: 'buzzer', label: 'Industrial Buzzer', description: 'Harsh low-frequency electric hazard tone' },
  ],
  up: [
    { id: 'chime', label: 'Crystal Chime', description: 'Ascending 3-tone harmonic chime' },
    { id: 'bell', label: 'Elevator Bell', description: 'High crisp dual-tone bell chime' },
    { id: 'ding', label: 'Acoustic Ding', description: 'Warm harmonic recovery tone' },
    { id: 'marimba', label: 'Bright Marimba', description: 'Lively 4-note upbeat xylophone' },
    { id: 'success', label: 'Mission Success', description: 'Triumphant major-triad brass fanfare' },
    { id: 'harp', label: 'Ethereal Harp', description: 'Gentle cascading celestial arpeggio' },
  ],
};

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('netops_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const [volume, setVolume] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('netops_sound_volume'));
      return isNaN(v) ? 0.8 : Math.max(0, Math.min(1, v));
    } catch {
      return 0.8;
    }
  });

  const [downSound, setDownSound] = useState(() => {
    try {
      return localStorage.getItem('netops_sound_down') || 'siren';
    } catch {
      return 'siren';
    }
  });

  const [upSound, setUpSound] = useState(() => {
    try {
      return localStorage.getItem('netops_sound_up') || 'chime';
    } catch {
      return 'chime';
    }
  });

  const [loopAlarm, setLoopAlarm] = useState(() => {
    try {
      return localStorage.getItem('netops_sound_loop') !== 'false';
    } catch {
      return true;
    }
  });

  // Individual & Group Monitor Sound Mute State
  const [mutedMonitorIds, setMutedMonitorIds] = useState(() => {
    try {
      const stored = localStorage.getItem('netops_sound_muted_monitors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAlarmInfo, setActiveAlarmInfo] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Monitor status tracking to detect transitions
  const prevStatusesRef = useRef({});
  const isInitializedRef = useRef(false);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('netops_sound_enabled', enabled ? 'true' : 'false');
      localStorage.setItem('netops_sound_volume', String(volume));
      localStorage.setItem('netops_sound_down', downSound);
      localStorage.setItem('netops_sound_up', upSound);
      localStorage.setItem('netops_sound_loop', loopAlarm ? 'true' : 'false');
      localStorage.setItem('netops_sound_muted_monitors', JSON.stringify(mutedMonitorIds));
    } catch {}
  }, [enabled, volume, downSound, upSound, loopAlarm, mutedMonitorIds]);

  // Check if a specific monitor has alarm sound disabled
  const isMonitorMuted = useCallback((monitorId) => {
    return mutedMonitorIds.includes(Number(monitorId));
  }, [mutedMonitorIds]);

  // Toggle individual monitor sound alarm
  const toggleMonitorMute = useCallback((monitorId) => {
    const idNum = Number(monitorId);
    setMutedMonitorIds((prev) => {
      const exists = prev.includes(idNum);
      const next = exists ? prev.filter((x) => x !== idNum) : [...prev, idNum];
      try {
        localStorage.setItem('netops_sound_muted_monitors', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Mute specific monitor IDs in bulk
  const muteMonitors = useCallback((ids) => {
    const idNums = ids.map(Number);
    setMutedMonitorIds((prev) => {
      const next = Array.from(new Set([...prev, ...idNums]));
      try {
        localStorage.setItem('netops_sound_muted_monitors', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Unmute specific monitor IDs in bulk
  const unmuteMonitors = useCallback((ids) => {
    const idSet = new Set(ids.map(Number));
    setMutedMonitorIds((prev) => {
      const next = prev.filter((x) => !idSet.has(x));
      try {
        localStorage.setItem('netops_sound_muted_monitors', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Group Mute all provided monitors
  const muteAll = useCallback((allMonitorIds = []) => {
    const allNums = allMonitorIds.map(Number);
    setMutedMonitorIds(allNums);
    try {
      localStorage.setItem('netops_sound_muted_monitors', JSON.stringify(allNums));
    } catch {}
  }, []);

  // Group Unmute all monitors
  const unmuteAll = useCallback(() => {
    setMutedMonitorIds([]);
    try {
      localStorage.setItem('netops_sound_muted_monitors', JSON.stringify([]));
    } catch {}
  }, []);

  const stopAlarm = useCallback(() => {
    stopAllSounds();
    setIsPlaying(false);
    setActiveAlarmInfo(null);
  }, []);

  const playDownAlarm = useCallback((monitorName = 'Monitor') => {
    if (!enabled) return;
    setIsPlaying(true);
    setActiveAlarmInfo({
      monitorName,
      timestamp: Date.now(),
    });

    if (loopAlarm) {
      startAlarmLoop(downSound, volume, 2800);
    } else {
      playPresetSound(downSound, volume);
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
    }
  }, [enabled, loopAlarm, downSound, volume]);

  const playUpChime = useCallback((monitorName = 'Monitor') => {
    if (!enabled) return;
    stopAlarm(); // silence any ongoing down alarm
    playPresetSound(upSound, volume);
  }, [enabled, upSound, volume, stopAlarm]);

  const testSound = useCallback((type, soundId) => {
    const sId = soundId || (type === 'down' ? downSound : upSound);
    playPresetSound(sId, volume);
  }, [downSound, upSound, volume]);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopAllSounds();
        setIsPlaying(false);
      }
      return next;
    });
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  /** Track live monitor updates to trigger sounds on DOWN and UP transitions */
  const trackMonitors = useCallback((monitors) => {
    if (!Array.isArray(monitors) || monitors.length === 0) return;

    if (!isInitializedRef.current) {
      // First poll establishes the baseline without alarming
      const initialMap = {};
      monitors.forEach((m) => {
        if (m && m.id) initialMap[m.id] = m.status;
      });
      prevStatusesRef.current = initialMap;
      isInitializedRef.current = true;
      return;
    }

    const prevMap = prevStatusesRef.current;
    let downTriggered = false;
    let upTriggered = false;
    let triggeredName = '';

    monitors.forEach((m) => {
      if (!m || !m.id) return;
      const prevStatus = prevMap[m.id];
      const curStatus = m.status;
      const isMuted = mutedMonitorIds.includes(Number(m.id));

      if (prevStatus && prevStatus !== curStatus) {
        // Only trigger audio alarms if the monitor is not individually/group muted
        if (!isMuted) {
          // Monitor transitioned from up/degraded/pending to down
          if (curStatus === 'down' && prevStatus !== 'down') {
            downTriggered = true;
            triggeredName = m.name;
          }
          // Monitor recovered from down to up
          else if (curStatus === 'up' && prevStatus === 'down') {
            upTriggered = true;
            triggeredName = m.name;
          }
        }
      }
      prevMap[m.id] = curStatus;
    });

    if (downTriggered) {
      playDownAlarm(triggeredName);
    } else if (upTriggered) {
      playUpChime(triggeredName);
    }
  }, [playDownAlarm, playUpChime, mutedMonitorIds]);

  return (
    <SoundContext.Provider
      value={{
        enabled,
        volume,
        downSound,
        upSound,
        loopAlarm,
        isPlaying,
        activeAlarmInfo,
        isSettingsOpen,
        mutedMonitorIds,
        isMonitorMuted,
        toggleMonitorMute,
        muteMonitors,
        unmuteMonitors,
        muteAll,
        unmuteAll,
        setEnabled,
        setVolume,
        setDownSound,
        setUpSound,
        setLoopAlarm,
        stopAlarm,
        playDownAlarm,
        playUpChime,
        testSound,
        toggleEnabled,
        openSettings,
        closeSettings,
        trackMonitors,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return ctx;
}
