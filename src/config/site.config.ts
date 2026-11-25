export type DomainSlot = 'slot_horoscope' | 'slot_tarot' | 'slot_dream';

export type DigestTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type PerspectiveLens =
  | 'buddhist'
  | 'islamic'
  | 'chinese'
  | 'christian'
  | 'jewish'
  | 'thai_folk';

export interface TimeframeOption {
  id: DigestTimeframe;
  labelTh: string;
  labelEn: string;
  scopeTh: string;
}

export interface PerspectiveLensOption {
  id: PerspectiveLens;
  labelTh: string;
  labelEn: string;
  focusTh: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  {
    id: 'daily',
    labelTh: 'รายวัน',
    labelEn: 'Daily',
    scopeTh: 'พลังเฉพาะหน้า แรงเสียดทานอารมณ์ สัญญาณเล็กๆ และสิ่งที่ต้องจับตาวันนี้',
  },
  {
    id: 'weekly',
    labelTh: 'รายสัปดาห์',
    labelEn: 'Weekly',
    scopeTh: 'โมเมนตัมระยะสั้น การขยับของคนรอบตัว/เรียน/งาน และจุดตัดสินใจใกล้ตัว',
  },
  {
    id: 'monthly',
    labelTh: 'รายเดือน',
    labelEn: 'Monthly',
    scopeTh: 'การเปลี่ยนแพตเทิร์น เส้นโค้งอารมณ์-นิสัย และธีมที่วนกลับมาตลอดเดือน',
  },
  {
    id: 'yearly',
    labelTh: 'รายปี',
    labelEn: 'Yearly',
    scopeTh: 'ทิศทางภาพใหญ่ วงรอบระยะยาว บททดสอบการเติบโต และจุดเปลี่ยนสำคัญ',
  },
];

export const PERSPECTIVE_LENSES: PerspectiveLensOption[] = [
  {
    id: 'thai_folk',
    labelTh: 'ไทยโบราณ · พระเคราะห์',
    labelEn: 'Thai Folk & Graha',
    focusTh: 'จังหวะราหูพลิกมุม สัญชาตญาณพระเกตุ วงรอบพระเสาร์ และนิมิตในบริบทไทยร่วมสมัย',
  },
  {
    id: 'buddhist',
    labelTh: 'พุทธ · สติและเหตุปัจจัย',
    labelEn: 'Buddhist',
    focusTh: 'สภาวะจิต เหตุ-ปัจจัย (กรรม) ความไม่เที่ยง (อนิจจัง) ความคมชัด vs ความฟุ้งซ่าน',
  },
  {
    id: 'islamic',
    labelTh: 'อิสลาม · การใคร่ครวญ',
    labelEn: 'Islamic',
    focusTh: 'ความชัดเจนทางใจ ความกตัญญู (Shukr) ความอดทน (Sabr) และแยกฝันรบกวนจากนิมิตสะท้อนใจ (Ru’ya)',
  },
  {
    id: 'chinese',
    labelTh: 'จีน · หยินหยางเบญจธาตุ',
    labelEn: 'Chinese',
    focusTh: 'สมดุลหยิน-หยาง เบญจธาตุ จังหวะจันทรคติ และการปรับตัวแบบเซียมซี/ปวย',
  },
  {
    id: 'christian',
    labelTh: 'คริสต์ · มโนธรรมและความหวัง',
    labelEn: 'Christian',
    focusTh: 'มโนธรรม ความหวัง การแยกแยะภายใน และความสงบใจเทียบกับความวิตกกังวล',
  },
  {
    id: 'jewish',
    labelTh: 'ยิว · การตั้งคำถามและจริยธรรม',
    labelEn: 'Jewish',
    focusTh: 'การใคร่ครวญเชิงลึก ความกระจ่างภายใน ความรับผิดชอบ และความหมายของสัญลักษณ์ฝัน',
  },
];

export const NON_DOGMATIC_LENS_NOTE_TH =
  'หมายเหตุสำคัญ: มุมมองทั้งหมดเป็นเลนส์เชิงวัฒนธรรม สัญลักษณ์ และการสะท้อนคิดทางจิตวิทยา มิใช่คำวินิจฉัยทางศาสนาอย่างเป็นทางการ คำแนะนำทางการแพทย์ หรือคำทำนายอนาคตแบบตายตัว';

export interface PricingTier {
  id: 'tier_compact' | 'tier_deep' | 'tier_full_voice';
  priceThb: number;
  titleTh: string;
  subtitleTh: string;
  featuresTh: string[];
  includesVoice: boolean;
}

export interface FreeArticle {
  id: string;
  categoryTh: string;
  readMinutes: number;
  titleTh: string;
  excerptTh: string;
  bodyTh: string;
  reflectionPromptTh: string;
}

export interface DomainConfig {
  slot: DomainSlot;
  envHostKey: string;
  defaultHost: string;
  brandLatin: string;
  brandThai: string;
  shortNavLabelTh: string;
  taglineTh: string;
  heroTitleTh: string;
  heroSubtitleTh: string;
  primaryCtaTh: string;
  studioHeadingTh: string;
  studioPromptLabelTh: string;
  studioPromptPlaceholderTh: string;
  seoTitle: string;
  seoDescription: string;
  accentLabelTh: string;
  freeArticles: FreeArticle[];
}

function readEnvSafe(key: string, fallback: string): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (metaEnv && metaEnv[key]) return metaEnv[key] as string;
  } catch {
    // ignore in non-Vite contexts
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch {
    // ignore in browser contexts
  }
  return fallback;
}

export const DESIGN_TOKENS = {
  deepSlate: '#0D1015',
  agedAsh: '#141820',
  warmParchment: '#F4EFE6',
  lanternGold: '#D4A359',
  forestMoss: '#4A5D4E',
  mithrilSilver: '#C0C5CE',
} as const;

export const THAI_ETHICS_DISCLAIMER =
  'คำชี้แจงเชิงจริยธรรมและจิตวิทยา: ผลการวิเคราะห์ทั้งหมดจัดทำขึ้นเพื่อการสะท้อนตนเอง ทำความเข้าใจรูปแบบความคิด (Cognitive Reframing) และสำรวจอารมณ์ความรู้สึกเท่านั้น มิใช่การพยากรณ์โชคชะตาแบบตายตัว คำตัดสินทางการแพทย์ หรือคำแนะนำทางกฎหมาย/การเงิน';

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'tier_compact',
    priceThb: 99,
    titleTh: 'ถอดรหัสเชิงลึกเฉพาะบุคคล',
    subtitleTh: 'บทวิเคราะห์จิตวิทยาฉบับเต็ม + กรอบคิดปรับมุมมอง',
    featuresTh: [
      'วิเคราะห์เจาะจงบริบทและข้อความของคุณ',
      'สรุปอคติทางความคิดและแนวทางปฏิบัติ 7 วัน',
      'บันทึกผลอ่านย้อนหลังในหน้าต่างปัจจุบัน',
    ],
    includesVoice: false,
  },
  {
    id: 'tier_deep',
    priceThb: 129,
    titleTh: 'เชิงลึกพร้อมเสียงบรรยายไทย',
    subtitleTh: 'บทวิเคราะห์ฉบับเต็ม + เสียงนำทาง Male Sage / Female Oracle',
    featuresTh: [
      'วิเคราะห์จิตวิทยาเชิงลึกเฉพาะบุคคลเต็มรูปแบบ',
      'เสียงบรรยายภาษาไทยธรรมชาติ (กดเล่นเมื่อพร้อม)',
      'ผนวกรวมบริบทจาก Gmail แบบคัดกรองความเป็นส่วนตัว (ถ้าอนุญาต)',
    ],
    includesVoice: true,
  },
  {
    id: 'tier_full_voice',
    priceThb: 199,
    titleTh: 'ชุดสำรวจครบ 3 มิติ + เสียงบรรยาย',
    subtitleTh: 'วิเคราะห์เจาะลึกสูงสุด + แผนปฏิบัติการจิตวิทยา 14 วัน + เสียง',
    featuresTh: [
      'บทวิเคราะห์โครงสร้างอารมณ์และความสัมพันธ์เชิงลึก',
      'เสียงบรรยายภาษาไทยคุณภาพสูงเลือกได้ 2 บุคลิก',
      'คำถามสะท้อนคิดต่อเนื่องสำหรับจดบันทึกส่วนตัว',
    ],
    includesVoice: true,
  },
];

export const SITE_CONFIG: Record<DomainSlot, DomainConfig> = {
  slot_horoscope: {
    slot: 'slot_horoscope',
    envHostKey: 'DOMAIN_HOROSCOPE',
    defaultHost: readEnvSafe('VITE_DOMAIN_HOROSCOPE', readEnvSafe('DOMAIN_HOROSCOPE', 'duangtok.example.com')),
    brandLatin: 'DuangTok',
    brandThai: 'ดวงตกและจังหวะชีวิต',
    shortNavLabelTh: 'จังหวะชีวิต',
    taglineTh: 'อ่านทางแยกชะตา จังหวะลับ และแรงโน้มถ่วงของช่วงชีวิต',
    heroTitleTh: 'ทำไมช่วงนี้เหมือนมีแรงต้านที่มองไม่เห็น — รู้ทันจังหวะเปลี่ยนผ่านก่อนพลาดโอกาสสำคัญ',
    heroSubtitleTh:
      'เจาะลึกช่วงหัวเลี้ยวหัวต่อ จุดอับสายตาเรื่องงาน เงิน และความสัมพันธ์ ผ่านพิกัดวันเกิดของคุณผสานเลนส์ 6 ศาสตร์และจิตวิทยาการตัดสินใจ',
    primaryCtaTh: 'เช็กจังหวะชะตาของคุณตอนนี้',
    studioHeadingTh: 'ห้องถอดรหัสจังหวะชีวิตและทางแยกการตัดสินใจ',
    studioPromptLabelTh: 'เล่าช่วงเปลี่ยนผ่านหรือความติดขัดที่คุณกำลังเผชิญ',
    studioPromptPlaceholderTh:
      'เช่น ช่วง 2 เดือนมานี้รู้สึกหมดไฟกับงานประจำ ลังเลว่าจะย้ายสายงานหรือรอจังหวะปลายปีดี...',
    seoTitle: 'DuangTok — ดวงตกและจังหวะชีวิต | ถอดรหัสทางแยกชีวิตเชิงจิตวิทยา',
    seoDescription:
      'เปลี่ยนความกังวลเรื่องดวงตกให้เป็นความเข้าใจจิตวิทยาพฤติกรรมและการตัดสินใจในภาษาไทย พร้อมเสียงบรรยาย',
    accentLabelTh: 'ศาสตร์ที่ 1 · จังหวะชีวิตและอคติการตัดสินใจ',
    freeArticles: [
      {
        id: 'horo-1',
        categoryTh: 'จิตวิทยาช่วงเปลี่ยนผ่าน',
        readMinutes: 4,
        titleTh: 'ทำไมสมองจึงมองหาคำทำนายเป็นพิเศษในช่วงที่ควบคุมสถานการณ์ไม่ได้',
        excerptTh:
          'ทำความเข้าใจกลไก Illusion of Control และความล้าจากการตัดสินใจ (Decision Fatigue) เมื่อชีวิตเกิดความไม่แน่นอนพร้อมกันหลายด้าน',
        bodyTh:
          'เมื่อภาระงาน ความสัมพันธ์ และความไม่มั่นคงทางการเงินประดังเข้ามาพร้อมกัน ระบบประสาทส่วนความตื่นตัวจะมองหาแบบแผนที่อธิบายความวุ่นวายได้ทันที การสังเกตอคตินี้ช่วยให้เราแยก "สัญญาณเตือนที่ควรลงมือแก้" ออกจาก "เสียงรบกวนจากความเหนื่อยล้า" ได้ชัดเจนขึ้น',
        reflectionPromptTh: 'เรื่องใดในสัปดาห์นี้ที่คุณกำลังพยายามควบคุมผลลัพธ์ ทั้งที่ควบคุมได้เพียงการลงมือทำในวันนี้?',
      },
      {
        id: 'horo-2',
        categoryTh: 'อคติทางความคิด',
        readMinutes: 5,
        titleTh: 'กับดัก Negativity Bias ในช่วงที่รู้สึกว่าอะไรๆ ก็ติดขัด',
        excerptTh:
          'เหตุใดเหตุการณ์เล็กๆ ที่ผิดแผนเพียงสองเรื่อง จึงทำให้เรารู้สึกเหมือนทั้งฤดูกาลกำลังพังทลาย',
        bodyTh:
          'สมองมนุษย์ถูกออกแบบมาให้จดจำความเสี่ยงรุนแรงกว่าความราบรื่นถึงสามเท่า เมื่อเราติดป้ายให้ช่วงเวลาหนึ่งว่า "ช่วงดวงตก" เราจะยิ่งคัดกรองเห็นแต่หลักฐานที่ยืนยันความติดขัด (Confirmation Bias) การบันทึกข้อเท็จจริงแบบเป็นกลางวันละ 3 บรรทัดช่วยคลายกรอบคิดนี้ได้',
        reflectionPromptTh: 'มีสิ่งใดที่ยังทำงานได้ตามปกติในชีวิตคุณช่วงนี้ แต่สมองมองข้ามไปเพราะความกังวล?',
      },
      {
        id: 'horo-3',
        categoryTh: 'จังหวะพักและฟื้นตัว',
        readMinutes: 3,
        titleTh: 'ฤดูกาลของการเก็บแรง: ศิลปะการชะลอตัวก่อนก้าวถัดไป',
        excerptTh:
          'ในทางจิตวิทยา ช่วงที่แรงจูงใจลดลงไม่ใช่ความล้มเหลวเสมอไป แต่อาจเป็นสัญญาณปรับทิศทางใหม่',
        bodyTh:
          'การฝืนเร่งความเร็วในขณะที่เข็มทิศภายในยังไม่นิ่งมักนำไปสู่การตัดสินใจแบบหุนหันพลันแล่น การยอมรับจังหวะชะลอตัวเพื่อทบทวนค่านิยมหลักจะช่วยให้การขยับตัวครั้งต่อไปแม่นยำกว่าเดิม',
        reflectionPromptTh: 'หากคุณอนุญาตให้ตัวเองชะลอลงได้ 20% ในเดือนนี้ คุณอยากคืนพลังงานให้เรื่องใดมากที่สุด?',
      },
    ],
  },
  slot_tarot: {
    slot: 'slot_tarot',
    envHostKey: 'DOMAIN_TAROT',
    defaultHost: readEnvSafe('VITE_DOMAIN_TAROT', readEnvSafe('DOMAIN_TAROT', 'greypilgrim.example.com')),
    brandLatin: 'The Grey Pilgrim',
    brandThai: 'ผู้เดินทางชุดเทา',
    shortNavLabelTh: 'ไพ่ทาโรต์',
    taglineTh: 'กระจกเงา 78 บานที่อ่านความลับในใจได้ตรงกว่าคำพูด',
    heroTitleTh: 'สิ่งที่อีกฝ่ายไม่พูด และทางเลือกที่ใจคุณแอบซ่อนไว้ กำลังปรากฏบนหน้าไพ่',
    heroSubtitleTh:
      'สำรวจไพ่ 78 ใบทั้งด้านสว่างและด้านเงา ผสานพิกัดวันเกิดและความรู้สึกแรกของคุณ เพื่อเห็นแรงจูงใจที่ซ่อนอยู่เบื้องหลังเหตุการณ์ตรงหน้า',
    primaryCtaTh: 'เปิดไพ่ส่องความจริงในใจ',
    studioHeadingTh: 'ห้องเปิดไพ่ทาโรต์และเชื่อมโยงจิตใต้สำนึก',
    studioPromptLabelTh: 'คำถามหรือเรื่องที่กำลังใคร่ครวญในใจตอนนี้',
    studioPromptPlaceholderTh:
      'เช่น รู้สึกสับสนระหว่างการรักษาความสัมพันธ์เดิมกับการถอยออกมาดูแลขอบเขตของตัวเอง...',
    seoTitle: 'The Grey Pilgrim — ผู้เดินทางชุดเทา | ไพ่ทาโรต์เชิงจิตวิทยา 78 ใบ',
    seoDescription:
      'คลังความหมายไพ่ทาโรต์เชิงจิตวิทยา 78 ใบ ด้านสว่างและด้านเงา พร้อมห้องสะท้อนใจภาษาไทยและเสียงบรรยาย',
    accentLabelTh: 'ศาสตร์ที่ 2 · สัญลักษณ์ไพ่และภาวะเงา (Shadow Work)',
    freeArticles: [
      {
        id: 'tarot-1',
        categoryTh: 'หลักการเชื่อมโยงเสรี',
        readMinutes: 4,
        titleTh: 'ทำไมการเขียนความรู้สึกแรกก่อนอ่านคำทำนายจึงสำคัญที่สุด',
        excerptTh:
          'เทคนิค Free Association ช่วยให้คุณเห็นความหมายที่ซ่อนอยู่ในภาพไพ่จากประสบการณ์ตรงของคุณเอง',
        bodyTh:
          'ก่อนอ่านความหมายมาตรฐาน การบันทึกว่า "ภาพใบนี้ทำให้นึกถึงใคร ความรู้สึกใด หรือความกังวลไหน" จะช่วยปลดล็อก Projection ทางจิตวิทยา ทำให้การอ่านไพ่กลายเป็นบทสนทนากับตัวเองอย่างซื่อตรง',
        reflectionPromptTh: 'เมื่อมองสัญลักษณ์แสงตะเกียงหรือเงามืด สิ่งแรกที่แวบเข้ามาในใจคุณคือเรื่องอะไร?',
      },
      {
        id: 'tarot-2',
        categoryTh: 'ภาวะด้านสว่างและด้านเงา',
        readMinutes: 5,
        titleTh: 'ไม่มีไพ่ใบใดดีหรือร้ายอย่างสมบูรณ์: บทเรียนจาก Carl Jung',
        excerptTh:
          'แม้แต่ไพ่ The Tower หรือ The Devil ก็เป็นเพียงสัญญาณของโครงสร้างเก่าที่ถึงเวลาปรับเปลี่ยน',
        bodyTh:
          'ในมุมจิตวิทยาเชิงวิเคราะห์ ทุกอาร์คีไทป์มีทั้งพลังสร้างสรรค์ (Light) และภาวะติดกับดัก (Shadow) การอ่านทั้งสองด้านควบคู่กันช่วยลดความหวาดกลัวและเปลี่ยนเป็นการตั้งคำถามที่ลงมือทำได้จริง',
        reflectionPromptTh: 'นิสัยหรือบทบาทใดที่คุณเคยมองว่า "เป็นจุดแข็ง" แต่อาจกำลังทำให้คุณเหนื่อยล้าเกินไป?',
      },
    ],
  },
  slot_dream: {
    slot: 'slot_dream',
    envHostKey: 'DOMAIN_DREAM',
    defaultHost: readEnvSafe('VITE_DOMAIN_DREAM', readEnvSafe('DOMAIN_DREAM', 'fanrai.example.com')),
    brandLatin: 'FanRai',
    brandThai: 'ฝันร้ายและนิมิตยามค่ำ',
    shortNavLabelTh: 'ถอดรหัสฝัน',
    taglineTh: 'ถอดรหัสนิมิตยามค่ำคืนที่แฝงลางสังหรณ์และอารมณ์ค้างคา',
    heroTitleTh: 'ฝันซ้ำหรือฝันประหลาดเมื่อคืน กำลังส่งคำเตือนเรื่องอะไรในชีวิตจริงของคุณ?',
    heroSubtitleTh:
      'ถอดรหัสความฝันและนิมิตผ่านพิกัดวันเกิด ตัวชี้วัดเชิงปริมาณ HVDC และเลนส์ 6 วัฒนธรรม เพื่อแยก "เสียงรบกวน" ออกจาก "สัญญาณเตือนจริง"',
    primaryCtaTh: 'ถอดรหัสฝันเมื่อคืนทันที',
    studioHeadingTh: 'ห้องวิเคราะห์ความฝัน (HVDC & Clara Hill 3-Stage)',
    studioPromptLabelTh: 'เล่าเหตุการณ์ในความฝัน ตัวละคร สถานที่ และอารมณ์ตอนตื่น',
    studioPromptPlaceholderTh:
      'เช่น ฝันว่าเดินหลงในอาคารเก่าที่ไม่มีบันไดลง รู้สึกอึดอัดและพยายามโทรหาเพื่อนแต่กดเบอร์ไม่ติด...',
    seoTitle: 'FanRai — ฝันร้ายและนิมิตยามค่ำ | วิเคราะห์ความฝันตามหลักจิตวิทยา HVDC',
    seoDescription:
      'ถอดรหัสความฝันและฝันร้ายภาษาไทยด้วยหลัก Hall-Van de Castle และ Clara Hill พร้อมกราฟวิเคราะห์อารมณ์และเสียงบรรยาย',
    accentLabelTh: 'ศาสตร์ที่ 3 · จิตวิทยาความฝัน HVDC & Clara Hill',
    freeArticles: [
      {
        id: 'dream-1',
        categoryTh: 'Continuity Hypothesis',
        readMinutes: 4,
        titleTh: 'ทำไมความฝันมักสะท้อนความเครียดที่เรากดไว้ตอนกลางวัน',
        excerptTh:
          'สมมติฐานความต่อเนื่องอธิบายว่าสมองจัดเรียงความทรงจำและอารมณ์ที่ยังไม่คลี่คลายระหว่างหลับ REM',
        bodyTh:
          'ฝันว่าฟันหลุด วิ่งหนีไม่พ้น หรือสอบไม่ทัน ไม่ใช่ลางบอกเหตุร้ายล่วงหน้า แต่มักเกิดในช่วงที่สมองกำลังประมวลผลความกังวลเรื่องการสูญเสียการควบคุม ความไม่พร้อม หรือความกดดันทางสังคม',
        reflectionPromptTh: 'อารมณ์หลักในฝันเมื่อคืน (เช่น กลัว อึดอัด เสียใจ) คล้ายกับเหตุการณ์ใดใน 7 วันที่ผ่านมา?',
      },
      {
        id: 'dream-2',
        categoryTh: 'โมเดล 3 ขั้นของ Clara Hill',
        readMinutes: 5,
        titleTh: 'สำรวจ — เชื่อมโยง — ลงมือ: แปลงฝันร้ายให้เป็นความเข้าใจตนเอง',
        excerptTh:
          'จากการทดลองทางคลินิก การทบทวนภาพฝันอย่างเป็นระบบช่วยลดความถี่และความรุนแรงของฝันร้ายซ้ำๆ',
        bodyTh:
          'แทนที่จะเปิดตำราทำนายตัวเลข โมเดลของ Clara Hill ชวนเราแยกองค์ประกอบเด่นของภาพฝัน (Exploration) เชื่อมกับประสบการณ์ปัจจุบัน (Insight) และออกแบบการดูแลใจเล็กๆ ในโลกความจริง (Action)',
        reflectionPromptTh: 'หากภาพฝันนั้นเป็นเพียงฉากละครสั้นๆ ที่ใจคุณกำกับขึ้น มันกำลังขอให้คุณดูแลเรื่องใด?',
      },
    ],
  },
};

export const DOMAIN_ORDER: DomainSlot[] = ['slot_tarot', 'slot_horoscope', 'slot_dream'];
