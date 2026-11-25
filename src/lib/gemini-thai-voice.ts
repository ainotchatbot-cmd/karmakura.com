import { GoogleGenAI, Type } from '@google/genai';
import {
  NON_DOGMATIC_LENS_NOTE_TH,
  PERSPECTIVE_LENSES,
  TIMEFRAME_OPTIONS,
  type DigestTimeframe,
  type DomainSlot,
  type PerspectiveLens,
} from '../config/site.config.ts';

export type VoicePersona = 'male_sage' | 'female_oracle';

export interface ReadingRequestPayload {
  domain: DomainSlot;
  userPrompt: string;
  freeAssociation?: string;
  drawnCardNames?: string[];
  birthSeasonOrContext?: string;
  gmailThemes?: string[];
  persona: VoicePersona;
  includeVoice: boolean;
  timeframe?: DigestTimeframe;
  activeLens?: PerspectiveLens;
  compareOtherAngles?: boolean;
  personalContext?: string;
}

export interface LensDigestItem {
  lensId: PerspectiveLens;
  lensNameTh: string;
  framingTh: string;
  watchForTh: string;
  groundedTakeawayTh: string;
  shortComparisonTh: string;
}

export interface OutcomeDigestPayload {
  timeframe: DigestTimeframe;
  timeframeLabelTh: string;
  activeLens: PerspectiveLens;
  compareOtherAngles: boolean;
  coreDigestBulletsTh: string[];
  lenses: LensDigestItem[];
  nonDogmaticNoteTh: string;
}

export interface HvdcMetrics {
  charactersCount: number;
  friendlyInteractions: number;
  aggressiveInteractions: number;
  fcRatioPercent: number;
  acRatioPercent: number;
  emotions: Array<{ labelTh: string; intensity: number }>;
  claraHillExplorationTh: string;
  claraHillInsightTh: string;
  claraHillActionTh: string;
}

export interface TarotSynthesisMetrics {
  lightPercent: number;
  shadowPercent: number;
  archetypeTensionTh: string;
  associationBridgeTh: string;
}

export interface HoroscopeCycleMetrics {
  cyclePhaseTh: string;
  dominantCognitiveBiasTh: string;
  stabilityScore: number;
}

export interface GeneratedThaiReading {
  headlineTh: string;
  summaryTh: string;
  deepReflectionTh: string;
  cognitiveReframeTh: string;
  actionStepsTh: string[];
  selfInquiryQuestionTh: string;
  spokenScriptTh: string;
  outcomeDigest: OutcomeDigestPayload;
  hvdc?: HvdcMetrics;
  tarotSynthesis?: TarotSynthesisMetrics;
  horoscopeCycle?: HoroscopeCycleMetrics;
  audioBase64Wav?: string;
  voicePersonaUsed?: VoicePersona;
}

function getGeminiClient(): GoogleGenAI {
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

function buildSystemInstruction(
  domain: DomainSlot,
  persona: VoicePersona,
  timeframe: DigestTimeframe,
  activeLens: PerspectiveLens
): string {
  const voiceTone =
    persona === 'male_sage'
      ? 'น้ำเสียงสุขุม อบอุ่น ลุ่มลึกแบบนักปราชญ์ชุดเทา (Male Sage)'
      : 'น้ำเสียงนุ่มนวล ชัดเจน เปี่ยมเมตตาและสติปัญญา (Female Oracle)';

  const tfMeta = TIMEFRAME_OPTIONS.find((t) => t.id === timeframe) ?? TIMEFRAME_OPTIONS[0];
  const lensMeta = PERSPECTIVE_LENSES.find((l) => l.id === activeLens) ?? PERSPECTIVE_LENSES[0];

  const domainDirective =
    domain === 'slot_tarot'
      ? 'คุณคือเอนจินถอดรหัสไพ่ทาโรต์เชิงจิตวิทยา วิเคราะห์ไพ่ที่เปิดได้ควบคู่กับความรู้สึกเชื่อมโยงเสรี (Free Association) ของผู้ถาม ให้สมดุลด้านสว่างและด้านเงา (lightPercent + shadowPercent = 100)'
      : domain === 'slot_dream'
        ? 'คุณคือเอนจินถอดรหัสความฝันที่ใช้เกณฑ์เชิงปริมาณ Hall–Van de Castle (HVDC) และกระบวนการ 3 ขั้นของ Clara Hill (Exploration, Insight, Action) วิเคราะห์ตัวละคร ปฏิสัมพันธ์ F/C และ A/C อารมณ์หลักในฝัน และเชื่อมโยงกับความเครียดในชีวิตประจำวัน'
        : 'คุณคือเอนจินถอดรหัสจังหวะชีวิตและสัญญาณรอบตัว (DuangTok) วิเคราะห์ช่วงเปลี่ยนผ่าน อคติทางความคิดยามเครียด (Cognitive Biases) และแนวทางตัดสินใจอย่างมีสติ';

  return [
    'ตอบเป็นภาษาไทยที่คมชัด ทันสมัย ตรงประเด็น และเข้าถึงง่ายสำหรับคนรุ่นใหม่อายุ 18+ ("อะไรจะเกิดขึ้นต่อไป / จับสัญญาณอะไรได้บ้าง") — ห้ามยืดเยื้อ ห้ามสั่งสอน ห้ามเพ้อฝันน้ำเน่า และห้ามใช้ภาษาวิชาการแข็งทื่อ',
    domainDirective,
    `ขอบเขตสรุปผลลัพธ์ (Timeframe Digest): ${tfMeta.labelTh} (${tfMeta.labelEn}) — โฟกัสที่: ${tfMeta.scopeTh}`,
    `เลนส์มุมมองหลักที่เลือก (Active Lens): ${lensMeta.labelTh} (${lensMeta.labelEn}) — โฟกัสที่: ${lensMeta.focusTh}`,
    'โครงสร้าง outcomeDigest ที่ต้องสร้างให้ครบทุกครั้ง:',
    '1. coreDigestBulletsTh: จุดสรุปสั้นคม 2-3 ข้อว่าผลลัพธ์นี้ชี้ไปทางไหนในช่วงเวลาที่เลือก (Core Outcome ต้องคงที่สม่ำเสมอไม่ว่าจะสลับเลนส์ใด)',
    '2. lenses: สร้างครบทั้ง 6 เลนส์ (lensId ต้องใช้ค่าตรงตัวคือ "buddhist", "islamic", "chinese", "christian", "jewish", "thai_folk") สำหรับช่วงเวลาเดียวกันนี้ โดยทุกเลนส์ต้องเล่าแก่นผลลัพธ์เดียวกันแต่เปลี่ยนกรอบคิด คำศัพท์ และคำแนะนำให้ตรงกับวิถีของเลนส์นั้นอย่างเคารพและไม่งมงาย:',
    '   - buddhist: สภาวะจิต เหตุ-ปัจจัย (กรรม) ความไม่เที่ยง (อนิจจัง) ความนิ่งเทียบกับความฟุ้งซ่าน และสติ',
    '   - islamic: การทบทวนตน ความชัดเจนทางศีลธรรม ความกตัญญู ความอดทน (ซอบัร) และการแยกฝันรบกวนทั่วไปออกจากฝันที่ชวนสะท้อนใจ (Ru’ya) โดยห้ามอ้างการทำนายอนาคตหรือสิ่งเร้นลับเด็ดขาด',
    '   - chinese: สมดุลหยิน-หยาง เบญจธาตุ จังหวะเวลาตามฤดูกาล/จันทรคติ และการปรับตัวเชิงปฏิบัติแบบเซียมซี/ปวย',
    '   - christian: มโนธรรม ความหวัง การแยกแยะทางจิตวิญญาณ ความสงบใจ vs ความกังวล โดยไม่ยึดติดโชคลาง',
    '   - jewish: การตั้งคำถามเชิงสะท้อน ความกระจ่างภายใน ความรับผิดชอบทางจริยธรรม และธีมการใคร่ครวญความฝันอย่างไม่ผูกมัด',
    '   - thai_folk: จังหวะพระเคราะห์และเงา (เช่น ราหูพลิกมุม เกตุ/ลางสังหรณ์ เสาร์หนักทบทวน) นิมิต และจังหวะชีวิตแบบไทยร่วมสมัย',
    '   สำหรับแต่ละเลนส์ ให้ใส่ framingTh (วิธีตีความ), watchForTh (สิ่งที่ควรจับตา), groundedTakeawayTh (1 สิ่งที่ทำได้จริงในช่วงเวลานี้), และ shortComparisonTh (1-2 ประโยคสั้นคมสำหรับตารางเทียบเคียง)',
    `โทนสคริปต์เสียงพูด: ${voiceTone}`,
    'ข้อห้ามเด็ดขาด: ห้ามพยากรณ์ชะตากรรมแบบตายตัว ห้ามรับรองผลลัพธ์ล่วงหน้า ห้ามวินิจฉัยโรคทางการแพทย์ และห้ามอ้างคำตัดสินทางศาสนาอย่างเป็นทางการ',
    'spokenScriptTh ต้องเป็นบทพูดภาษาไทยต่อเนื่องความยาวประมาณ 70-110 คำ ไม่มีสัญลักษณ์มาร์กดาวน์',
  ].join('\n');
}

export async function generateThaiPsychologicalReading(
  req: ReadingRequestPayload
): Promise<GeneratedThaiReading> {
  const ai = getGeminiClient();
  const timeframe: DigestTimeframe = req.timeframe ?? 'daily';
  const activeLens: PerspectiveLens = req.activeLens ?? 'thai_folk';
  const compareOtherAngles = req.compareOtherAngles ?? true;

  const tfMeta = TIMEFRAME_OPTIONS.find((t) => t.id === timeframe) ?? TIMEFRAME_OPTIONS[0];
  const lensMeta = PERSPECTIVE_LENSES.find((l) => l.id === activeLens) ?? PERSPECTIVE_LENSES[0];

  const contextParts: string[] = [
    `ศาสตร์ที่วิเคราะห์: ${req.domain}`,
    `Timeframe Digest: ${tfMeta.labelEn} (${tfMeta.labelTh})`,
    `Active Perspective Lens: ${lensMeta.labelEn} (${lensMeta.labelTh})`,
    `Compare Other Angles?: ${compareOtherAngles ? 'Yes' : 'No'}`,
    `เรื่องราว/ความฝัน/ไพ่/คำถามของผู้ใช้: ${req.userPrompt}`,
  ];
  if (req.freeAssociation) {
    contextParts.push(`ความรู้สึกแรกก่อนเปิดไพ่ (Free Association): ${req.freeAssociation}`);
  }
  if (req.drawnCardNames?.length) {
    contextParts.push(`ไพ่ที่จับได้: ${req.drawnCardNames.join(', ')}`);
  }
  if (req.birthSeasonOrContext) {
    contextParts.push(`ช่วงวัยหรือบริบทเพิ่มเติม: ${req.birthSeasonOrContext}`);
  }
  if (req.personalContext?.trim()) {
    contextParts.push(
      `พิกัดชะตาเฉพาะบุคคลของผู้ใช้ (เพศ / วันเดือนปีเกิด / ราศี / นักษัตร / เลขรหัส / เรื่องที่โฟกัส — ใช้ปรับมุมวิเคราะห์ให้เฉียบคมและตรงตัว): ${req.personalContext.trim().slice(0, 600)}`
    );
  }
  if (req.gmailThemes?.length) {
    contextParts.push(
      `บริบทภาพรวมชีวิตช่วง 14 วัน (คัดกรองข้อมูลส่วนตัวแล้ว): ${req.gmailThemes.join(' | ')}`
    );
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: contextParts.join('\n'),
    config: {
      systemInstruction: buildSystemInstruction(req.domain, req.persona, timeframe, activeLens),
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headlineTh: { type: Type.STRING },
          summaryTh: { type: Type.STRING },
          deepReflectionTh: { type: Type.STRING },
          cognitiveReframeTh: { type: Type.STRING },
          actionStepsTh: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          selfInquiryQuestionTh: { type: Type.STRING },
          spokenScriptTh: { type: Type.STRING },
          outcomeDigest: {
            type: Type.OBJECT,
            properties: {
              coreDigestBulletsTh: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              lenses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lensId: { type: Type.STRING },
                    lensNameTh: { type: Type.STRING },
                    framingTh: { type: Type.STRING },
                    watchForTh: { type: Type.STRING },
                    groundedTakeawayTh: { type: Type.STRING },
                    shortComparisonTh: { type: Type.STRING },
                  },
                  required: [
                    'lensId',
                    'lensNameTh',
                    'framingTh',
                    'watchForTh',
                    'groundedTakeawayTh',
                    'shortComparisonTh',
                  ],
                },
              },
            },
            required: ['coreDigestBulletsTh', 'lenses'],
          },
          hvdc: {
            type: Type.OBJECT,
            properties: {
              charactersCount: { type: Type.INTEGER },
              friendlyInteractions: { type: Type.INTEGER },
              aggressiveInteractions: { type: Type.INTEGER },
              fcRatioPercent: { type: Type.INTEGER },
              acRatioPercent: { type: Type.INTEGER },
              emotions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    labelTh: { type: Type.STRING },
                    intensity: { type: Type.INTEGER },
                  },
                },
              },
              claraHillExplorationTh: { type: Type.STRING },
              claraHillInsightTh: { type: Type.STRING },
              claraHillActionTh: { type: Type.STRING },
            },
          },
          tarotSynthesis: {
            type: Type.OBJECT,
            properties: {
              lightPercent: { type: Type.INTEGER },
              shadowPercent: { type: Type.INTEGER },
              archetypeTensionTh: { type: Type.STRING },
              associationBridgeTh: { type: Type.STRING },
            },
          },
          horoscopeCycle: {
            type: Type.OBJECT,
            properties: {
              cyclePhaseTh: { type: Type.STRING },
              dominantCognitiveBiasTh: { type: Type.STRING },
              stabilityScore: { type: Type.INTEGER },
            },
          },
        },
        required: [
          'headlineTh',
          'summaryTh',
          'deepReflectionTh',
          'cognitiveReframeTh',
          'actionStepsTh',
          'selfInquiryQuestionTh',
          'spokenScriptTh',
          'outcomeDigest',
        ],
      },
    },
  });

  const rawJson = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawJson) as GeneratedThaiReading;

  // Normalize outcomeDigest guarantees
  const returnedLenses = Array.isArray(parsed.outcomeDigest?.lenses)
    ? parsed.outcomeDigest.lenses
    : [];
  const normalizedLenses: LensDigestItem[] = PERSPECTIVE_LENSES.map((meta) => {
    const found = returnedLenses.find((item) => item.lensId === meta.id);
    return (
      found ?? {
        lensId: meta.id,
        lensNameTh: meta.labelTh,
        framingTh: parsed.summaryTh,
        watchForTh: parsed.cognitiveReframeTh,
        groundedTakeawayTh: parsed.actionStepsTh?.[0] ?? parsed.selfInquiryQuestionTh,
        shortComparisonTh: parsed.summaryTh,
      }
    );
  });

  parsed.outcomeDigest = {
    timeframe,
    timeframeLabelTh: `${tfMeta.labelTh} (${tfMeta.labelEn})`,
    activeLens,
    compareOtherAngles,
    coreDigestBulletsTh:
      parsed.outcomeDigest?.coreDigestBulletsTh?.length > 0
        ? parsed.outcomeDigest.coreDigestBulletsTh.slice(0, 3)
        : [parsed.summaryTh],
    lenses: normalizedLenses,
    nonDogmaticNoteTh: NON_DOGMATIC_LENS_NOTE_TH,
  };

  if (req.includeVoice && parsed.spokenScriptTh) {
    const audioBase64Wav = await synthesizeThaiVoice(parsed.spokenScriptTh, req.persona);
    if (audioBase64Wav) {
      parsed.audioBase64Wav = audioBase64Wav;
      parsed.voicePersonaUsed = req.persona;
    }
  }

  return parsed;
}

export async function synthesizeThaiVoice(
  thaiScript: string,
  persona: VoicePersona
): Promise<string | undefined> {
  const ai = getGeminiClient();
  const voiceName = persona === 'male_sage' ? 'Charon' : 'Zephyr';
  const styleHint =
    persona === 'male_sage'
      ? 'Low-pitched, calm, warm and unhurried Thai male sage narrator with steady meditative cadence'
      : 'Ethereal, higher-pitched, luminous and soothing Thai oracle narrator with airy mystical cadence';

  try {
    const ttsRes = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: thaiScript,
              speechMetadata: {
                style: styleHint,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    return ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (err) {
    console.error('Gemini TTS generation error:', err);
    return undefined;
  }
}

export interface FunnelReadingRequestPayload {
  domain: DomainSlot;
  primaryDimension: string;
  secondaryDimension: string;
  unmaskedTitleTh: string;
  behavioralSummaryTh: string;
  chosenLabelsTh: string[];
  predictedCardNameTh: string;
  predictedCardNameEn: string;
  predictedCardLightTh: string;
  predictedCardShadowTh: string;
  persona: VoicePersona;
  timeframe: DigestTimeframe;
  activeLens: PerspectiveLens;
  personalContext?: string;
}

export interface FunnelReadingAiPayload {
  storyHeadlineTh: string;
  affirmingStoryTh: string;
  groundedActionTh: string;
  selfInquiryQuestionTh: string;
  spokenScriptTh: string;
  outcomeDigest: OutcomeDigestPayload;
}

export async function generateSubconsciousFunnelReading(
  req: FunnelReadingRequestPayload
): Promise<FunnelReadingAiPayload> {
  const ai = getGeminiClient();
  const tfMeta = TIMEFRAME_OPTIONS.find((t) => t.id === req.timeframe) ?? TIMEFRAME_OPTIONS[0];
  const lensMeta = PERSPECTIVE_LENSES.find((l) => l.id === req.activeLens) ?? PERSPECTIVE_LENSES[0];
  const voiceTone =
    req.persona === 'male_sage'
      ? 'น้ำเสียงสุขุม อบอุ่น ลุ่มลึกแบบนักปราชญ์กบเฒ่า (Sage)'
      : 'น้ำเสียงกังวานใส อ่อนโยน ชวนสงบใจแบบโหรหญิง (Oracle)';

  const systemInstruction = [
    'คุณคือ "ท่านเจ้าอาวาสกบเฒ่า" นักปราชญ์จิตวิทยาเชิงสัญลักษณ์ประจำอารามสระบัวชุดเทา',
    'ผู้ใช้เพิ่งผ่านการเลือกภาพ A/B โดยสัญชาตญาณ 5 รอบโดยไม่รู้หมวดหมู่ล่วงหน้า แล้วระบบวิเคราะห์ได้ว่าแรงจูงใจที่ซ่อนอยู่ใต้จิตสำนึกคือมิติใด',
    'ภารกิจ: เขียนคำทำนายและเรื่องราวปลอบโยน/ยืนยันกำลังใจภาษาไทยที่ลึกซึ้ง ตรงใจ อ่อนโยนแต่น่าเชื่อถือ — ห้ามขายความกลัว ห้ามเทศนายาว และห้ามดูถูกความรู้สึกของผู้ใช้ (โดยเฉพาะหากเป็นเรื่องผู้ล่วงลับ ความรัก ครอบครัว งาน โชค หรือความมั่นคง)',
    `โทนสคริปต์เสียงพูด: ${voiceTone} (spokenScriptTh ยาวประมาณ 55-85 คำ เป็นภาษาไทยธรรมชาติ ไร้ markdown)`,
    `สร้าง outcomeDigest ครบทั้ง 6 เลนส์ (lensId ตรงตัว: "buddhist", "islamic", "chinese", "christian", "jewish", "thai_folk") ในกรอบเวลา ${tfMeta.labelTh} (${tfMeta.labelEn}) และเน้นเลนส์ ${lensMeta.labelTh}`,
  ].join('\n');

  const promptText = [
    `ศาสตร์: ${req.domain}`,
    `แกนจิตใต้สำนึกหลักที่อ่านได้: ${req.primaryDimension} (${req.unmaskedTitleTh})`,
    `แกนรองที่แฝงอยู่: ${req.secondaryDimension}`,
    `รูปแบบพฤติกรรมการตัดสินใจ (Behavioral / Game Theory): ${req.behavioralSummaryTh}`,
    `5 ภาพสัญลักษณ์ที่มือผู้ใช้เลือกตามสัญชาตญาณ: ${req.chosenLabelsTh.join(' -> ')}`,
    `ไพ่ตัวแทนที่ปรากฏ: ${req.predictedCardNameTh} (${req.predictedCardNameEn}) — ด้านสว่าง: ${req.predictedCardLightTh} | ด้านเงา: ${req.predictedCardShadowTh}`,
    ...(req.personalContext?.trim()
      ? [`พิกัดวันเดือนปีเกิดของผู้ใช้ (นำมาผูกเรื่องให้ตรงตัว): ${req.personalContext.trim().slice(0, 500)}`]
      : []),
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: promptText,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          storyHeadlineTh: { type: Type.STRING },
          affirmingStoryTh: { type: Type.STRING },
          groundedActionTh: { type: Type.STRING },
          selfInquiryQuestionTh: { type: Type.STRING },
          spokenScriptTh: { type: Type.STRING },
          outcomeDigest: {
            type: Type.OBJECT,
            properties: {
              coreDigestBulletsTh: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              lenses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lensId: { type: Type.STRING },
                    lensNameTh: { type: Type.STRING },
                    framingTh: { type: Type.STRING },
                    watchForTh: { type: Type.STRING },
                    groundedTakeawayTh: { type: Type.STRING },
                    shortComparisonTh: { type: Type.STRING },
                  },
                  required: [
                    'lensId',
                    'lensNameTh',
                    'framingTh',
                    'watchForTh',
                    'groundedTakeawayTh',
                    'shortComparisonTh',
                  ],
                },
              },
            },
            required: ['coreDigestBulletsTh', 'lenses'],
          },
        },
        required: [
          'storyHeadlineTh',
          'affirmingStoryTh',
          'groundedActionTh',
          'selfInquiryQuestionTh',
          'spokenScriptTh',
          'outcomeDigest',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as FunnelReadingAiPayload;
  const returnedLenses = Array.isArray(parsed.outcomeDigest?.lenses)
    ? parsed.outcomeDigest.lenses
    : [];

  const normalizedLenses: LensDigestItem[] = PERSPECTIVE_LENSES.map((meta) => {
    const found = returnedLenses.find((item) => item.lensId === meta.id);
    return (
      found ?? {
        lensId: meta.id,
        lensNameTh: meta.labelTh,
        framingTh: parsed.affirmingStoryTh,
        watchForTh: parsed.selfInquiryQuestionTh,
        groundedTakeawayTh: parsed.groundedActionTh,
        shortComparisonTh: parsed.storyHeadlineTh,
      }
    );
  });

  return {
    storyHeadlineTh: parsed.storyHeadlineTh,
    affirmingStoryTh: parsed.affirmingStoryTh,
    groundedActionTh: parsed.groundedActionTh,
    selfInquiryQuestionTh: parsed.selfInquiryQuestionTh,
    spokenScriptTh: parsed.spokenScriptTh,
    outcomeDigest: {
      timeframe: req.timeframe,
      timeframeLabelTh: `${tfMeta.labelTh} (${tfMeta.labelEn})`,
      activeLens: req.activeLens,
      compareOtherAngles: true,
      coreDigestBulletsTh:
        parsed.outcomeDigest?.coreDigestBulletsTh?.length > 0
          ? parsed.outcomeDigest.coreDigestBulletsTh.slice(0, 3)
          : [parsed.storyHeadlineTh],
      lenses: normalizedLenses,
      nonDogmaticNoteTh: NON_DOGMATIC_LENS_NOTE_TH,
    },
  };
}

