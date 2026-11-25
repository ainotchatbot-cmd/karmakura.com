import React, { useMemo, useState } from 'react';
import { ArrowDownRight, Eye, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';
import { FULL_TAROT_DECK, type TarotCardLore } from '../data/majorArcanaLore';
import {
  THAI_MONTHS_SHORT,
  type BirthTimeSlot,
  type ComputedDestinyProfile,
  type FocusArea,
  type PersonalCalibrationInput,
  type UserGender,
} from '../lib/birthProfile';
import {
  SHRINE_HORIZON_IMG,
  TarotCardArtwork,
  TarotCardBackArtwork,
} from './MysticArtifacts';

interface PersonalCalibratorProps {
  value: PersonalCalibrationInput;
  profile: ComputedDestinyProfile;
  onChange: (next: PersonalCalibrationInput) => void;
  dailyCard: TarotCardLore | null;
  onDailyCardDrawn: (card: TarotCardLore | null) => void;
  onAskAbbot: (promptText: string) => void;
  onUseInStudio: (promptText: string) => void;
}

const GENDER_OPTIONS: Array<{ id: UserGender; labelTh: string }> = [
  { id: 'male', labelTh: 'ชาย' },
  { id: 'female', labelTh: 'หญิง' },
  { id: 'other', labelTh: 'LGBTQ+' },
  { id: 'unspecified', labelTh: 'ไม่ระบุ' },
];

const TIME_SLOT_OPTIONS: Array<{ id: BirthTimeSlot; labelTh: string }> = [
  { id: 'dawn', labelTh: 'เช้ามืด' },
  { id: 'morning', labelTh: 'เช้า–สาย' },
  { id: 'afternoon', labelTh: 'บ่าย–เย็น' },
  { id: 'night', labelTh: 'ค่ำ–ดึก' },
  { id: 'unknown', labelTh: 'ไม่ทราบ' },
];

const FOCUS_OPTIONS: Array<{ id: FocusArea; labelTh: string }> = [
  { id: 'love', labelTh: 'ความรัก / คนในใจ' },
  { id: 'money_work', labelTh: 'เงิน / โอกาสงาน' },
  { id: 'crossroads', labelTh: 'ทางแยกชีวิต' },
  { id: 'secret_sign', labelTh: 'ลางสังหรณ์ช่วงนี้' },
];

function pickThreeCandidateCards(): TarotCardLore[] {
  const pool = [...FULL_TAROT_DECK];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function PersonalCalibrator({
  value,
  profile,
  onChange,
  dailyCard,
  onDailyCardDrawn,
  onAskAbbot,
  onUseInStudio,
}: PersonalCalibratorProps) {
  const [candidates, setCandidates] = useState<TarotCardLore[]>(() => pickThreeCandidateCards());
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const daysInMonth = useMemo(() => {
    return new Date(value.birthYearCe, value.birthMonth, 0).getDate();
  }, [value.birthYearCe, value.birthMonth]);

  const yearsDescending = useMemo(() => {
    const arr: number[] = [];
    for (let y = 2010; y >= 1947; y -= 1) {
      arr.push(y);
    }
    return arr;
  }, []);

  const updateField = <K extends keyof PersonalCalibrationInput>(
    key: K,
    nextVal: PersonalCalibrationInput[K]
  ) => {
    const updated: PersonalCalibrationInput = { ...value, [key]: nextVal };
    const maxD = new Date(updated.birthYearCe, updated.birthMonth, 0).getDate();
    if (updated.birthDay > maxD) {
      updated.birthDay = maxD;
    }
    onChange(updated);
  };

  const handleFlipDailyCard = (idx: number) => {
    if (dailyCard && pickedIndex !== null) return;
    const chosen = candidates[idx] ?? candidates[0];
    setPickedIndex(idx);
    onDailyCardDrawn(chosen);
  };

  const handleResetDailyPull = () => {
    setCandidates(pickThreeCandidateCards());
    setPickedIndex(null);
    onDailyCardDrawn(null);
  };

  const handleSendDestinyToStudio = () => {
    onUseInStudio(
      `ช่วยวิเคราะห์เจาะจงสำหรับ${profile.genderLabelTh} เกิด${profile.dobFormattedTh} (${profile.thaiWeekdayTh} · ${profile.westernZodiacTh} · ${profile.chineseZodiacTh} · เลขรหัส ${profile.lifePathNumber}) โดยเฉพาะเรื่อง${profile.focusLabelTh}${
        dailyCard ? ` และไพ่เงาประจำวันที่เปิดได้คือ "${dailyCard.nameTh} (${dailyCard.nameEn})"` : ''
      }`
    );
  };

  return (
    <section
      id="calibrator"
      aria-label="ตั้งค่าพิกัดชะตาและรับคำอ่านฟรีเฉพาะคุณ"
      className="mt-8 rounded-xl border border-[#D4A359]/25 bg-[#141820] overflow-hidden shadow-2xl"
    >
      <div className="relative overflow-hidden border-b border-[#D4A359]/20 px-5 sm:px-7 py-6">
        <img
          src={SHRINE_HORIZON_IMG}
          alt="ศาลาสระบัวกลางคืน"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#0D1015]/95 via-[#0D1015]/82 to-[#0D1015]/90"
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[#D4A359] tracking-wide">
              ปรับพิกัดความแม่นยำเฉพาะบุคคล · คำนวณฟรีทันที
            </p>
            <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#F4EFE6]">
              ใส่เพศและวันเกิด เพื่อส่องจุดแข็ง จุดบอด และหยิบไพ่เงาฟรีวันนี้
            </h2>
          </div>
          <span className="text-xs text-[#C0C5CE]/90">
            เชื่อมต่ออัตโนมัติทั้งท่านเจ้าอาวาสกบเฒ่า และห้องถอดรหัสเชิงลึก
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-7">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Easy 1-tap Gender, DOB, Time Slot, Focus Area */}
        <div className="lg:col-span-5 rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015] p-5 space-y-5">
          <div>
            <span className="block text-xs font-medium text-[#C0C5CE] mb-2">
              1. เพศ (ปรับบริบทบทบาทและความสัมพันธ์)
            </span>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-[#141820] border border-[#C0C5CE]/15">
              {GENDER_OPTIONS.map((g) => {
                const active = value.gender === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateField('gender', g.id)}
                    className={`min-h-[38px] px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#D4A359] text-[#0D1015] font-semibold'
                        : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {g.labelTh}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#C0C5CE] mb-2">
              2. วัน / เดือน / ปีเกิด (แสดง พ.ศ. คู่ ค.ศ.)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="sr-only">วันเกิด</span>
                <select
                  value={value.birthDay}
                  onChange={(e) => updateField('birthDay', Number(e.target.value))}
                  className="w-full min-h-[42px] rounded-lg border border-[#C0C5CE]/20 bg-[#141820] px-2.5 text-xs text-[#F4EFE6] focus:border-[#D4A359] focus:outline-none"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      วันที่ {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">เดือนเกิด</span>
                <select
                  value={value.birthMonth}
                  onChange={(e) => updateField('birthMonth', Number(e.target.value))}
                  className="w-full min-h-[42px] rounded-lg border border-[#C0C5CE]/20 bg-[#141820] px-2.5 text-xs text-[#F4EFE6] focus:border-[#D4A359] focus:outline-none"
                >
                  {THAI_MONTHS_SHORT.map((mName, idx) => (
                    <option key={mName} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">ปีเกิด</span>
                <select
                  value={value.birthYearCe}
                  onChange={(e) => updateField('birthYearCe', Number(e.target.value))}
                  className="w-full min-h-[42px] rounded-lg border border-[#C0C5CE]/20 bg-[#141820] px-2 text-xs text-[#F4EFE6] focus:border-[#D4A359] focus:outline-none"
                >
                  {yearsDescending.map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {y + 543} ({y})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#C0C5CE] mb-2">
              3. ช่วงเวลาเกิด (เลือกได้ถ้าทราบ)
            </span>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-[#141820] border border-[#C0C5CE]/15">
              {TIME_SLOT_OPTIONS.map((t) => {
                const active = value.birthTimeSlot === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateField('birthTimeSlot', t.id)}
                    className={`min-h-[36px] px-1.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#4A5D4E] text-[#F4EFE6]'
                        : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {t.labelTh}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#C0C5CE] mb-2">
              4. เรื่องที่อยากรู้คำตอบมากที่สุดตอนนี้
            </span>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_OPTIONS.map((f) => {
                const active = value.focusArea === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateField('focusArea', f.id)}
                    className={`min-h-[40px] px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors ${
                      active
                        ? 'border-[#D4A359] bg-[#D4A359]/15 text-[#F4EFE6]'
                        : 'border-[#C0C5CE]/15 bg-[#141820] text-[#C0C5CE] hover:border-[#D4A359]/45'
                    }`}
                  >
                    {f.labelTh}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Instant Free Added Value (Destiny Brief + Free 1-Card Shadow Pull) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Free Destiny & Shadow Brief */}
          <div className="rounded-xl border border-[#D4A359]/30 bg-[#0D1015] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C0C5CE]/12 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D4A359]">
                <Eye className="w-4 h-4" />
                <span>รหัสชะตาและจุดอับสายตาของคุณ (เปิดดูฟรี)</span>
              </div>
              <span className="text-[11px] text-[#C0C5CE] tabular-nums">
                เลขรหัสชีวิต {profile.lifePathNumber}
              </span>
            </div>

            {/* Unboxed dot-separated personal astronomy coordinates */}
            <div className="text-xs sm:text-sm text-[#F4EFE6] leading-relaxed">
              <span className="text-[#D4A359] font-semibold">{profile.thaiWeekdayTh}</span>
              <span aria-hidden="true" className="text-[#C0C5CE]/45"> · </span>
              <span>{profile.rulingPlanetTh}</span>
              <span aria-hidden="true" className="text-[#C0C5CE]/45"> · </span>
              <span>{profile.westernZodiacTh}</span>
              <span aria-hidden="true" className="text-[#C0C5CE]/45"> · </span>
              <span>{profile.chineseZodiacTh} ({profile.chineseElementTh})</span>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs leading-relaxed">
              <div className="rounded-lg border border-[#C0C5CE]/12 bg-[#141820] p-3.5">
                <span className="font-semibold text-[#D4A359] block">จุดแข็งที่ซ่อนอยู่</span>
                <p className="mt-1 text-[#F4EFE6]/90">{profile.freeEdgeTh}</p>
              </div>
              <div className="rounded-lg border border-[#C0C5CE]/12 bg-[#141820] p-3.5">
                <span className="font-semibold text-[#D4A359] block">จุดบอดที่มักเผลอทำซ้ำ</span>
                <p className="mt-1 text-[#F4EFE6]/90">{profile.freeBlindSpotTh}</p>
              </div>
              <div className="rounded-lg border border-[#C0C5CE]/12 bg-[#141820] p-3.5">
                <span className="font-semibold text-[#4A5D4E] block">สัญญาณที่ต้องจับตาใน 7 วันนี้</span>
                <p className="mt-1 text-[#F4EFE6]/90">{profile.freeSevenDayWatchTh}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  onAskAbbot(
                    `อาตมาเกิด${profile.dobFormattedTh} (${profile.thaiWeekdayTh}, ${profile.westernZodiacTh}, เลขรหัสชีวิต ${profile.lifePathNumber}) เพศ${profile.genderLabelTh} ตอนนี้โฟกัสเรื่อง${profile.focusLabelTh} — ช่วยส่องให้หน่อยว่า 7 วันนี้ระวังอะไรและควรขยับทางไหน?`
                  )
                }
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#D4A359] text-[#0D1015] text-xs font-semibold inline-flex items-center gap-1.5 lantern-glow whitespace-nowrap"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>ถามเจ้าอาวาสเรื่องพิกัดนี้</span>
              </button>
              <button
                type="button"
                onClick={handleSendDestinyToStudio}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[#C0C5CE]/25 bg-[#141820] text-[#F4EFE6] text-xs font-medium hover:border-[#D4A359]/60 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-[#D4A359]" />
                <span>นำไปวิเคราะห์ลึกด้านล่าง</span>
              </button>
            </div>
          </div>

          {/* Free Daily 1-Card Shadow Pull */}
          <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#0D1015] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F4EFE6]">
                <Sparkles className="w-4 h-4 text-[#D4A359]" />
                <span>หยิบไพ่เงาประจำวันฟรี 1 ใบ (จากสำรับ 78 ใบ)</span>
              </div>
              {dailyCard && (
                <button
                  type="button"
                  onClick={handleResetDailyPull}
                  className="text-xs text-[#D4A359] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>สับไพ่ลองใหม่</span>
                </button>
              )}
            </div>

            {!dailyCard ? (
              <div className="grid grid-cols-3 gap-3">
                {candidates.map((card, idx) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleFlipDailyCard(idx)}
                    className="group rounded-lg border border-[#D4A359]/30 bg-[#141820] p-2.5 text-center hover:border-[#D4A359] lantern-glow flex flex-col items-center justify-between gap-2"
                  >
                    <TarotCardBackArtwork
                      alt={`ไพ่เงาใบที่ ${idx + 1}`}
                      className="w-full aspect-[3/4] transition-transform duration-200 group-hover:-translate-y-1"
                    />
                    <span className="text-xs text-[#D4A359] font-medium">
                      แตะเปิดใบที่ {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-[#D4A359]/40 bg-[#141820] p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <TarotCardArtwork
                    motif={dailyCard.symbolMotif}
                    alt={dailyCard.nameTh}
                    className="w-28 aspect-[3/4] shrink-0 mx-auto sm:mx-0"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <div className="text-[11px] text-[#C0C5CE]">
                        <span>{dailyCard.suitLabelTh}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{dailyCard.nameEn}</span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-[#F4EFE6]">
                        {dailyCard.nameTh}
                      </h3>
                      <p className="text-xs text-[#D4A359] mt-0.5">{dailyCard.archetypeTh}</p>
                    </div>
                    <p className="text-xs italic text-[#F4EFE6]/90">
                      คำถามสะท้อนใจ: “{dailyCard.inquiryPromptTh}”
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                  <div className="rounded-md bg-[#0D1015] border border-[#C0C5CE]/10 p-3">
                    <strong className="text-[#D4A359] block">ด้านสว่างวันนี้</strong>
                    <p className="mt-1 text-[#C0C5CE]">{dailyCard.lightTh}</p>
                  </div>
                  <div className="rounded-md bg-[#0D1015] border border-[#C0C5CE]/10 p-3">
                    <strong className="text-rose-300 block">ด้านเงาที่ต้องระวัง</strong>
                    <p className="mt-1 text-[#C0C5CE]">{dailyCard.shadowTh}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      onAskAbbot(
                        `วันนี้ฉันหยิบไพ่เงาประจำวันได้ใบ "${dailyCard.nameTh} (${dailyCard.nameEn})" โดยกำลังโฟกัสเรื่อง${profile.focusLabelTh} — เจ้าอาวาสช่วยตีความสัญญาณจากไพ่ใบนี้ให้หน่อย`
                      )
                    }
                    className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#D4A359] text-[#0D1015] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>ถามเจ้าอาวาสเรื่องไพ่ใบนี้</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendDestinyToStudio}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-lg border border-[#C0C5CE]/25 bg-[#0D1015] text-xs text-[#F4EFE6] hover:border-[#D4A359]/60 whitespace-nowrap"
                  >
                    นำไปถอดรหัสลึกต่อ →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
