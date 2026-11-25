import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  PERSPECTIVE_LENSES,
  SITE_CONFIG,
  type DomainSlot,
  type PerspectiveLens,
} from '../config/site.config.ts';
import { synthesizeThaiVoice, type VoicePersona } from './gemini-thai-voice.ts';

export type AbbotDepth = 'quick' | 'balanced' | 'deep';

export interface AbbotHistoryMessage {
  role: 'user' | 'abbot';
  text: string;
}

export interface AbbotChatRequest {
  message: string;
  history?: AbbotHistoryMessage[];
  depthMode?: AbbotDepth;
  domainSlot?: DomainSlot;
  activeLens?: PerspectiveLens;
  includeVoice?: boolean;
  persona?: VoicePersona;
  personalContext?: string;
}

export interface AbbotChatResponse {
  replyTh: string;
  quipTh: string;
  suggestedActionTh: string;
  modelUsed: string;
  audioBase64Wav?: string;
  voicePersonaUsed?: VoicePersona;
}

export interface OmenTalismanMeta {
  titleTh: string;
  latinMotto: string;
  abbotNoteTh: string;
  symbolMotif: 'lantern' | 'lotus' | 'crescent' | 'serpent' | 'hourglass' | 'compass';
  primaryHex: string;
  secondaryHex: string;
  ringCount: number;
  pulseTempoSec: number;
}

export function getAbbotGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const ABBOT_LIVE_SYSTEM_INSTRUCTION = [
  'คุณคือ "ท่านเจ้าอาวาสกบเฒ่า" (The Wise Wizard Frog Abbot) แห่งอารามสระบัวชุดเทา',
  'คุณประจำอยู่ที่ยอดหน้าเว็บคอยพูดคุยกับทั้งผู้ใช้ฟรีและผู้ใช้ที่จ่าย PromptPay',
  'บุคลิกและน้ำเสียง:',
  '- ภาษาไทยล้วน คมชัด ทันสมัย เหมาะกับคนรุ่นใหม่อายุ 18+ ที่กำลังจับสัญญาณชีวิตหรือสงสัยว่าอะไรจะเกิดขึ้นต่อไป',
  '- สุขุม ขี้เล่นปนเหน็บแนมเบาๆ อย่างมีเมตตา เหมือนกบชราที่เฝ้าตะเกียงมานานจนรู้ทันข้ออ้างและความฟุ้งซ่านของมนุษย์',
  '- ห้ามเทศนายาวเหยียด ห้ามน้ำเน่า ห้ามขายความกลัว และห้ามทำนายอนาคตแบบหมอดูฟันธงตายตัว',
  '- แปลงทุกความกังวลเป็นมุมมองสะท้อนใจทางจิตวิทยา (Cognitive Reframing) หรือคำถามชวนคิดที่สั้น กระชับ (2-4 ประโยคสำหรับเสียงพูดสด)',
  '- เริ่มหรือแทรกเสียงหัวเราะเบาๆ หรือคำทักแบบ "อ๊บ... โยม" ได้พอประมาณให้มีเสน่ห์ แต่ยังน่าเชื่อถือ',
].join('\n');

export async function runAbbotChat(req: AbbotChatRequest): Promise<AbbotChatResponse> {
  const ai = getAbbotGeminiClient();
  const depthMode: AbbotDepth =
    req.depthMode === 'quick' || req.depthMode === 'deep' ? req.depthMode : 'balanced';
  const slot: DomainSlot =
    req.domainSlot && req.domainSlot in SITE_CONFIG ? req.domainSlot : 'slot_tarot';
  const lensMeta = PERSPECTIVE_LENSES.find((l) => l.id === req.activeLens) ?? PERSPECTIVE_LENSES[0];

  const model = depthMode === 'quick' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
  const safePersonal = req.personalContext?.trim().slice(0, 600);

  const systemInstruction = [
    ABBOT_LIVE_SYSTEM_INSTRUCTION,
    `ศาสตร์ที่โยมกำลังเปิดอยู่: ${SITE_CONFIG[slot].brandThai} (${SITE_CONFIG[slot].brandLatin})`,
    `เลนส์มุมมองปัจจุบัน: ${lensMeta.labelTh} (${lensMeta.focusTh})`,
    ...(safePersonal
      ? [`พิกัดชะตาของผู้ถาม (นำมาปรับคำแนะนำให้ตรงตัวและแม่นยำขึ้น): ${safePersonal}`]
      : []),
    'ตอบกลับเป็น JSON ตามสคีมาเท่านั้น: replyTh (คำตอบหลัก 2-5 ประโยค), quipTh (มุกสั้นๆ หรือคำเปรยคมๆ 1 ประโยคของกบเฒ่า), suggestedActionTh (1 ก้าวเล็กๆ ที่ทำได้จริงวันนี้).',
  ].join('\n');

  const historyText = (req.history ?? [])
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'โยม' : 'ท่านเจ้าอาวาสกบเฒ่า'}: ${m.text}`)
    .join('\n');

  const promptContent = historyText
    ? `บทสนทนาก่อนหน้า:\n${historyText}\n\nโยมถามต่อว่า: ${req.message}`
    : `โยมกล่าวว่า: ${req.message}`;

  const config: Record<string, unknown> = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        replyTh: { type: Type.STRING },
        quipTh: { type: Type.STRING },
        suggestedActionTh: { type: Type.STRING },
      },
      required: ['replyTh', 'quipTh', 'suggestedActionTh'],
    },
  };

  if (model === 'gemini-4-hydrogen') {
    config.thinkingConfig = {
      thinkingLevel: depthMode === 'deep' ? ThinkingLevel.HIGH : ThinkingLevel.MEDIUM,
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents: promptContent,
    config,
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    replyTh?: string;
    quipTh?: string;
    suggestedActionTh?: string;
  };

  const replyTh = parsed.replyTh?.trim() || 'อ๊บ... ลองเล่าให้ละเอียดอีกนิดสิโยม ตะเกียงยังรอฟังอยู่';
  const quipTh = parsed.quipTh?.trim() || 'บางทีปัญหาไม่ได้ใหญ่ขึ้น แค่เรานั่งจ้องมันใกล้ไปหน่อย';
  const suggestedActionTh = parsed.suggestedActionTh?.trim() || 'พักสายตา 1 นาที แล้วเขียน 1 สิ่งที่ควบคุมได้วันนี้';

  let audioBase64Wav: string | undefined;
  let voicePersonaUsed: VoicePersona | undefined;
  if (req.includeVoice) {
    const persona: VoicePersona = req.persona === 'female_oracle' ? 'female_oracle' : 'male_sage';
    audioBase64Wav = await synthesizeThaiVoice(`${quipTh} ${replyTh}`, persona);
    if (audioBase64Wav) {
      voicePersonaUsed = persona;
    }
  }

  return {
    replyTh,
    quipTh,
    suggestedActionTh,
    modelUsed: model,
    audioBase64Wav,
    voicePersonaUsed,
  };
}

export async function transcribeAbbotAudio(
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getAbbotGeminiClient();
  const safeMime = mimeType.startsWith('audio/') ? mimeType : 'audio/webm';

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: safeMime,
            data: audioBase64,
          },
        },
        {
          text: 'ถอดความเสียงพูดภาษาไทย (และคำอังกฤษที่ปนมา) ให้ถูกต้องเป็นธรรมชาติ โดยไม่ต้องเติมคำอธิบายเพิ่มเติม',
        },
      ],
    },
  });

  return (response.text ?? '').trim();
}

export async function generateOmenTalismanMeta(params: {
  prompt: string;
  domainSlot: DomainSlot;
  activeLens: PerspectiveLens;
}): Promise<OmenTalismanMeta> {
  const ai = getAbbotGeminiClient();
  const lensMeta = PERSPECTIVE_LENSES.find((l) => l.id === params.activeLens) ?? PERSPECTIVE_LENSES[0];

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `ความฝันหรือสัญญาณที่โยมนำมา: "${params.prompt}"\nศาสตร์: ${SITE_CONFIG[params.domainSlot].brandThai}\nเลนส์: ${lensMeta.labelTh}`,
    config: {
      systemInstruction:
        'คุณคือท่านเจ้าอาวาสกบเฒ่า ออกแบบสเปก "ยันต์นิมิตสะท้อนใจ (Omen Talisman)" สำหรับวาดบนผืนผ้าใบดิจิทัล โดยใช้โทนสีสระบัวชุดเทา (#D4A359, #4A5D4E, #C0C5CE, #E2B86B, #7B9B82) ตอบกลับเป็น JSON เท่านั้น และให้คำคม abbotNoteTh ที่ขี้เล่นปนสุขุม 1-2 ประโยค',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titleTh: { type: Type.STRING },
          latinMotto: { type: Type.STRING },
          abbotNoteTh: { type: Type.STRING },
          symbolMotif: { type: Type.STRING },
          primaryHex: { type: Type.STRING },
          secondaryHex: { type: Type.STRING },
          ringCount: { type: Type.INTEGER },
          pulseTempoSec: { type: Type.INTEGER },
        },
        required: [
          'titleTh',
          'latinMotto',
          'abbotNoteTh',
          'symbolMotif',
          'primaryHex',
          'secondaryHex',
          'ringCount',
          'pulseTempoSec',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<OmenTalismanMeta>;
  const allowedMotifs: OmenTalismanMeta['symbolMotif'][] = [
    'lantern',
    'lotus',
    'crescent',
    'serpent',
    'hourglass',
    'compass',
  ];
  const symbolMotif = allowedMotifs.includes(parsed.symbolMotif as OmenTalismanMeta['symbolMotif'])
    ? (parsed.symbolMotif as OmenTalismanMeta['symbolMotif'])
    : 'lotus';

  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  return {
    titleTh: parsed.titleTh?.trim() || 'นิมิตตะเกียงกลางสระบัว',
    latinMotto: parsed.latinMotto?.trim() || 'SPECULUM NOCTIS',
    abbotNoteTh:
      parsed.abbotNoteTh?.trim() ||
      'อ๊บ... ภาพนี้ไม่ได้บอกให้กลัว แค่ชี้ให้ดูว่าใจเจ้ากำลังกอดอะไรไว้แน่นเกินไป',
    symbolMotif,
    primaryHex: hexRegex.test(parsed.primaryHex ?? '') ? (parsed.primaryHex as string) : '#D4A359',
    secondaryHex: hexRegex.test(parsed.secondaryHex ?? '') ? (parsed.secondaryHex as string) : '#4A5D4E',
    ringCount: Math.min(7, Math.max(3, Number(parsed.ringCount) || 5)),
    pulseTempoSec: Math.min(8, Math.max(3, Number(parsed.pulseTempoSec) || 5)),
  };
}
