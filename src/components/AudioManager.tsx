// src/components/AudioManager.tsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Synth-based AudioManager — generates short section cues using Web Audio API.
 * No audio files required. Works best after a user interaction (browser autoplay policy).
 */

// Extended GainNode type with context reference
interface GainNodeWithCtx extends GainNode {
  __ctx?: AudioContext;
}

// Extended window type for webkit prefix
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const sectionCues: Record<string, { type: "chime" | "whoosh" | "pad"; freq?: number }> = {
  "/": { type: "pad", freq: 220 },
  "/learn": { type: "chime", freq: 880 },
  "/research": { type: "chime", freq: 660 },
  "/tools": { type: "whoosh", freq: 300 },
  "/community": { type: "pad", freq: 330 },
  "/contact": { type: "whoosh", freq: 1000 },
  "/dashboard": { type: "chime", freq: 440 },
};

function fadeGain(gainNode: GainNode, from: number, to: number, duration = 0.25, audioCtx?: AudioContext) {
  const now = (audioCtx ?? (gainNode as GainNodeWithCtx).__ctx)?.currentTime ?? 0;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(from, now);
  gainNode.gain.linearRampToValueAtTime(to, now + duration);
}

export default function AudioManager() {
  const location = useLocation();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastNodeRef = useRef<{
    osc?: OscillatorNode;
    gain?: GainNode;
    bufferSource?: AudioBufferSourceNode;
  } | null>(null);

  useEffect(() => {
    const path = location.pathname;
    const cue = sectionCues[path];
    if (!cue) return;

    // create audio context lazily
    let ctx = audioCtxRef.current;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext)();
        audioCtxRef.current = ctx;
      } catch (e) {
        console.warn("AudioContext not available:", e);
        return;
      }
    }

    // stop previous sound smoothly
    if (lastNodeRef.current) {
      const prevGain = lastNodeRef.current.gain;
      if (prevGain) fadeGain(prevGain, prevGain.gain.value, 0, 0.15, ctx);
      setTimeout(() => {
        try {
          lastNodeRef.current?.osc?.stop();
          lastNodeRef.current?.bufferSource?.stop();
        } catch {}
        lastNodeRef.current = null;
      }, 200);
    }

    // Small helper to play different cue types
    if (cue.type === "chime") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      (gain as GainNodeWithCtx).__ctx = ctx;
      osc.type = "sine";
      osc.frequency.value = cue.freq ?? 660;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      // ADSR-ish
      fadeGain(gain, 0, 0.8, 0.02, ctx);
      fadeGain(gain, 0.8, 0.0, 0.9, ctx);

      // slight vibrato
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 6;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      lastNodeRef.current = { osc, gain };
      setTimeout(() => {
        try {
          lfo.stop();
          osc.stop();
        } catch {}
      }, 1000);
    } else if (cue.type === "pad") {
      // quick evolving pad: two oscillators + gentle lowpass
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      (gain as GainNodeWithCtx).__ctx = ctx;

      o1.type = "sine";
      o2.type = "sine";
      o1.frequency.value = cue.freq ?? 220;
      o2.frequency.value = (cue.freq ?? 220) * 1.5;

      lp.type = "lowpass";
      lp.frequency.value = 800;

      gain.gain.value = 0;
      o1.connect(gain);
      o2.connect(gain);
      gain.connect(lp);
      lp.connect(ctx.destination);

      o1.start();
      o2.start();

      fadeGain(gain, 0, 0.6, 0.05, ctx);
      fadeGain(gain, 0.6, 0.0, 1.2, ctx);

      lastNodeRef.current = { osc: o1, gain };
      setTimeout(() => {
        try {
          o1.stop();
          o2.stop();
        } catch {}
      }, 1400);
    } else if (cue.type === "whoosh") {
      // short filtered noise whoosh
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      (gain as GainNodeWithCtx).__ctx = ctx;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cue.freq ?? 1000;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.value = 0;
      source.start();

      fadeGain(gain, 0, 0.6, 0.02, ctx);
      fadeGain(gain, 0.6, 0.0, 0.6, ctx);

      lastNodeRef.current = { bufferSource: source, gain };
      setTimeout(() => {
        try {
          source.stop();
        } catch {}
      }, 900);
    }

     
  }, [location.pathname]);

  return null;
}
