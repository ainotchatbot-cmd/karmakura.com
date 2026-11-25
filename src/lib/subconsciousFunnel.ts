import {
  NON_DOGMATIC_LENS_NOTE_TH,
  PERSPECTIVE_LENSES,
  TIMEFRAME_OPTIONS,
  type DigestTimeframe,
  type DomainSlot,
  type PerspectiveLens,
} from '../config/site.config';
import { FULL_TAROT_DECK, type TarotCardLore } from '../data/majorArcanaLore';
import type { ComputedDestinyProfile } from './birthProfile';
import type { LensDigestItem, OutcomeDigestPayload } from './gemini-thai-voice';

export type SubconsciousDimension =
  | 'ancestral_closure'
  | 'work_purpose'
  | 'relationship_bond'
  | 'family_roots'
  | 'luck_timing'
  | 'fortune_affirmation';

export type ThemePresetId = 'obsidian_gold' | 'moss_slate' | 'mithril_dusk';
export type DisplayLangMode = 'th' | 'th_en';

export interface LatentDesireScores {
  ancestral_closure: number;
  work_purpose: number;
  relationship_bond: number;
  family_roots: number;
  luck_timing: number;
  fortune_affirmation: number;
}

export interface BehavioralState {
  riskScore: number; // negative = cautious, positive = bold
  horizonScore: number; // negative = memory_closure, positive = future_horizon
  agencyScore: number; // negative = acceptance, positive = intervention
}

export interface FunnelOption {
  id: 'A' | 'B';
  artworkSrc: string;
  artworkAltTh: string;
  titleTh: string;
  titleEn: string;
  whisperTh: string;
  weights: Partial<LatentDesireScores>;
  behaviorDelta: {
    risk?: number;
    horizon?: number;
    agency?: number;
  };
  abbotReactionTh: string;
}

export interface FunnelPair {
  pairId: string;
  promptTh: string;
  promptEn: string;
  gameTheoryNoteEn: string;
  optionA: FunnelOption;
  optionB: FunnelOption;
}

export interface FunnelChoiceRecord {
  stepIndex: number;
  pairId: string;
  choice: 'A' | 'B';
  chosenTitleTh: string;
  latencyMs: number;
}

export interface SubconsciousPrediction {
  primaryDimension: SubconsciousDimension;
  secondaryDimension: SubconsciousDimension;
  confidencePercent: number;
  unmaskedTitleTh: string;
  unmaskedTitleEn: string;
  unmaskedEssenceTh: string;
  behavioralLabelTh: string;
  behavioralLabelEn: string;
  predictedCard: TarotCardLore;
  storyHeadlineTh: string;
  affirmingStoryTh: string;
  groundedActionTh: string;
  selfInquiryQuestionTh: string;
  spokenScriptTh: string;
  outcomeDigest: OutcomeDigestPayload;
  dimensionScores: LatentDesireScores;
}

export const INITIAL_LATENT_SCORES: LatentDesireScores = {
  ancestral_closure: 0,
  work_purpose: 0,
  relationship_bond: 0,
  family_roots: 0,
  luck_timing: 0,
  fortune_affirmation: 0,
};

export const INITIAL_BEHAVIOR_STATE: BehavioralState = {
  riskScore: 0,
  horizonScore: 0,
  agencyScore: 0,
};

const ART = {
  lantern: '/src/assets/images/tarot_lantern_plate_1795596658743.jpg',
  moon: '/src/assets/images/tarot_moon_plate_1795596659490.jpg',
  sword: '/src/assets/images/tarot_sword_plate_1795596659682.jpg',
  chalice: '/src/assets/images/tarot_chalice_plate_1795596659882.jpg',
  pentacle: '/src/assets/images/tarot_pentacle_plate_1795596661754.jpg',
  wand: '/src/assets/images/tarot_wand_plate_1795596661561.jpg',
  crown: '/src/assets/images/tarot_crown_plate_1795596661314.jpg',
  wheel: '/src/assets/images/tarot_wheel_plate_1795596662509.jpg',
  pilgrim: '/src/assets/images/hero_pilgrim_lantern_1795592350590.jpg',
  threshold: '/src/assets/images/hero_dream_threshold_1795592350027.jpg',
  astrolabe: '/src/assets/images/hero_horoscope_astrolabe_1795592350171.jpg',
  altar: '/src/assets/images/altar_still_life_1795596664679.jpg',
};

export const FUNNEL_ARTWORK_URLS: string[] = Array.from(new Set(Object.values(ART)));

// Rounds 1-3: Fixed orthogonal behavioral & game-theory pairs (zero spoilers)
const CORE_ROUNDS: FunnelPair[] = [
  {
    pairId: 'round1_horizon',
    promptTh: 'ในห้องมืดที่มีเพียงสองสิ่งวางอยู่ ใจของคุณถูกดึงไปยังภาพใดก่อนโดยไม่ต้องคิด?',
    promptEn: 'In a quiet midnight room, which symbol pulls your hand first?',
    gameTheoryNoteEn: 'Temporal discounting & emotional gravity split',
    optionA: {
      id: 'A',
      artworkSrc: ART.lantern,
      artworkAltTh: 'ตะเกียงอุ่นข้างเก้าอี้ไม้ว่างเปล่า',
      titleTh: 'ตะเกียงอุ่นข้างเก้าอี้ตัวเก่า',
      titleEn: 'The Unfinished Ember',
      whisperTh: 'แสงที่ยังรอใครบางคนหรือถ้อยคำที่ค้างไว้',
      weights: { ancestral_closure: 3, family_roots: 2.5, relationship_bond: 2 },
      behaviorDelta: { horizon: -2, agency: -1 },
      abbotReactionTh: 'อ๊บ... มือของโยมเลือกแสงที่อบอุ่นแต่แอบสั่นไหว — ใจกำลังหันกลับไปมองบางเรื่องที่ยังไม่จางสินะ',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.moon,
      artworkAltTh: 'จันทร์เสี้ยวเหนือทางแยกไร้รอยเท้า',
      titleTh: 'จันทร์เสี้ยวเหนือทางแยกหมอก',
      titleEn: 'The Uncharted Horizon',
      whisperTh: 'เส้นทางข้างหน้าที่ยังไม่มีใครขีดเขียนคำตอบ',
      weights: { work_purpose: 3, luck_timing: 2.5, fortune_affirmation: 2 },
      behaviorDelta: { horizon: 2, risk: 1 },
      abbotReactionTh: 'อ๊บ... ตาของโยมจับจ้องไปไกลพ้นประตูวัด — ใจกำลังถามหาจุดเปลี่ยนที่กำลังจะมาถึงล่ะสิ',
    },
  },
  {
    pairId: 'round2_arena',
    promptTh: 'หากคืนนี้สามารถหยุดเวลาได้เพียง 10 นาที คุณอยากใช้สิทธินั้นเพื่อสิ่งใด?',
    promptEn: 'If midnight paused for ten silent minutes, how would you spend them?',
    gameTheoryNoteEn: 'Cooperative Stag-Hunt vs Solitary Minimax choice',
    optionA: {
      id: 'A',
      artworkSrc: ART.chalice,
      artworkAltTh: 'ถ้วยเงินสะท้อนเงาสองดวงตา',
      titleTh: 'ถ้วยน้ำชาสองใบที่ไร้เสียงพูด',
      titleEn: 'The Silent Mirror',
      whisperTh: 'นั่งฟังความจริงที่คนใกล้ตัวไม่เคยเอ่ยออกมา',
      weights: { relationship_bond: 3, family_roots: 2.5, ancestral_closure: 2 },
      behaviorDelta: { agency: -1, horizon: -1 },
      abbotReactionTh: 'หืม... เสียงเงียบระหว่างคนสองคนมันดังกว่าพายุข้างนอกอีกนะโยม',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.sword,
      artworkAltTh: 'ดาบตั้งตรงท่ามกลางหมอกยามรุ่ง',
      titleTh: 'คมดาบตัดม่านหมอกเพียงลำพัง',
      titleEn: 'The Sovereign Edge',
      whisperTh: 'ฟันความลังเลให้ขาด แล้วเดินหน้าคว้าสิ่งที่เป็นของคุณ',
      weights: { work_purpose: 3, fortune_affirmation: 2.5, luck_timing: 1.8 },
      behaviorDelta: { agency: 2, risk: 1 },
      abbotReactionTh: 'คมดีนักโยม... แต่ดาบที่คมที่สุดมักต้องรู้ว่ากำลังตัดอะไรทิ้ง หรือกำลังปกป้องใครอยู่',
    },
  },
  {
    pairId: 'round3_payoff',
    promptTh: 'ตรงหน้ามีหีบปิดตายกับวงล้อทองเหลืองไร้ตัวเลข สัญชาตญาณบอกให้เลือกทางใด?',
    promptEn: 'Facing a sealed heirloom vault and an unmarked wheel, which instinct wins?',
    gameTheoryNoteEn: 'Prospect Theory loss-aversion vs asymmetric payoff test',
    optionA: {
      id: 'A',
      artworkSrc: ART.pentacle,
      artworkAltTh: 'เหรียญทองโบราณบนผ้ากำมะหยี่',
      titleTh: 'รักษาหีบที่คุ้นมือเอาไว้ให้มั่น',
      titleEn: 'The Guarded Vault',
      whisperTh: 'ไม่ยอมให้สิ่งที่สร้างและประคองมาพังทลายไป',
      weights: { fortune_affirmation: 2.8, family_roots: 2.6, ancestral_closure: 2.2 },
      behaviorDelta: { risk: -2, agency: -1 },
      abbotReactionTh: 'คนที่ไม่ยอมเสียสิ่งสำคัญ มักแบกน้ำหนักไว้มากกว่าที่ใครมองเห็น...',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.wheel,
      artworkAltTh: 'วงล้อชะตาทองเหลืองหมุนในความมืด',
      titleTh: 'หมุนวงล้อที่ยังไม่มีใครรู้ผล',
      titleEn: 'The Turning Wheel',
      whisperTh: 'ยอมเดิมพันกับจังหวะใหม่ แม้ต้องทิ้งความเคยชิน',
      weights: { luck_timing: 3.4, work_purpose: 2.2, relationship_bond: 1.5 },
      behaviorDelta: { risk: 2, agency: 2 },
      abbotReactionTh: 'อ๊บ! กล้าหมุนวงล้อโดยไม่ดูแต้มล่วงหน้า — จังหวะชะตาชอบคนที่กล้าขยับก่อนเสมอ',
    },
  },
];

// Adaptive head-to-head duels for Rounds 4 & 5 to disambiguate top contenders
const DUEL_BANK: Record<string, FunnelPair> = {
  'ancestral_closure|family_roots': {
    pairId: 'duel_ancestral_family',
    promptTh: 'เมื่อมองกลับไปยังโต๊ะอาหารเก่าในความทรงจำ ภาพใดทำให้ใจคุณสะเทือนลึกกว่า?',
    promptEn: 'Looking back at an old family table, which silence lingers deeper?',
    gameTheoryNoteEn: 'Distinguishes memorial closure from living household duty',
    optionA: {
      id: 'A',
      artworkSrc: ART.threshold,
      artworkAltTh: 'ประตูหินสู่หมอกแสงจันทร์',
      titleTh: 'จดหมายที่ส่งไม่ถึงอีกฟากฝั่ง',
      titleEn: 'The Unsent Letter',
      whisperTh: 'คำขอบคุณหรือคำขอโทษที่อยากบอกคนที่ไม่อาจกลับมาฟัง',
      weights: { ancestral_closure: 4.5 },
      behaviorDelta: { horizon: -2, agency: -1 },
      abbotReactionTh: 'ความผูกพันบางสายไม่ได้ขาดหายไปตามเวลา แต่มันรอเพียงความอุ่นใจว่าอีกฝั่งสบายดี...',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.altar,
      artworkAltTh: 'แท่นศิลาและเทียนบนโต๊ะไม้',
      titleTh: 'กำแพงที่มองไม่เห็นในบ้านหลังเดิม',
      titleEn: 'The Heavy Roof',
      whisperTh: 'ความคาดหวังและบทบาทที่ต้องแบกรับจนลืมเสียงตัวเอง',
      weights: { family_roots: 4.5 },
      behaviorDelta: { agency: 1, horizon: 0 },
      abbotReactionTh: 'รากไม้ยิ่งใหญ่ บางครั้งก็ยิ่งพันกันแน่น... โยมกำลังหาวิธีหายใจให้เป็นตัวเองสินะ',
    },
  },
  'ancestral_closure|relationship_bond': {
    pairId: 'duel_ancestral_relationship',
    promptTh: 'หากเสียงกระซิบในความฝันดังขึ้นหนึ่งครั้ง คุณหวังลึกๆ ว่าเป็นเสียงจากทิศทางใด?',
    promptEn: 'If a voice reached you softly through midnight fog, whose answer do you seek?',
    gameTheoryNoteEn: 'Separates past beloved/ancestral memory from present romantic/interpersonal bond',
    optionA: {
      id: 'A',
      artworkSrc: ART.pilgrim,
      artworkAltTh: 'ผู้เดินทางถือตะเกียงบนเส้นทางหมอก',
      titleTh: 'เงาอ้อมกอดจากวันวานที่แสนไกล',
      titleEn: 'Echo Beyond Time',
      whisperTh: 'สัญญาณว่าสายใยที่ล่วงลับไปแล้ว ยังคอยคุ้มครองอยู่',
      weights: { ancestral_closure: 4.5 },
      behaviorDelta: { horizon: -2 },
      abbotReactionTh: 'ตะเกียงดวงนั้นไม่เคยดับหรอกโยม เพียงแค่เปลี่ยนวิธีส่องแสงมาอยู่ข้างหลังเราเงียบๆ',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.chalice,
      artworkAltTh: 'ถ้วยประกายทองกลางเงามืด',
      titleTh: 'สายตาคนตรงหน้าที่อ่านไม่ออก',
      titleEn: 'The Unspoken Heart',
      whisperTh: 'ความชัดแจ้งว่าคนที่มีชีวิตอยู่ตรงนี้ ยังเดินไปด้วยกันไหม',
      weights: { relationship_bond: 4.5 },
      behaviorDelta: { horizon: 1, risk: 1 },
      abbotReactionTh: 'อ๊บ... ความลังเลในใจคนเป็น มันทรมานตรงที่เราเดาใจเขาไม่ถูกนี่แหละ',
    },
  },
  'work_purpose|luck_timing': {
    pairId: 'duel_work_luck',
    promptTh: 'เมื่อประตูทองบานใหญ่เปิดแง้มตรงหน้า อะไรทำให้หัวใจคุณเต้นแรงกว่ากัน?',
    promptEn: 'As a golden gate opens slightly before dawn, what stirs your pulse more?',
    gameTheoryNoteEn: 'Separates craft/career mastery from serendipitous timing/windfall',
    optionA: {
      id: 'A',
      artworkSrc: ART.wand,
      artworkAltTh: 'คทาไม้เรืองแสงท่ามกลางประกายไฟ',
      titleTh: 'คทาสร้างอาณาจักรด้วยสองมือ',
      titleEn: 'The Architect Wand',
      whisperTh: 'การได้ลงแรงในสิ่งที่พิสูจน์คุณค่าและความหมายของตัวเอง',
      weights: { work_purpose: 4.5 },
      behaviorDelta: { agency: 2 },
      abbotReactionTh: 'คนมีไฟในมือ มักเหนื่อยไม่ใช่เพราะงานหนัก แต่เพราะยังไม่ได้ทำในสิ่งที่เชื่อเต็มร้อย',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.wheel,
      artworkAltTh: 'วงล้อแห่งโชคชะตาสีทอง',
      titleTh: 'ลมส่งท้ายที่มาถึงถูกจังหวะพอดี',
      titleEn: 'Windfall Tide',
      whisperTh: 'โอกาสฉับพลัน โชคช่วย และจังหวะฟ้าเปิดที่พลิกกระดาน',
      weights: { luck_timing: 4.5 },
      behaviorDelta: { risk: 2, horizon: 2 },
      abbotReactionTh: 'อ๊บ! กระแสลมกำลังเปลี่ยนทิศแล้วโยม เตรียมใบเรือให้ไวก็พอ',
    },
  },
  'work_purpose|fortune_affirmation': {
    pairId: 'duel_work_fortune',
    promptTh: 'ก่อนหลับตาลงคืนนี้ ความสบายใจแบบใดที่คุณปรารถนาให้เป็นจริงมากที่สุด?',
    promptEn: 'Before closing your eyes tonight, which reassurance feels heaviest in your chest?',
    gameTheoryNoteEn: 'Separates daily career/purpose struggle from macro security & life-path affirmation',
    optionA: {
      id: 'A',
      artworkSrc: ART.sword,
      artworkAltTh: 'ดาบแห่งความชัดเจนในแสงทอง',
      titleTh: 'คำตอบว่าก้าวต่อไปควรทุ่มให้ทางไหน',
      titleEn: 'Clarity of Craft',
      whisperTh: 'เลิกเสียพลังไปกับบทบาทที่ไม่ใช่ แล้วโฟกัสถูกจุดเสียที',
      weights: { work_purpose: 4.5 },
      behaviorDelta: { agency: 2, risk: 1 },
      abbotReactionTh: 'ชัดเจนขึ้นแล้วสินะ... ความเหนื่อยล้าส่วนใหญ่เกิดจากการพายเรือทวนกระแสตัวเอง',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.crown,
      artworkAltTh: 'มงกุฎทองบนแท่นศิลา',
      titleTh: 'หลักประกันว่าชีวิตนับจากนี้จะมั่นคง',
      titleEn: 'Sovereign Anchor',
      whisperTh: 'คำยืนยันว่าแรงที่อดทนมาทั้งหมดจะออกดอกเป็นความมั่งคั่งสงบสุข',
      weights: { fortune_affirmation: 4.5 },
      behaviorDelta: { risk: -1, horizon: 1 },
      abbotReactionTh: 'ต้นไม้ใหญ่ต้องหยั่งรากลึกกว่ายอดเสมอ รากของโยมกำลังแน่นขึ้นแล้วล่ะ',
    },
  },
  'luck_timing|fortune_affirmation': {
    pairId: 'duel_luck_fortune',
    promptTh: 'หากเปรียบช่วง 90 วันข้างหน้าเป็นสายน้ำ คุณเลือกขึ้นเรือลำไหน?',
    promptEn: 'Seeing the next ninety days as a midnight river, which vessel calls to you?',
    gameTheoryNoteEn: 'Separates high-variance lucky break from steady compounded fortune',
    optionA: {
      id: 'A',
      artworkSrc: ART.astrolabe,
      artworkAltTh: 'วงล้อแอสโตรแลบทองเหลืองนำทาง',
      titleTh: 'เรือใบที่จับคลื่นลมลูกใหญ่ทันที',
      titleEn: 'The Sudden Tide',
      whisperTh: 'จังหวะเสี่ยงที่คุ้มค่า ข่าวดีไม่คาดฝัน และการพลิกเกมเร็ว',
      weights: { luck_timing: 4.5 },
      behaviorDelta: { risk: 2, agency: 1 },
      abbotReactionTh: 'ใจโยมกำลังรอสัญญาณไฟเขียวสินะ — ดวงตาเป็นประกายเชียว',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.pentacle,
      artworkAltTh: 'เหรียญห้าแฉกแห่งความมั่นคง',
      titleTh: 'เรือไม้โอ๊คที่ไม่มีคลื่นใดจมได้',
      titleEn: 'The Steadfast Vessel',
      whisperTh: 'ความมั่งคั่งยืนยาว เงินทองไม่รั่วไหล และใจที่มั่นคง',
      weights: { fortune_affirmation: 4.5 },
      behaviorDelta: { risk: -2, horizon: 1 },
      abbotReactionTh: 'ความรวยที่แท้จริงคือการหลับตาลงได้โดยไม่ต้องกังวลพรุ่งนี้...',
    },
  },
  'relationship_bond|family_roots': {
    pairId: 'duel_rel_family',
    promptTh: 'ความอบอุ่นที่ขาดหายไปเล็กน้อยในใจช่วงนี้ เกี่ยวข้องกับภาพไหนมากกว่ากัน?',
    promptEn: 'Which quiet ache sits closer to your heartbeat tonight?',
    gameTheoryNoteEn: 'Separates partner/chosen intimacy from blood/family dynamics',
    optionA: {
      id: 'A',
      artworkSrc: ART.chalice,
      artworkAltTh: 'ถ้วยคู่ใต้แสงจันทร์',
      titleTh: 'หัวใจที่รอใครสักคนเข้าใจโดยไม่ต้องอธิบาย',
      titleEn: 'Mirror of Two Hearts',
      whisperTh: 'ความรัก ความซื่อสัตย์ หรือขอบเขตระหว่างคนสองคน',
      weights: { relationship_bond: 4.5 },
      behaviorDelta: { horizon: 1 },
      abbotReactionTh: 'บางทีอีกฝ่ายก็อาจกำลังรอให้เราส่งสัญญาณก่อนเหมือนกันนะโยม',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.lantern,
      artworkAltTh: 'ตะเกียงหน้าประตูเรือนไม้',
      titleTh: 'โต๊ะบ้านที่ทุกคนรักกันแต่พูดกันไม่ตรงใจ',
      titleEn: 'Roots of the Hearth',
      whisperTh: 'สายสัมพันธ์ครอบครัว ความกตัญญู และการวางระยะห่างที่พอดี',
      weights: { family_roots: 4.5 },
      behaviorDelta: { horizon: -1 },
      abbotReactionTh: 'บ้านคือที่ที่เรารักที่สุด... และมักทำให้เราเก็บคำพูดเก่งที่สุดเช่นกัน',
    },
  },
};

const FALLBACK_DUELS: FunnelPair[] = [
  {
    pairId: 'duel_affirmation_resonance',
    promptTh: 'เมื่อพายุข้างนอกสงบลง เหลือเพียงคำยืนยันเดียวที่คุณอยากได้ยิน มันควรมาในรูปแบบใด?',
    promptEn: 'When the wind settles, in what form does your true reassurance arrive?',
    gameTheoryNoteEn: 'Final Bayesian calibration between inner peace and outer breakthrough',
    optionA: {
      id: 'A',
      artworkSrc: ART.crown,
      artworkAltTh: 'มงกุฎแสงทองแห่งความอุ่นใจ',
      titleTh: 'คำปลอบโยนว่าสิ่งที่ผ่านมาไม่สูญเปล่า',
      titleEn: 'Sacred Validation',
      whisperTh: 'ทุกการสูญเสียและความอดทนมีคนมองเห็นและคุ้มค่าแล้ว',
      weights: { ancestral_closure: 2.5, family_roots: 2.2, fortune_affirmation: 2.5 },
      behaviorDelta: { agency: -1, risk: -1 },
      abbotReactionTh: 'อาตมาเห็นแล้ว... กว่าโยมจะเดินมาถึงตรงนี้ได้ โยมเก่งกว่าที่คิดไว้มากนัก',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.wand,
      artworkAltTh: 'คทาจุดประกายเริ่มต้นใหม่',
      titleTh: 'สัญญาณไฟเขียวให้กล้าเริ่มต้นบทใหม่',
      titleEn: 'Ignition Spark',
      whisperTh: 'ถึงเวลาปลดล็อกตัวเองแล้วก้าวสู่โอกาสที่ใหญ่กว่าเดิม',
      weights: { work_purpose: 2.5, luck_timing: 2.8, relationship_bond: 2 },
      behaviorDelta: { agency: 2, risk: 2 },
      abbotReactionTh: 'อ๊บ! ตะเกียงสว่างวาบแล้ว — เตรียมใจรับคำตอบที่กำลังเปิดเผยได้เลย',
    },
  },
  {
    pairId: 'duel_depth_seal',
    promptTh: 'รอบสุดท้าย... วางมือลงบนภาพที่สะท้อน "ความหวังลับๆ" ในใจคุณตอนนี้มากที่สุด',
    promptEn: 'Final seal — rest your gaze upon the symbol that mirrors your unspoken wish.',
    gameTheoryNoteEn: 'Terminal preference lock',
    optionA: {
      id: 'A',
      artworkSrc: ART.moon,
      artworkAltTh: 'แสงจันทร์สะท้อนสระบัวสงบ',
      titleTh: 'ความสงบใสที่คลี่คลายปมค้างคาในใจ',
      titleEn: 'Stillness & Healing',
      whisperTh: 'ปล่อยวางความหนักอึ้งแล้วกลับมาเชื่อใจจังหวะชีวิต',
      weights: { ancestral_closure: 2.2, relationship_bond: 2.2, family_roots: 2.2 },
      behaviorDelta: { horizon: -1, agency: -1 },
      abbotReactionTh: 'เลือกได้นิ่งมากโยม... ขอมอบคำทำนายที่ใจโยมรอฟังให้กระจ่างเดี๋ยวนี้',
    },
    optionB: {
      id: 'B',
      artworkSrc: ART.astrolabe,
      artworkAltTh: 'วงล้อแอสโตรแลบแห่งโชควาสนา',
      titleTh: 'เข็มทิศทองที่หมุนตรงจังหวะรุ่งเรือง',
      titleEn: 'Golden Alignment',
      whisperTh: 'ความมั่งคั่ง โชคชะตา และความสำเร็จที่ชัดเจนจับต้องได้',
      weights: { fortune_affirmation: 2.6, luck_timing: 2.6, work_purpose: 2.2 },
      behaviorDelta: { horizon: 2, risk: 1 },
      abbotReactionTh: 'เข็มทิศหยุดหมุนตรงเลขมงคลพอดี... พร้อมเปิดหน้าไพ่สุดท้ายแล้วหรือยัง?',
    },
  },
];

function getSortedDimensions(scores: LatentDesireScores): SubconsciousDimension[] {
  return (Object.keys(scores) as SubconsciousDimension[]).sort((a, b) => scores[b] - scores[a]);
}

function lookupPairForDuel(d1: SubconsciousDimension, d2: SubconsciousDimension, usedIds: Set<string>): FunnelPair | null {
  const keyA = `${d1}|${d2}`;
  const keyB = `${d2}|${d1}`;
  const candidate = DUEL_BANK[keyA] ?? DUEL_BANK[keyB];
  if (candidate && !usedIds.has(candidate.pairId)) return candidate;
  return null;
}

export function getRoundPair(
  stepIndex: number,
  scores: LatentDesireScores,
  history: FunnelChoiceRecord[]
): FunnelPair {
  if (stepIndex < CORE_ROUNDS.length) {
    return CORE_ROUNDS[stepIndex];
  }

  const usedIds = new Set(history.map((h) => h.pairId));
  const ranked = getSortedDimensions(scores);

  // Try top contenders in Bayesian priority order without repeating pairs
  for (let i = 0; i < ranked.length; i += 1) {
    for (let j = i + 1; j < ranked.length; j += 1) {
      const match = lookupPairForDuel(ranked[i], ranked[j], usedIds);
      if (match) return match;
    }
  }

  for (const fb of FALLBACK_DUELS) {
    if (!usedIds.has(fb.pairId)) return fb;
  }

  return FALLBACK_DUELS[stepIndex % FALLBACK_DUELS.length];
}

export function applyRoundChoice(
  pair: FunnelPair,
  choice: 'A' | 'B',
  prevScores: LatentDesireScores,
  prevBehavior: BehavioralState
): {
  nextScores: LatentDesireScores;
  nextBehavior: BehavioralState;
  chosenOption: FunnelOption;
} {
  const chosenOption = choice === 'A' ? pair.optionA : pair.optionB;
  const nextScores: LatentDesireScores = { ...prevScores };

  (Object.entries(chosenOption.weights) as Array<[SubconsciousDimension, number]>).forEach(
    ([dim, delta]) => {
      nextScores[dim] = Number(((nextScores[dim] || 0) + delta).toFixed(2));
    }
  );

  const nextBehavior: BehavioralState = {
    riskScore: prevBehavior.riskScore + (chosenOption.behaviorDelta.risk ?? 0),
    horizonScore: prevBehavior.horizonScore + (chosenOption.behaviorDelta.horizon ?? 0),
    agencyScore: prevBehavior.agencyScore + (chosenOption.behaviorDelta.agency ?? 0),
  };

  return { nextScores, nextBehavior, chosenOption };
}

interface DimensionNarrativeBlueprint {
  unmaskedTitleTh: string;
  unmaskedTitleEn: string;
  unmaskedEssenceTh: string;
  candidateCardIds: string[];
  storyHeadlineTh: string;
  affirmingStoryTh: string;
  groundedActionTh: string;
  selfInquiryQuestionTh: string;
  spokenScriptTh: string;
}

const DIMENSION_BLUEPRINTS: Record<SubconsciousDimension, DimensionNarrativeBlueprint> = {
  ancestral_closure: {
    unmaskedTitleTh: 'สายใยผู้ล่วงลับและการปลอบโยนหัวใจ',
    unmaskedTitleEn: 'Ancestral Memory & Tender Closure',
    unmaskedEssenceTh:
      'จิตใต้สำนึกของคุณกำลังโอบกอดความทรงจำถึงคนสำคัญที่จากไป — โหยหาสัญญาณอุ่นใจว่าความรักนั้นยังคงอยู่ และอยากวางคำค้างคาลงอย่างสงบ',
    candidateCardIds: ['major-2', 'major-9', 'major-17', 'cups-6', 'cups-5'],
    storyHeadlineTh: 'ตะเกียงอีกฝั่งไม่เคยดับ — สายใยรักยังอุ่นอยู่ในทุกลมหายใจของคุณ',
    affirmingStoryTh:
      'จากการเลือกตลอด 5 ภาพโดยไม่รู้ตัว จิตใต้สำนึกของคุณไม่ได้หันไปหาความกลัวหรือการเสี่ยงโชคฉาบฉวย แต่มือของคุณเอื้อมหาแสงที่คุ้นเคยและจดหมายที่ยังส่งไม่ถึง ความคิดถึงต่อคนที่ล่วงลับหรือผู้ใหญ่ที่จากไปแล้วไม่ใช่ความอ่อนแอ แต่มันคือหลักฐานว่าความรักครั้งนั้นลึกซึ้งเพียงใด\n\nไพ่ใบนี้ปรากฏขึ้นเพื่อยืนยันให้คุณสบายใจ: สิ่งดีงาม คำสอน และความห่วงใยที่คุณได้รับจากท่านเหล่านั้นยังคงทำหน้าที่เป็นรากคอยคุ้มครองคุณอยู่เสมอ ไม่จำเป็นต้องรู้สึกผิดกับคำพูดที่ไม่ได้บอกทันเวลา เพียงใช้ชีวิตวันนี้ให้มีความสุขและอ่อนโยนกับตัวเอง นั่นคือของขวัญที่ผู้จากไปปรารถนาจะเห็นมากที่สุด',
    groundedActionTh:
      'คืนนี้ก่อนนอน จุดเทียนหรือหลับตา 1 นาที นึกถึงรอยยิ้มของคนสำคัญคนนั้นแล้วบอกในใจว่า "หนู/ผมสบายดีและจะดูแลตัวเองให้ดีนะ"',
    selfInquiryQuestionTh: 'คุณค่าหรือนิสัยดีๆ ข้อใดของคนที่คุณคิดถึง ที่ยังมีชีวิตอยู่ผ่านตัวคุณในวันนี้?',
    spokenScriptTh:
      'อ๊บ... ฟังอาตมาดีๆ นะโยม จากภาพที่ใจโยมเลือกทั้งห้าครั้ง อาตมาเห็นความผูกพันอันเงียบสงบถึงคนที่ไม่อยู่ตรงนี้แล้ว... อย่าเก็บคำค้างคาไว้โทษตัวเองเลย สายใยรักที่แท้จริงไม่เคยขาดหาย แค่โยมใช้ชีวิตอย่างอ่อนโยนและดูแลใจตัวเองให้ดี นั่นคือคำตอบที่อีกฝั่งภูมิใจที่สุดแล้ว',
  },
  work_purpose: {
    unmaskedTitleTh: 'เส้นทางงาน เป้าหมายชีวิต และการปลดล็อกไฟในใจ',
    unmaskedTitleEn: 'Work Calling & Sovereign Momentum',
    unmaskedEssenceTh:
      'ลึกๆ แล้วคุณกำลังชั่งใจเรื่องงาน คุณค่าของสิ่งที่ทำ และความกล้าที่จะก้าวออกจากกรอบเดิมที่เริ่มคับแคบเกินไปสำหรับศักยภาพของคุณ',
    candidateCardIds: ['major-1', 'major-7', 'wands-3', 'pentacles-8', 'major-8'],
    storyHeadlineTh: 'ถึงเวลาปลดมือจากภาระที่ดูดพลัง แล้วปักธงในงานที่สะท้อนคุณค่าจริงของคุณ',
    affirmingStoryTh:
      'ตลอดทั้ง 5 ตัวเลือก สัญชาตญาณของคุณเทน้ำหนักไปทางคมดาบและคทาแห่งการลงมือทำอย่างมีทิศทาง คุณไม่ได้ขาดความสามารถเลยแม้แต่น้อย แต่ความล้าลึกๆ เกิดจากการต้องแบกรับบทบาทหรือระบบงานที่ไม่เปิดพื้นที่ให้ฝีมือที่แท้จริงของคุณได้เปล่งประกาย\n\nไพ่ใบนี้ยืนยันชัดเจนว่าเข็มทิศภายในของคุณจับถูกทิศแล้ว ช่วงเปลี่ยนผ่านที่ดูอึดอัดตอนนี้คือช่วงตั้งหลักก่อนขยับครั้งสำคัญ อย่ารอให้ความกลัวหรือความเกรงใจคนอื่นมากำหนดเพดานชีวิต จงเริ่มวางแผนโยกย้าย ปรับขอบเขต หรือปั้นโปรเจกต์ที่ตรงจริตตั้งแต่วันนี้',
    groundedActionTh:
      'เขียนแยก 2 คอลัมน์ในกระดาษวันนี้: งาน 1 อย่างที่เติมไฟให้คุณ และงาน 1 อย่างที่ควรเริ่มส่งต่อหรือปฏิเสธภายในสัปดาห์นี้',
    selfInquiryQuestionTh: 'หากไม่ต้องกลัวคำตัดสินจากใคร ก้าวแรกในเรื่องงานที่คุณอยากทำมานานคืออะไร?',
    spokenScriptTh:
      'อ๊บ... ตลอดห้าภาพที่ผ่านมา มือของโยมเลือกทางของคนที่พร้อมจะยืนด้วยลำแข้งตัวเองนะ... ความเหนื่อยในงานตอนนี้ไม่ใช่เพราะโยมไม่เก่ง แต่เป็นสัญญาณว่ากรงเดิมมันเล็กเกินตัวแล้ว ตั้งหลักให้มั่น ตัดเรื่องจุกจิกทิ้งสักหนึ่งอย่าง แล้วเดินหน้าตามไฟในใจตัวเองได้เลย',
  },
  relationship_bond: {
    unmaskedTitleTh: 'ความรัก ความผูกพัน และความชัดเจนระหว่างใจสองดวง',
    unmaskedTitleEn: 'Intimate Bond & Heart Clarity',
    unmaskedEssenceTh:
      'หัวใจของคุณกำลังวนเวียนอยู่กับความสัมพันธ์คนใกล้ตัว — ทั้งการรอความชัดเจน การโหยหาความเข้าใจ และความระมัดระวังไม่ให้ใจเจ็บซ้ำ',
    candidateCardIds: ['major-6', 'cups-2', 'major-14', 'cups-10', 'swords-2'],
    storyHeadlineTh: 'ความสัมพันธ์ที่ดีไม่ต้องแลกด้วยการฝืนเดาใจ — ความจริงใจกำลังเปิดทางสว่างให้คุณ',
    affirmingStoryTh:
      'แม้บนหน้าจอจะไม่ปรากฏคำว่าความรักเลยสักคำ แต่ทั้ง 5 การตัดสินใจของคุณเผยให้เห็นสายตาที่จับจ้องไปที่ถ้วยคู่และเสียงเงียบระหว่างคนสองคน คุณเป็นคนที่ใส่ใจรายละเอียดทางอารมณ์ลึกซึ้ง และมักอดทนรักษาน้ำใจอีกฝ่ายไว้จนบางครั้งเผลอกลืนความรู้สึกของตัวเอง\n\nคำตอบที่ไพ่ใบนี้มอบให้คือคำยืนยันว่าคุณสมควรได้รับความสัมพันธ์ที่สม่ำเสมอและสื่อสารกันได้อย่างปลอดภัย การเปิดใจถามหรือตั้งขอบเขตอย่างสุภาพไม่ใช่การทำลายความสัมพันธ์ แต่มันคือการคัดกรองความรักที่แท้จริงให้อยู่เคียงข้างคุณอย่างมั่นคง',
    groundedActionTh:
      'เลือกสื่อสารความต้องการที่แท้จริงของตัวเอง 1 ประโยคสั้นๆ อย่างตรงไปตรงมาและอบอุ่น โดยไม่ต้องคาดเดาคำตอบล่วงหน้า',
    selfInquiryQuestionTh: 'ในความสัมพันธ์นี้ คุณกำลังอดทนเพื่อ "รักษาภาพ" หรือกำลังเติบโตไปด้วยกันอย่างสบายใจ?',
    spokenScriptTh:
      'อ๊บ... คนเราชอบแกล้งทำเป็นเข้มแข็ง แต่พอให้เลือกด้วยสัญชาตญาณ ใจก็ฟ้องออกมาหมดว่ากำลังห่วงเรื่องความรักสินะโยม... จำไว้นะ ความสัมพันธ์ที่ใช่ไม่ต้องใช้ความอึดอัดมาแลก ลองพูดความจริงในใจอย่างนุ่มนวล แล้วโยมจะเห็นคำตอบชัดเจนขึ้นทันที',
  },
  family_roots: {
    unmaskedTitleTh: 'สายสัมพันธ์ครอบครัว ความกตัญญู และพื้นที่หายใจของตัวเอง',
    unmaskedTitleEn: 'Family Hearth & Gentle Boundaries',
    unmaskedEssenceTh:
      'เบื้องหลังความนิ่งของคุณมีความผูกพันและความรับผิดชอบต่อคนในบ้านซ่อนอยู่ — คุณอยากดูแลทุกคนให้ดีโดยไม่สูญเสียตัวตนของตัวเอง',
    candidateCardIds: ['major-3', 'major-4', 'pentacles-10', 'cups-10', 'major-5'],
    storyHeadlineTh: 'คุณเป็นรากฐานที่อบอุ่นของบ้านได้ โดยไม่จำเป็นต้องแบกทุกความคาดหวังไว้คนเดียว',
    affirmingStoryTh:
      'หีบที่ถูกเก็บรักษาและแสงตะเกียงหน้าเรือนไม้ในตัวเลือกของคุณสะท้อนจิตวิญญาณของผู้ปกป้องที่แสนอ่อนโยน ใจของคุณคำนึงถึงความรู้สึกของคนในครอบครัวเสมอ แต่ลึกๆ แล้วก็มีความเหนื่อยสะสมจากการต้องเป็นคนเข้มแข็ง หรือเป็นตัวกลางประสานความไม่เข้าใจกันในบ้าน\n\nไพ่ใบนี้ขอยืนยันกับคุณด้วยความชื่นชมว่า ความรักที่คุณมีต่อบ้านนั้นเพียงพอแล้ว การวางภาระที่ไม่ใช่หน้าที่ของคุณลงบ้าง หรือการขอเวลาส่วนตัวเพื่อดูแลใจตัวเอง ไม่ใช่ความอกตัญญู แต่เป็นวิธีรักษากำลังใจให้คุณยืนอยู่เคียงข้างครอบครัวได้อย่างยั่งยืนที่สุด',
    groundedActionTh:
      'จัดสรร "พื้นที่เงียบของตัวเอง" อย่างน้อยวันละ 30 นาทีในสัปดาห์นี้ โดยไม่รับภาระเรื่องของใครเข้ามาวางบนบ่า',
    selfInquiryQuestionTh: 'ความคาดหวังข้อใดของครอบครัวที่คุณสามารถวางลงอย่างนุ่มนวลได้ เพื่อคืนความสบายใจให้ทั้งสองฝ่าย?',
    spokenScriptTh:
      'อ๊บ... โยมนี่แบกเรื่องของคนทั้งบ้านไว้บนบ่าคนเดียวมานานแล้วสินะ... ความห่วงใยที่โยมมีให้ครอบครัวเป็นเรื่องประเสริฐ แต่อย่าลืมว่าเสาหลักก็ต้องพักให้เป็น พอกลับมาเมตตาตัวเองบ้าง บรรยากาศในบ้านก็จะเบาและอบอุ่นตามไปด้วย',
  },
  luck_timing: {
    unmaskedTitleTh: 'จังหวะโชคลาภ โอกาสพลิกผัน และลางสังหรณ์ไฟเขียว',
    unmaskedTitleEn: 'Serendipity Tide & Lucky Pivot',
    unmaskedEssenceTh:
      'จิตใต้สำนึกของคุณกำลังจับสัญญาณของจังหวะเวลา (Timing) — รอโอกาสฉับพลัน ข่าวดี หรือความกล้าที่จะกระโดดคว้าลมส่งท้ายรอบใหม่',
    candidateCardIds: ['major-10', 'major-19', 'major-0', 'wands-1', 'pentacles-1'],
    storyHeadlineTh: 'วงล้อชะตาขยับเข้าจังหวะเปิดแล้ว — โอกาสที่ไม่คาดฝันกำลังเดินเข้ามาหาคนที่พร้อมขยับ',
    affirmingStoryTh:
      'ในเกมการตัดสินใจทั้ง 5 ขั้น สมองส่วนสัญชาตญาณของคุณปฏิเสธการรอคอยแบบเดิมๆ และเลือกหมุนวงล้อทองเหลืองอย่างไม่ลังเล นี่คือสัญญาณชัดเจนว่าพลังงานชีวิตของคุณกำลังเข้าสู่ช่วง "เปลี่ยนกระแส" จังหวะโชคและโอกาสที่ไม่เคยอยู่ในแผนกำลังเริ่มก่อตัวขึ้นรอบตัวคุณ\n\nไพ่ใบนี้ยืนยันว่าดวงและจังหวะกำลังเปิดทางให้คนกล้าคิดกล้าเริ่ม อย่ามัวกังวลกับความผิดพลาดในอดีตจนพลาดรถไฟขบวนใหม่ ในช่วง 14 วันข้างหน้า หากมีข้อเสนอ การทักทายจากคนคุ้นเคย หรือไอเดียที่แวบเข้ามาซ้ำๆ จงเปิดรับและทดลองลงมือทันที เพราะโชคช่วยคนที่มีตาไวและมือพร้อมเสมอ',
    groundedActionTh:
      'ทักหาคนที่เคยคุยค้างไว้เรื่องโปรเจกต์/โอกาส 1 คน หรือลงมือเปิดประตูทดลองสิ่งใหม่ที่เลื่อนมานานภายใน 48 ชั่วโมงนี้',
    selfInquiryQuestionTh: 'โอกาสดีข้อใดที่อยู่ใกล้ตัวคุณอยู่แล้ว เพียงแค่รอให้คุณยื่นมือไปรับอย่างมั่นใจ?',
    spokenScriptTh:
      'อ๊บ! ดวงตาของโยมเลือกหมุนวงล้อโดยไม่กลัวเสี่ยงเลยนะ... สัญญาณแบบนี้บอกว่าจังหวะฟ้าเปิดกำลังมาถึงแล้วโยม อย่ามัวลังเลจนเลยเวลา ข่าวดีหรือโอกาสพลิกล็อกในเร็วๆ นี้ต้องการเพียงความกล้าที่จะตอบรับในจังหวะแรกเท่านั้นเอง',
  },
  fortune_affirmation: {
    unmaskedTitleTh: 'วาสนา ความมั่นคง และคำยืนยันว่าคุณเดินมาถูกทางแล้ว',
    unmaskedTitleEn: 'Abundant Fortune & Path Affirmation',
    unmaskedEssenceTh:
      'ลึกที่สุดในใจคุณกำลังต้องการความอุ่นใจว่าความเหน็ดเหนื่อยที่ผ่านมาจะงอกงามเป็นความมั่นคง ทรัพย์สิน และชีวิตที่สงบสุขยั่งยืน',
    candidateCardIds: ['major-21', 'major-19', 'pentacles-9', 'pentacles-10', 'major-4'],
    storyHeadlineTh: 'สิ่งที่คุณเพาะบ่มมาอย่างอดทนกำลังรวมตัวเป็นฐานความมั่นคงและวาสนาที่แท้จริง',
    affirmingStoryTh:
      'การเลือกของคุณตลอด 5 รอบแสดงถึงวุฒิภาวะและความปรารถนาอันลึกซึ้งต่อความมั่นคงที่ยืนยาว คุณอาจเคยตั้งคำถามเงียบๆ ว่าความพยายามและความซื่อสัตย์ที่คุณรักษาไว้ตลอดมานั้นจะพาไปถึงฝั่งที่ปลอดภัยและมั่งคั่งได้จริงหรือเปล่า\n\nไพ่ใบนี้ถือเป็นคำตอบรับอย่างเต็มภาคภูมิ: รากฐานที่คุณค่อยๆ สร้างไว้แข็งแรงกว่าที่ตาเห็นมาก ช่วงเวลานี้คือช่วงที่ผลลัพธ์ทางการเงิน เครดิตความน่าเชื่อถือ และความสงบในใจเริ่มประสานกันเป็นหนึ่งเดียว ขอให้เชื่อมั่นในจังหวะเติบโตของตัวเองต่อไป เพราะความอุดมสมบูรณ์ที่ยั่งยืนกำลังเป็นของคุณแล้ว',
    groundedActionTh:
      'จดบันทึก "สินทรัพย์และความสำเร็จเล็กๆ 3 ข้อ" ที่คุณสร้างมาได้ด้วยตัวเองตลอดปีนี้ เพื่อตอกย้ำพลังความมั่นใจและดึงดูดจังหวะรุ่งเรืองต่อ',
    selfInquiryQuestionTh: 'หากรู้แน่ชัดแล้วว่าเส้นทางนี้จะพาคุณไปสู่ความมั่นคง คุณอยากขอบคุณตัวเองในเรื่องใดมากที่สุด?',
    spokenScriptTh:
      'อ๊บ... ใจของโยมมั่นคงและรอบคอบยิ่งกว่าก้อนศิลาเสียอีกนะ... อาตมาขอยืนยันให้โยมโล่งใจตรงนี้เลยว่า แรงที่อดทนทำดีและวางรากฐานมาทั้งหมดไม่สูญเปล่าเลย ความมั่นคง วาสนา และความอิ่มใจกำลังค่อยๆ ก่อรูปให้เห็นชัดในไม่ช้านี้แล้ว',
  },
};

function selectMatchedCard(
  primaryDimension: SubconsciousDimension,
  behavior: BehavioralState,
  personalProfile?: ComputedDestinyProfile
): TarotCardLore {
  const blueprint = DIMENSION_BLUEPRINTS[primaryDimension];
  const candidateIds = blueprint.candidateCardIds;
  const candidates = candidateIds
    .map((id) => FULL_TAROT_DECK.find((c) => c.id === id))
    .filter((c): c is TarotCardLore => Boolean(c));

  if (candidates.length === 0) {
    return FULL_TAROT_DECK[0];
  }

  let index = 0;
  if (behavior.riskScore > 1) index += 1;
  if (behavior.horizonScore > 1) index += 1;
  if (behavior.agencyScore < -1) index += 2;
  if (personalProfile) {
    index += personalProfile.lifePathNumber % candidates.length;
  }
  return candidates[index % candidates.length];
}

export function buildBehavioralLabel(behavior: BehavioralState): { th: string; en: string } {
  const riskPart = behavior.riskScore >= 1 ? 'กล้าเปิดรับจุดเปลี่ยน' : 'รอบคอบรักษารากฐาน';
  const horizonPart = behavior.horizonScore >= 0 ? 'มุ่งสู่อนาคต' : 'ทบทวนรากลึกในใจ';
  const agencyPart = behavior.agencyScore >= 1 ? 'ลงมือกำหนดทิศเอง' : 'ฟังเสียงภายในอย่างสงบ';

  const riskEn = behavior.riskScore >= 1 ? 'Leap-Ready' : 'Steadfast';
  const horizonEn = behavior.horizonScore >= 0 ? 'Horizon-Driven' : 'Depth-Reflective';
  const agencyEn = behavior.agencyScore >= 1 ? 'Self-Directed' : 'Mindful Receiver';

  return {
    th: `${riskPart} · ${horizonPart} · ${agencyPart}`,
    en: `${riskEn} · ${horizonEn} · ${agencyEn}`,
  };
}

export function buildGroundedOutcomeDigest(params: {
  primaryDimension: SubconsciousDimension;
  predictedCard: TarotCardLore;
  storyHeadlineTh: string;
  groundedActionTh: string;
  timeframe: DigestTimeframe;
  activeLens: PerspectiveLens;
}): OutcomeDigestPayload {
  const tfMeta = TIMEFRAME_OPTIONS.find((t) => t.id === params.timeframe) ?? TIMEFRAME_OPTIONS[0];
  const bp = DIMENSION_BLUEPRINTS[params.primaryDimension];

  const lensFramings: Record<PerspectiveLens, { framing: string; watch: string; takeaway: string; short: string }> = {
    thai_folk: {
      framing: `จังหวะพระเคราะห์สะท้อนผ่านไพ่ “${params.predictedCard.nameTh}” ชี้ว่าแรงกดดันที่ซ่อนอยู่กำลังเปลี่ยนจากภาวะอึดอัดเป็นพลังตั้งหลักในช่วง${tfMeta.labelTh}`,
      watch: `ระวังอารมณ์ค้างหรือความเกรงใจที่ทำให้พลาดจังหวะสำคัญของช่วง${tfMeta.labelTh}`,
      takeaway: params.groundedActionTh,
      short: `จังหวะชะตากำลังคลายปมในมิติ${bp.unmaskedTitleTh} ให้จับตาโอกาสที่มาเงียบๆ`,
    },
    buddhist: {
      framing: `เมื่อมองตามหลักเหตุ-ปัจจัยและสติ ไพ่ “${params.predictedCard.nameTh}” ชวนเห็นว่าความทุกข์ไม่ได้เกิดจากเหตุการณ์ภายนอกเท่ากับการยึดถือภาพคาดหวังไว้ในใจ`,
      watch: 'สังเกตจังหวะที่จิตเผลอปรุงแต่งล่วงหน้าเกินจริงหรือจมกับอดีตที่แก้ไม่ได้',
      takeaway: `ฝึกกลับมาอยู่กับลมหายใจและลงมือทำทีละ 1 ขั้น: ${params.groundedActionTh}`,
      short: 'แยกความจริงตรงหน้าออกจากความกังวล แล้วใช้สติกำหนดก้าวถัดไปอย่างเบาสบาย',
    },
    islamic: {
      framing: `ในมุมการใคร่ครวญทางใจและความอดทน (Sabr) ไพ่สะท้อนให้เห็นคุณค่าของการรักษาเจตนาที่บริสุทธิ์และความกตัญญู (Shukr) ต่อสิ่งที่ยังโอบอุ้มชีวิตอยู่`,
      watch: 'ระวังเสียงกระซิบแห่งความกังวลที่ทำให้ลังเลไม่กล้าเชื่อใจการเดินทางของตนเอง',
      takeaway: `ตั้งเจตนาให้ชัดเจนในเรื่อง${bp.unmaskedTitleTh} แล้วลงมืออย่างสง่างาม`,
      short: 'ยึดมั่นในความสุจริตใจ ความอดทน และความสงบจากการวางใจในเหตุผลที่ดี',
    },
    chinese: {
      framing: `ตามหลักสมดุลหยิน-หยาง ภาวะนี้คือจุดเปลี่ยนผ่านจากช่วงเก็บพลังเงียบ (หยิน) สู่จังหวะเริ่มเคลื่อนไหวอย่างมีกลยุทธ์ (หยาง) ในรอบ${tfMeta.labelTh}`,
      watch: 'อย่าฝืนออกแรงชนตรงๆ ในจังหวะที่น้ำยังไม่ขึ้น ให้ปรับทิศตามจังหวะเวลา',
      takeaway: `ประหยัดพลังงานจากเรื่องรอง แล้วทุ่มให้จุดสำคัญที่สุดใน${tfMeta.labelTh}นี้`,
      short: 'ปรับสมดุลระหว่างการรอจังหวะที่ใช่กับการขยับตัวเมื่อประตูโอกาสเปิด',
    },
    christian: {
      framing: `ผ่านมุมมโนธรรมและความหวัง ภาพสัญลักษณ์เตือนให้วางความรู้สึกผิดหรือความกังวลลง แล้วเชื่อในความหมายที่ดีของการเริ่มต้นใหม่`,
      watch: 'ระวังการตำหนิตัวเองซ้ำๆ จนบดบังความหวังและกำลังใจที่มีอยู่ตรงหน้า',
      takeaway: `ให้อภัยตัวเองในสิ่งที่ผ่านมา แล้วมอบความเมตตาให้หัวใจตัวเองวันนี้`,
      short: 'ความหวังและความสงบใจจะชัดเจนขึ้นเมื่อเลือกเดินบนความซื่อตรงต่อคุณค่าในใจ',
    },
    jewish: {
      framing: `ในวิถีการตั้งคำถามเชิงลึกและความรับผิดชอบ สัญลักษณ์ทั้ง 5 รอบชวนให้รับฟังความต้องการแท้จริงเบื้องหลังความเงียบของคุณ`,
      watch: 'ระวังการปล่อยให้ความคุ้นชินปิดกั้นคำถามสำคัญที่ควรตอบกับตัวเองเสียที',
      takeaway: bp.selfInquiryQuestionTh,
      short: 'ใช้คำถามที่ซื่อสัตย์เป็นตะเกียงนำทางสู่การตัดสินใจที่มีวุฒิภาวะ',
    },
  };

  const lenses: LensDigestItem[] = PERSPECTIVE_LENSES.map((meta) => {
    const content = lensFramings[meta.id];
    return {
      lensId: meta.id,
      lensNameTh: meta.labelTh,
      framingTh: content.framing,
      watchForTh: content.watch,
      groundedTakeawayTh: content.takeaway,
      shortComparisonTh: content.short,
    };
  });

  return {
    timeframe: params.timeframe,
    timeframeLabelTh: `${tfMeta.labelTh} (${tfMeta.labelEn})`,
    activeLens: params.activeLens,
    compareOtherAngles: true,
    coreDigestBulletsTh: [
      params.storyHeadlineTh,
      `อาร์คีไทป์หลัก: ${params.predictedCard.nameTh} (${params.predictedCard.nameEn}) — ${params.predictedCard.lightTh}`,
      `แนวทางสำคัญในช่วง${tfMeta.labelTh}: ${params.groundedActionTh}`,
    ],
    lenses,
    nonDogmaticNoteTh: NON_DOGMATIC_LENS_NOTE_TH,
  };
}

export function predictSubconsciousOutcome(params: {
  scores: LatentDesireScores;
  behavior: BehavioralState;
  choices: FunnelChoiceRecord[];
  personalProfile?: ComputedDestinyProfile;
  domain?: DomainSlot;
  timeframe?: DigestTimeframe;
  activeLens?: PerspectiveLens;
}): SubconsciousPrediction {
  const adjustedScores: LatentDesireScores = { ...params.scores };

  // Subtle calibration nudge when optional personal DOB profile focus is set
  if (params.personalProfile) {
    if (params.personalProfile.focusLabelTh.includes('ความรัก')) {
      adjustedScores.relationship_bond += 0.6;
    } else if (params.personalProfile.focusLabelTh.includes('การเงิน')) {
      adjustedScores.work_purpose += 0.4;
      adjustedScores.fortune_affirmation += 0.4;
    } else if (params.personalProfile.focusLabelTh.includes('ทางแยก')) {
      adjustedScores.luck_timing += 0.4;
      adjustedScores.work_purpose += 0.4;
    }
  }

  const ranked = getSortedDimensions(adjustedScores);
  const primaryDimension = ranked[0];
  const secondaryDimension = ranked[1] ?? ranked[0];

  const topScore = adjustedScores[primaryDimension];
  const secondScore = adjustedScores[secondaryDimension];
  const spread = Math.max(0, topScore - secondScore);
  const confidencePercent = Math.min(96, Math.max(76, Math.round(78 + spread * 4.5)));

  const blueprint = DIMENSION_BLUEPRINTS[primaryDimension];
  const predictedCard = selectMatchedCard(primaryDimension, params.behavior, params.personalProfile);
  const behavioralLabel = buildBehavioralLabel(params.behavior);
  const timeframe: DigestTimeframe = params.timeframe ?? 'daily';
  const activeLens: PerspectiveLens = params.activeLens ?? 'thai_folk';

  const profileTouch = params.personalProfile
    ? `\n\nเมื่อผสานกับพิกัด${params.personalProfile.thaiWeekdayTh} (${params.personalProfile.westernZodiacTh} · เลขรหัสชีวิต ${params.personalProfile.lifePathNumber}) พลังของไพ่ “${predictedCard.nameTh}” ยิ่งเด่นชัดเป็นพิเศษ: ${params.personalProfile.freeEdgeTh}`
    : '';

  const fullStory = `${blueprint.affirmingStoryTh}${profileTouch}`;

  const outcomeDigest = buildGroundedOutcomeDigest({
    primaryDimension,
    predictedCard,
    storyHeadlineTh: blueprint.storyHeadlineTh,
    groundedActionTh: blueprint.groundedActionTh,
    timeframe,
    activeLens,
  });

  return {
    primaryDimension,
    secondaryDimension,
    confidencePercent,
    unmaskedTitleTh: blueprint.unmaskedTitleTh,
    unmaskedTitleEn: blueprint.unmaskedTitleEn,
    unmaskedEssenceTh: blueprint.unmaskedEssenceTh,
    behavioralLabelTh: behavioralLabel.th,
    behavioralLabelEn: behavioralLabel.en,
    predictedCard,
    storyHeadlineTh: blueprint.storyHeadlineTh,
    affirmingStoryTh: fullStory,
    groundedActionTh: blueprint.groundedActionTh,
    selfInquiryQuestionTh: blueprint.selfInquiryQuestionTh,
    spokenScriptTh: blueprint.spokenScriptTh,
    outcomeDigest,
    dimensionScores: adjustedScores,
  };
}
