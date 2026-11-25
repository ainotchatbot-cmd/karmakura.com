/**
 * Server-side Gmail Context Extractor & PII Redactor.
 * Accepts a short-lived Google OAuth Bearer token passed from client memory
 * ONLY after explicit PDPA Section 26 consent, redacts sensitive numbers/emails/PII,
 * and returns only high-level non-sensitive life/stress themes.
 */

export interface SanitizedGmailSummary {
  messageCountAnalyzed: number;
  themesTh: string[];
  redactedPreviewSnippets: string[];
}

interface GmailMessageListResponse {
  messages?: Array<{ id: string }>;
}

interface GmailMessageDetail {
  id: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
}

export function redactSensitiveText(input: string): string {
  return input
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[อีเมล]')
    // URLs
    .replace(/https?:\/\/[^\s]+/gi, '[ลิงก์]')
    // OTPs, Thai IDs, Phone Numbers, Account Numbers (4+ digits or dashed numeric sequences)
    .replace(/\b\d[\d\s-]{3,}\d\b/g, '[ตัวเลขปกปิด]')
    .replace(/\b\d{4,}\b/g, '[รหัสปกปิด]')
    // Currency amounts
    .replace(/(?:THB|USD|฿|\$)\s?[\d,.]+/gi, '[ยอดเงินปกปิด]')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyHighLevelThemes(sanitizedTexts: string[]): string[] {
  const joined = sanitizedTexts.join(' ').toLowerCase();
  const themes: string[] = [];

  if (/(deadline|project|meeting|interview|offer|งาน|ประชุม|สัมภาษณ์|โปรเจกต์|ส่งงาน)/i.test(joined)) {
    themes.push('ภาระงาน กำหนดส่งงาน หรือการเปลี่ยนผ่านด้านอาชีพ');
  }
  if (/(invoice|billing|payment|statement|tax|บิล|ชำระเงิน|ภาษี|ค่าใช้จ่าย)/i.test(joined)) {
    themes.push('การจัดการธุรกรรมและการวางแผนภาระค่าใช้จ่าย');
  }
  if (/(flight|hotel|travel|booking|trip|เดินทาง|เที่ยวบิน|โรงแรม|จอง)/i.test(joined)) {
    themes.push('การเดินทางหรือการปรับเปลี่ยนตารางชีวิต');
  }
  if (/(clinic|doctor|appointment|health|หมอ|นัดหมาย|สุขภาพ|พักผ่อน)/i.test(joined)) {
    themes.push('การดูแลสุขภาพและการนัดหมายส่วนตัว');
  }
  if (/(family|friend|invitation|event|ครอบครัว|ชวน|กิจกรรม)/i.test(joined)) {
    themes.push('ความสัมพันธ์และการสื่อสารกับคนรอบตัว');
  }

  if (themes.length === 0) {
    themes.push('จังหวะกิจวัตรประจำวันและการจัดการข้อมูลข่าวสารทั่วไป');
  }
  return themes.slice(0, 4);
}

export async function extractSanitizedGmailThemes(accessToken: string): Promise<SanitizedGmailSummary> {
  if (!accessToken || accessToken.length < 10) {
    throw new Error('Missing or invalid Google access token.');
  }

  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6&q=newer_than:14d',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail API error (${listRes.status}): ${errText.slice(0, 140)}`);
  }

  const listData = (await listRes.json()) as GmailMessageListResponse;
  const messageIds = (listData.messages ?? []).slice(0, 6).map((m) => m.id);

  if (messageIds.length === 0) {
    return {
      messageCountAnalyzed: 0,
      themesTh: ['ไม่พบจดหมายล่าสุดในช่วง 14 วัน'],
      redactedPreviewSnippets: [],
    };
  }

  const details = await Promise.all(
    messageIds.map(async (id) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!msgRes.ok) return null;
      return (await msgRes.json()) as GmailMessageDetail;
    })
  );

  const sanitizedSnippets: string[] = [];
  for (const item of details) {
    if (!item) continue;
    const subject =
      item.payload?.headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '';
    const combined = `${subject} — ${item.snippet ?? ''}`.slice(0, 180);
    const cleaned = redactSensitiveText(combined);
    if (cleaned) {
      sanitizedSnippets.push(cleaned);
    }
  }

  return {
    messageCountAnalyzed: sanitizedSnippets.length,
    themesTh: classifyHighLevelThemes(sanitizedSnippets),
    redactedPreviewSnippets: sanitizedSnippets.slice(0, 3),
  };
}
