import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { Settings, X } from 'lucide-react';
import {
  DOMAIN_ORDER,
  SITE_CONFIG,
  type DomainSlot,
  type PerspectiveLens,
  type PricingTier,
} from './config/site.config';
import {
  computeDestinyProfile,
  type PersonalCalibrationInput,
} from './lib/birthProfile';
import {
  initGoogleAuth,
  signInWithGoogleAccount,
  signOutGoogle,
} from './lib/firebaseAuth';
import { ensureUserProfile } from './lib/firestoreStore';
import type { VoicePersona } from './lib/gemini-thai-voice';
import {
  type DisplayLangMode,
  type ThemePresetId,
} from './lib/subconsciousFunnel';
import { resolveTenantSlot } from './lib/tenant';
import type { AbbotMood } from './components/FrogAbbotStage';
import { LanternEmblemSvg } from './components/MysticArtifacts';
import { PromptPayCheckout } from './components/PromptPayCheckout';
import { ReadingStudio } from './components/ReadingStudio';
import { SanctuaryLeftStage } from './components/SanctuaryLeftStage';
import { SettingsGearModal, type SettingsTabId } from './components/SettingsGearModal';
import {
  SubconsciousFunnelStage,
  type FunnelPhase,
} from './components/SubconsciousFunnelStage';

export default function App() {
  const [activeSlot, setActiveSlot] = useState<DomainSlot>(() => {
    if (typeof window === 'undefined') return 'slot_tarot';
    const params = new URLSearchParams(window.location.search);
    return resolveTenantSlot({
      host: window.location.host,
      queryDomain: params.get('domain'),
    });
  });

  // Preferences persisted in localStorage
  const [themePreset, setThemePreset] = useState<ThemePresetId>(() => {
    if (typeof window === 'undefined') return 'obsidian_gold';
    const saved = window.localStorage.getItem('gp_theme_preset');
    return saved === 'moss_slate' || saved === 'mithril_dusk' ? saved : 'obsidian_gold';
  });
  const [langMode, setLangMode] = useState<DisplayLangMode>(() => {
    if (typeof window === 'undefined') return 'th';
    return window.localStorage.getItem('gp_lang_mode') === 'th_en' ? 'th_en' : 'th';
  });
  const [voicePersona, setVoicePersona] = useState<VoicePersona>('male_sage');
  const [activeLens, setActiveLens] = useState<PerspectiveLens>('thai_folk');

  // Auth, Consent & Credits
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [trialAvailable, setTrialAvailable] = useState<boolean>(true);
  const [paidReadingToken, setPaidReadingToken] = useState<string | null>(null);
  const [pdpaCoreConsent, setPdpaCoreConsent] = useState<boolean>(false);
  const [pdpaGmailConsent, setPdpaGmailConsent] = useState<boolean>(false);
  const [cookieConsentAccepted, setCookieConsentAccepted] = useState<boolean>(true);

  // Personal Profile Calibration (used quietly when computing final End Card)
  const [calibrationInput, setCalibrationInput] = useState<PersonalCalibrationInput>({
    gender: 'unspecified',
    birthDay: 14,
    birthMonth: 7,
    birthYearCe: 1998,
    birthTimeSlot: 'night',
    focusArea: 'secret_sign',
  });
  const personalProfile = useMemo(() => computeDestinyProfile(calibrationInput), [calibrationInput]);

  // Live 3D Abbot & Funnel Interaction Coupling
  const [funnelPhase, setFunnelPhase] = useState<FunnelPhase>('ROUND');
  const [hoveredChoice, setHoveredChoice] = useState<'A' | 'B' | null>(null);
  const [storySpeaking, setStorySpeaking] = useState(false);
  const [storySpeechAmp, setStorySpeechAmp] = useState(0);
  const [abbotBannerQuoteTh, setAbbotBannerQuoteTh] = useState(
    'อ๊บ... อย่าเพิ่งบอกอาตมาว่าใจกำลังกังวลเรื่องไหน แค่เลือกภาพที่มืออยากเอื้อมถึงที่สุด 5 ครั้งก็พอ'
  );
  const [externalAskAbbot, setExternalAskAbbot] = useState<{ prompt: string; nonce: number } | null>(
    null
  );

  // Modals (Teeth-Ring Settings, PromptPay QR, Extended Custom Studio)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>('appearance');
  const [promptPayOpen, setPromptPayOpen] = useState(false);
  const [extendedStudioOpen, setExtendedStudioOpen] = useState(false);

  const cfg = SITE_CONFIG[activeSlot];

  useEffect(() => {
    try {
      window.localStorage.setItem('gp_theme_preset', themePreset);
      window.localStorage.setItem('gp_lang_mode', langMode);
    } catch {
      // ignore storage errors
    }
  }, [themePreset, langMode]);

  useEffect(() => {
    const unsub = initGoogleAuth(
      (user) => {
        setGoogleUser(user);
        void ensureUserProfile(user, activeLens, pdpaCoreConsent).catch(() => {});
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const uidParam = googleUser ? `&userId=${encodeURIComponent(googleUser.uid)}` : '';
    fetch(`/api/tenant?domain=${encodeURIComponent(activeSlot)}${uidParam}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { trialAvailable?: boolean } | null) => {
        if (!cancelled && data && typeof data.trialAvailable === 'boolean') {
          setTrialAvailable(data.trialAvailable);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeSlot, googleUser]);

  useEffect(() => {
    document.title = cfg.seoTitle;
  }, [cfg.seoTitle]);

  const handleSwitchDomain = (slot: DomainSlot) => {
    setActiveSlot(slot);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('domain', slot);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleGoogleSignIn = async () => {
    const user = await signInWithGoogleAccount();
    setGoogleUser(user);
    await ensureUserProfile(user, activeLens, pdpaCoreConsent);
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUser(null);
  };

  const handlePhaseChange = useCallback((phase: FunnelPhase) => {
    setFunnelPhase(phase);
  }, []);

  const handleSpeakStateChange = useCallback((speaking: boolean, amplitude = 0) => {
    setStorySpeaking(speaking);
    setStorySpeechAmp(amplitude);
  }, []);

  const handleUnlockedToken = (token: string, _tier: PricingTier) => {
    setPaidReadingToken(token);
    setPromptPayOpen(false);
    setExtendedStudioOpen(true);
  };

  const derivedAbbotMood: AbbotMood = storySpeaking
    ? 'speaking'
    : funnelPhase === 'PREDICTING'
      ? 'thinking'
      : hoveredChoice !== null
        ? 'listening'
        : 'idle';

  const gazeBiasX = hoveredChoice === 'A' ? -0.9 : hoveredChoice === 'B' ? 0.9 : 0;

  return (
    <div
      data-theme={themePreset}
      className="h-dvh w-screen overflow-hidden bg-[var(--theme-bg)] text-[#F4EFE6] flex flex-col select-none sm:select-auto"
    >
      {/* Minimal 3-Zone Top Header */}
      <header className="shrink-0 h-14 border-b border-[#C0C5CE]/12 bg-[var(--theme-bg)]/95 px-3 sm:px-5 flex items-center justify-between gap-3">
        {/* Zone 1: Emblem + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <LanternEmblemSvg className="w-6 h-6 shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-sm sm:text-base font-semibold tracking-tight text-[#F4EFE6] truncate">
              {cfg.brandThai}
            </div>
          </div>
        </div>

        {/* Zone 2: Subtle 3-Domain Switcher */}
        <div
          className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--theme-surface)] border border-[#C0C5CE]/15"
          role="tablist"
          aria-label="เลือกศาสตร์สะท้อนจิตใต้สำนึก"
        >
          {DOMAIN_ORDER.map((slot) => {
            const item = SITE_CONFIG[slot];
            const active = slot === activeSlot;
            return (
              <button
                key={slot}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSwitchDomain(slot)}
                className={`min-h-[30px] px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                    : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                }`}
              >
                {item.shortNavLabelTh}
              </button>
            );
          })}
        </div>

        {/* Zone 3: Teeth-Ring Settings Gear Button (All metadata & secondary settings tucked here) */}
        <button
          type="button"
          onClick={() => {
            setSettingsInitialTab('appearance');
            setSettingsOpen(true);
          }}
          aria-label="ตั้งค่าศาลเจ้า สี ภาษา โปรไฟล์ PDPA และเครดิต"
          title="ตั้งค่าและข้อมูลระบบ"
          className="group min-h-[38px] min-w-[38px] px-2.5 rounded-lg border border-[var(--theme-accent)]/35 bg-[var(--theme-surface)] text-[#F4EFE6] hover:border-[var(--theme-accent)] inline-flex items-center justify-center gap-1.5 lantern-glow shrink-0"
        >
          <Settings className="w-4 h-4 text-[var(--theme-accent)] transition-transform duration-300 group-hover:rotate-45" />
          <span className="hidden md:inline text-xs text-[#C0C5CE] group-hover:text-[#F4EFE6]">
            ตั้งค่า
          </span>
        </button>
      </header>

      {/* Zero-Scroll Split Stage: Left = 3D Frog Abbot, Right = 5-Round A/B Funnel / End-Card Reveal */}
      <main className="flex-1 min-h-0 w-full max-w-[1440px] mx-auto p-2.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        <div className="lg:col-span-5 h-[33dvh] lg:h-full min-h-0">
          <SanctuaryLeftStage
            domainSlot={activeSlot}
            activeLens={activeLens}
            voicePersona={voicePersona}
            onVoicePersonaChange={setVoicePersona}
            externalMood={derivedAbbotMood}
            externalSpeechAmp={storySpeechAmp}
            gazeBiasX={gazeBiasX}
            bannerQuoteTh={abbotBannerQuoteTh}
            onBannerQuoteChange={setAbbotBannerQuoteTh}
            googleUser={googleUser}
            personalContext={personalProfile.promptSummaryText}
            externalAskAbbot={externalAskAbbot}
          />
        </div>

        <div className="lg:col-span-7 flex-1 lg:h-full min-h-0">
          <SubconsciousFunnelStage
            domainSlot={activeSlot}
            activeLens={activeLens}
            onActiveLensChange={setActiveLens}
            voicePersona={voicePersona}
            langMode={langMode}
            personalProfile={personalProfile}
            googleUser={googleUser}
            onPhaseChange={handlePhaseChange}
            onHoverChoice={setHoveredChoice}
            onAbbotReaction={setAbbotBannerQuoteTh}
            onSpeakStateChange={handleSpeakStateChange}
            onAskAbbotWithContext={(promptText) =>
              setExternalAskAbbot({ prompt: promptText, nonce: Date.now() })
            }
            onOpenPromptPay={() => setPromptPayOpen(true)}
            onOpenSettingsProfile={() => {
              setSettingsInitialTab('profile');
              setSettingsOpen(true);
            }}
            paidReadingToken={paidReadingToken}
          />
        </div>
      </main>

      {/* Consolidated Teeth-Ring Settings Gear Modal */}
      <SettingsGearModal
        open={settingsOpen}
        initialTab={settingsInitialTab}
        onClose={() => setSettingsOpen(false)}
        domainSlot={activeSlot}
        themePreset={themePreset}
        onThemePresetChange={setThemePreset}
        langMode={langMode}
        onLangModeChange={setLangMode}
        voicePersona={voicePersona}
        onVoicePersonaChange={setVoicePersona}
        activeLens={activeLens}
        onActiveLensChange={setActiveLens}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        calibrationInput={calibrationInput}
        personalProfile={personalProfile}
        onCalibrationChange={setCalibrationInput}
        trialAvailable={trialAvailable}
        paidReadingToken={paidReadingToken}
        onOpenPromptPay={() => setPromptPayOpen(true)}
        onOpenExtendedStudio={() => setExtendedStudioOpen(true)}
        pdpaCoreConsent={pdpaCoreConsent}
        pdpaGmailConsent={pdpaGmailConsent}
        cookieConsentAccepted={cookieConsentAccepted}
        onPdpaConsentChange={(core, gmail) => {
          setPdpaCoreConsent(core);
          setPdpaGmailConsent(gmail);
        }}
        onCookieConsentChange={setCookieConsentAccepted}
      />

      {/* PromptPay QR Checkout Modal */}
      <PromptPayCheckout
        open={promptPayOpen}
        domain={activeSlot}
        onUnlockedToken={handleUnlockedToken}
        onClose={() => setPromptPayOpen(false)}
      />

      {/* Optional Extended Custom Prompt Reading Studio Modal */}
      {extendedStudioOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="ห้องวิเคราะห์คำถามเจาะจงเต็มรูปแบบ"
        >
          <div className="relative w-full max-w-5xl rounded-2xl border border-[var(--theme-accent)]/40 bg-[var(--theme-bg)] shadow-2xl max-h-[90dvh] overflow-y-auto sanctuary-scroll p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#C0C5CE]/15">
              <span className="font-display text-base font-semibold text-[var(--theme-accent)]">
                ห้องถามเจาะจงเต็มรูปแบบ (Extended Analysis &amp; HVDC)
              </span>
              <button
                type="button"
                onClick={() => setExtendedStudioOpen(false)}
                aria-label="ปิดห้องวิเคราะห์"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-[#C0C5CE] hover:text-[#F4EFE6] hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ReadingStudio
              domain={activeSlot}
              trialAvailable={trialAvailable}
              onTrialConsumed={() => setTrialAvailable(false)}
              onLensChange={setActiveLens}
              personalProfile={personalProfile}
            />
          </div>
        </div>
      )}
    </div>
  );
}
