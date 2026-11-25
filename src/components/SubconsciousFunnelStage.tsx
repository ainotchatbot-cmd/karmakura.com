import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BookmarkPlus,
  Check,
  Compass,
  Layers,
  Loader2,
  MessageSquare,
  Pause,
  QrCode,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  TIMEFRAME_OPTIONS,
  type DigestTimeframe,
  type DomainSlot,
  type PerspectiveLens as PerspectiveLensId,
} from '../config/site.config';
import type { ComputedDestinyProfile } from '../lib/birthProfile';
import type { AbbotChatResponse } from '../lib/abbot-ai';
import type { FunnelReadingAiPayload, VoicePersona } from '../lib/gemini-thai-voice';
import { saveReadingDigest } from '../lib/firestoreStore';
import {
  applyRoundChoice,
  buildGroundedOutcomeDigest,
  FUNNEL_ARTWORK_URLS,
  getRoundPair,
  INITIAL_BEHAVIOR_STATE,
  INITIAL_LATENT_SCORES,
  predictSubconsciousOutcome,
  type BehavioralState,
  type DisplayLangMode,
  type FunnelChoiceRecord,
  type LatentDesireScores,
  type SubconsciousPrediction,
} from '../lib/subconsciousFunnel';
import { LoreLibrary } from './LoreLibrary';
import { TarotCardArtwork } from './MysticArtifacts';
import { PerspectiveLens, type LensFilterValue } from './PerspectiveLens';

export type FunnelPhase = 'ROUND' | 'PREDICTING' | 'REVEAL';
type RevealTab = 'story' | 'lenses' | 'archive';
type RoundTransitionStage = 'idle' | 'exiting' | 'entering';

interface FunnelRoundState {
  stepIndex: number;
  scores: LatentDesireScores;
  behavior: BehavioralState;
  choices: FunnelChoiceRecord[];
}

const INITIAL_ROUND_STATE: FunnelRoundState = {
  stepIndex: 0,
  scores: INITIAL_LATENT_SCORES,
  behavior: INITIAL_BEHAVIOR_STATE,
  choices: [],
};

interface CachedPredictionEntry {
  key: string;
  createdAt: number;
  payload: FunnelReadingAiPayload;
}

const PREDICTION_CACHE_STORAGE_KEY = 'gp_funnel_prediction_cache_v1';
const PREDICTION_CACHE_MAX_ENTRIES = 16;
const PREDICTION_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const memoryPredictionCache = new Map<string, CachedPredictionEntry>();
let storageCacheHydrated = false;

function hydratePredictionCache(): void {
  if (storageCacheHydrated || typeof window === 'undefined') return;
  storageCacheHydrated = true;
  try {
    const raw = window.localStorage.getItem(PREDICTION_CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as CachedPredictionEntry[];
    if (!Array.isArray(parsed)) return;
    const now = Date.now();
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry.key === 'string' &&
        typeof entry.createdAt === 'number' &&
        entry.payload &&
        now - entry.createdAt <= PREDICTION_CACHE_TTL_MS
      ) {
        memoryPredictionCache.set(entry.key, entry);
      }
    }
  } catch {
    // ignore storage errors
  }
}

function persistPredictionCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const entries = Array.from(memoryPredictionCache.values()).slice(-PREDICTION_CACHE_MAX_ENTRIES);
    window.localStorage.setItem(PREDICTION_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

function getCachedPredictionPayload(key: string): FunnelReadingAiPayload | null {
  hydratePredictionCache();
  const hit = memoryPredictionCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.createdAt > PREDICTION_CACHE_TTL_MS) {
    memoryPredictionCache.delete(key);
    persistPredictionCache();
    return null;
  }
  // Touch entry for LRU order
  memoryPredictionCache.delete(key);
  memoryPredictionCache.set(key, hit);
  return hit.payload;
}

function setCachedPredictionPayload(key: string, payload: FunnelReadingAiPayload): void {
  hydratePredictionCache();
  memoryPredictionCache.delete(key);
  memoryPredictionCache.set(key, {
    key,
    createdAt: Date.now(),
    payload,
  });
  while (memoryPredictionCache.size > PREDICTION_CACHE_MAX_ENTRIES) {
    const oldestKey = memoryPredictionCache.keys().next().value;
    if (oldestKey === undefined) break;
    memoryPredictionCache.delete(oldestKey);
  }
  persistPredictionCache();
}

function buildPredictionCacheKey(params: {
  domain: DomainSlot;
  base: SubconsciousPrediction;
  choices: FunnelChoiceRecord[];
  persona: VoicePersona;
  timeframe: DigestTimeframe;
  activeLens: PerspectiveLensId;
  personalProfile: ComputedDestinyProfile;
}): string {
  const pathSig = params.choices.map((c) => `${c.pairId}:${c.choice}`).join('>');
  const profileSig = [
    params.personalProfile.thaiWeekdayTh,
    params.personalProfile.westernZodiacTh,
    params.personalProfile.lifePathNumber,
    params.personalProfile.focusLabelTh,
  ].join('|');
  return [
    params.domain,
    params.base.primaryDimension,
    params.base.secondaryDimension,
    params.base.predictedCard.id,
    pathSig,
    params.persona,
    params.timeframe,
    params.activeLens,
    profileSig,
  ].join('::');
}

function applyAiPayloadToPrediction(
  basePrediction: SubconsciousPrediction,
  aiPayload: FunnelReadingAiPayload
): SubconsciousPrediction {
  return {
    ...basePrediction,
    storyHeadlineTh: aiPayload.storyHeadlineTh || basePrediction.storyHeadlineTh,
    affirmingStoryTh: aiPayload.affirmingStoryTh || basePrediction.affirmingStoryTh,
    groundedActionTh: aiPayload.groundedActionTh || basePrediction.groundedActionTh,
    selfInquiryQuestionTh:
      aiPayload.selfInquiryQuestionTh || basePrediction.selfInquiryQuestionTh,
    spokenScriptTh: aiPayload.spokenScriptTh || basePrediction.spokenScriptTh,
    outcomeDigest: aiPayload.outcomeDigest || basePrediction.outcomeDigest,
  };
}

interface SubconsciousFunnelStageProps {
  domainSlot: DomainSlot;
  activeLens: PerspectiveLensId;
  onActiveLensChange: (lens: PerspectiveLensId) => void;
  voicePersona: VoicePersona;
  langMode: DisplayLangMode;
  personalProfile: ComputedDestinyProfile;
  googleUser: User | null;
  onPhaseChange: (phase: FunnelPhase, stepIndex: number) => void;
  onHoverChoice: (side: 'A' | 'B' | null) => void;
  onAbbotReaction: (quoteTh: string) => void;
  onSpeakStateChange: (speaking: boolean, amplitude?: number) => void;
  onAskAbbotWithContext: (promptText: string) => void;
  onOpenPromptPay: () => void;
  onOpenSettingsProfile: () => void;
  paidReadingToken: string | null;
}

export function SubconsciousFunnelStage({
  domainSlot,
  activeLens,
  onActiveLensChange,
  voicePersona,
  langMode,
  personalProfile,
  googleUser,
  onPhaseChange,
  onHoverChoice,
  onAbbotReaction,
  onSpeakStateChange,
  onAskAbbotWithContext,
  onOpenPromptPay,
  onOpenSettingsProfile,
  paidReadingToken,
}: SubconsciousFunnelStageProps) {
  const [phase, setPhase] = useState<FunnelPhase>('ROUND');
  const [roundState, setRoundState] = useState<FunnelRoundState>(INITIAL_ROUND_STATE);
  const [transitionStage, setTransitionStage] = useState<RoundTransitionStage>('idle');
  const [selectedSide, setSelectedSide] = useState<'A' | 'B' | null>(null);

  const [revealTab, setRevealTab] = useState<RevealTab>('story');
  const [timeframe, setTimeframe] = useState<DigestTimeframe>('daily');
  const [lensFilter, setLensFilter] = useState<LensFilterValue>(activeLens);
  const [showSideBySide, setShowSideBySide] = useState(true);

  const [prediction, setPrediction] = useState<SubconsciousPrediction | null>(null);
  const [predictionCacheKey, setPredictionCacheKey] = useState<string | null>(null);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'ready' | 'fallback'>('idle');
  const [aiNoticeTh, setAiNoticeTh] = useState<string | null>(null);

  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlayingStory, setIsPlayingStory] = useState(false);
  const storyAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioCacheRef = useRef<Map<string, string>>(new Map());

  const [savingDigest, setSavingDigest] = useState(false);
  const [digestSaved, setDigestSaved] = useState(false);

  const roundOpenedAtRef = useRef<number>(Date.now());
  const roundTransitionTimerRef = useRef<number | null>(null);
  const roundEnterTimerRef = useRef<number | null>(null);
  const predictRequestIdRef = useRef<number>(0);

  const { stepIndex, scores, behavior, choices } = roundState;

  const currentPair = useMemo(
    () => getRoundPair(stepIndex, scores, choices),
    [stepIndex, scores, choices]
  );

  // Preload all tarot artwork plates on mount so all 5 A/B transitions render instantaneously
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloaded: HTMLImageElement[] = [];
    for (const url of FUNNEL_ARTWORK_URLS) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      preloaded.push(img);
    }
    return () => {
      preloaded.length = 0;
    };
  }, []);

  useEffect(() => {
    onPhaseChange(phase, stepIndex);
  }, [phase, stepIndex, onPhaseChange]);

  useEffect(() => {
    setLensFilter(activeLens);
  }, [activeLens]);

  const stopStoryAudio = useCallback(() => {
    storyAudioRef.current?.pause();
    setIsPlayingStory(false);
    onSpeakStateChange(false, 0);
  }, [onSpeakStateChange]);

  useEffect(() => {
    return () => {
      if (roundTransitionTimerRef.current !== null) {
        window.clearTimeout(roundTransitionTimerRef.current);
      }
      if (roundEnterTimerRef.current !== null) {
        window.clearTimeout(roundEnterTimerRef.current);
      }
      predictRequestIdRef.current += 1;
      storyAudioRef.current?.pause();
      onSpeakStateChange(false, 0);
    };
  }, [onSpeakStateChange]);

  const runFinalPrediction = useCallback(
    async (
      finalScores: LatentDesireScores,
      finalBehavior: BehavioralState,
      finalChoices: FunnelChoiceRecord[]
    ) => {
      const requestId = ++predictRequestIdRef.current;
      setPhase('PREDICTING');
      setAiNoticeTh(null);
      setAiStatus('idle');
      setIsCachedResult(false);
      setDigestSaved(false);
      stopStoryAudio();

      const basePrediction = predictSubconsciousOutcome({
        scores: finalScores,
        behavior: finalBehavior,
        choices: finalChoices,
        personalProfile,
        domain: domainSlot,
        timeframe,
        activeLens,
      });

      const cacheKey = buildPredictionCacheKey({
        domain: domainSlot,
        base: basePrediction,
        choices: finalChoices,
        persona: voicePersona,
        timeframe,
        activeLens,
        personalProfile,
      });
      setPredictionCacheKey(cacheKey);

      const cachedAiPayload = getCachedPredictionPayload(cacheKey);
      if (cachedAiPayload) {
        await new Promise((resolve) => window.setTimeout(resolve, 340));
        if (predictRequestIdRef.current !== requestId) return;
        setPrediction(applyAiPayloadToPrediction(basePrediction, cachedAiPayload));
        setAiStatus('ready');
        setIsCachedResult(true);
        onAbbotReaction(
          `อ๊บ... หน้าไพ่เปิดแล้วโยม: “${basePrediction.predictedCard.nameTh}” — จิตใต้สำนึกของโยมซื่อตรงต่อหัวใจยิ่งนัก`
        );
        setRevealTab('story');
        setPhase('REVEAL');
        return;
      }

      const minDelay = new Promise((resolve) => window.setTimeout(resolve, 750));

      try {
        const [res] = await Promise.all([
          fetch('/api/funnel-reading', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: domainSlot,
              primaryDimension: basePrediction.primaryDimension,
              secondaryDimension: basePrediction.secondaryDimension,
              unmaskedTitleTh: basePrediction.unmaskedTitleTh,
              behavioralSummaryTh: basePrediction.behavioralLabelTh,
              chosenLabelsTh: finalChoices.map((c) => c.chosenTitleTh),
              predictedCardNameTh: basePrediction.predictedCard.nameTh,
              predictedCardNameEn: basePrediction.predictedCard.nameEn,
              predictedCardLightTh: basePrediction.predictedCard.lightTh,
              predictedCardShadowTh: basePrediction.predictedCard.shadowTh,
              persona: voicePersona,
              timeframe,
              activeLens,
              personalContext: personalProfile.promptSummaryText,
            }),
          }),
          minDelay,
        ]);

        if (predictRequestIdRef.current !== requestId) return;

        if (res.ok) {
          const aiPayload = (await res.json()) as FunnelReadingAiPayload;
          if (predictRequestIdRef.current !== requestId) return;
          setCachedPredictionPayload(cacheKey, aiPayload);
          setPrediction(applyAiPayloadToPrediction(basePrediction, aiPayload));
          setAiStatus('ready');
        } else {
          setPrediction(basePrediction);
          setAiStatus('fallback');
          setAiNoticeTh(
            'กำลังแสดงคำทำนายเชิงโครงสร้างไพ่และพิกัดชะตา (ยังไม่สามารถเชื่อมต่อ AI บรรยายเสริมในสภาพแวดล้อมนี้)'
          );
        }
      } catch {
        await minDelay;
        if (predictRequestIdRef.current !== requestId) return;
        setPrediction(basePrediction);
        setAiStatus('fallback');
        setAiNoticeTh(
          'กำลังแสดงคำทำนายเชิงโครงสร้างไพ่และพิกัดชะตา (การเชื่อมต่อ AI ขัดข้องชั่วคราว)'
        );
      }

      onAbbotReaction(
        `อ๊บ... หน้าไพ่เปิดแล้วโยม: “${basePrediction.predictedCard.nameTh}” — จิตใต้สำนึกของโยมซื่อตรงต่อหัวใจยิ่งนัก`
      );
      setRevealTab('story');
      setPhase('REVEAL');
    },
    [
      activeLens,
      domainSlot,
      onAbbotReaction,
      personalProfile,
      stopStoryAudio,
      timeframe,
      voicePersona,
    ]
  );

  const handlePickChoice = useCallback(
    (choiceSide: 'A' | 'B') => {
      if (phase !== 'ROUND' || transitionStage === 'exiting') return;
      onHoverChoice(null);
      setSelectedSide(choiceSide);
      setTransitionStage('exiting');

      const latencyMs = Math.max(120, Date.now() - roundOpenedAtRef.current);
      const { nextScores, nextBehavior, chosenOption } = applyRoundChoice(
        currentPair,
        choiceSide,
        scores,
        behavior
      );

      const record: FunnelChoiceRecord = {
        stepIndex,
        pairId: currentPair.pairId,
        choice: choiceSide,
        chosenTitleTh: chosenOption.titleTh,
        latencyMs,
      };
      const nextChoices = [...choices, record];
      onAbbotReaction(chosenOption.abbotReactionTh);

      if (roundTransitionTimerRef.current !== null) {
        window.clearTimeout(roundTransitionTimerRef.current);
      }
      if (roundEnterTimerRef.current !== null) {
        window.clearTimeout(roundEnterTimerRef.current);
      }

      roundTransitionTimerRef.current = window.setTimeout(() => {
        roundTransitionTimerRef.current = null;
        setSelectedSide(null);
        roundOpenedAtRef.current = Date.now();

        if (stepIndex < 4) {
          setRoundState({
            stepIndex: stepIndex + 1,
            scores: nextScores,
            behavior: nextBehavior,
            choices: nextChoices,
          });
          setTransitionStage('entering');
          roundEnterTimerRef.current = window.setTimeout(() => {
            setTransitionStage('idle');
            roundEnterTimerRef.current = null;
          }, 240);
        } else {
          setRoundState({
            stepIndex: 4,
            scores: nextScores,
            behavior: nextBehavior,
            choices: nextChoices,
          });
          setTransitionStage('idle');
          void runFinalPrediction(nextScores, nextBehavior, nextChoices);
        }
      }, 180);
    },
    [
      behavior,
      choices,
      currentPair,
      onAbbotReaction,
      onHoverChoice,
      phase,
      runFinalPrediction,
      scores,
      stepIndex,
      transitionStage,
    ]
  );

  // Seamless keyboard quick-pick (A / Left / 1 vs B / Right / 2) during active 5-round test
  useEffect(() => {
    if (phase !== 'ROUND') return;
    const onKeyDown = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (ev.key === 'ArrowLeft' || ev.key === '1' || ev.key.toLowerCase() === 'a') {
        handlePickChoice('A');
      } else if (ev.key === 'ArrowRight' || ev.key === '2' || ev.key.toLowerCase() === 'b') {
        handlePickChoice('B');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePickChoice, phase]);

  const handleResetFunnel = () => {
    if (roundTransitionTimerRef.current !== null) {
      window.clearTimeout(roundTransitionTimerRef.current);
      roundTransitionTimerRef.current = null;
    }
    if (roundEnterTimerRef.current !== null) {
      window.clearTimeout(roundEnterTimerRef.current);
      roundEnterTimerRef.current = null;
    }
    predictRequestIdRef.current += 1;
    stopStoryAudio();
    setPhase('ROUND');
    setRoundState(INITIAL_ROUND_STATE);
    setSelectedSide(null);
    setTransitionStage('entering');
    roundEnterTimerRef.current = window.setTimeout(() => {
      setTransitionStage('idle');
      roundEnterTimerRef.current = null;
    }, 240);
    setPrediction(null);
    setPredictionCacheKey(null);
    setIsCachedResult(false);
    setAiStatus('idle');
    setAiNoticeTh(null);
    setDigestSaved(false);
    setRevealTab('story');
    roundOpenedAtRef.current = Date.now();
    onAbbotReaction(
      'อ๊บ... ล้างกระดานเรียบร้อย ลองหลับตาหนึ่งวินาทีแล้วเลือกภาพแรกที่ดึงใจอีกสักรอบสิโยม'
    );
  };

  const playWav = (base64Wav: string) => {
    storyAudioRef.current?.pause();
    const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
    storyAudioRef.current = audio;
    setIsPlayingStory(true);
    onSpeakStateChange(true, 0.68);
    audio.onended = () => {
      setIsPlayingStory(false);
      onSpeakStateChange(false, 0);
    };
    audio.onerror = () => {
      setIsPlayingStory(false);
      onSpeakStateChange(false, 0);
    };
    audio.play().catch(() => {
      setIsPlayingStory(false);
      onSpeakStateChange(false, 0);
    });
  };

  const handlePlayPredictionVoice = async () => {
    if (!prediction || audioLoading) return;
    if (isPlayingStory) {
      stopStoryAudio();
      return;
    }

    const audioCacheKey = `${predictionCacheKey ?? prediction.predictedCard.id}::${voicePersona}`;
    const cachedWav = ttsAudioCacheRef.current.get(audioCacheKey);
    if (cachedWav) {
      playWav(cachedWav);
      return;
    }

    setAudioLoading(true);
    try {
      const res = await fetch('/api/abbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prediction.spokenScriptTh,
          speakOnly: true,
          persona: voicePersona,
        }),
      });
      const data = (await res.json()) as AbbotChatResponse & { error?: string };
      if (!res.ok || !data.audioBase64Wav) {
        throw new Error(data.error || 'ไม่สามารถสังเคราะห์เสียงบรรยายได้');
      }
      if (ttsAudioCacheRef.current.size >= 16) {
        const firstKey = ttsAudioCacheRef.current.keys().next().value;
        if (firstKey !== undefined) ttsAudioCacheRef.current.delete(firstKey);
      }
      ttsAudioCacheRef.current.set(audioCacheKey, data.audioBase64Wav);
      playWav(data.audioBase64Wav);
    } catch (err) {
      setAiNoticeTh(err instanceof Error ? err.message : 'ไม่สามารถสังเคราะห์เสียงบรรยายได้');
    } finally {
      setAudioLoading(false);
    }
  };

  const handleTimeframeSwitch = (nextTf: DigestTimeframe) => {
    setTimeframe(nextTf);
    if (!prediction) return;
    setPrediction({
      ...prediction,
      outcomeDigest: buildGroundedOutcomeDigest({
        primaryDimension: prediction.primaryDimension,
        predictedCard: prediction.predictedCard,
        storyHeadlineTh: prediction.storyHeadlineTh,
        groundedActionTh: prediction.groundedActionTh,
        timeframe: nextTf,
        activeLens: lensFilter === 'all' ? activeLens : lensFilter,
      }),
    });
  };

  const handleSaveToFirestore = async () => {
    if (!googleUser || !prediction || savingDigest || digestSaved) return;
    setSavingDigest(true);
    try {
      await saveReadingDigest({
        uid: googleUser.uid,
        domainSlot,
        timeframe,
        activeLens: lensFilter === 'all' ? activeLens : lensFilter,
        promptSummary: `${prediction.unmaskedTitleTh} (${prediction.behavioralLabelTh})`,
        headline: `${prediction.predictedCard.nameTh} · ${prediction.storyHeadlineTh}`,
        coreGuidance: prediction.affirmingStoryTh,
      });
      setDigestSaved(true);
    } finally {
      setSavingDigest(false);
    }
  };

  // =========================================================================
  // VIEW 1: 5-ROUND MASKED A/B VISUAL FUNNEL
  // =========================================================================
  if (phase === 'ROUND') {
    const pairAnimClass =
      transitionStage === 'exiting'
        ? 'funnel-pair-exit pointer-events-none'
        : transitionStage === 'entering'
          ? 'funnel-pair-enter'
          : '';

    return (
      <section
        aria-label="แบบทดสอบสัญชาตญาณเลือกภาพ 5 รอบ"
        className="h-full min-h-0 flex flex-col rounded-xl border border-[var(--theme-accent)]/25 bg-[var(--theme-surface)] p-4 sm:p-5 shadow-2xl overflow-hidden"
      >
        {/* Minimal Progress + Prompt Header */}
        <div className="shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-accent)] tabular-nums">
                รอบที่ {stepIndex + 1} / 5
              </span>
              {langMode === 'th_en' && (
                <span className="text-[11px] text-[#C0C5CE]/65">· Intuitive Mirror</span>
              )}
            </div>

            <div className="flex items-center gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx < stepIndex
                      ? 'w-5 bg-[var(--theme-accent)]'
                      : idx === stepIndex
                        ? 'w-7 bg-[#F4EFE6]'
                        : 'w-3 bg-[#C0C5CE]/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div key={`prompt-${currentPair.pairId}`} className={pairAnimClass}>
            <h1 className="font-display text-lg sm:text-xl font-semibold text-[#F4EFE6] leading-snug">
              {currentPair.promptTh}
            </h1>
            {langMode === 'th_en' && (
              <p className="mt-0.5 text-xs text-[#C0C5CE]/75">{currentPair.promptEn}</p>
            )}
          </div>
        </div>

        {/* Paired Dark-Luxury Tarot Artwork Cards (A vs B) */}
        <div
          key={currentPair.pairId}
          className={`flex-1 min-h-0 mt-3 grid grid-cols-2 gap-3 sm:gap-4 ${pairAnimClass}`}
        >
          {([currentPair.optionA, currentPair.optionB] as const).map((opt) => {
            const isPicked = selectedSide === opt.id;
            return (
              <button
                key={`${currentPair.pairId}-${opt.id}`}
                type="button"
                disabled={transitionStage === 'exiting'}
                onMouseEnter={() => onHoverChoice(opt.id)}
                onMouseLeave={() => onHoverChoice(null)}
                onFocus={() => onHoverChoice(opt.id)}
                onBlur={() => onHoverChoice(null)}
                onClick={() => handlePickChoice(opt.id)}
                className={`group relative h-full min-h-0 flex flex-col rounded-xl border bg-[#0D1015] overflow-hidden text-left transition-all duration-200 lantern-glow focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] ${
                  isPicked
                    ? 'border-[var(--theme-accent)] scale-[0.985] shadow-[0_0_26px_color-mix(in_srgb,var(--theme-accent)_40%,transparent)]'
                    : 'border-[var(--theme-accent)]/30 hover:border-[var(--theme-accent)] hover:-translate-y-0.5'
                }`}
              >
                {/* Visual Artwork Frame */}
                <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                  <img
                    src={opt.artworkSrc}
                    alt={opt.artworkAltTh}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1015] via-[#0D1015]/25 to-transparent"
                  />
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center justify-center w-7 h-7 rounded-md border border-[var(--theme-accent)]/55 bg-[#0D1015]/90 font-display text-xs font-semibold text-[var(--theme-accent)]">
                    {opt.id}
                  </span>
                </div>

                {/* Minimal Choice Label + 1-line whisper (Zero spoilers) */}
                <div className="shrink-0 p-3 sm:p-3.5 border-t border-[var(--theme-accent)]/15 bg-[#12161E]">
                  <div className="font-display text-sm sm:text-base font-semibold text-[#F4EFE6] group-hover:text-[var(--theme-accent)] transition-colors leading-snug">
                    {opt.titleTh}
                  </div>
                  {langMode === 'th_en' && (
                    <div className="text-[11px] text-[var(--theme-accent)]/85 mt-0.5">
                      {opt.titleEn}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-[#C0C5CE] leading-snug line-clamp-2">
                    {opt.whisperTh}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Subtle Bottom Precision Nudge */}
        <div className="shrink-0 mt-2.5 flex items-center justify-between gap-2 text-[11px] text-[#C0C5CE]/75">
          <span>เลือกตามสัญชาตญาณแรก — ไม่มีคำตอบถูกหรือผิด</span>
          <button
            type="button"
            onClick={onOpenSettingsProfile}
            className="text-[var(--theme-accent)] hover:underline whitespace-nowrap"
          >
            พิกัดเกิด: {personalProfile.thaiWeekdayTh} · เลข {personalProfile.lifePathNumber}
          </button>
        </div>
      </section>
    );
  }

  // =========================================================================
  // VIEW 2: SYNTHESIS CONVERGENCE PULSE (PREDICTING)
  // =========================================================================
  if (phase === 'PREDICTING' || !prediction) {
    return (
      <section
        aria-label="กำลังประมวลผลจิตใต้สำนึก"
        className="h-full min-h-0 flex flex-col items-center justify-center rounded-xl border border-[var(--theme-accent)]/30 bg-[var(--theme-surface)] p-6 text-center shadow-2xl"
      >
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full border border-[var(--theme-accent)]/40 bg-[#0D1015]">
          <Sparkles className="w-8 h-8 text-[var(--theme-accent)]" />
        </div>
        <h2 className="mt-5 font-display text-xl sm:text-2xl font-semibold text-[#F4EFE6]">
          กำลังประกอบสัญญาณทั้ง 5 ภาพเป็นคำตอบเดียว...
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#C0C5CE] max-w-md leading-relaxed">
          เชื่อมโยงแรงโน้มถ่วงของจิตใต้สำนึก รูปแบบการตัดสินใจ และพิกัดวันเกิดของคุณเข้ากับหน้าไพ่ที่ซ่อนอยู่
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {choices.map((c, idx) => (
            <span
              key={`${c.pairId}-${idx}`}
              className="px-2.5 py-1 rounded border border-[var(--theme-accent)]/30 bg-[#0D1015] text-[11px] text-[#C0C5CE]"
            >
              {idx + 1}. {c.chosenTitleTh}
            </span>
          ))}
        </div>
      </section>
    );
  }

  // =========================================================================
  // VIEW 3: CULMINATING END-CARD & TABBED REVEAL (ZERO OUTER SCROLL)
  // =========================================================================
  return (
    <section
      aria-label="ผลการทำนายจากจิตใต้สำนึก"
      className="h-full min-h-0 flex flex-col rounded-xl border border-[var(--theme-accent)]/35 bg-[var(--theme-surface)] shadow-2xl overflow-hidden"
    >
      {/* Top Reveal Tabs + Play Again Header */}
      <div className="shrink-0 px-3 sm:px-4 py-2.5 border-b border-[#C0C5CE]/15 bg-[#0D1015]/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1" role="tablist" aria-label="มุมมองคำทำนาย">
          {(
            [
              { id: 'story', label: 'คำทำนายและเรื่องราว', icon: Sparkles },
              { id: 'lenses', label: 'มุมมอง 6 ศาสตร์', icon: Compass },
              { id: 'archive', label: 'คลังไพ่ 78 ใบ', icon: Layers },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = revealTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRevealTab(tab.id)}
                className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                    : 'text-[#C0C5CE] hover:text-[#F4EFE6] bg-[#1A202B]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleResetFunnel}
          className="min-h-[34px] px-3 py-1 rounded-md border border-[var(--theme-accent)]/45 bg-[#161B24] text-xs font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-accent)] hover:text-[#0D1015] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>เล่นใหม่อีกครั้ง</span>
        </button>
      </div>

      {/* Tab Body (Internal clean scroll if long, keeping window completely locked) */}
      <div className="flex-1 min-h-0 overflow-y-auto sanctuary-scroll p-4 sm:p-5">
        {revealTab === 'story' && (
          <div className="space-y-4">
            {aiNoticeTh && (
              <div className="rounded-lg border border-[var(--theme-accent)]/30 bg-[#0D1015]/70 px-3 py-2 text-[11px] text-[#C0C5CE] flex items-center justify-between gap-2">
                <span>{aiNoticeTh}</span>
                {aiStatus === 'fallback' && (
                  <button
                    type="button"
                    onClick={() => void runFinalPrediction(scores, behavior, choices)}
                    className="text-[var(--theme-accent)] hover:underline shrink-0"
                  >
                    ลองเชื่อมต่อ AI ใหม่
                  </button>
                )}
              </div>
            )}

            {/* End-Card Hero Split: Artwork + Unmasked Subconscious Insight */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-4 flex flex-col items-center sm:items-stretch">
                <TarotCardArtwork
                  motif={prediction.predictedCard.symbolMotif}
                  alt={prediction.predictedCard.nameTh}
                  className="w-40 sm:w-full aspect-[3/4] mx-auto"
                />
                <div className="mt-2 text-center sm:text-left">
                  <div className="text-[11px] text-[var(--theme-accent)] font-medium">
                    ไพ่ตัวแทนที่ปรากฏ · {prediction.confidencePercent}% Match
                    {isCachedResult ? ' · ดึงผลเดิมอย่างไว' : ''}
                  </div>
                  <div className="font-display text-base font-semibold text-[#F4EFE6]">
                    {prediction.predictedCard.nameTh}
                  </div>
                  <div className="text-xs text-[#C0C5CE]">{prediction.predictedCard.nameEn}</div>
                </div>
              </div>

              <div className="sm:col-span-8 space-y-3">
                {/* Unmasked Subconscious Core Reveal */}
                <div className="rounded-xl border border-[var(--theme-accent)]/40 bg-[#0D1015] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-[var(--theme-accent)]">
                      สิ่งที่จิตใต้สำนึกของคุณกำลังเรียกร้องจริง
                    </span>
                    <span className="text-[#C0C5CE]">
                      {langMode === 'th_en'
                        ? prediction.behavioralLabelEn
                        : prediction.behavioralLabelTh}
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-lg font-semibold text-[#F4EFE6]">
                    {prediction.unmaskedTitleTh}
                  </h2>
                  <p className="mt-1 text-xs text-[#C0C5CE] leading-relaxed">
                    {prediction.unmaskedEssenceTh}
                  </p>
                </div>

                {/* Affirming Story Sheet */}
                <div className="rounded-xl parchment-sheet border border-[var(--theme-accent)]/45 p-4 sm:p-5 space-y-3 shadow-lg">
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#1C1F24] leading-snug">
                    “{prediction.storyHeadlineTh}”
                  </h3>
                  <div className="text-xs sm:text-sm text-[#1C1F24]/90 leading-relaxed whitespace-pre-line">
                    {prediction.affirmingStoryTh}
                  </div>

                  <div className="pt-2.5 border-t border-[#1C1F24]/15 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-white/70 border border-[#4A5D4E]/25 p-2.5">
                      <span className="font-semibold text-[#4A5D4E] block">ก้าวเล็กๆ วันนี้</span>
                      <p className="mt-0.5 text-[#1C1F24]">{prediction.groundedActionTh}</p>
                    </div>
                    <div className="rounded-lg bg-[#1C1F24]/5 border border-[#1C1F24]/15 p-2.5">
                      <span className="font-semibold text-[#1C1F24] block">คำถามสะท้อนใจ</span>
                      <p className="mt-0.5 italic text-[#1C1F24]/85">
                        “{prediction.selfInquiryQuestionTh}”
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Action Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={audioLoading}
                  onClick={() => void handlePlayPredictionVoice()}
                  className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[var(--theme-accent)] text-[#0D1015] text-xs font-semibold inline-flex items-center gap-1.5 lantern-glow disabled:opacity-60"
                >
                  {audioLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlayingStory ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>
                    {isPlayingStory
                      ? 'หยุดเสียง'
                      : `ฟังเสียงคำทำนาย (${voicePersona === 'male_sage' ? 'Sage' : 'Oracle'})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onAskAbbotWithContext(
                      `อาตมาได้ไพ่ “${prediction.predictedCard.nameTh}” ในมิติ ${prediction.unmaskedTitleTh} — อยากให้ท่านเจ้าอาวาสช่วยชี้แนะเพิ่มเติมจากคำทำนายนี้หน่อย`
                    )
                  }
                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[#C0C5CE]/25 bg-[#0D1015] text-xs text-[#F4EFE6] hover:border-[var(--theme-accent)] inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                  <span>ถามเจ้าอาวาสต่อ</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenPromptPay}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[var(--theme-accent)]/40 bg-[#0D1015] text-xs text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/15 inline-flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>
                    {paidReadingToken ? 'มีสิทธิ์เจาะลึกพร้อมใช้' : 'ปลดล็อกเจาะลึก PromptPay'}
                  </span>
                </button>
              </div>

              {googleUser && (
                <button
                  type="button"
                  disabled={savingDigest || digestSaved}
                  onClick={() => void handleSaveToFirestore()}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#4A5D4E]/60 bg-[#4A5D4E]/20 text-xs text-[#F4EFE6] inline-flex items-center gap-1.5 disabled:opacity-70"
                >
                  {digestSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>บันทึกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                      <span>{savingDigest ? 'กำลังบันทึก...' : 'บันทึกลงคลัง'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {revealTab === 'lenses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F4EFE6]">
                  เทียบมุมมอง 6 ศาสตร์สำหรับไพ่ “{prediction.predictedCard.nameTh}”
                </h3>
                <p className="text-xs text-[#C0C5CE]">
                  แก่นคำตอบเดียวกัน — เลือกกรอบเวลาและเลนส์ที่ตรงใจคุณ
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1015] border border-[#C0C5CE]/15">
                {TIMEFRAME_OPTIONS.map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => handleTimeframeSwitch(tf.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      timeframe === tf.id
                        ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                        : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {tf.labelTh}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl parchment-sheet p-4 border border-[var(--theme-accent)]/40 space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#4A5D4E]">
                  1. แก่นคำทำนายช่วง{prediction.outcomeDigest.timeframeLabelTh}
                </div>
                <ul className="list-disc pl-5 text-xs sm:text-sm text-[#1C1F24]/90 space-y-1">
                  {prediction.outcomeDigest.coreDigestBulletsTh.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>

              <PerspectiveLens
                mode="filter"
                selectedFilter={lensFilter}
                onSelectFilter={(next) => {
                  setLensFilter(next);
                  if (next !== 'all') onActiveLensChange(next);
                }}
                lenses={prediction.outcomeDigest.lenses}
                timeframeLabelTh={prediction.outcomeDigest.timeframeLabelTh}
                showSideBySide={showSideBySide}
                onToggleSideBySide={() => setShowSideBySide((v) => !v)}
              />

              <p className="pt-2 border-t border-[#1C1F24]/15 text-[11px] text-[#1C1F24]/70">
                {prediction.outcomeDigest.nonDogmaticNoteTh}
              </p>
            </div>
          </div>
        )}

        {revealTab === 'archive' && <LoreLibrary compact />}
      </div>
    </section>
  );
}
