import React, { useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { THAI_ETHICS_DISCLAIMER } from '../config/site.config';

interface PdpaConsentModalProps {
  open: boolean;
  initialCoreConsent: boolean;
  initialGmailConsent: boolean;
  googleEmail: string | null;
  isSigningInGoogle: boolean;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onConfirm: (coreConsent: boolean, gmailConsent: boolean) => void;
  onClose: () => void;
}

export function PdpaConsentModal({
  open,
  initialCoreConsent,
  initialGmailConsent,
  googleEmail,
  isSigningInGoogle,
  onGoogleSignIn,
  onGoogleSignOut,
  onConfirm,
  onClose,
}: PdpaConsentModalProps) {
  const [coreConsent, setCoreConsent] = useState(initialCoreConsent);
  const [gmailConsent, setGmailConsent] = useState(initialGmailConsent);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdpa-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-[#D4A359]/35 bg-[#1C1F24] p-6 sm:p-8 text-[#F4EFE6] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[#C0C5CE]/15 pb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#D4A359] shrink-0" />
            <div>
              <h2 id="pdpa-modal-title" className="font-display text-lg sm:text-xl font-semibold text-[#F4EFE6]">
                ความยินยอมตาม PDPA มาตรา 26
              </h2>
              <p className="text-xs text-[#C0C5CE] mt-0.5">
                แยกความยินยอมระหว่างการวิเคราะห์หลักกับการเชื่อมบริบท Gmail อย่างชัดเจน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[#C0C5CE] hover:text-[#F4EFE6] hover:bg-[#2A2E35]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm leading-relaxed">
          <div className="rounded-lg border border-[#C0C5CE]/15 bg-[#2A2E35] p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={coreConsent}
                onChange={(e) => setCoreConsent(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#D4A359] shrink-0"
              />
              <div>
                <span className="font-semibold text-[#F4EFE6] block">
                  1. ความยินยอมหลัก: ประมวลผลข้อความสะท้อนจิตวิทยาและความฝัน (จำเป็น)
                </span>
                <span className="text-xs text-[#C0C5CE] block mt-1">
                  อนุญาตให้ระบบประมวลผลเรื่องราว ความรู้สึกเชื่อมโยงเสรี หรือความฝันที่คุณกรอกเพื่อสร้างบทสะท้อนตนเองและเสียงบรรยายภาษาไทย โดยไม่นำไปเผยแพร่สาธารณะ
                </span>
              </div>
            </label>
          </div>

          <div className="rounded-lg border border-[#C0C5CE]/15 bg-[#2A2E35] p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gmailConsent}
                onChange={(e) => setGmailConsent(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#D4A359] shrink-0"
              />
              <div>
                <span className="font-semibold text-[#F4EFE6] block">
                  2. ความยินยอมเสริม: อ่านบริบทหัวข้อ Gmail ล่าสุด 14 วันแบบอ่านอย่างเดียว (ไม่บังคับ)
                </span>
                <span className="text-xs text-[#C0C5CE] block mt-1">
                  เซิร์ฟเวอร์จะคัดกรองลบอีเมล เบอร์โทร รหัส OTP เลขบัญชี และยอดเงินออกทั้งหมดก่อนส่งเฉพาะธีมภาพรวมชีวิต (เช่น ภาระงาน การเดินทาง) เข้าสู่บทวิเคราะห์
                </span>
              </div>
            </label>

            {gmailConsent && (
              <div className="pt-2 border-t border-[#C0C5CE]/10 flex flex-wrap items-center justify-between gap-3">
                {googleEmail ? (
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="text-xs text-[#D4A359] flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      เชื่อมต่อแล้ว: {googleEmail}
                    </span>
                    <button
                      type="button"
                      onClick={onGoogleSignOut}
                      className="px-3 py-1.5 text-xs rounded-md border border-[#C0C5CE]/30 text-[#C0C5CE] hover:text-[#F4EFE6] whitespace-nowrap shrink-0"
                    >
                      ยกเลิกการเชื่อมต่อ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSigningInGoogle}
                    onClick={onGoogleSignIn}
                    className="inline-flex items-center gap-3 rounded-md bg-white px-4 py-2 text-sm font-medium text-[#1C1F24] hover:bg-[#F4EFE6] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>{isSigningInGoogle ? 'กำลังเปิดหน้าต่าง...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-[#C0C5CE] leading-relaxed">{THAI_ETHICS_DISCLAIMER}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#C0C5CE]/15 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm text-[#C0C5CE] hover:text-[#F4EFE6] whitespace-nowrap shrink-0"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!coreConsent}
            onClick={() => onConfirm(coreConsent, gmailConsent)}
            className="min-h-[44px] px-6 py-2 rounded-lg bg-[#D4A359] text-[#1C1F24] text-sm font-semibold lantern-glow disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            ยืนยันความยินยอมและดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>
  );
}
