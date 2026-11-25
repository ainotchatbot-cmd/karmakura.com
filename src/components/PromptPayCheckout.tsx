import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Loader2, QrCode, X } from 'lucide-react';
import { PRICING_TIERS, type DomainSlot, type PricingTier } from '../config/site.config';

interface PromptPayCheckoutProps {
  open: boolean;
  domain: DomainSlot;
  onUnlockedToken: (readingToken: string, tier: PricingTier) => void;
  onClose: () => void;
}

interface CreatedOrderState {
  orderId: string;
  amountThb: number;
  promptpayPayload: string;
  qrDataUrl: string;
  tier: PricingTier;
}

export function PromptPayCheckout({
  open,
  domain,
  onUnlockedToken,
  onClose,
}: PromptPayCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<PricingTier>(PRICING_TIERS[1]);
  const [order, setOrder] = useState<CreatedOrderState | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating' | 'pending' | 'paid'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyingTest, setVerifyingTest] = useState(false);

  useEffect(() => {
    if (!open) {
      setOrder(null);
      setStatus('idle');
      setErrorMsg(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !order || status !== 'pending') return;
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order.orderId)}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string; readingToken?: string };
        if (data.status === 'paid' && data.readingToken) {
          setStatus('paid');
          window.clearInterval(interval);
          onUnlockedToken(data.readingToken, order.tier);
        }
      } catch {
        // retry on next tick
      }
    }, 2500);
    return () => window.clearInterval(interval);
  }, [open, order, status, onUnlockedToken]);

  if (!open) return null;

  const handleCreateOrder = async () => {
    setErrorMsg(null);
    setStatus('creating');
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, tierId: selectedTier.id }),
      });
      const data = (await res.json()) as {
        orderId?: string;
        amountThb?: number;
        promptpayPayload?: string;
        error?: string;
      };
      if (!res.ok || !data.orderId || !data.promptpayPayload) {
        throw new Error(data.error || 'สร้างรายการ PromptPay ไม่สำเร็จ');
      }
      const qrDataUrl = await QRCode.toDataURL(data.promptpayPayload, {
        width: 240,
        margin: 2,
        color: { dark: '#1C1F24', light: '#F4EFE6' },
      });
      setOrder({
        orderId: data.orderId,
        amountThb: data.amountThb ?? selectedTier.priceThb,
        promptpayPayload: data.promptpayPayload,
        qrDataUrl,
        tier: selectedTier,
      });
      setStatus('pending');
    } catch (err) {
      setStatus('idle');
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้าง QR');
    }
  };

  const handleTestVerify = async () => {
    if (!order) return;
    setVerifyingTest(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.orderId)}/verify-test`, {
        method: 'POST',
      });
      const data = (await res.json()) as { status?: string; readingToken?: string; error?: string };
      if (!res.ok || !data.readingToken) {
        throw new Error(data.error || 'ไม่สามารถยืนยันยอดทดลองได้');
      }
      setStatus('paid');
      onUnlockedToken(data.readingToken, order.tier);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยืนยัน');
    } finally {
      setVerifyingTest(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promptpay-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#D4A359]/35 bg-[#1C1F24] p-6 sm:p-8 text-[#F4EFE6] shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[#C0C5CE]/15 pb-4">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-[#D4A359] shrink-0" />
            <div>
              <h2 id="promptpay-title" className="font-display text-lg sm:text-xl font-semibold">
                ปลดล็อกบทวิเคราะห์เฉพาะบุคคลด้วย PromptPay QR
              </h2>
              <p className="text-xs text-[#C0C5CE] mt-0.5">
                ใช้สิทธิ์ทดลองอ่านฟรีครบ 1 ครั้งแล้ว เลือกแพ็กเกจเพื่อสร้างบทวิเคราะห์และเสียงบรรยายต่อได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างชำระเงิน"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[#C0C5CE] hover:text-[#F4EFE6] hover:bg-[#2A2E35]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!order ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRICING_TIERS.map((tier) => {
                const active = selectedTier.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={`text-left rounded-lg border p-4 transition-colors ${
                      active
                        ? 'border-[#D4A359] bg-[#2A2E35]'
                        : 'border-[#C0C5CE]/15 bg-[#2A2E35]/50 hover:border-[#C0C5CE]/35'
                    }`}
                  >
                    <div className="text-xl font-semibold text-[#D4A359] tabular-nums">
                      {tier.priceThb} บาท
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#F4EFE6]">{tier.titleTh}</div>
                    <p className="mt-1 text-xs text-[#C0C5CE] leading-relaxed">{tier.subtitleTh}</p>
                    <ul className="mt-3 space-y-1.5 text-xs text-[#C0C5CE]">
                      {tier.featuresTh.map((feat) => (
                        <li key={feat} className="flex items-start gap-1.5">
                          <span className="text-[#D4A359] shrink-0">·</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-sm text-[#C0C5CE] hover:text-[#F4EFE6] whitespace-nowrap shrink-0"
              >
                ปิดไว้ก่อน
              </button>
              <button
                type="button"
                disabled={status === 'creating'}
                onClick={handleCreateOrder}
                className="min-h-[44px] px-6 py-2 rounded-lg bg-[#D4A359] text-[#1C1F24] text-sm font-semibold lantern-glow disabled:opacity-50 whitespace-nowrap shrink-0 inline-flex items-center gap-2"
              >
                {status === 'creating' && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>สร้าง QR ชำระเงิน {selectedTier.priceThb} บาท</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="rounded-lg bg-[#F4EFE6] p-3 border border-[#D4A359]/40 shrink-0">
              <img
                src={order.qrDataUrl}
                alt={`PromptPay QR ${order.amountThb} บาท`}
                className="w-48 h-48 block"
              />
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div className="text-xs text-[#C0C5CE]">
                รหัสคำสั่งซื้อ <span className="font-mono text-[#F4EFE6]">{order.orderId}</span>
              </div>
              <div className="text-2xl font-semibold text-[#D4A359] tabular-nums">
                ยอดชำระ {order.amountThb.toFixed(2)} THB
              </div>
              <p className="text-xs text-[#C0C5CE] leading-relaxed">
                สแกน QR ด้วยแอปธนาคารใดก็ได้ในประเทศไทย ระบบกำลังตรวจสอบสถานะแบบอัตโนมัติและจะปลดล็อกสิทธิ์การวิเคราะห์ทันทีที่ยืนยันยอดเงิน
              </p>

              {status === 'paid' ? (
                <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ยืนยันการชำระเงินเรียบร้อยแล้ว กำลังสร้างบทวิเคราะห์...</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={verifyingTest}
                    onClick={handleTestVerify}
                    className="min-h-[44px] px-4 py-2 rounded-lg border border-[#D4A359]/60 bg-[#2A2E35] text-xs font-medium text-[#D4A359] hover:bg-[#D4A359] hover:text-[#1C1F24] transition-colors whitespace-nowrap shrink-0"
                  >
                    {verifyingTest ? 'กำลังจำลอง Webhook...' : 'ทดสอบยืนยันการชำระเงิน (Preview Test)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrder(null)}
                    className="min-h-[44px] px-3 py-2 text-xs text-[#C0C5CE] hover:text-[#F4EFE6] whitespace-nowrap shrink-0"
                  >
                    เปลี่ยนแพ็กเกจ
                  </button>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
