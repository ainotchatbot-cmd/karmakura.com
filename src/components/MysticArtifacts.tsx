import React, { useState } from 'react';
import type { DomainSlot } from '../config/site.config';
import type { TarotCardLore } from '../data/majorArcanaLore';

export const TAROT_CARD_BACK_IMG = '/src/assets/images/tarot_card_back_1795596658237.jpg';
export const FROG_ABBOT_PORTRAIT_IMG = '/src/assets/images/frog_abbot_emblem_1795596664203.jpg';
export const FROG_ORACLE_PORTRAIT_IMG = '/src/assets/images/frog_oracle_portrait_1795599042211.jpg';
export const FROG_ORACLE_SPEAKING_IMG = '/src/assets/images/frog_oracle_speaking_1795599041200.jpg';
export const SHRINE_HORIZON_IMG = '/src/assets/images/nocturnal_shrine_horizon_1795596663637.jpg';
export const ALTAR_STILL_LIFE_IMG = '/src/assets/images/altar_still_life_1795596664679.jpg';

export const TAROT_MOTIF_IMAGES: Record<TarotCardLore['symbolMotif'], string> = {
  lantern: '/src/assets/images/tarot_lantern_plate_1795596658743.jpg',
  moon: '/src/assets/images/tarot_moon_plate_1795596659490.jpg',
  sword: '/src/assets/images/tarot_sword_plate_1795596659682.jpg',
  chalice: '/src/assets/images/tarot_chalice_plate_1795596659882.jpg',
  pentacle: '/src/assets/images/tarot_pentacle_plate_1795596661754.jpg',
  wand: '/src/assets/images/tarot_wand_plate_1795596661561.jpg',
  crown: '/src/assets/images/tarot_crown_plate_1795596661314.jpg',
  wheel: '/src/assets/images/tarot_wheel_plate_1795596662509.jpg',
};

export const DOMAIN_ARTWORK_URLS: Record<DomainSlot, { src: string; altTh: string; captionTh: string }> = {
  slot_horoscope: {
    src: '/src/assets/images/hero_horoscope_astrolabe_1795592350171.jpg',
    altTh: 'ภาพพิมพ์แกะสลักวงล้อแอสโตรแลบและกิ่งมอสแห่งฤดูกาลชีวิต',
    captionTh: 'ภาพประกอบที่ 1 · วงล้อจังหวะชีวิตและฤดูกาลทางอารมณ์',
  },
  slot_tarot: {
    src: '/src/assets/images/hero_pilgrim_lantern_1795592350590.jpg',
    altTh: 'ภาพพิมพ์ผู้เดินทางชุดเทาถือตะเกียงสีอำพันท่ามกลางภูเขาหมอก',
    captionTh: 'ภาพประกอบที่ 2 · ผู้เดินทางชุดเทากับแสงตะเกียงส่องทางตรงหน้า',
  },
  slot_dream: {
    src: '/src/assets/images/hero_dream_threshold_1795592350027.jpg',
    altTh: 'ภาพพิมพ์ซุ้มประตูหินยามค่ำเปิดสู่ทะเลสาบหมอกและพระจันทร์เสี้ยว',
    captionTh: 'ภาพประกอบที่ 3 · ธรณีประตูแห่งนิมิตและความฝันยามค่ำ',
  },
};

export function TarotCardBackArtwork({
  alt,
  className = 'w-full aspect-[3/4]',
}: {
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`rounded-lg border border-[#D4A359]/35 bg-[#0D1015] flex items-center justify-center p-3 ${className}`}
      >
        <img src="/icons/card-back.svg" alt={alt} className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[#D4A359]/40 bg-[#0D1015] shadow-lg ${className}`}
    >
      <img
        src={TAROT_CARD_BACK_IMG}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1015]/45 via-transparent to-transparent"
      />
    </div>
  );
}

export function TarotCardArtwork({
  motif,
  alt,
  className = 'w-full aspect-[3/4]',
}: {
  motif: TarotCardLore['symbolMotif'];
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = TAROT_MOTIF_IMAGES[motif] ?? TAROT_MOTIF_IMAGES.lantern;

  if (failed) {
    return (
      <div
        className={`rounded-lg border border-[#D4A359]/35 bg-[#0D1015] flex items-center justify-center p-3 ${className}`}
      >
        <MajorArcanaSigilSvg motif={motif} className="w-12 h-12" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[#D4A359]/40 bg-[#0D1015] shadow-lg ${className}`}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1015]/55 via-transparent to-transparent"
      />
    </div>
  );
}

export function DomainEditorialPlate({ slot }: { slot: DomainSlot }) {
  const [imgError, setImgError] = useState(false);
  const art = DOMAIN_ARTWORK_URLS[slot];

  if (imgError) {
    return (
      <div className="w-full h-full min-h-[320px] bg-[#141820] border border-[#D4A359]/30 rounded-lg flex flex-col items-center justify-center p-8 text-center">
        {slot === 'slot_dream' ? (
          <NightDreamerSilhouetteSvg className="w-40 h-52 text-[#D4A359]" />
        ) : (
          <GreyPilgrimSilhouetteSvg className="w-40 h-52 text-[#D4A359]" />
        )}
        <p className="mt-4 text-xs text-[#C0C5CE]">{art.captionTh}</p>
      </div>
    );
  }

  return (
    <figure className="w-full h-full flex flex-col">
      <div className="relative overflow-hidden rounded-lg border border-[#D4A359]/30 bg-[#141820] aspect-[3/4] lg:h-full lg:aspect-auto shadow-2xl">
        <img
          src={art.src}
          alt={art.altTh}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1015]/85 via-transparent to-transparent"
        />
      </div>
      <figcaption className="mt-2.5 text-xs text-[#C0C5CE] italic">{art.captionTh}</figcaption>
    </figure>
  );
}

export function LanternEmblemSvg({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="34" r="20" fill="#D4A359" fillOpacity="0.12" />
      <path d="M26 14H38M29 14V18H35V14" stroke="#D4A359" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M22 22L26 18H38L42 22V44L38 49H26L22 44V22Z"
        fill="#2A2E35"
        stroke="#D4A359"
        strokeWidth="2"
      />
      <path
        d="M32 27C34.5 30.5 35.5 33 35.5 35.2C35.5 37.3 33.9 39 32 39C30.1 39 28.5 37.3 28.5 35.2C28.5 33 29.5 30.5 32 27Z"
        fill="#D4A359"
      />
      <circle cx="32" cy="35" r="2" fill="#F4EFE6" />
      <path d="M20 50H44" stroke="#D4A359" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GreyPilgrimSilhouetteSvg({ className = 'w-32 h-44' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 240" fill="none" className={className} aria-hidden="true">
      <circle cx="90" cy="115" r="68" stroke="#D4A359" strokeOpacity="0.22" strokeWidth="1" />
      <path
        d="M90 42C79 42 71 51 71 63C71 71 75 76 79 79L58 188H122L101 79C105 76 109 71 109 63C109 51 101 42 90 42Z"
        fill="#2A2E35"
        stroke="#C0C5CE"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <path d="M62 84L44 196" stroke="#D4A359" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" />
      <circle cx="132" cy="126" r="22" fill="#D4A359" fillOpacity="0.16" />
      <path
        d="M124 114L132 108L140 114V134L132 140L124 134V114Z"
        fill="#1C1F24"
        stroke="#D4A359"
        strokeWidth="1.6"
      />
      <circle cx="132" cy="124" r="4" fill="#D4A359" />
    </svg>
  );
}

export function NightDreamerSilhouetteSvg({ className = 'w-32 h-44' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 240" fill="none" className={className} aria-hidden="true">
      <path
        d="M36 206V98C36 62 60 36 90 36C120 36 144 62 144 98V206"
        stroke="#C0C5CE"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <path
        d="M108 66C97 66 88 75 88 86C88 97 97 106 108 106C101 103 97 95 97 86C97 77 101 69 108 66Z"
        fill="#D4A359"
      />
      <path
        d="M90 120C82 120 77 127 77 135C77 141 80 146 84 149L72 206H108L96 149C100 146 103 141 103 135C103 127 98 120 90 120Z"
        fill="#2A2E35"
        stroke="#D4A359"
        strokeOpacity="0.6"
        strokeWidth="1.4"
      />
      <path d="M46 184C68 178 112 190 134 184" stroke="#4A5D4E" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MajorArcanaSigilSvg({
  motif,
  className = 'w-14 h-14',
}: {
  motif: TarotCardLore['symbolMotif'];
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke="#D4A359" strokeOpacity="0.35" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="22" stroke="#C0C5CE" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
      {motif === 'lantern' && (
        <>
          <path d="M24 22L28 18H36L40 22V42L36 46H28L24 42V22Z" stroke="#D4A359" strokeWidth="1.8" />
          <path d="M32 27C34 30 35 32 35 34C35 35.8 33.6 37 32 37C30.4 37 29 35.8 29 34C29 32 30 30 32 27Z" fill="#D4A359" />
        </>
      )}
      {motif === 'moon' && (
        <>
          <path
            d="M37 18C28.5 19 22 26 22 34.5C22 43 28.5 49.5 37 50.5C31 47.5 27.5 41.5 27.5 34.5C27.5 27.5 31 21.5 37 18Z"
            fill="#D4A359"
          />
          <circle cx="41" cy="24" r="2" fill="#C0C5CE" />
        </>
      )}
      {motif === 'sword' && (
        <>
          <path d="M32 14V46M23 38H41" stroke="#D4A359" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 14L36 22H28L32 14Z" fill="#D4A359" />
        </>
      )}
      {motif === 'chalice' && (
        <>
          <path d="M22 20H42C42 29 37.5 35 32 35C26.5 35 22 29 22 20Z" stroke="#D4A359" strokeWidth="1.8" />
          <path d="M32 35V46M25 46H39" stroke="#D4A359" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {motif === 'pentacle' && (
        <>
          <circle cx="32" cy="32" r="14" stroke="#D4A359" strokeWidth="1.6" />
          <path d="M32 19L36 42L21 28H43L28 42L32 19Z" stroke="#D4A359" strokeWidth="1.3" strokeLinejoin="round" />
        </>
      )}
      {motif === 'wand' && (
        <>
          <path d="M21 45L43 19" stroke="#D4A359" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="43" cy="19" r="3" fill="#D4A359" />
          <path d="M36 16L38 12M47 23L51 21" stroke="#C0C5CE" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {motif === 'crown' && (
        <>
          <path d="M18 40L21 24L29 32L32 20L35 32L43 24L46 40H18Z" stroke="#D4A359" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M18 44H46" stroke="#D4A359" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {motif === 'wheel' && (
        <>
          <circle cx="32" cy="32" r="13" stroke="#D4A359" strokeWidth="1.8" />
          <path d="M32 19V45M19 32H45M23 23L41 41M41 23L23 41" stroke="#D4A359" strokeWidth="1.3" />
          <circle cx="32" cy="32" r="3.5" fill="#1C1F24" stroke="#D4A359" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
