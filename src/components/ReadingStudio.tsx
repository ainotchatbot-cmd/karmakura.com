import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  ExternalLink,
  Loader2,
  Mail,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import {
  SITE_CONFIG,
  THAI_ETHICS_DISCLAIMER,
  TIMEFRAME_OPTIONS,
  type DigestTimeframe,
  type DomainSlot,
  type PerspectiveLens as PerspectiveLensId,
  type PricingTier,
} from '../config/site.config';
import { FULL_TAROT_DECK, type TarotCardLore } from '../data/majorArcanaLore';
import {
  getInMemoryGmailToken,
  initGoogleAuth,
  signInWithGoogleForGmail,
  signOutGoogle,
} from '../lib/firebaseAuth';
import { saveReadingDigest } from '../lib/firestoreStore';
import type { ComputedDestinyProfile } from '../lib/birthProfile';
import type { GeneratedThaiReading, VoicePersona } from '../lib/gemini-thai-voice';
import {
  ALTAR_STILL_LIFE_IMG,
  TarotCardArtwork,
  TarotCardBackArtwork,
} from './MysticArtifacts';
import { PdpaConsentModal } from './PdpaConsentModal';
import { PerspectiveLens, type LensFilterValue } from './PerspectiveLens';
import { PromptPayCheckout } from './PromptPayCheckout';

interface ReadingStudioProps {
  domain: DomainSlot;
  trialAvailable: boolean;
  onTrialConsumed: () => void;
  injectedPrompt?: { text: string; nonce: number } | null;
  onLensChange?: (lens: PerspectiveLensId) => void;
  personalProfile: ComputedDestinyProfile;
  activeDailyCardTh?: string | null;
}

function drawThreeRandomCards(): TarotCardLore[] {
  const copy = [...FULL_TAROT_DECK];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 3);
}

export function ReadingStudio({
  domain,
  trialAvailable,
  onTrialConsumed,
  injectedPrompt,
  onLensChange,
  personalProfile,
  activeDailyCardTh,
}: ReadingStudioProps) {
  const cfg = SITE_CONFIG[domain];

  const [userPrompt, setUserPrompt] = useState('');
  const [freeAssociation, setFreeAssociation] = useState('');
  const [birthContext, setBirthContext] = useState('');
  const [persona, setPersona] = useState<VoicePersona>('male_sage');
  const [timeframe, setTimeframe] = useState<DigestTimeframe>('daily');
  const [activeLens, setActiveLens] = useState<PerspectiveLensId>('thai_folk');
  const [compareOtherAngles, setCompareOtherAngles] = useState<boolean>(true);
  const [resultViewLens, setResultViewLens] = useState<LensFilterValue>('thai_folk');
  const [showSideBySide, setShowSideBySide] = useState<boolean>(true);

  const [drawnCards, setDrawnCards] = useState<TarotCardLore[]>(() => drawThreeRandomCards());
  const [cardsRevealed, setCardsRevealed] = useState(false);

  const [pdpaCoreConsent, setPdpaCoreConsent] = useState(false);
  const [pdpaGmailConsent, setPdpaGmailConsent] = useState(false);
  const [pdpaModalOpen, setPdpaModalOpen] = useState(false);

  const [googleUid, setGoogleUid] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [gmailThemes, setGmailThemes] = useState<string[]>([]);
  const [loadingGmail, setLoadingGmail] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedThaiReading | null>(null);
  const [accessModeUsed, setAccessModeUsed] = useState<'trial' | 'paid' | null>(null);
  const [savingDigest, setSavingDigest] = useState(false);
  const [digestSaved, setDigestSaved] = useState(false);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isLineBrowser = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /\bLine\b/i.test(navigator.userAgent);
  }, []);

  const externalBrowserUrl = useMemo(() => {
    if (typeof window === 'undefined') return '#';
    const url = new URL(window.location.href);
    url.searchParams.set('openExternalBrowser', '1');
    return url.toString();
  }, []);

  useEffect(() => {
    const unsub = initGoogleAuth(
      (user) => {
        setGoogleUid(user.uid);
        setGoogleEmail(user.email);
      },
      () => {
        setGoogleUid(null);
        setGoogleEmail(null);
        setGmailThemes([]);
      }
    );
    return () => unsub();
  }, []);

  // Reset transient audio playback when result changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setDigestSaved(false);
  }, [result]);

  useEffect(() => {
    if (injectedPrompt?.text) {
      setUserPrompt(injectedPrompt.text);
    }
  }, [injectedPrompt]);

  const handleSaveDigestToFirestore = async () => {
    if (!googleUid || !result || savingDigest || digestSaved) return;
    setSavingDigest(true);
    try {
      await saveReadingDigest({
        uid: googleUid,
        domainSlot: domain,
        timeframe,
        activeLens: resultViewLens === 'all' ? activeLens : resultViewLens,
        promptSummary: userPrompt.trim(),
        headline: result.headlineTh,
        coreGuidance: result.summaryTh,
      });
      setDigestSaved(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถบันทึกผลลงคลังส่วนตัวได้');
    } finally {
      setSavingDigest(false);
    }
  };

  const handleRedrawCards = () => {
    setDrawnCards(drawThreeRandomCards());
    setCardsRevealed(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleForGmail();
      setGoogleUid(res.user.uid);
      setGoogleEmail(res.user.email);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เชื่อมต่อบัญชี Google ไม่สำเร็จ');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUid(null);
    setGoogleEmail(null);
    setGmailThemes([]);
  };

  const fetchGmailThemesIfConsented = async (gmailConsent: boolean): Promise<string[]> => {
    if (!gmailConsent) return [];
    const token = getInMemoryGmailToken();
    if (!token) return [];
    setLoadingGmail(true);
    try {
      const res = await fetch('/api/gmail/themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pdpaGmailConsent: true }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { themesTh?: string[] };
      const themes = data.themesTh ?? [];
      setGmailThemes(themes);
      return themes;
    } finally {
      setLoadingGmail(false);
    }
  };

  const executeReadingRequest = async (overrideToken?: string, overrideThemes?: string[]) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const tokenToUse = overrideToken ?? pendingToken ?? undefined;
      const themesToUse = overrideThemes ?? gmailThemes;

      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          userPrompt: userPrompt.trim(),
          freeAssociation: domain === 'slot_tarot' ? freeAssociation.trim() : undefined,
          drawnCardNames:
            domain === 'slot_tarot'
              ? drawnCards.map((c) => `${c.nameTh} (${c.nameEn})`)
              : undefined,
          birthSeasonOrContext: birthContext.trim() || undefined,
          personalContext: `${personalProfile.promptSummaryText}${
            activeDailyCardTh ? ` | ไพ่เงาประจำวันที่เปิดได้: ${activeDailyCardTh}` : ''
          }`,
          gmailThemes: themesToUse.length > 0 ? themesToUse : undefined,
          persona,
          timeframe,
          activeLens,
          compareOtherAngles,
          pdpaCoreConsent: true,
          readingToken: tokenToUse,
          userId: googleUid ?? undefined,
        }),
      });

      const data = (await res.json()) as {
        code?: string;
        error?: string;
        accessMode?: 'trial' | 'paid';
        reading?: GeneratedThaiReading;
      };

      if (res.status === 402 || data.code === 'TRIAL_EXHAUSTED' || data.code === 'PAYMENT_REQUIRED') {
        setCheckoutOpen(true);
        return;
      }

      if (!res.ok || !data.reading) {
        throw new Error(data.error || 'ไม่สามารถสร้างบทวิเคราะห์ได้ในขณะนี้');
      }

      if (domain === 'slot_tarot') {
        setCardsRevealed(true);
      }
      if (data.accessMode === 'trial') {
        onTrialConsumed();
      }
      setPendingToken(null);
      setAccessModeUsed(data.accessMode ?? 'trial');
      setResultViewLens(data.reading.outcomeDigest?.activeLens ?? activeLens);
      setShowSideBySide(data.reading.outcomeDigest?.compareOtherAngles ?? compareOtherAngles);
      setResult(data.reading);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (userPrompt.trim().length < 10) {
      setErrorMsg('กรุณาเล่าบริบทหรือคำถามอย่างน้อย 10 ตัวอักษร');
      return;
    }

    if (domain === 'slot_tarot' && !freeAssociation.trim()) {
      setErrorMsg('สำหรับศาสตร์ไพ่ทาโรต์ กรุณาบันทึกความรู้สึกแรก (Free Association) ก่อนเปิดไพ่');
      return;
    }

    if (!pdpaCoreConsent) {
      setPdpaModalOpen(true);
      return;
    }

    const fetchedThemes = await fetchGmailThemesIfConsented(pdpaGmailConsent);
    await executeReadingRequest(undefined, fetchedThemes);
  };

  const handlePdpaConfirm = async (core: boolean, gmail: boolean) => {
    setPdpaCoreConsent(core);
    setPdpaGmailConsent(gmail);
    setPdpaModalOpen(false);
    if (!core) return;
    const fetchedThemes = await fetchGmailThemesIfConsented(gmail);
    await executeReadingRequest(undefined, fetchedThemes);
  };

  const handlePromptPayUnlocked = async (readingToken: string, _tier: PricingTier) => {
    setPendingToken(readingToken);
    setCheckoutOpen(false);
    await executeReadingRequest(readingToken);
  };

  const handleToggleAudio = () => {
    if (!result?.audioBase64Wav) return;
    if (!audioRef.current) {
      const audio = new Audio(`data:audio/wav;base64,${result.audioBase64Wav}`);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audioRef.current = audio;
    }
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(() => setIsPlayingAudio(false));
      setIsPlayingAudio(true);
    }
  };

  return (
    <section id="studio" className="py-16 border-t border-[#C0C5CE]/15">
      {isLineBrowser && (
        <div className="mb-8 rounded-lg border border-[#D4A359]/45 bg-[#2A2E35] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-[#F4EFE6]">
            <p className="font-semibold text-[#D4A359]">กำลังเปิดผ่านเบราว์เซอร์ภายใน LINE</p>
            <p className="text-xs text-[#C0C5CE] mt-0.5">
              เพื่อความเสถียรของเสียงบรรยายภาษาไทยและการเชื่อมต่อ Google แนะนำให้เปิดในเบราว์เซอร์ภายนอก (Safari / Chrome)
            </p>
          </div>
          <a
            href={externalBrowserUrl}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[#D4A359] text-[#1C1F24] text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            <span>เปิดในเบราว์เซอร์ภายนอก</span>
          </a>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-[#D4A359]">{cfg.accentLabelTh}</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-[#F4EFE6]">
            {cfg.studioHeadingTh}
          </h2>
          <p className="mt-2 text-xs text-[#C0C5CE]">
            {trialAvailable
              ? 'สิทธิ์ต้อนรับ: ทดลองวิเคราะห์เจาะลึกพร้อมเสียงบรรยายไทยฟรี 1 ครั้ง (ข้ามศาสตร์ทั้งหมด)'
              : 'สิทธิ์ทดลองฟรีครบแล้ว · รองรับการปลดล็อกรายครั้งผ่าน PromptPay QR (99 / 129 / 199 บาท)'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPdpaModalOpen(true)}
          className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#C0C5CE]/25 bg-[#141820] text-xs text-[#F4EFE6] hover:border-[#D4A359]/60 inline-flex items-center gap-2 whitespace-nowrap shrink-0 w-fit"
        >
          <ShieldCheck className="w-4 h-4 text-[#D4A359]" />
          <span>{pdpaCoreConsent ? 'ตั้งค่าความยินยอม PDPA (อนุญาตแล้ว)' : 'ตั้งค่า PDPA และบริบท Gmail'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmitClick}
          className="lg:col-span-5 rounded-xl border border-[#D4A359]/25 bg-[#141820] p-6 space-y-5"
        >
          <div className="rounded-lg border border-[#D4A359]/25 bg-[#0D1015] p-3 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#D4A359]">พิกัดชะตาที่เชื่อมต่อแล้ว</span>
              <a href="#calibrator" className="text-[11px] text-[#C0C5CE] hover:text-[#D4A359] underline">
                ปรับเพศ / วันเกิด
              </a>
            </div>
            <p className="text-[#F4EFE6]/90 leading-relaxed">
              {personalProfile.genderLabelTh} · {personalProfile.thaiWeekdayTh} · {personalProfile.westernZodiacTh} · โฟกัส {personalProfile.focusLabelTh}
            </p>
          </div>
          {domain === 'slot_tarot' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#F4EFE6]">
                  สำรับไพ่สะท้อนใจ 3 ใบ (จาก 78 ใบ)
                </span>
                <button
                  type="button"
                  onClick={handleRedrawCards}
                  className="text-xs text-[#D4A359] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>สับไพ่ชุดใหม่</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {drawnCards.map((card, idx) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-[#D4A359]/30 bg-[#0D1015] p-2 text-center flex flex-col items-center justify-between gap-2"
                  >
                    {cardsRevealed ? (
                      <>
                        <TarotCardArtwork
                          motif={card.symbolMotif}
                          alt={card.nameTh}
                          className="w-full aspect-[3/4]"
                        />
                        <div>
                          <span className="block text-xs font-semibold text-[#F4EFE6] leading-snug">
                            {card.nameTh}
                          </span>
                          <span className="block text-[11px] text-[#D4A359]">{card.nameEn}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <TarotCardBackArtwork
                          alt={`ไพ่คว่ำใบที่ ${idx + 1}`}
                          className="w-full aspect-[3/4]"
                        />
                        <span className="text-[11px] text-[#C0C5CE]">ใบที่ {idx + 1} · รอเปิด</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="studio-prompt" className="block text-sm font-medium text-[#F4EFE6]">
              {cfg.studioPromptLabelTh}
            </label>
            <textarea
              id="studio-prompt"
              rows={4}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={cfg.studioPromptPlaceholderTh}
              className="mt-2 w-full rounded-lg border border-[#C0C5CE]/20 bg-[#1C1F24] p-3.5 text-sm text-[#F4EFE6] placeholder:text-[#C0C5CE]/50 focus:border-[#D4A359] focus:outline-none"
            />
          </div>

          {domain === 'slot_tarot' && (
            <div>
              <label htmlFor="free-association" className="block text-sm font-medium text-[#D4A359]">
                บันทึกความรู้สึกแรกก่อนเปิดไพ่ (Free Association · จำเป็น)
              </label>
              <textarea
                id="free-association"
                rows={2}
                value={freeAssociation}
                onChange={(e) => setFreeAssociation(e.target.value)}
                placeholder="ตอนนี้ใจคุณนึกถึงภาพ ความกังวล หรือคำสำคัญอะไรขึ้นมาเป็นสิ่งแรก?"
                className="mt-2 w-full rounded-lg border border-[#D4A359]/35 bg-[#1C1F24] p-3 text-sm text-[#F4EFE6] placeholder:text-[#C0C5CE]/50 focus:border-[#D4A359] focus:outline-none"
              />
            </div>
          )}

          {domain === 'slot_horoscope' && (
            <div>
              <label htmlFor="birth-context" className="block text-xs font-medium text-[#C0C5CE]">
                ช่วงวัยหรือจังหวะปีที่กำลังอยู่ (ไม่บังคับ)
              </label>
              <input
                id="birth-context"
                type="text"
                value={birthContext}
                onChange={(e) => setBirthContext(e.target.value)}
                placeholder="เช่น อายุ 31 ปี · กำลังเปลี่ยนบทบาทงานช่วงปลายปี"
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-[#C0C5CE]/20 bg-[#1C1F24] px-3.5 text-sm text-[#F4EFE6] placeholder:text-[#C0C5CE]/50 focus:border-[#D4A359] focus:outline-none"
              />
            </div>
          )}

          <div>
            <span className="block text-xs font-medium text-[#C0C5CE] mb-2">
              กรอบเวลาสรุปผลลัพธ์ (Timeframe Digest · อะไรจะเกิดขึ้นต่อไป)
            </span>
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#1C1F24] rounded-lg border border-[#C0C5CE]/15">
              {TIMEFRAME_OPTIONS.map((tf) => {
                const active = timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setTimeframe(tf.id)}
                    className={`min-h-[38px] px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#D4A359] text-[#1C1F24]'
                        : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {tf.labelTh}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-[#C0C5CE]/80">
              {TIMEFRAME_OPTIONS.find((t) => t.id === timeframe)?.scopeTh}
            </p>
          </div>

          <PerspectiveLens
            mode="selector"
            activeLens={activeLens}
            onSelectLens={(lens) => {
              setActiveLens(lens);
              onLensChange?.(lens);
            }}
          />

          <label className="flex items-center gap-2.5 text-xs text-[#C0C5CE] cursor-pointer">
            <input
              type="checkbox"
              checked={compareOtherAngles}
              onChange={(e) => setCompareOtherAngles(e.target.checked)}
              className="h-4 w-4 accent-[#D4A359] shrink-0"
            />
            <span>เปรียบเทียบมุมมองจากอีก 5 ศาสตร์แบบเคียงคู่กัน (Side-by-Side)</span>
          </label>

          <div>
            <span className="block text-xs font-medium text-[#C0C5CE] mb-2">
              เลือกผู้บรรยายเสียงภาษาไทย (กดเล่นเมื่อพร้อม ไม่มีเสียงอัตโนมัติ)
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#1C1F24] rounded-lg border border-[#C0C5CE]/15">
              <button
                type="button"
                onClick={() => setPersona('male_sage')}
                className={`min-h-[40px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  persona === 'male_sage'
                    ? 'bg-[#D4A359] text-[#1C1F24]'
                    : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                }`}
              >
                ปราชญ์ชาย (Male Sage)
              </button>
              <button
                type="button"
                onClick={() => setPersona('female_oracle')}
                className={`min-h-[40px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  persona === 'female_oracle'
                    ? 'bg-[#D4A359] text-[#1C1F24]'
                    : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                }`}
              >
                ผู้แนะนำหญิง (Female Oracle)
              </button>
            </div>
          </div>

          {googleEmail && pdpaGmailConsent && (
            <div className="rounded-lg border border-[#4A5D4E]/50 bg-[#4A5D4E]/20 p-3 text-xs text-[#F4EFE6] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#D4A359] shrink-0" />
              <span>
                เชื่อมต่อ Gmail ({googleEmail}) แล้ว {loadingGmail ? '· กำลังคัดกรองธีม...' : '· คัดกรองข้อมูลส่วนตัวบนเซิร์ฟเวอร์'}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#D4A359] text-[#1C1F24] text-sm font-semibold lantern-glow disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {isSubmitting
                ? 'กำลังถอดรหัสและสังเคราะห์เสียงไทย...'
                : trialAvailable
                  ? 'เริ่มวิเคราะห์สะท้อนใจ (ทดลองฟรี 1 ครั้ง)'
                  : 'วิเคราะห์เชิงลึกเฉพาะบุคคล'}
            </span>
          </button>
        </form>

        <div className="lg:col-span-7">
          {!result ? (
            <div className="rounded-xl border border-[#D4A359]/25 bg-[#141820] overflow-hidden shadow-2xl">
              <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[#D4A359]/20">
                <img
                  src={ALTAR_STILL_LIFE_IMG}
                  alt="โต๊ะอ่านสัญลักษณ์ยามค่ำคืนพร้อมเข็มทิศทองเหลืองและสมุดบันทึก"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141820] via-[#0D1015]/45 to-transparent"
                />
                <div className="absolute bottom-4 left-6 right-6">
                  <p className="text-xs text-[#D4A359] font-medium">แผ่นบันทึกการสะท้อนตนเอง</p>
                  <p className="font-display text-xl sm:text-2xl text-[#F4EFE6] font-semibold mt-0.5">
                    รอคำถามจากใจคุณเพื่อเปิดคำอ่านเฉพาะบุคคล
                  </p>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-3">
                <p className="text-sm text-[#C0C5CE] leading-relaxed">
                  เมื่อกรอกเรื่องราวและยืนยันความยินยอม PDPA เรียบร้อยแล้ว บทวิเคราะห์เชิงจิตวิทยาภาษาไทย
                  {domain === 'slot_dream' && ' พร้อมกราฟ HVDC และขั้นตอน Clara Hill 3 ระยะ'}
                  {domain === 'slot_tarot' && ' พร้อมสมดุลอาร์คีไทป์ Light/Shadow หลังเปิดไพ่'}
                  {' '}และตารางเปรียบเทียบ 6 เลนส์ จะปรากฏบนกระดาษบันทึกนี้ทันที
                </p>
                <p className="text-xs text-[#C0C5CE]/80 pt-3 border-t border-[#C0C5CE]/10">
                  {THAI_ETHICS_DISCLAIMER}
                </p>
              </div>
            </div>
          ) : (
            <article className="rounded-xl border border-[#D4A359]/40 parchment-sheet p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1C1F24]/15 pb-4">
                <div className="text-xs text-[#4A5D4E] font-medium">
                  <span>{cfg.brandThai}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{accessModeUsed === 'paid' ? 'สิทธิ์วิเคราะห์ฉบับเต็ม' : 'สิทธิ์ทดลองฟรี 1 ครั้ง'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {googleUid && (
                    <button
                      type="button"
                      disabled={savingDigest || digestSaved}
                      onClick={() => void handleSaveDigestToFirestore()}
                      className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#4A5D4E]/40 bg-white/80 text-[#1C1F24] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-70"
                    >
                      {digestSaved ? (
                        <Check className="w-4 h-4 text-[#4A5D4E]" />
                      ) : (
                        <BookmarkPlus className="w-4 h-4 text-[#4A5D4E]" />
                      )}
                      <span>{digestSaved ? 'บันทึกแล้ว' : savingDigest ? 'กำลังบันทึก...' : 'บันทึกลงคลังส่วนตัว'}</span>
                    </button>
                  )}

                  {result.audioBase64Wav && (
                    <button
                      type="button"
                      onClick={handleToggleAudio}
                      className="min-h-[44px] px-4 py-2 rounded-lg bg-[#1C1F24] text-[#F4EFE6] text-xs font-medium inline-flex items-center gap-2 hover:bg-[#2A2E35] transition-colors whitespace-nowrap shrink-0"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4 text-[#D4A359]" /> : <Play className="w-4 h-4 text-[#D4A359]" />}
                      <Volume2 className="w-4 h-4" />
                      <span>{isPlayingAudio ? 'หยุดเสียงบรรยาย' : 'กดฟังเสียงบรรยายภาษาไทย'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-[#1C1F24] leading-snug">
                  {result.headlineTh}
                </h3>
                <p className="mt-3 text-base text-[#1C1F24]/90 reading-measure">{result.summaryTh}</p>
              </div>

              {result.outcomeDigest && (
                <div className="space-y-5 rounded-lg border border-[#1C1F24]/15 bg-white/70 p-5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-[#1C1F24]">
                        1. Core Digest ({result.outcomeDigest.timeframeLabelTh})
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowSideBySide((v) => !v)}
                        className="text-xs font-medium text-[#4A5D4E] hover:underline whitespace-nowrap shrink-0"
                      >
                        {showSideBySide ? 'ซ่อนการเทียบ 5 ศาสตร์' : 'ดูว่าศาสตร์อื่นมองฉันอย่างไร'}
                      </button>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-sm text-[#1C1F24]/90">
                      {result.outcomeDigest.coreDigestBulletsTh.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#D4A359] font-bold">·</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <PerspectiveLens
                    mode="filter"
                    selectedFilter={resultViewLens}
                    onSelectFilter={setResultViewLens}
                    lenses={result.outcomeDigest.lenses}
                    timeframeLabelTh={result.outcomeDigest.timeframeLabelTh}
                    showSideBySide={showSideBySide}
                    onToggleSideBySide={() => setShowSideBySide((v) => !v)}
                  />

                  <p className="text-[11px] text-[#1C1F24]/70 leading-relaxed border-t border-[#1C1F24]/10 pt-2.5">
                    {result.outcomeDigest.nonDogmaticNoteTh}
                  </p>
                </div>
              )}

              {domain === 'slot_tarot' && result.tarotSynthesis && (
                <div className="rounded-lg border border-[#1C1F24]/15 bg-white/65 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1C1F24]">
                    <span>สมดุลอาร์คีไทป์: ด้านสว่าง {result.tarotSynthesis.lightPercent}%</span>
                    <span>ด้านเงา {result.tarotSynthesis.shadowPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#1C1F24]/15 overflow-hidden flex">
                    <div
                      className="h-full bg-[#D4A359]"
                      style={{ width: `${result.tarotSynthesis.lightPercent}%` }}
                    />
                    <div
                      className="h-full bg-[#4A5D4E]"
                      style={{ width: `${result.tarotSynthesis.shadowPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#1C1F24]/85 leading-relaxed">
                    <strong>ความเชื่อมโยงกับความรู้สึกแรกของคุณ:</strong> {result.tarotSynthesis.associationBridgeTh}
                  </p>
                  <p className="text-xs text-[#1C1F24]/80 leading-relaxed">
                    <strong>แรงตึงอาร์คีไทป์:</strong> {result.tarotSynthesis.archetypeTensionTh}
                  </p>
                </div>
              )}

              {domain === 'slot_horoscope' && result.horoscopeCycle && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-[#1C1F24]/15 bg-white/65 p-4 text-xs">
                  <div>
                    <div className="text-[#4A5D4E] font-semibold">จังหวะชีวิตปัจจุบัน</div>
                    <div className="mt-1 text-sm font-medium text-[#1C1F24]">
                      {result.horoscopeCycle.cyclePhaseTh}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#4A5D4E] font-semibold">อคติความคิดที่ควรรู้ทัน</div>
                    <div className="mt-1 text-sm font-medium text-[#1C1F24]">
                      {result.horoscopeCycle.dominantCognitiveBiasTh}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#4A5D4E] font-semibold">ดัชนีสมดุลความนิ่ง</div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1F24] tabular-nums">
                      {result.horoscopeCycle.stabilityScore} / 100
                    </div>
                  </div>
                </div>
              )}

              {domain === 'slot_dream' && result.hvdc && (
                <div className="space-y-4 rounded-lg border border-[#1C1F24]/15 bg-white/65 p-5">
                  <h4 className="font-semibold text-sm text-[#1C1F24]">
                    ตัวชี้วัด Hall–Van de Castle (HVDC) และความเข้มข้นทางอารมณ์
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-md bg-[#F4EFE6] p-3">
                      <div className="text-xs text-[#4A5D4E]">ตัวละคร</div>
                      <div className="mt-1 text-lg font-bold tabular-nums">{result.hvdc.charactersCount}</div>
                    </div>
                    <div className="rounded-md bg-[#F4EFE6] p-3">
                      <div className="text-xs text-[#4A5D4E]">มิตรภาพ (F/C)</div>
                      <div className="mt-1 text-lg font-bold tabular-nums">{result.hvdc.fcRatioPercent}%</div>
                    </div>
                    <div className="rounded-md bg-[#F4EFE6] p-3">
                      <div className="text-xs text-[#4A5D4E]">ความตึงเครียด (A/C)</div>
                      <div className="mt-1 text-lg font-bold tabular-nums">{result.hvdc.acRatioPercent}%</div>
                    </div>
                    <div className="rounded-md bg-[#F4EFE6] p-3">
                      <div className="text-xs text-[#4A5D4E]">เหตุการณ์โต้ตอบ</div>
                      <div className="mt-1 text-lg font-bold tabular-nums">
                        {result.hvdc.friendlyInteractions + result.hvdc.aggressiveInteractions}
                      </div>
                    </div>
                  </div>

                  {result.hvdc.emotions?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {result.hvdc.emotions.map((em) => (
                        <div key={em.labelTh} className="space-y-1">
                          <div className="flex justify-between text-xs text-[#1C1F24]">
                            <span>{em.labelTh}</span>
                            <span className="tabular-nums font-medium">{em.intensity}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#1C1F24]/10 overflow-hidden">
                            <div
                              className="h-full bg-[#4A5D4E]"
                              style={{ width: `${Math.min(100, Math.max(5, em.intensity))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1C1F24]/10 text-xs leading-relaxed">
                    <div>
                      <strong className="text-[#4A5D4E] block">1. สำรวจ (Exploration)</strong>
                      <p className="mt-1 text-[#1C1F24]/85">{result.hvdc.claraHillExplorationTh}</p>
                    </div>
                    <div>
                      <strong className="text-[#4A5D4E] block">2. เชื่อมโยง (Insight)</strong>
                      <p className="mt-1 text-[#1C1F24]/85">{result.hvdc.claraHillInsightTh}</p>
                    </div>
                    <div>
                      <strong className="text-[#4A5D4E] block">3. ลงมือ (Action)</strong>
                      <p className="mt-1 text-[#1C1F24]/85">{result.hvdc.claraHillActionTh}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm leading-relaxed text-[#1C1F24]/90 reading-measure">
                <h4 className="font-semibold text-[#1C1F24]">การสะท้อนเชิงลึก</h4>
                <p>{result.deepReflectionTh}</p>
              </div>

              <div className="rounded-lg bg-[#1C1F24]/5 p-4 text-sm leading-relaxed">
                <h4 className="font-semibold text-[#1C1F24]">กรอบปรับมุมมองความคิด (Cognitive Reframe)</h4>
                <p className="mt-1 text-[#1C1F24]/90">{result.cognitiveReframeTh}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-[#1C1F24]">แนวทางปฏิบัติที่ทำได้จริง</h4>
                <ul className="mt-2 space-y-1.5 text-sm text-[#1C1F24]/90">
                  {result.actionStepsTh.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-semibold text-[#4A5D4E] tabular-nums">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-[#1C1F24]/15 pt-4">
                <p className="text-sm italic text-[#1C1F24]">
                  คำถามฝากไว้ให้ใคร่ครวญ: “{result.selfInquiryQuestionTh}”
                </p>
                <p className="mt-3 text-xs text-[#1C1F24]/70">{THAI_ETHICS_DISCLAIMER}</p>
              </div>
            </article>
          )}
        </div>
      </div>

      <PdpaConsentModal
        open={pdpaModalOpen}
        initialCoreConsent={pdpaCoreConsent}
        initialGmailConsent={pdpaGmailConsent}
        googleEmail={googleEmail}
        isSigningInGoogle={isSigningInGoogle}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onConfirm={handlePdpaConfirm}
        onClose={() => setPdpaModalOpen(false)}
      />

      <PromptPayCheckout
        open={checkoutOpen}
        domain={domain}
        onUnlockedToken={handlePromptPayUnlocked}
        onClose={() => setCheckoutOpen(false)}
      />
    </section>
  );
}
