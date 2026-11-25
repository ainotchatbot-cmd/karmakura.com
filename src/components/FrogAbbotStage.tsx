import React, { useEffect, useRef, useState } from 'react';
import type { VoicePersona } from '../lib/gemini-thai-voice';
import {
  FROG_ORACLE_PORTRAIT_IMG,
  FROG_ORACLE_SPEAKING_IMG,
} from './MysticArtifacts';

export type AbbotMood = 'idle' | 'listening' | 'thinking' | 'speaking';
export type AbbotAnimState = 'idle' | 'listening' | 'talking' | 'thinking';

interface FrogAbbotStageProps {
  mood: AbbotMood;
  animState?: AbbotAnimState;
  isStateTransitioning?: boolean;
  speechAmplitude: number;
  voicePersona?: VoicePersona;
  gazeBiasX?: number;
  className?: string;
  onPokeAbbot?: () => void;
}

interface EmberMote {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
  phase: number;
}

export function resolveAbbotAnimState(mood: AbbotMood): AbbotAnimState {
  return mood === 'speaking' ? 'talking' : mood;
}

export function FrogAbbotStage({
  mood,
  animState,
  isStateTransitioning = false,
  speechAmplitude,
  voicePersona = 'male_sage',
  gazeBiasX = 0,
  className = 'w-full h-full min-h-[200px]',
  onPokeAbbot,
}: FrogAbbotStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resolvedAnimState: AbbotAnimState = animState ?? resolveAbbotAnimState(mood);

  const animStateRef = useRef<AbbotAnimState>(resolvedAnimState);
  const personaRef = useRef<VoicePersona>(voicePersona);
  const [pokePulse, setPokePulse] = useState(false);
  const pokeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    animStateRef.current = resolvedAnimState;
  }, [resolvedAnimState]);

  useEffect(() => {
    personaRef.current = voicePersona;
  }, [voicePersona]);

  useEffect(() => {
    return () => {
      if (pokeTimerRef.current !== null) {
        window.clearTimeout(pokeTimerRef.current);
      }
    };
  }, []);

  // Lightweight ambient floating embers inside square frame (non-blocking visual atmosphere)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const motes: EmberMote[] = Array.from({ length: 24 }, (_, idx) => ({
      x: (idx * 0.37) % 1,
      y: (idx * 0.23) % 1,
      r: 0.9 + (idx % 3) * 0.65,
      vy: 0.032 + (idx % 5) * 0.013,
      vx: (idx % 2 === 0 ? 1 : -1) * (0.007 + (idx % 3) * 0.004),
      alpha: 0.26 + (idx % 4) * 0.13,
      phase: idx * 1.17,
    }));

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const size = Math.max(120, Math.round(rect.width));
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      const curState = animStateRef.current;
      const isOracle = personaRef.current === 'female_oracle';
      const speedBoost =
        curState === 'talking' ? 1.8 : curState === 'listening' ? 1.28 : curState === 'thinking' ? 1.4 : 1;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const m of motes) {
        m.y -= m.vy * dt * speedBoost;
        m.x += (m.vx + Math.sin(elapsed * 1.4 + m.phase) * 0.011) * dt;
        if (m.y < -0.04) {
          m.y = 1.04;
          m.x = (m.x + 0.31) % 1;
        }
        if (m.x < 0) m.x += 1;
        if (m.x > 1) m.x -= 1;

        const px = m.x * w;
        const py = m.y * h;
        const pulseAlpha = m.alpha * (0.6 + 0.4 * Math.sin(elapsed * 2.8 + m.phase));
        ctx.beginPath();
        ctx.arc(px, py, m.r, 0, Math.PI * 2);
        ctx.fillStyle = isOracle
          ? `rgba(218, 226, 245, ${pulseAlpha.toFixed(3)})`
          : `rgba(244, 196, 110, ${pulseAlpha.toFixed(3)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handleTap = () => {
    setPokePulse(true);
    if (pokeTimerRef.current !== null) {
      window.clearTimeout(pokeTimerRef.current);
    }
    pokeTimerRef.current = window.setTimeout(() => {
      setPokePulse(false);
      pokeTimerRef.current = null;
    }, 300);
    onPokeAbbot?.();
  };

  const stageCssVars = {
    '--abbot-gaze-x': `${(gazeBiasX * -5.2).toFixed(2)}px`,
    '--abbot-speech-amp': Math.max(0, Math.min(1, speechAmplitude)).toFixed(3),
  } as React.CSSProperties;

  return (
    <div
      data-abbot-state={resolvedAnimState}
      data-abbot-transitioning={isStateTransitioning ? 'true' : 'false'}
      style={stageCssVars}
      className={`relative flex items-center justify-center bg-[#090B0F] p-2 sm:p-3 overflow-hidden select-none ${className}`}
      aria-label="พอร์ตเทรตท่านเจ้าอาวาสกบเฒ่า"
    >
      {/* Subtle shrine ambient vignette behind square frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            voicePersona === 'female_oracle'
              ? 'radial-gradient(circle at 50% 50%, rgba(184, 199, 224, 0.14) 0%, rgba(9, 11, 15, 0.96) 74%)'
              : 'radial-gradient(circle at 50% 50%, rgba(212, 163, 89, 0.14) 0%, rgba(9, 11, 15, 0.96) 74%)',
        }}
      />

      {/* Crisp Hyper-Realistic 1:1 Square Oracle Frame controlled by CSS keyframe states */}
      <button
        type="button"
        onClick={handleTap}
        aria-label="แตะที่ภาพท่านเจ้าอาวาสกบเฒ่า"
        className={`abbot-square-frame relative aspect-square h-full max-h-full w-auto max-w-full rounded-xl border border-[var(--theme-accent)]/45 bg-[#0D1015] overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.85)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] ${
          pokePulse ? 'scale-[0.982]' : 'scale-100'
        }`}
      >
        {/* CSS Keyframe-Controlled Portrait Rig (idle breathe / listening lean / thinking sway / talking cadence) */}
        <div className="abbot-portrait-rig relative w-full h-full">
          <img
            src={FROG_ORACLE_PORTRAIT_IMG}
            alt="ท่านเจ้าอาวาสกบเฒ่าในความมืดแห่งอาราม"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center block"
          />

          {/* CSS-Controlled Mid-Speech Throat-Sac & Parted Mouth Blend Layer */}
          <img
            src={FROG_ORACLE_SPEAKING_IMG}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="abbot-speaking-layer absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />
        </div>

        {/* CSS-Controlled Warm Brass Lantern Focal Glow */}
        <div
          aria-hidden="true"
          className="abbot-lantern-glow pointer-events-none absolute -bottom-6 -left-6 w-44 h-44 rounded-full mix-blend-screen"
          style={{
            background:
              voicePersona === 'female_oracle'
                ? 'radial-gradient(circle, rgba(244,214,158,0.45) 0%, rgba(184,199,224,0.16) 45%, transparent 72%)'
                : 'radial-gradient(circle, rgba(255,196,92,0.52) 0%, rgba(212,163,89,0.2) 45%, transparent 72%)',
          }}
        />

        {/* Atmospheric Floating Embers Canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full"
        />

        {/* Subtle Inner Chiaroscuro Vignette + Corner Brass Rim */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.72)] ring-1 ring-inset ring-[var(--theme-accent)]/25"
        />
      </button>
    </div>
  );
}
