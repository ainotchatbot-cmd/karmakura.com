import React from 'react';
import {
  PERSPECTIVE_LENSES,
  type PerspectiveLens as PerspectiveLensId,
} from '../config/site.config';
import type { LensDigestItem } from '../lib/gemini-thai-voice';

export type LensFilterValue = PerspectiveLensId | 'all';

interface PerspectiveLensSelectorProps {
  mode: 'selector';
  activeLens: PerspectiveLensId;
  onSelectLens: (lens: PerspectiveLensId) => void;
}

interface PerspectiveLensFilterProps {
  mode: 'filter';
  selectedFilter: LensFilterValue;
  onSelectFilter: (filter: LensFilterValue) => void;
  lenses: LensDigestItem[];
  timeframeLabelTh: string;
  showSideBySide: boolean;
  onToggleSideBySide: () => void;
}

export type PerspectiveLensProps = PerspectiveLensSelectorProps | PerspectiveLensFilterProps;

export function PerspectiveLens(props: PerspectiveLensProps) {
  if (props.mode === 'selector') {
    const activeMeta =
      PERSPECTIVE_LENSES.find((item) => item.id === props.activeLens) ?? PERSPECTIVE_LENSES[0];

    return (
      <div className="space-y-2">
        <span className="block text-xs font-medium text-[#C0C5CE]">
          เลนส์มุมมองหลัก (Perspective Lens · สลับกรองผลลัพธ์ได้ทันที)
        </span>
        <div
          className="grid grid-cols-2 gap-1.5"
          role="radiogroup"
          aria-label="เลือกเลนส์มุมมองทางจิตวิทยาและวัฒนธรรม"
        >
          {PERSPECTIVE_LENSES.map((lens) => {
            const active = props.activeLens === lens.id;
            return (
              <button
                key={lens.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => props.onSelectLens(lens.id)}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-md border text-left text-xs font-medium transition-colors truncate ${
                  active
                    ? 'border-[#D4A359] bg-[#D4A359]/15 text-[#F4EFE6]'
                    : 'border-[#C0C5CE]/15 bg-[#1C1F24] text-[#C0C5CE] hover:text-[#F4EFE6]'
                }`}
              >
                {lens.labelTh}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#C0C5CE]/80 leading-relaxed">{activeMeta.focusTh}</p>
      </div>
    );
  }

  const {
    selectedFilter,
    onSelectFilter,
    lenses,
    timeframeLabelTh,
    showSideBySide,
    onToggleSideBySide,
  } = props;

  const focusedLens =
    selectedFilter === 'all'
      ? null
      : (lenses.find((l) => l.lensId === selectedFilter) ?? lenses[0] ?? null);

  return (
    <div className="border-t border-[#1C1F24]/10 pt-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#4A5D4E]">
          2. กรองผลลัพธ์ตามเลนส์มุมมอง (Real-Time Perspective Filter)
        </span>
        {selectedFilter !== 'all' && (
          <button
            type="button"
            onClick={onToggleSideBySide}
            className="text-xs font-medium text-[#4A5D4E] hover:underline whitespace-nowrap shrink-0"
          >
            {showSideBySide ? 'ซ่อนตารางเทียบอีก 5 ศาสตร์' : 'เทียบกับศาสตร์อื่นเคียงคู่กัน'}
          </button>
        )}
      </div>

      <div
        className="flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="กรองมุมมองผลลัพธ์แบบเรียลไทม์"
      >
        {lenses.map((lens) => {
          const active = selectedFilter === lens.lensId;
          return (
            <button
              key={lens.lensId}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectFilter(lens.lensId)}
              className={`min-h-[34px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#1C1F24] text-[#F4EFE6]'
                  : 'bg-[#1C1F24]/8 text-[#1C1F24]/75 hover:bg-[#1C1F24]/15'
              }`}
            >
              {lens.lensNameTh}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={selectedFilter === 'all'}
          onClick={() => onSelectFilter('all')}
          className={`min-h-[34px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            selectedFilter === 'all'
              ? 'bg-[#4A5D4E] text-[#F4EFE6]'
              : 'bg-[#4A5D4E]/12 text-[#4A5D4E] hover:bg-[#4A5D4E]/20'
          }`}
        >
          ดูทั้งหมด (6 เลนส์)
        </button>
      </div>

      {selectedFilter === 'all' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lenses.map((lens) => (
            <div
              key={lens.lensId}
              className="rounded-lg border border-[#1C1F24]/12 bg-[#F4EFE6] p-4 space-y-2 text-xs"
            >
              <div className="font-semibold text-sm text-[#1C1F24]">{lens.lensNameTh}</div>
              <p className="text-[#1C1F24]/90 leading-relaxed">{lens.framingTh}</p>
              <p className="text-[#1C1F24]/75">
                <strong>สิ่งที่ควรจับตา:</strong> {lens.watchForTh}
              </p>
              <p className="text-[#4A5D4E] font-medium">
                <strong>สิ่งที่ทำได้จริง:</strong> {lens.groundedTakeawayTh}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <>
          {focusedLens && (
            <div className="rounded-lg border border-[#1C1F24]/12 bg-[#F4EFE6] p-4 space-y-2 text-sm">
              <div className="font-semibold text-[#1C1F24]">
                มุมมองแบบ {focusedLens.lensNameTh}
              </div>
              <p className="text-[#1C1F24]/90 leading-relaxed">{focusedLens.framingTh}</p>
              <p className="text-xs text-[#1C1F24]/80">
                <strong>สิ่งที่ควรจับตา:</strong> {focusedLens.watchForTh}
              </p>
              <p className="text-xs text-[#4A5D4E] font-medium">
                <strong>สิ่งที่ทำได้จริงตอนนี้:</strong> {focusedLens.groundedTakeawayTh}
              </p>
            </div>
          )}

          {showSideBySide && (
            <div className="border-t border-[#1C1F24]/10 pt-3.5 space-y-2.5">
              <div className="text-xs font-semibold text-[#4A5D4E]">
                3. เปรียบเทียบมุมมองอื่นในช่วงเวลาเดียวกัน ({timeframeLabelTh})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {lenses
                  .filter((l) => l.lensId !== selectedFilter)
                  .map((lens) => (
                    <button
                      key={lens.lensId}
                      type="button"
                      onClick={() => onSelectFilter(lens.lensId)}
                      className="text-left rounded-md border border-[#1C1F24]/10 bg-[#F4EFE6]/70 hover:bg-[#F4EFE6] p-3 text-xs space-y-1 transition-colors"
                    >
                      <div className="font-semibold text-[#1C1F24]">{lens.lensNameTh}</div>
                      <p className="text-[#1C1F24]/85 leading-relaxed">
                        {lens.shortComparisonTh}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
