import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FULL_TAROT_DECK } from '../src/data/majorArcanaLore.ts';
import { redactSensitiveText } from '../src/lib/gmail-context.ts';
import {
  buildPromptPayPayload,
  signPromptPayWebhook,
  verifyPromptPayWebhookSignature,
} from '../src/lib/promptpay.ts';
import { FileStoreDriver, hashClientIp, ReadingAccessManager } from '../src/lib/reading-access.ts';
import { resolveTenantSlot } from '../src/lib/tenant.ts';

async function runSmokeTests() {
  console.log('1. Testing 78-card Tarot Lore completeness...');
  assert.equal(FULL_TAROT_DECK.length, 78, 'Deck must contain all 78 cards');

  console.log('2. Testing multi-domain Host resolution...');
  assert.equal(resolveTenantSlot({ host: 'duangtok.example.com' }), 'slot_horoscope');
  assert.equal(resolveTenantSlot({ host: 'greypilgrim.example.com' }), 'slot_tarot');
  assert.equal(resolveTenantSlot({ host: 'fanrai.example.com' }), 'slot_dream');
  assert.equal(resolveTenantSlot({ host: 'localhost:3000' }), 'slot_horoscope');

  console.log('3. Testing Gmail PII & number redaction...');
  const dirty = 'แจ้งเตือน OTP 482910 จาก support@bank.co.th โทร 081-234-5678 ยอด ฿12,500 https://evil.test/login';
  const cleaned = redactSensitiveText(dirty);
  assert.ok(!cleaned.includes('482910'), 'OTP must be redacted');
  assert.ok(!cleaned.includes('support@bank.co.th'), 'Email must be redacted');
  assert.ok(!cleaned.includes('081-234-5678'), 'Phone must be redacted');

  console.log('4. Testing 1-free-trial & idempotent PromptPay webhook unlock...');
  const tmpLedger = path.join(os.tmpdir(), `pilgrim-smoke-${Date.now()}.json`);
  const manager = new ReadingAccessManager(new FileStoreDriver(tmpLedger));
  const ipHash = hashClientIp('203.0.113.42');

  assert.equal(await manager.checkTrialAvailable({ cookieTrialId: 'c1', ipHash }), true);
  await manager.consumeTrial({ cookieTrialId: 'c1', ipHash, domain: 'slot_tarot' });
  assert.equal(await manager.checkTrialAvailable({ cookieTrialId: 'c2', ipHash }), false);

  const qrPayload = buildPromptPayPayload('0812345678', 129);
  assert.ok(qrPayload.startsWith('000201010212'), 'Valid EMVCo PromptPay header');

  await manager.createOrder({
    orderId: 'ORD-SMOKE-1',
    domain: 'slot_tarot',
    tierId: 'tier_deep',
    amountThb: 129,
    promptpayPayload: qrPayload,
  });

  const body = JSON.stringify({ orderId: 'ORD-SMOKE-1', eventId: 'evt-1', status: 'paid' });
  const sig = signPromptPayWebhook(body);
  assert.equal(verifyPromptPayWebhookSignature(body, sig), true);

  const paid = await manager.markOrderPaidIdempotent({
    orderId: 'ORD-SMOKE-1',
    webhookEventId: 'evt-1',
  });
  assert.equal(paid?.status, 'paid');
  assert.ok(paid?.readingToken);

  const firstUse = await manager.consumePaidToken(paid!.readingToken!);
  const secondUse = await manager.consumePaidToken(paid!.readingToken!);
  assert.equal(firstUse.valid, true);
  assert.equal(secondUse.valid, false, 'Single-use token must not replay');

  fs.rmSync(tmpLedger, { force: true });
  console.log('ALL E2E SMOKE TESTS PASSED');
}

runSmokeTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
