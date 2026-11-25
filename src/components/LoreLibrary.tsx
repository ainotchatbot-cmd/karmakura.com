import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { FULL_TAROT_DECK, type ArcanaCategory, type TarotCardLore } from '../data/majorArcanaLore';
import { TarotCardArtwork } from './MysticArtifacts';

const FILTER_OPTIONS: Array<{ id: 'all' | ArcanaCategory; labelTh: string }> = [
  { id: 'all', labelTh: 'ทั้งหมด (78)' },
  { id: 'major', labelTh: 'ชุดใหญ่ (22)' },
  { id: 'wands', labelTh: 'ไม้เท้า (14)' },
  { id: 'cups', labelTh: 'ถ้วย (14)' },
  { id: 'swords', labelTh: 'ดาบ (14)' },
  { id: 'pentacles', labelTh: 'เหรียญ (14)' },
];

export function LoreLibrary({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState<'all' | ArcanaCategory>('all');
  const [query, setQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<TarotCardLore | null>(null);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FULL_TAROT_DECK.filter((card) => {
      if (filter !== 'all' && card.arcana !== filter) return false;
      if (!q) return true;
      return (
        card.nameTh.toLowerCase().includes(q) ||
        card.nameEn.toLowerCase().includes(q) ||
        card.archetypeTh.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  return (
    <section
      id="lore"
      className={compact ? 'space-y-4' : 'py-16 border-t border-[#C0C5CE]/15'}
    >
      <div className={`flex flex-col lg:flex-row lg:items-end justify-between gap-4 ${compact ? 'mb-3' : 'mb-8'}`}>
        <div>
          <p className="text-xs text-[#D4A359]">คลังความหมายเชิงจิตวิทยา · 78 ใบสมบูรณ์</p>
          <h2 className={`mt-1 font-display font-semibold text-[#F4EFE6] ${compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}>
            คลังไพ่ทาโรต์แห่งผู้เดินทางชุดเทา (Major &amp; Minor Arcana)
          </h2>
          {!compact && (
            <p className="mt-2 text-sm text-[#C0C5CE] reading-measure">
              สำรวจทั้งด้านสว่าง (Light) ด้านเงา (Shadow) กรอบปรับมุมมองทางความคิด และคำถามสะท้อนใจสำหรับไพ่ครบทั้ง 78 ใบโดยไม่มีค่าใช้จ่าย
            </p>
          )}
        </div>

        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-[#C0C5CE] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อไพ่หรือธีมจิตวิทยา..."
            className="w-full min-h-[44px] rounded-lg border border-[#C0C5CE]/20 bg-[#141820] pl-10 pr-4 text-sm text-[#F4EFE6] placeholder:text-[#C0C5CE]/60 focus:border-[#D4A359] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#141820] rounded-lg border border-[#C0C5CE]/15 w-fit mb-8">
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#D4A359] text-[#1C1F24]'
                  : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
              }`}
            >
              {opt.labelTh}
            </button>
          );
        })}
      </div>

      {filteredCards.length === 0 ? (
        <div className="rounded-lg border border-[#C0C5CE]/15 bg-[#141820] p-10 text-center text-sm text-[#C0C5CE]">
          ไม่พบไพ่ที่ตรงกับคำค้นหา “{query}”
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCard(card)}
              className="text-left rounded-lg border border-[#C0C5CE]/15 bg-[#141820] p-4 hover:border-[#D4A359]/60 lantern-glow transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <TarotCardArtwork
                  motif={card.symbolMotif}
                  alt={card.nameTh}
                  className="w-20 aspect-[3/4] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[#C0C5CE]">
                    <span className="tabular-nums">ลำดับ {String(card.number).padStart(2, '0')}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{card.suitLabelTh}</span>
                  </div>
                  <h3 className="mt-1 font-display text-base sm:text-lg font-semibold text-[#F4EFE6] leading-snug">
                    {card.nameTh}
                  </h3>
                  <p className="text-xs text-[#D4A359]">{card.nameEn}</p>
                  <p className="mt-2 text-xs text-[#C0C5CE] leading-relaxed line-clamp-2">
                    {card.archetypeTh}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#C0C5CE]/10 text-xs text-[#D4A359] font-medium">
                เปิดอ่านด้านสว่างและด้านเงา →
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-lore-title"
        >
          <div className="w-full max-w-xl rounded-xl border border-[#D4A359]/40 bg-[#F4EFE6] text-[#1C1F24] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-[#1C1F24]/15 pb-4">
              <div className="flex items-center gap-4">
                <TarotCardArtwork
                  motif={selectedCard.symbolMotif}
                  alt={selectedCard.nameTh}
                  className="w-20 aspect-[3/4] shrink-0"
                />
                <div>
                  <div className="text-xs text-[#4A5D4E] font-medium">
                    <span className="tabular-nums">ลำดับ {String(selectedCard.number).padStart(2, '0')}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{selectedCard.suitLabelTh}</span>
                  </div>
                  <h3 id="card-lore-title" className="font-display text-2xl font-bold text-[#1C1F24]">
                    {selectedCard.nameTh}
                  </h3>
                  <p className="text-xs text-[#1C1F24]/70">{selectedCard.nameEn}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                aria-label="ปิดหน้าต่างไพ่"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[#1C1F24]/70 hover:text-[#1C1F24] hover:bg-[#1C1F24]/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-relaxed">
              <div>
                <h4 className="font-semibold text-[#1C1F24]">แก่นอาร์คีไทป์ทางจิตวิทยา</h4>
                <p className="mt-1 text-[#1C1F24]/85">{selectedCard.archetypeTh}</p>
              </div>
              <div className="rounded-lg border border-[#4A5D4E]/25 bg-white/60 p-4">
                <h4 className="font-semibold text-[#4A5D4E]">ด้านสว่าง (Light Reflection)</h4>
                <p className="mt-1 text-[#1C1F24]/90">{selectedCard.lightTh}</p>
              </div>
              <div className="rounded-lg border border-[#1C1F24]/15 bg-[#1C1F24]/5 p-4">
                <h4 className="font-semibold text-[#1C1F24]">ด้านเงา (Shadow Pattern)</h4>
                <p className="mt-1 text-[#1C1F24]/90">{selectedCard.shadowTh}</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#1C1F24]">การปรับกรอบความคิด (Cognitive Reframe)</h4>
                <p className="mt-1 text-[#1C1F24]/85">{selectedCard.cognitiveReframeTh}</p>
              </div>
              <div className="border-t border-[#1C1F24]/15 pt-3">
                <h4 className="font-semibold text-[#1C1F24]">คำถามชวนใคร่ครวญตนเอง</h4>
                <p className="mt-1 italic text-[#1C1F24]/90">“{selectedCard.inquiryPromptTh}”</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
