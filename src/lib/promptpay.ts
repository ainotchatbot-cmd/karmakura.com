import crypto from 'node:crypto';

function formatTlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

function crc16CcittFalse(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizePromptPayTarget(target: string): { tag: string; value: string } {
  const digits = target.replace(/[^0-9]/g, '');
  if (digits.length === 13) {
    return { tag: '02', value: digits };
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return { tag: '01', value: `0066${digits.slice(1)}` };
  }
  return { tag: '01', value: `0066${digits.slice(-9)}` };
}

/**
 * Generates an EMVCo compliant Thai PromptPay QR payload string with CRC-16 checksum.
 */
export function buildPromptPayPayload(target: string, amountThb: number): string {
  const { tag, value } = normalizePromptPayTarget(target);
  const merchantAccountInfo = formatTlv(
    '29',
    formatTlv('00', 'A000000677010111') + formatTlv(tag, value)
  );
  const amountStr = amountThb.toFixed(2);
  const body =
    formatTlv('00', '01') +
    formatTlv('01', '12') + // dynamic QR
    merchantAccountInfo +
    formatTlv('53', '764') + // THB
    formatTlv('54', amountStr) +
    formatTlv('58', 'TH') +
    '6304';

  return body + crc16CcittFalse(body);
}

const EPHEMERAL_WEBHOOK_SECRET = crypto.randomBytes(32).toString('hex');

export function getPromptPayWebhookSecret(): string {
  return process.env.PROMPTPAY_WEBHOOK_SECRET?.trim() || EPHEMERAL_WEBHOOK_SECRET;
}

export function signPromptPayWebhook(rawBody: string): string {
  return crypto
    .createHmac('sha256', getPromptPayWebhookSecret())
    .update(rawBody)
    .digest('hex');
}

export function verifyPromptPayWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const expected = signPromptPayWebhook(rawBody);
  const gotBuf = Buffer.from(signatureHeader.trim(), 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (gotBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(gotBuf, expBuf);
}
