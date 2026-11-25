export type UserGender = 'male' | 'female' | 'other' | 'unspecified';
export type BirthTimeSlot = 'dawn' | 'morning' | 'afternoon' | 'night' | 'unknown';
export type FocusArea = 'love' | 'money_work' | 'crossroads' | 'secret_sign';

export interface PersonalCalibrationInput {
  gender: UserGender;
  birthDay: number;
  birthMonth: number;
  birthYearCe: number;
  birthTimeSlot: BirthTimeSlot;
  focusArea: FocusArea;
}

export interface ComputedDestinyProfile {
  genderLabelTh: string;
  dobFormattedTh: string;
  ageYears: number;
  thaiWeekdayTh: string;
  rulingPlanetTh: string;
  westernZodiacTh: string;
  westernElementTh: string;
  chineseZodiacTh: string;
  chineseElementTh: string;
  lifePathNumber: number;
  birthTimeLabelTh: string;
  focusLabelTh: string;
  freeEdgeTh: string;
  freeBlindSpotTh: string;
  freeSevenDayWatchTh: string;
  promptSummaryText: string;
}

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_WEEKDAYS = [
  { day: 'วันอาทิตย์', planet: 'พระอาทิตย์ (ธาตุไฟ · อำนาจและศักดิ์ศรี)' },
  { day: 'วันจันทร์', planet: 'พระจันทร์ (ธาตุดินอ่อน · เสน่ห์และไหวพริบ)' },
  { day: 'วันอังคาร', planet: 'พระอังคาร (ธาตุลมกล้า · ความกล้าและแรงปะทะ)' },
  { day: 'วันพุธ', planet: 'พระพุธ (ธาตุน้ำ · วาทศิลป์และการเจรจา)' },
  { day: 'วันพฤหัสบดี', planet: 'พระพฤหัส (ธาตุดินใหญ่ · ปัญญาและผู้ใหญ่เกื้อหนุน)' },
  { day: 'วันศุกร์', planet: 'พระศุกร์ (ธาตุน้ำหอม · แรงดึงดูด โภคทรัพย์ และความรัก)' },
  { day: 'วันเสาร์', planet: 'พระเสาร์ (ธาตุไฟใหญ่ · ความอึด พลิกชะตาช้าแต่มั่นคง)' },
];

const CHINESE_ANIMALS = [
  'ชวด (หนู)',
  'ฉลู (วัว)',
  'ขาล (เสือ)',
  'เถาะ (กระต่าย)',
  'มะโรง (มังกรใหญ่)',
  'มะเส็ง (งูเล็ก)',
  'มะเมีย (ม้า)',
  'มะแม (แพะ)',
  'วอก (ลิง)',
  'ระกา (ไก่)',
  'จอ (สุนัข)',
  'กุน (หมู)',
];

const CHINESE_ELEMENTS = ['ทอง', 'ทอง', 'น้ำ', 'น้ำ', 'ไม้', 'ไม้', 'ไฟ', 'ไฟ', 'ดิน', 'ดิน'];

function getWesternZodiac(day: number, month: number): { sign: string; element: string } {
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return { sign: 'ราศีเมษ (Aries)', element: 'ไฟ' };
  if (md >= 420 && md <= 520) return { sign: 'ราศีพฤษภ (Taurus)', element: 'ดิน' };
  if (md >= 521 && md <= 620) return { sign: 'ราศีเมถุน (Gemini)', element: 'ลม' };
  if (md >= 621 && md <= 722) return { sign: 'ราศีกรกฎ (Cancer)', element: 'น้ำ' };
  if (md >= 723 && md <= 822) return { sign: 'ราศีสิงห์ (Leo)', element: 'ไฟ' };
  if (md >= 823 && md <= 922) return { sign: 'ราศีกันย์ (Virgo)', element: 'ดิน' };
  if (md >= 923 && md <= 1022) return { sign: 'ราศีตุลย์ (Libra)', element: 'ลม' };
  if (md >= 1023 && md <= 1121) return { sign: 'ราศีพิจิก (Scorpio)', element: 'น้ำ' };
  if (md >= 1122 && md <= 1221) return { sign: 'ราศีธนู (Sagittarius)', element: 'ไฟ' };
  if (md >= 1222 || md <= 119) return { sign: 'ราศีมังกร (Capricorn)', element: 'ดิน' };
  if (md >= 120 && md <= 218) return { sign: 'ราศีกุมภ์ (Aquarius)', element: 'ลม' };
  return { sign: 'ราศีมีน (Pisces)', element: 'น้ำ' };
}

function computeLifePath(day: number, month: number, yearCe: number): number {
  const digits = `${day}${month}${yearCe}`
    .split('')
    .map((d) => Number(d) || 0);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22) {
    sum = String(sum)
      .split('')
      .reduce((a, b) => a + (Number(b) || 0), 0);
  }
  return sum || 9;
}

export function computeDestinyProfile(input: PersonalCalibrationInput): ComputedDestinyProfile {
  const safeYear = Math.min(2015, Math.max(1945, Math.floor(input.birthYearCe || 2004)));
  const safeMonth = Math.min(12, Math.max(1, Math.floor(input.birthMonth || 1)));
  const maxDayInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const safeDay = Math.min(maxDayInMonth, Math.max(1, Math.floor(input.birthDay || 1)));

  const birthDate = new Date(safeYear, safeMonth - 1, safeDay);
  const weekdayIdx = birthDate.getDay();
  const weekdayMeta = THAI_WEEKDAYS[weekdayIdx] ?? THAI_WEEKDAYS[0];
  const western = getWesternZodiac(safeDay, safeMonth);
  const animalIdx = (((safeYear - 1900) % 12) + 12) % 12;
  const elementIdx = (((safeYear % 10) + 10) % 10);
  const chineseZodiacTh = `ปี${CHINESE_ANIMALS[animalIdx]}`;
  const chineseElementTh = `ธาตุ${CHINESE_ELEMENTS[elementIdx]}`;
  const lifePathNumber = computeLifePath(safeDay, safeMonth, safeYear);
  const ageYears = Math.max(12, new Date().getFullYear() - safeYear);

  const genderMap: Record<UserGender, string> = {
    male: 'ชาย',
    female: 'หญิง',
    other: 'LGBTQ+ / อิสระ',
    unspecified: 'ไม่ระบุ',
  };

  const timeMap: Record<BirthTimeSlot, string> = {
    dawn: 'เช้ามืด (03:00–06:59)',
    morning: 'เช้า–สาย (07:00–11:59)',
    afternoon: 'บ่าย–เย็น (12:00–18:59)',
    night: 'ค่ำ–ดึก (19:00–02:59)',
    unknown: 'ไม่ทราบเวลาเกิด',
  };

  const focusMap: Record<FocusArea, string> = {
    love: 'ความรัก / คนที่อยู่ในใจ',
    money_work: 'การเงิน / โอกาสงานและการเติบโต',
    crossroads: 'ทางแยกสำคัญที่ต้องตัดสินใจ',
    secret_sign: 'ลางสังหรณ์ / สัญญาณแปลกช่วงนี้',
  };

  const genderLabelTh = genderMap[input.gender] ?? 'ไม่ระบุ';
  const birthTimeLabelTh = timeMap[input.birthTimeSlot] ?? 'ไม่ทราบเวลาเกิด';
  const focusLabelTh = focusMap[input.focusArea] ?? focusMap.secret_sign;
  const dobFormattedTh = `${safeDay} ${THAI_MONTHS_SHORT[safeMonth - 1]} พ.ศ. ${safeYear + 543} (${safeYear})`;

  const edgeByElement: Record<string, string> = {
    ไฟ: `พลัง${weekdayMeta.day} ผสาน${western.sign} ทำให้คุณมีแรงดึงดูดและตัดสินใจเฉียบขาดเวลาเจอสถานการณ์กดดัน คนรอบตัวมักแอบเกรงใจแต่คุณมักไม่รู้ตัว`,
    ดิน: `รหัสชีวิตเลข ${lifePathNumber} ร่วมกับ${western.sign} ให้สัญชาตญาณอ่านคนเก่งเป็นพิเศษ คุณจับพิรุธและรู้ว่าใครจริงใจได้เร็วกว่าคนส่วนใหญ่`,
    ลม: `${chineseZodiacTh} ผสานธาตุลมของ${western.sign} ทำให้สมองคุณเชื่อมโยงโอกาสที่คนอื่นมองข้ามได้ไว โดยเฉพาะเรื่องดีลงานและจังหวะเข้าหาคน`,
    น้ำ: `พลัง${weekdayMeta.day} และธาตุน้ำของ${western.sign} ทำให้ลางสังหรณ์ช่วงกลางคืนแม่นเป็นพิเศษ ฝันหรือความรู้สึกวูบแรกของคุณมักมาก่อนเหตุการณ์จริงเสมอ`,
  };

  const blindSpotByFocus: Record<FocusArea, string> = {
    love: `ข้อควรระวังของ${genderLabelTh}เกิด${weekdayMeta.day}: มักทุ่มหรือคิดเผื่ออีกฝ่ายจนเผลอแบกความคาดหวังไว้ฝ่ายเดียว ยิ่งเงียบยิ่งตีความไปไกล`,
    money_work: `จุดรั่วไหลเรื่องงาน-เงิน: ความเกรงใจหรือการรอ "ความพร้อม 100%" ทำให้โอกาสดีๆ มักหลุดไปให้คนที่กล้าขยับก่อนคุณเพียงก้าวเดียว`,
    crossroads: `กับดักทางแยกของเลข ${lifePathNumber}: คุณเห็นข้อเสียของทุกทางเลือกชัดเกินไป จนลังเลอยู่ที่เดิมทั้งที่ใจลึกๆ เลือกคำตอบไว้แล้ว`,
    secret_sign: `สิ่งที่มักมองข้าม: สัญญาณซ้ำๆ 3 ครั้งใน 7 วัน (คนทักเรื่องเดิม ความฝันซ้ำ หรือตัวเลข/เหตุบังเอิญ) ไม่ใช่เรื่องฟุ้งซ่าน แต่เป็นสิ่งที่ใจกำลังเตือน`,
  };

  const sevenDayWatchByTime: Record<BirthTimeSlot, string> = {
    dawn: 'ช่วง 7 วันนี้ จับตาข่าวหรือข้อความที่เข้ามาช่วงเช้าตรู่ และระวังคำพูดคนใกล้ตัวที่ดูเหมือนพูดเล่นแต่แฝงความจริง',
    morning: 'ช่วง 7 วันนี้ โอกาสขยับตัวอยู่ที่การทักหรือเปิดดีลก่อนเที่ยง อย่าปล่อยให้เรื่องค้างคาข้ามวันศุกร์',
    afternoon: 'ช่วง 7 วันนี้ ให้ระวังแรงเสียดทานช่วงบ่ายแก่ๆ คนที่มีท่าทีเร่งรัดคุณอาจกำลังปิดบังเงื่อนไขบางอย่างไว้',
    night: 'ช่วง 7 วันนี้ ลางสังหรณ์และไอเดียคมที่สุดหลังพระอาทิตย์ตก แต่ห้ามตัดสินใจเรื่องหัวใจหรือโอนเงินตอนดึกยามเหนื่อยล้า',
    unknown: 'ช่วง 7 วันนี้ ให้จับตาคนหรือเหตุการณ์ที่ไม่คาดคิดในช่วง 48 ชั่วโมงข้างหน้า — คำตอบจะชัดจาก "การกระทำ" ไม่ใช่ "คำพูด"',
  };

  const promptSummaryText = [
    `เพศ: ${genderLabelTh}`,
    `วันเกิด: ${dobFormattedTh} (อายุ ~${ageYears} ปี)`,
    `เกิด${weekdayMeta.day} · ${weekdayMeta.planet}`,
    `ราศี: ${western.sign} (ธาตุ${western.element})`,
    `นักษัตร: ${chineseZodiacTh} (${chineseElementTh})`,
    `เลขรหัสชีวิต: ${lifePathNumber}`,
    `เวลาเกิด: ${birthTimeLabelTh}`,
    `เรื่องที่ต้องการความแม่นยำเป็นพิเศษ: ${focusLabelTh}`,
  ].join(' | ');

  return {
    genderLabelTh,
    dobFormattedTh,
    ageYears,
    thaiWeekdayTh: weekdayMeta.day,
    rulingPlanetTh: weekdayMeta.planet,
    westernZodiacTh: western.sign,
    westernElementTh: western.element,
    chineseZodiacTh,
    chineseElementTh,
    lifePathNumber,
    birthTimeLabelTh,
    focusLabelTh,
    freeEdgeTh: edgeByElement[western.element] ?? edgeByElement.น้ำ,
    freeBlindSpotTh: blindSpotByFocus[input.focusArea] ?? blindSpotByFocus.secret_sign,
    freeSevenDayWatchTh: sevenDayWatchByTime[input.birthTimeSlot] ?? sevenDayWatchByTime.unknown,
    promptSummaryText,
  };
}
