import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Modality, type LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  PRICING_TIERS,
  SITE_CONFIG,
  type DigestTimeframe,
  type DomainSlot,
  type PerspectiveLens,
} from './src/config/site.config.ts';
import {
  ABBOT_LIVE_SYSTEM_INSTRUCTION,
  generateOmenTalismanMeta,
  getAbbotGeminiClient,
  runAbbotChat,
  transcribeAbbotAudio,
  type AbbotDepth,
  type AbbotHistoryMessage,
} from './src/lib/abbot-ai.ts';
import {
  generateSubconsciousFunnelReading,
  generateThaiPsychologicalReading,
  synthesizeThaiVoice,
  type VoicePersona,
} from './src/lib/gemini-thai-voice.ts';
import { extractSanitizedGmailThemes } from './src/lib/gmail-context.ts';
import {
  buildPromptPayPayload,
  signPromptPayWebhook,
  verifyPromptPayWebhookSignature,
} from './src/lib/promptpay.ts';
import { hashClientIp, ReadingAccessManager } from './src/lib/reading-access.ts';
import { getTenantConfig, isValidDomainSlot, resolveTenantSlot } from './src/lib/tenant.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const accessManager = new ReadingAccessManager();

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function setHardenedTrialCookie(res: Response, trialId: string): void {
  const cookieVal = `gp_trial=${encodeURIComponent(trialId)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=None; Partitioned`;
  res.setHeader('Set-Cookie', cookieVal);
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function verifyOriginMatchesHost(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim().toLowerCase();
    const host = (req.headers.host || '').toLowerCase();
    return originHost === host || (Boolean(forwardedHost) && originHost === forwardedHost);
  } catch {
    return false;
  }
}

function resolveRequestTenant(req: Request): DomainSlot {
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  const queryDomain = typeof req.query.domain === 'string' ? req.query.domain : undefined;
  const headerDomain =
    typeof req.headers['x-tenant-domain'] === 'string' ? req.headers['x-tenant-domain'] : undefined;
  return resolveTenantSlot({ host, queryDomain, headerDomain });
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return ch;
    }
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );

  // Dynamic per-domain robots.txt
  app.get('/robots.txt', (req, res) => {
    const slot = resolveRequestTenant(req);
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || SITE_CONFIG[slot].defaultHost;
    const baseUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/$/, '')
      : `${proto}://${host}`;

    res.type('text/plain; charset=utf-8').send(
      [
        'User-agent: *',
        'Allow: /',
        'Allow: /lore',
        'Disallow: /api/',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  // Dynamic per-domain sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    const slot = resolveRequestTenant(req);
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || SITE_CONFIG[slot].defaultHost;
    const baseUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/$/, '')
      : `${proto}://${host}`;
    const today = new Date().toISOString().split('T')[0];

    const urls = [
      `${baseUrl}/`,
      `${baseUrl}/?domain=slot_horoscope`,
      `${baseUrl}/?domain=slot_tarot`,
      `${baseUrl}/?domain=slot_dream`,
      `${baseUrl}/lore`,
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml; charset=utf-8').send(xml);
  });

  // Resolve tenant & access status
  app.get('/api/tenant', async (req, res) => {
    try {
      const slot = resolveRequestTenant(req);
      const cookies = parseCookies(req.headers.cookie);
      const ipHash = hashClientIp(getClientIp(req));
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const trialAvailable = await accessManager.checkTrialAvailable({
        cookieTrialId: cookies.gp_trial,
        ipHash,
        userId,
      });

      const ua = req.headers['user-agent'] || '';
      const isLineInAppBrowser = /\bLine\b/i.test(ua);

      res.json({
        slot,
        config: getTenantConfig(slot),
        trialAvailable,
        isLineInAppBrowser,
      });
    } catch (err) {
      console.error('Tenant resolution error:', err);
      res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลระบบได้ในขณะนี้' });
    }
  });

  // Sanitized Gmail Context Extraction (strictly after PDPA consent, Bearer token in header)
  app.post('/api/gmail/themes', async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'กรุณาเชื่อมต่อบัญชี Google ก่อนดึงบริบท Gmail' });
      return;
    }

    const { pdpaGmailConsent } = req.body as { pdpaGmailConsent?: boolean };
    if (!pdpaGmailConsent) {
      res.status(400).json({ error: 'ต้องได้รับความยินยอมตาม PDPA มาตรา 26 สำหรับบริบท Gmail ก่อน' });
      return;
    }

    try {
      const token = authHeader.slice('Bearer '.length).trim();
      const summary = await extractSanitizedGmailThemes(token);
      res.json(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูล Gmail ได้';
      res.status(502).json({ error: `ไม่สามารถอ่านบริบท Gmail: ${message}` });
    }
  });

  // Core Thai Psychological Reading Route (enforces PDPA, 1-free-trial, or paid token)
  app.post('/api/reading', async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }

    try {
      const body = req.body as {
        domain?: string;
        userPrompt?: string;
        freeAssociation?: string;
        drawnCardNames?: string[];
        birthSeasonOrContext?: string;
        gmailThemes?: string[];
        persona?: VoicePersona;
        timeframe?: string;
        activeLens?: string;
        compareOtherAngles?: boolean;
        personalContext?: string;
        pdpaCoreConsent?: boolean;
        readingToken?: string;
        userId?: string;
      };

      const slot: DomainSlot = isValidDomainSlot(body.domain)
        ? body.domain
        : resolveRequestTenant(req);

      if (!body.pdpaCoreConsent) {
        res.status(400).json({ error: 'กรุณายอมรับความยินยอมตาม PDPA มาตรา 26 ก่อนเริ่มการวิเคราะห์' });
        return;
      }

      const userPrompt = (body.userPrompt ?? '').trim();
      if (userPrompt.length < 10) {
        res.status(400).json({ error: 'กรุณาเล่าเรื่องราวหรือคำถามอย่างน้อย 10 ตัวอักษร เพื่อให้การวิเคราะห์แม่นยำ' });
        return;
      }

      if (slot === 'slot_tarot' && !(body.freeAssociation ?? '').trim()) {
        res.status(400).json({
          error: 'ศาสตร์ทาโรต์จำเป็นต้องบันทึกความรู้สึกแรก (Free Association) ก่อนเปิดไพ่',
        });
        return;
      }

      const cookies = parseCookies(req.headers.cookie);
      const ipHash = hashClientIp(getClientIp(req));
      const userId = body.userId?.trim() || undefined;

      let accessMode: 'trial' | 'paid' = 'trial';
      let includeVoice = true;

      if (body.readingToken) {
        const tokenCheck = await accessManager.consumePaidToken(body.readingToken);
        if (!tokenCheck.valid) {
          res.status(402).json({
            code: 'PAYMENT_REQUIRED',
            error: 'สิทธิ์การอ่านแบบชำระเงินถูกใช้งานแล้วหรือไม่ถูกต้อง กรุณาชำระเงินเพื่อรับสิทธิ์ใหม่',
          });
          return;
        }
        accessMode = 'paid';
        const tier = PRICING_TIERS.find((t) => t.id === tokenCheck.tierId);
        includeVoice = tier ? tier.includesVoice : true;
      } else {
        const trialAvailable = await accessManager.checkTrialAvailable({
          cookieTrialId: cookies.gp_trial,
          ipHash,
          userId,
        });
        if (!trialAvailable) {
          res.status(402).json({
            code: 'TRIAL_EXHAUSTED',
            error: 'คุณใช้สิทธิ์ทดลองอ่านฟรีครบ 1 ครั้งแล้ว สามารถเลือกแพ็กเกจ PromptPay เพื่อวิเคราะห์ต่อได้',
          });
          return;
        }
      }

      const persona: VoicePersona = body.persona === 'female_oracle' ? 'female_oracle' : 'male_sage';
      const validTimeframes: DigestTimeframe[] = ['daily', 'weekly', 'monthly', 'yearly'];
      const timeframe: DigestTimeframe = validTimeframes.includes(body.timeframe as DigestTimeframe)
        ? (body.timeframe as DigestTimeframe)
        : 'daily';
      const validLenses: PerspectiveLens[] = [
        'buddhist',
        'islamic',
        'chinese',
        'christian',
        'jewish',
        'thai_folk',
      ];
      const activeLens: PerspectiveLens = validLenses.includes(body.activeLens as PerspectiveLens)
        ? (body.activeLens as PerspectiveLens)
        : 'thai_folk';
      const compareOtherAngles = body.compareOtherAngles !== false;

      const reading = await generateThaiPsychologicalReading({
        domain: slot,
        userPrompt,
        freeAssociation: body.freeAssociation?.trim(),
        drawnCardNames: Array.isArray(body.drawnCardNames) ? body.drawnCardNames.slice(0, 5) : undefined,
        birthSeasonOrContext: body.birthSeasonOrContext?.trim(),
        gmailThemes: Array.isArray(body.gmailThemes) ? body.gmailThemes.slice(0, 5) : undefined,
        persona,
        includeVoice,
        timeframe,
        activeLens,
        compareOtherAngles,
        personalContext:
          typeof body.personalContext === 'string'
            ? body.personalContext.trim().slice(0, 600)
            : undefined,
      });

      if (accessMode === 'trial') {
        const trialId = cookies.gp_trial || crypto.randomUUID();
        await accessManager.consumeTrial({
          cookieTrialId: trialId,
          ipHash,
          userId,
          domain: slot,
        });
        setHardenedTrialCookie(res, trialId);
      }

      res.json({
        domain: slot,
        accessMode,
        trialAvailableAfter: false,
        reading,
      });
    } catch (err) {
      console.error('Reading generation error:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างบทวิเคราะห์';
      res.status(500).json({ error: message });
    }
  });

  // Free 5-Round Subconscious Funnel End-Card Synthesis Route (AI enrichment when configured)
  app.post('/api/funnel-reading', async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }

    try {
      const body = req.body as {
        domain?: string;
        primaryDimension?: string;
        secondaryDimension?: string;
        unmaskedTitleTh?: string;
        behavioralSummaryTh?: string;
        chosenLabelsTh?: string[];
        predictedCardNameTh?: string;
        predictedCardNameEn?: string;
        predictedCardLightTh?: string;
        predictedCardShadowTh?: string;
        persona?: VoicePersona;
        timeframe?: string;
        activeLens?: string;
        personalContext?: string;
      };

      const slot: DomainSlot = isValidDomainSlot(body.domain)
        ? body.domain
        : resolveRequestTenant(req);
      const persona: VoicePersona = body.persona === 'female_oracle' ? 'female_oracle' : 'male_sage';
      const validTimeframes: DigestTimeframe[] = ['daily', 'weekly', 'monthly', 'yearly'];
      const timeframe: DigestTimeframe = validTimeframes.includes(body.timeframe as DigestTimeframe)
        ? (body.timeframe as DigestTimeframe)
        : 'daily';
      const validLenses: PerspectiveLens[] = [
        'buddhist',
        'islamic',
        'chinese',
        'christian',
        'jewish',
        'thai_folk',
      ];
      const activeLens: PerspectiveLens = validLenses.includes(body.activeLens as PerspectiveLens)
        ? (body.activeLens as PerspectiveLens)
        : 'thai_folk';

      const payload = await generateSubconsciousFunnelReading({
        domain: slot,
        primaryDimension: String(body.primaryDimension || 'fortune_affirmation').slice(0, 60),
        secondaryDimension: String(body.secondaryDimension || 'luck_timing').slice(0, 60),
        unmaskedTitleTh: String(body.unmaskedTitleTh || '').slice(0, 140),
        behavioralSummaryTh: String(body.behavioralSummaryTh || '').slice(0, 200),
        chosenLabelsTh: Array.isArray(body.chosenLabelsTh)
          ? body.chosenLabelsTh.slice(0, 5).map((s) => String(s).slice(0, 100))
          : [],
        predictedCardNameTh: String(body.predictedCardNameTh || '').slice(0, 100),
        predictedCardNameEn: String(body.predictedCardNameEn || '').slice(0, 100),
        predictedCardLightTh: String(body.predictedCardLightTh || '').slice(0, 300),
        predictedCardShadowTh: String(body.predictedCardShadowTh || '').slice(0, 300),
        persona,
        timeframe,
        activeLens,
        personalContext:
          typeof body.personalContext === 'string'
            ? body.personalContext.trim().slice(0, 500)
            : undefined,
      });

      res.json(payload);
    } catch (err) {
      console.error('Funnel synthesis error:', err);
      const message = err instanceof Error ? err.message : 'ไม่สามารถสังเคราะห์คำทำนาย AI ได้';
      res.status(503).json({ error: message });
    }
  });

  // Create PromptPay QR checkout order
  app.post('/api/orders/create', async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }

    try {
      const body = req.body as { domain?: string; tierId?: string };
      const slot: DomainSlot = isValidDomainSlot(body.domain)
        ? body.domain
        : resolveRequestTenant(req);
      const tier = PRICING_TIERS.find((t) => t.id === body.tierId) ?? PRICING_TIERS[1];

      const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const promptpayTarget = process.env.PROMPTPAY_ID?.trim() || '0812345678';
      const promptpayPayload = buildPromptPayPayload(promptpayTarget, tier.priceThb);

      const order = await accessManager.createOrder({
        orderId,
        domain: slot,
        tierId: tier.id,
        amountThb: tier.priceThb,
        promptpayPayload,
      });

      res.json({
        orderId: order.orderId,
        domain: order.domain,
        tierId: order.tierId,
        amountThb: order.amountThb,
        promptpayPayload: order.promptpayPayload,
        status: order.status,
      });
    } catch (err) {
      console.error('Order create error:', err);
      res.status(500).json({ error: 'ไม่สามารถสร้างรายการชำระเงิน PromptPay ได้' });
    }
  });

  // Poll PromptPay order status
  app.get('/api/orders/:orderId/status', async (req, res) => {
    const order = await accessManager.getOrder(req.params.orderId);
    if (!order) {
      res.status(404).json({ error: 'ไม่พบคำสั่งซื้อนี้' });
      return;
    }
    res.json({
      orderId: order.orderId,
      status: order.status,
      amountThb: order.amountThb,
      tierId: order.tierId,
      readingToken: order.status === 'paid' ? order.readingToken : undefined,
      paidAt: order.paidAt,
    });
  });

  // Idempotent HMAC-signed PromptPay webhook
  app.post('/api/webhooks/promptpay', async (req, res) => {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const signature = req.headers['x-promptpay-signature'] as string | undefined;

    if (!verifyPromptPayWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: 'ลายเซ็น Webhook ไม่ถูกต้อง' });
      return;
    }

    const { orderId, eventId, status } = req.body as {
      orderId?: string;
      eventId?: string;
      status?: string;
    };

    if (!orderId || !eventId || status !== 'paid') {
      res.status(400).json({ error: 'ข้อมูล Webhook ไม่ครบถ้วน' });
      return;
    }

    const updated = await accessManager.markOrderPaidIdempotent({
      orderId,
      webhookEventId: eventId,
    });

    if (!updated) {
      res.status(404).json({ error: 'ไม่พบคำสั่งซื้อที่ต้องการปลดล็อก' });
      return;
    }

    res.json({ ok: true, orderId: updated.orderId, status: updated.status });
  });

  // Preview/Test-mode PromptPay verifier (invokes the exact HMAC webhook pipeline)
  app.post('/api/orders/:orderId/verify-test', async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }
    const order = await accessManager.getOrder(req.params.orderId);
    if (!order) {
      res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
      return;
    }

    const payload = JSON.stringify({
      orderId: order.orderId,
      eventId: `test-evt-${order.orderId}`,
      status: 'paid',
    });
    const sig = signPromptPayWebhook(payload);

    if (!verifyPromptPayWebhookSignature(payload, sig)) {
      res.status(500).json({ error: 'Test signature verification failed' });
      return;
    }

    const updated = await accessManager.markOrderPaidIdempotent({
      orderId: order.orderId,
      webhookEventId: `test-evt-${order.orderId}`,
    });

    res.json({
      ok: true,
      orderId: updated?.orderId,
      status: updated?.status,
      readingToken: updated?.readingToken,
    });
  });

  // Wise Wizard Frog Abbot — Multi-turn Thai Chat
  app.post('/api/abbot/chat', async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }
    try {
      const body = req.body as {
        message?: string;
        history?: AbbotHistoryMessage[];
        depthMode?: AbbotDepth;
        domainSlot?: string;
        activeLens?: string;
        includeVoice?: boolean;
        speakOnly?: boolean;
        persona?: VoicePersona;
        personalContext?: string;
      };
      const message = (body.message ?? '').trim();
      if (!message) {
        res.status(400).json({ error: 'กรุณาพิมพ์ข้อความถึงท่านเจ้าอาวาสก่อน' });
        return;
      }
      const persona: VoicePersona = body.persona === 'female_oracle' ? 'female_oracle' : 'male_sage';

      if (body.speakOnly) {
        const audioBase64Wav = await synthesizeThaiVoice(message.slice(0, 1200), persona);
        res.json({
          replyTh: message,
          quipTh: '',
          suggestedActionTh: '',
          modelUsed: 'gemini-3.8-flash-lite-tts',
          audioBase64Wav,
          voicePersonaUsed: audioBase64Wav ? persona : undefined,
        });
        return;
      }

      const domainSlot: DomainSlot = isValidDomainSlot(body.domainSlot)
        ? body.domainSlot
        : resolveRequestTenant(req);
      const validLenses: PerspectiveLens[] = [
        'buddhist',
        'islamic',
        'chinese',
        'christian',
        'jewish',
        'thai_folk',
      ];
      const activeLens: PerspectiveLens = validLenses.includes(body.activeLens as PerspectiveLens)
        ? (body.activeLens as PerspectiveLens)
        : 'thai_folk';

      const reply = await runAbbotChat({
        message: message.slice(0, 2000),
        history: Array.isArray(body.history) ? body.history.slice(-8) : [],
        depthMode: body.depthMode,
        domainSlot,
        activeLens,
        includeVoice: Boolean(body.includeVoice),
        persona,
        personalContext:
          typeof body.personalContext === 'string'
            ? body.personalContext.trim().slice(0, 600)
            : undefined,
      });
      res.json(reply);
    } catch (err) {
      console.error('Abbot chat error:', err);
      const msg = err instanceof Error ? err.message : 'ท่านเจ้าอาวาสกำลังพักตะเกียง ลองใหม่อีกครั้ง';
      res.status(500).json({ error: msg });
    }
  });

  // Wise Wizard Frog Abbot — Pre-recorded Mic Audio Transcription
  app.post('/api/abbot/transcribe', express.json({ limit: '12mb' }), async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }
    try {
      const { audioBase64, mimeType } = req.body as { audioBase64?: string; mimeType?: string };
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'ไม่พบไฟล์เสียงสำหรับถอดความ' });
        return;
      }
      const transcriptTh = await transcribeAbbotAudio(audioBase64, mimeType || 'audio/webm');
      if (!transcriptTh) {
        res.status(422).json({ error: 'ยังจับเสียงพูดได้ไม่ชัดเจน ลองพูดใกล้ไมโครโฟนอีกนิด' });
        return;
      }
      res.json({ transcriptTh });
    } catch (err) {
      console.error('Abbot transcription error:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถถอดความเสียงพูดได้';
      res.status(500).json({ error: msg });
    }
  });

  // Wise Wizard Frog Abbot — Procedural Omen Talisman Design Spec
  app.post('/api/abbot/talisman', async (req, res) => {
    if (!verifyOriginMatchesHost(req)) {
      res.status(403).json({ error: 'ไม่อนุญาตคำขอข้ามแหล่งที่มา' });
      return;
    }
    try {
      const body = req.body as {
        prompt?: string;
        domainSlot?: string;
        activeLens?: string;
      };
      const prompt = (body.prompt ?? '').trim();
      if (prompt.length < 3) {
        res.status(400).json({ error: 'กรุณาพิมพ์คำสำคัญหรือความฝันอย่างน้อย 3 ตัวอักษร' });
        return;
      }
      const domainSlot: DomainSlot = isValidDomainSlot(body.domainSlot)
        ? body.domainSlot
        : resolveRequestTenant(req);
      const validLenses: PerspectiveLens[] = [
        'buddhist',
        'islamic',
        'chinese',
        'christian',
        'jewish',
        'thai_folk',
      ];
      const activeLens: PerspectiveLens = validLenses.includes(body.activeLens as PerspectiveLens)
        ? (body.activeLens as PerspectiveLens)
        : 'thai_folk';

      const talisman = await generateOmenTalismanMeta({
        prompt: prompt.slice(0, 600),
        domainSlot,
        activeLens,
      });
      res.json(talisman);
    } catch (err) {
      console.error('Abbot talisman error:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้างยันต์นิมิตได้';
      res.status(500).json({ error: msg });
    }
  });

  // Vite dev middleware or static production assets
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      try {
        const htmlPath = path.resolve(process.cwd(), 'index.html');
        const template = await fs.promises.readFile(htmlPath, 'utf8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed);
      } catch (e) {
        next(e);
      }
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (reqUrl.pathname === '/ws/abbot-live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket, request: http.IncomingMessage) => {
    let liveSession: Awaited<ReturnType<ReturnType<typeof getAbbotGeminiClient>['live']['connect']>> | null =
      null;
    let isClosing = false;
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const personaParam = reqUrl.searchParams.get('persona');
    const isOracle = personaParam === 'female_oracle';
    const liveVoiceName = isOracle ? 'Zephyr' : 'Fenrir';
    const personaDirection = isOracle
      ? 'โทนเสียงบรรยายสด: สวมบท Oracle น้ำเสียงสูงกังวานใส ลุ่มลึก นุ่มนวลชวนสงบใจ'
      : 'โทนเสียงบรรยายสด: สวมบท Sage น้ำเสียงทุ้มต่ำ สุขุม เยือกเย็น และอบอุ่น';
    const profileParam = (reqUrl.searchParams.get('profile') || '').trim().slice(0, 500);
    const liveSystemInstruction = [
      ABBOT_LIVE_SYSTEM_INSTRUCTION,
      personaDirection,
      ...(profileParam
        ? [`พิกัดชะตาของผู้ถามในสายนี้ (ใช้อ้างอิงให้ตรงตัวและแม่นยำขึ้น): ${profileParam}`]
        : []),
    ].join('\n\n');

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      const ai = getAbbotGeminiClient();
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: liveVoiceName },
            },
          },
          systemInstruction: liveSystemInstruction,
        },
        callbacks: {
          onopen: () => {
            safeSend({ type: 'ready' });
          },
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              safeSend({ type: 'inputTranscript', text: content.inputTranscription.text });
            }
            if (content?.outputTranscription?.text) {
              safeSend({ type: 'outputTranscript', text: content.outputTranscription.text });
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                safeSend({ type: 'audio', data: part.inlineData.data });
              }
            }
            if (content?.interrupted) {
              safeSend({ type: 'interrupted' });
            }
            if (content?.turnComplete) {
              safeSend({ type: 'turnComplete' });
            }
          },
          onerror: (err) => {
            console.error('Abbot Live API error:', err);
            safeSend({ type: 'error', error: 'การเชื่อมต่อเสียงสดกับท่านเจ้าอาวาสขัดข้องชั่วคราว' });
          },
          onclose: () => {
            if (!isClosing) {
              safeSend({ type: 'closed' });
            }
          },
        },
      });
    } catch (err) {
      console.error('Abbot Live connect error:', err);
      safeSend({
        type: 'error',
        error: err instanceof Error ? err.message : 'ไม่สามารถเปิดห้องสนทนาเสียงสดได้',
      });
      clientWs.close();
      return;
    }

    clientWs.on('message', (raw) => {
      if (!liveSession) return;
      try {
        const msg = JSON.parse(raw.toString()) as { audio?: string; text?: string };
        if (msg.audio) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.text) {
          liveSession.sendRealtimeInput({ text: msg.text });
        }
      } catch {
        // ignore malformed frames
      }
    });

    clientWs.on('close', () => {
      isClosing = true;
      try {
        liveSession?.close();
      } catch {
        // ignore close errors
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`The Grey Pilgrim server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
