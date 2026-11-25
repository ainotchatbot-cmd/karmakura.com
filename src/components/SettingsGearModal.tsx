import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BookMarked,
  Check,
  Code2,
  Coins,
  Cookie,
  Globe,
  LogIn,
  LogOut,
  Palette,
  QrCode,
  ShieldCheck,
  Trash2,
  UserCircle2,
  Volume2,
  X,
} from 'lucide-react';
import {
  PERSPECTIVE_LENSES,
  THAI_ETHICS_DISCLAIMER,
  type DomainSlot,
  type PerspectiveLens,
} from '../config/site.config';
import {
  THAI_MONTHS_SHORT,
  type BirthTimeSlot,
  type ComputedDestinyProfile,
  type FocusArea,
  type PersonalCalibrationInput,
  type UserGender,
} from '../lib/birthProfile';
import type { VoicePersona } from '../lib/gemini-thai-voice';
import {
  deleteSavedReading,
  subscribeAbbotThreads,
  subscribeSavedReadings,
  type StoredAbbotThread,
  type StoredSavedReading,
} from '../lib/firestoreStore';
import type { DisplayLangMode, ThemePresetId } from '../lib/subconsciousFunnel';

export type SettingsTabId = 'appearance' | 'profile' | 'credits' | 'privacy';

interface SettingsGearModalProps {
  open: boolean;
  initialTab?: SettingsTabId;
  onClose: () => void;
  domainSlot: DomainSlot;
  themePreset: ThemePresetId;
  onThemePresetChange: (preset: ThemePresetId) => void;
  langMode: DisplayLangMode;
  onLangModeChange: (lang: DisplayLangMode) => void;
  voicePersona: VoicePersona;
  onVoicePersonaChange: (persona: VoicePersona) => void;
  activeLens: PerspectiveLens;
  onActiveLensChange: (lens: PerspectiveLens) => void;
  googleUser: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  calibrationInput: PersonalCalibrationInput;
  personalProfile: ComputedDestinyProfile;
  onCalibrationChange: (next: PersonalCalibrationInput) => void;
  trialAvailable: boolean;
  paidReadingToken: string | null;
  onOpenPromptPay: () => void;
  onOpenExtendedStudio: () => void;
  pdpaCoreConsent: boolean;
  pdpaGmailConsent: boolean;
  cookieConsentAccepted: boolean;
  onPdpaConsentChange: (core: boolean, gmail: boolean) => void;
  onCookieConsentChange: (accepted: boolean) => void;
}

const THEME_SWATCHES: Array<{
  id: ThemePresetId;
  nameTh: string;
  descTh: string;
  bgHex: string;
  accentHex: string;
}> = [
  {
    id: 'obsidian_gold',
    nameTh: 'นิลกาฬและทองวัด',
    descTh: 'Obsidian & Temple Gold',
    bgHex: '#0D1015',
    accentHex: '#D4A359',
  },
  {
    id: 'moss_slate',
    nameTh: 'สระบัวหยกเข้ม',
    descTh: 'Deep Celadon & Moss',
    bgHex: '#0A100F',
    accentHex: '#7BA591',
  },
  {
    id: 'mithril_dusk',
    nameTh: 'เงินรัตติกาล',
    descTh: 'Mithril & Lunar Dusk',
    bgHex: '#0C0F17',
    accentHex: '#B8C7E0',
  },
];

const OPEN_SOURCE_STACK = [
  { name: 'React 19', license: 'MIT License', note: 'UI Component Runtime' },
  { name: 'Three.js (WebGL)', license: 'MIT License', note: '3D Frog Abbot Sanctuary Scene' },
  { name: 'Tailwind CSS v4', license: 'MIT License', note: 'Design System & Dark Luxury Tokens' },
  { name: 'Lucide Icons', license: 'ISC License', note: 'Vector Iconography' },
  { name: 'Google GenAI SDK', license: 'Apache-2.0', note: 'Narrative & Thai Voice Synthesis' },
  { name: 'Firebase SDK', license: 'Apache-2.0', note: 'Google Auth & Firestore Archive' },
  { name: 'node-qrcode', license: 'MIT License', note: 'EMVCo PromptPay QR Rendering' },
];

export function SettingsGearModal({
  open,
  initialTab = 'appearance',
  onClose,
  themePreset,
  onThemePresetChange,
  langMode,
  onLangModeChange,
  voicePersona,
  onVoicePersonaChange,
  activeLens,
  onActiveLensChange,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  calibrationInput,
  personalProfile,
  onCalibrationChange,
  trialAvailable,
  paidReadingToken,
  onOpenPromptPay,
  onOpenExtendedStudio,
  pdpaCoreConsent,
  pdpaGmailConsent,
  cookieConsentAccepted,
  onPdpaConsentChange,
  onCookieConsentChange,
}: SettingsGearModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [authBusy, setAuthBusy] = useState(false);
  const [savedThreads, setSavedThreads] = useState<StoredAbbotThread[]>([]);
  const [savedReadings, setSavedReadings] = useState<StoredSavedReading[]>([]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !googleUser) {
      setSavedThreads([]);
      setSavedReadings([]);
      return;
    }
    const unsubThreads = subscribeAbbotThreads(googleUser.uid, setSavedThreads);
    const unsubReadings = subscribeSavedReadings(googleUser.uid, setSavedReadings);
    return () => {
      unsubThreads();
      unsubReadings();
    };
  }, [open, googleUser]);

  if (!open) return null;

  const daysInSelectedMonth = new Date(
    calibrationInput.birthYearCe,
    calibrationInput.birthMonth,
    0
  ).getDate();
  const years = Array.from({ length: 65 }, (_, i) => 2012 - i);
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--theme-accent)]/40 bg-[var(--theme-surface)] text-[#F4EFE6] shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 px-5 py-4 border-b border-[#C0C5CE]/15 bg-[#0D1015]/75 flex items-center justify-between gap-4">
          <div>
            <h2 id="settings-modal-title" className="font-display text-lg font-semibold text-[#F4EFE6]">
              ตั้งค่าศาลเจ้าและข้อมูลระบบ
            </h2>
            <p className="text-xs text-[#C0C5CE]">
              สีหน้าจอ · ภาษา · โปรไฟล์และวันเกิด · เครดิต PromptPay · PDPA คุกกี้ และโอเพ่นซอร์ส
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างตั้งค่า"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-[#C0C5CE] hover:text-[#F4EFE6] hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="shrink-0 px-4 sm:px-5 pt-3 border-b border-[#C0C5CE]/12 bg-[#0D1015]/40 flex flex-wrap gap-1.5 pb-3">
          {(
            [
              { id: 'appearance', label: 'สี ภาษา & เสียง', icon: Palette },
              { id: 'profile', label: 'โปรไฟล์ & พิกัดเกิด', icon: UserCircle2 },
              { id: 'credits', label: 'เครดิต & PromptPay', icon: Coins },
              { id: 'privacy', label: 'PDPA คุกกี้ & ลิขสิทธิ์', icon: ShieldCheck },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                    : 'bg-[#161B24] text-[#C0C5CE] hover:text-[#F4EFE6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto sanctuary-scroll p-5 space-y-6">
          {/* TAB 1: APPEARANCE, LANGUAGE & VOICE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-[var(--theme-accent)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" />
                  <span>โทนสีบรรยากาศ (Theme Colors)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {THEME_SWATCHES.map((sw) => {
                    const active = themePreset === sw.id;
                    return (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => onThemePresetChange(sw.id)}
                        className={`rounded-xl border p-3.5 text-left transition-all flex items-center gap-3 ${
                          active
                            ? 'border-[var(--theme-accent)] bg-[#0D1015]'
                            : 'border-[#C0C5CE]/15 bg-[#0D1015]/50 hover:border-[#C0C5CE]/40'
                        }`}
                      >
                        <span
                          className="w-9 h-9 rounded-lg border border-white/20 shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: sw.bgHex }}
                        >
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: sw.accentHex }}
                          />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#F4EFE6]">{sw.nameTh}</div>
                          <div className="text-[11px] text-[#C0C5CE] truncate">{sw.descTh}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/50 p-4 space-y-2.5">
                  <div className="text-xs font-semibold text-[var(--theme-accent)] flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    <span>ภาษาที่แสดง (Language)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onLangModeChange('th')}
                      className={`min-h-[38px] rounded-lg border text-xs font-medium ${
                        langMode === 'th'
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                          : 'border-[#C0C5CE]/20 text-[#C0C5CE]'
                      }`}
                    >
                      ภาษาไทยล้วน
                    </button>
                    <button
                      type="button"
                      onClick={() => onLangModeChange('th_en')}
                      className={`min-h-[38px] rounded-lg border text-xs font-medium ${
                        langMode === 'th_en'
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                          : 'border-[#C0C5CE]/20 text-[#C0C5CE]'
                      }`}
                    >
                      ไทย + English
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/50 p-4 space-y-2.5">
                  <div className="text-xs font-semibold text-[var(--theme-accent)] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4" />
                    <span>บุคลิกเสียงเจ้าอาวาส</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onVoicePersonaChange('male_sage')}
                      className={`min-h-[38px] rounded-lg border text-xs font-medium ${
                        voicePersona === 'male_sage'
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                          : 'border-[#C0C5CE]/20 text-[#C0C5CE]'
                      }`}
                    >
                      Sage · ทุ้มสุขุม
                    </button>
                    <button
                      type="button"
                      onClick={() => onVoicePersonaChange('female_oracle')}
                      className={`min-h-[38px] rounded-lg border text-xs font-medium ${
                        voicePersona === 'female_oracle'
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                          : 'border-[#C0C5CE]/20 text-[#C0C5CE]'
                      }`}
                    >
                      Oracle · กังวานใส
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/50 p-4 space-y-2.5">
                <div className="text-xs font-semibold text-[var(--theme-accent)]">
                  เลนส์มุมมองเริ่มต้น (6 ศาสตร์เปรียบเทียบ)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PERSPECTIVE_LENSES.map((lens) => (
                    <button
                      key={lens.id}
                      type="button"
                      onClick={() => onActiveLensChange(lens.id)}
                      className={`min-h-[36px] px-2.5 rounded-lg border text-xs text-left truncate ${
                        activeLens === lens.id
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/20 text-[#F4EFE6]'
                          : 'border-[#C0C5CE]/15 text-[#C0C5CE] hover:text-[#F4EFE6]'
                      }`}
                    >
                      {lens.labelTh}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE, GOOGLE LOGIN & PRECISION DOB CALIBRATOR */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Google Login Bar */}
              <div className="rounded-xl border border-[var(--theme-accent)]/30 bg-[#0D1015] p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--theme-accent)]">
                    บัญชีผู้ใช้และคลังบันทึก Cloud Firestore
                  </div>
                  <p className="text-xs text-[#C0C5CE] mt-0.5">
                    {googleUser
                      ? `เข้าสู่ระบบแล้ว: ${googleUser.displayName || googleUser.email}`
                      : 'ลงชื่อเข้าใช้ด้วย Google เพื่อเก็บประวัติคำทำนายและวงสนทนาไว้ดูย้อนหลัง'}
                  </p>
                </div>

                {googleUser ? (
                  <button
                    type="button"
                    onClick={() => void onGoogleSignOut()}
                    className="min-h-[38px] px-4 py-1.5 rounded-lg border border-[#C0C5CE]/25 text-xs text-[#F4EFE6] hover:border-[var(--theme-accent)] inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                    <span>ออกจากระบบ</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={async () => {
                      setAuthBusy(true);
                      try {
                        await onGoogleSignIn();
                      } finally {
                        setAuthBusy(false);
                      }
                    }}
                    className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[var(--theme-accent)] text-[#0D1015] text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{authBusy ? 'กำลังเข้าสู่ระบบ...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>

              {/* Compact Gender / DOB / Birth Time Calibrator */}
              <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/55 p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--theme-accent)]">
                    พิกัดชะตาเสริมความแม่นยำคำทำนาย (ไม่บังคับ)
                  </h3>
                  <p className="text-[11px] text-[#C0C5CE] mt-0.5">
                    ข้อมูลเพศและวันเกิดใช้คำนวณวันพระเคราะห์ ราศี นักษัตร และเลขรหัสชีวิตเพื่อปรับน้ำหนักหน้าไพ่สุดท้าย
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'female', label: 'หญิง' },
                      { id: 'male', label: 'ชาย' },
                      { id: 'other', label: 'อิสระ / LGBTQ+' },
                      { id: 'unspecified', label: 'ไม่ระบุ' },
                    ] as Array<{ id: UserGender; label: string }>
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        onCalibrationChange({ ...calibrationInput, gender: g.id })
                      }
                      className={`min-h-[36px] rounded-lg border text-xs font-medium ${
                        calibrationInput.gender === g.id
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                          : 'border-[#C0C5CE]/20 text-[#C0C5CE]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <select
                    aria-label="วันเกิด"
                    value={Math.min(calibrationInput.birthDay, daysInSelectedMonth)}
                    onChange={(e) =>
                      onCalibrationChange({
                        ...calibrationInput,
                        birthDay: Number(e.target.value),
                      })
                    }
                    className="min-h-[38px] rounded-lg border border-[#C0C5CE]/25 bg-[#141820] px-2.5 text-xs text-[#F4EFE6]"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        วันที่ {d}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="เดือนเกิด"
                    value={calibrationInput.birthMonth}
                    onChange={(e) =>
                      onCalibrationChange({
                        ...calibrationInput,
                        birthMonth: Number(e.target.value),
                      })
                    }
                    className="min-h-[38px] rounded-lg border border-[#C0C5CE]/25 bg-[#141820] px-2.5 text-xs text-[#F4EFE6]"
                  >
                    {THAI_MONTHS_SHORT.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="ปีเกิด พ.ศ."
                    value={calibrationInput.birthYearCe}
                    onChange={(e) =>
                      onCalibrationChange({
                        ...calibrationInput,
                        birthYearCe: Number(e.target.value),
                      })
                    }
                    className="min-h-[38px] rounded-lg border border-[#C0C5CE]/25 bg-[#141820] px-2.5 text-xs text-[#F4EFE6]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        พ.ศ. {y + 543} ({y})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'dawn', label: 'เช้ามืด' },
                      { id: 'morning', label: 'เช้า–สาย' },
                      { id: 'afternoon', label: 'บ่าย–เย็น' },
                      { id: 'night', label: 'ค่ำ–ดึก' },
                      { id: 'unknown', label: 'ไม่ระบุเวลา' },
                    ] as Array<{ id: BirthTimeSlot; label: string }>
                  ).map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() =>
                        onCalibrationChange({ ...calibrationInput, birthTimeSlot: slot.id })
                      }
                      className={`min-h-[34px] rounded-md border text-[11px] ${
                        calibrationInput.birthTimeSlot === slot.id
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/20 text-[#F4EFE6]'
                          : 'border-[#C0C5CE]/15 text-[#C0C5CE]'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'love', label: 'เน้นความรัก' },
                      { id: 'money_work', label: 'เน้นงาน/เงิน' },
                      { id: 'crossroads', label: 'เน้นทางแยก' },
                      { id: 'secret_sign', label: 'เน้นลางสังหรณ์' },
                    ] as Array<{ id: FocusArea; label: string }>
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        onCalibrationChange({ ...calibrationInput, focusArea: f.id })
                      }
                      className={`min-h-[34px] rounded-md border text-[11px] ${
                        calibrationInput.focusArea === f.id
                          ? 'border-[#4A5D4E] bg-[#4A5D4E]/35 text-[#F4EFE6]'
                          : 'border-[#C0C5CE]/15 text-[#C0C5CE]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Live Computed Destiny Snapshot */}
                <div className="rounded-lg bg-[#141820] border border-[var(--theme-accent)]/25 p-3 text-xs space-y-1">
                  <div className="font-semibold text-[var(--theme-accent)]">
                    {personalProfile.thaiWeekdayTh} · {personalProfile.westernZodiacTh} ·{' '}
                    {personalProfile.chineseZodiacTh} · เลขรหัสชีวิต {personalProfile.lifePathNumber}
                  </div>
                  <p className="text-[#C0C5CE]">{personalProfile.freeEdgeTh}</p>
                </div>
              </div>

              {/* Saved Firestore Readings Quick View */}
              {googleUser && (
                <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/50 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--theme-accent)]">
                    <span className="inline-flex items-center gap-1.5">
                      <BookMarked className="w-4 h-4" />
                      ประวัติคำทำนายที่บันทึก ({savedReadings.length}) · วงสนทนา ({savedThreads.length})
                    </span>
                  </div>
                  {savedReadings.length === 0 ? (
                    <p className="text-xs text-[#C0C5CE]/75">
                      ยังไม่มีผลทำนายที่บันทึกไว้ กด “บันทึกลงคลัง” หลังจบ 5 รอบเพื่อเก็บไว้ที่นี่
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto sanctuary-scroll pr-1">
                      {savedReadings.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-[#C0C5CE]/15 bg-[#141820] p-2.5 text-xs flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[#F4EFE6] truncate">
                              {item.headline}
                            </div>
                            <p className="text-[11px] text-[#C0C5CE] line-clamp-1">
                              {item.promptSummary}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void deleteSavedReading(googleUser.uid, item.id)}
                            aria-label="ลบบันทึกนี้"
                            className="text-[#C0C5CE]/70 hover:text-rose-300 shrink-0 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREDITS & PROMPTPAY */}
          {activeTab === 'credits' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--theme-accent)]/35 bg-[#0D1015] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-[#F4EFE6]">
                      เครดิตและสิทธิ์ปลดล็อกบทวิเคราะห์เชิงลึก
                    </h3>
                    <p className="text-xs text-[#C0C5CE] mt-0.5">
                      แบบทดสอบสัญชาตญาณ 5 รอบและกบเฒ่า 3 มิติเปิดให้ใช้งานฟรีเสมอ ส่วนสิทธิ์วิเคราะห์คำถามเฉพาะเจาะจงเปิดรับชำระผ่าน PromptPay QR
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      paidReadingToken
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : trialAvailable
                          ? 'bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]/40'
                          : 'bg-[#1C1F24] text-[#C0C5CE] border border-[#C0C5CE]/25'
                    }`}
                  >
                    {paidReadingToken
                      ? 'มีเครดิตเจาะลึก 1 สิทธิ์พร้อมใช้'
                      : trialAvailable
                        ? 'ทดลองเจาะลึกฟรีคงเหลือ 1 ครั้ง'
                        : 'ใช้สิทธิ์ฟรีครบแล้ว'}
                  </span>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPromptPay();
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-[#0D1015] text-xs font-semibold inline-flex items-center gap-2 lantern-glow"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>ซื้อเครดิต PromptPay QR (99 / 129 / 199 บาท)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenExtendedStudio();
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-lg border border-[#C0C5CE]/30 bg-[#141820] text-xs text-[#F4EFE6] hover:border-[var(--theme-accent)] inline-flex items-center gap-2"
                  >
                    <span>เปิดห้องถามเจาะจงเต็มรูปแบบ (Custom Prompt / HVDC)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PDPA, GDPR, COOKIES, OPEN SOURCE & SITE METADATA */}
          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/60 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-[var(--theme-accent)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ความยินยอม PDPA มาตรา 26 &amp; GDPR Processing Consent</span>
                </h3>

                <label className="flex items-start gap-3 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={pdpaCoreConsent}
                    onChange={(e) => onPdpaConsentChange(e.target.checked, pdpaGmailConsent)}
                    className="mt-0.5 h-4 w-4 accent-[#D4A359] shrink-0"
                  />
                  <div>
                    <span className="font-semibold text-[#F4EFE6] block">
                      ยินยอมให้ประมวลผลข้อความสะท้อนจิตวิทยาและวันเกิดบนเซิร์ฟเวอร์
                    </span>
                    <span className="text-[#C0C5CE]">
                      ข้อมูลใช้เพื่อสร้างบทวิเคราะห์ส่วนตัวและเสียงบรรยายภาษาไทย ไม่นำไปเผยแพร่สาธารณะ
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={pdpaGmailConsent}
                    onChange={(e) => onPdpaConsentChange(pdpaCoreConsent, e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#D4A359] shrink-0"
                  />
                  <div>
                    <span className="font-semibold text-[#F4EFE6] block">
                      ยินยอมเสริม: คัดกรองบริบทหัวข้อ Gmail แบบอ่านอย่างเดียว (ตัดอีเมล/OTP/ตัวเลขออกทั้งหมด)
                    </span>
                    <span className="text-[#C0C5CE]">
                      ใช้เฉพาะเมื่อกดอนุญาตเชื่อมต่อในห้องวิเคราะห์เจาะลึกเท่านั้น
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer text-xs pt-2 border-t border-[#C0C5CE]/10">
                  <input
                    type="checkbox"
                    checked={cookieConsentAccepted}
                    onChange={(e) => onCookieConsentChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#D4A359] shrink-0"
                  />
                  <div className="flex items-start gap-1.5">
                    <Cookie className="w-3.5 h-3.5 text-[var(--theme-accent)] mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-[#F4EFE6] block">
                        คุกกี้การตั้งค่าหน้าจอและสิทธิ์ทดลองอ่าน (Preference &amp; Security Cookies)
                      </span>
                      <span className="text-[#C0C5CE]">
                        บันทึกโทนสี ภาษา โทนเสียง และการป้องกันการใช้สิทธิ์ซ้ำอย่างปลอดภัย
                      </span>
                    </div>
                  </div>
                </label>
              </div>

              <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/60 p-4 space-y-2.5">
                <h3 className="text-xs font-semibold text-[var(--theme-accent)] flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  <span>Open-Source Credits &amp; Attributions</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {OPEN_SOURCE_STACK.map((lib) => (
                    <div
                      key={lib.name}
                      className="rounded-lg border border-[#C0C5CE]/12 bg-[#141820] px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium text-[#F4EFE6]">{lib.name}</div>
                        <div className="text-[11px] text-[#C0C5CE]">{lib.note}</div>
                      </div>
                      <span className="text-[10px] text-[var(--theme-accent)] shrink-0">
                        {lib.license}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015]/60 p-4 space-y-3 text-xs">
                <p className="text-[#C0C5CE] leading-relaxed">{THAI_ETHICS_DISCLAIMER}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#C0C5CE]/10 text-[#C0C5CE]">
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Check className="w-3.5 h-3.5" />
                    Single-Screen Sanctuary v2
                  </span>
                  <div className="flex items-center gap-4">
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--theme-accent)] underline"
                    >
                      sitemap.xml
                    </a>
                    <a
                      href="/robots.txt"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--theme-accent)] underline"
                    >
                      robots.txt
                    </a>
                    <a
                      href="/llms.txt"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--theme-accent)] underline"
                    >
                      llms.txt
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
