import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Music, Pause, Play, Sparkles, Upload, Volume2 } from 'lucide-react';
import type { DomainSlot, PerspectiveLens } from '../config/site.config';
import type { OmenTalismanMeta } from '../lib/abbot-ai';
import { TempleAmbientSoundscape } from '../lib/templeAudio';

interface AbbotOmenStudioProps {
  domainSlot: DomainSlot;
  activeLens: PerspectiveLens;
}

type TalismanAspect = '1:1' | '16:9' | '9:16';

export function AbbotOmenStudio({ domainSlot, activeLens }: AbbotOmenStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<TalismanAspect>('1:1');
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [talisman, setTalisman] = useState<OmenTalismanMeta>({
    titleTh: 'นิมิตตะเกียงสระบัว',
    latinMotto: 'SPECULUM NOCTIS',
    abbotNoteTh: 'อ๊บ... โยมจะเสกภาพจากความฝันหรือเลือกเปิดเสียงฝนสระบัวก็เลือกเอาตามสบาย',
    symbolMotif: 'lotus',
    primaryHex: '#D4A359',
    secondaryHex: '#4A5D4E',
    ringCount: 5,
    pulseTempoSec: 5,
  });

  const [isAnimating, setIsAnimating] = useState(true);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.25);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadedImgRef = useRef<HTMLImageElement | null>(null);
  const soundscapeRef = useRef<TempleAmbientSoundscape | null>(null);

  useEffect(() => {
    return () => {
      soundscapeRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!uploadedPreviewUrl) {
      uploadedImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      uploadedImgRef.current = img;
    };
    img.src = uploadedPreviewUrl;
  }, [uploadedPreviewUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dims =
      aspect === '16:9'
        ? { w: 720, h: 405 }
        : aspect === '9:16'
          ? { w: 405, h: 720 }
          : { w: 540, h: 540 };
    canvas.width = dims.w;
    canvas.height = dims.h;

    let rafId = 0;
    const startMs = performance.now();

    const drawFrame = (now: number) => {
      const elapsed = isAnimating ? (now - startMs) / 1000 : 1.2;
      const w = dims.w;
      const h = dims.h;
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.34;

      // Slate nocturnal backdrop
      const grad = ctx.createRadialGradient(cx, cy, baseR * 0.15, cx, cy, Math.max(w, h) * 0.72);
      grad.addColorStop(0, '#2A2E35');
      grad.addColorStop(1, '#14171B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Optional uploaded image veil
      if (uploadedImgRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.24;
        const img = uploadedImgRef.current;
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.restore();
      }

      // Outer gold hairline frame
      ctx.strokeStyle = `${talisman.primaryHex}66`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(18, 18, w - 36, h - 36);

      // Concentric breathing sacred geometry rings
      const pulse = Math.sin((elapsed / talisman.pulseTempoSec) * Math.PI * 2) * 0.04;
      for (let i = 0; i < talisman.ringCount; i += 1) {
        const radius = baseR * (0.42 + i * 0.14 + pulse);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i % 2 === 0 ? 1 : -1) * elapsed * 0.09 * (i + 1) * 0.35);
        ctx.strokeStyle = i % 2 === 0 ? `${talisman.primaryHex}99` : `${talisman.secondaryHex}CC`;
        ctx.lineWidth = i === talisman.ringCount - 1 ? 2 : 1.2;
        if (i % 2 === 1) ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Orbital nodes
        const nodes = 6 + i * 2;
        for (let n = 0; n < nodes; n += 1) {
          const ang = (n / nodes) * Math.PI * 2;
          const nx = Math.cos(ang) * radius;
          const ny = Math.sin(ang) * radius;
          ctx.fillStyle = talisman.primaryHex;
          ctx.beginPath();
          ctx.arc(nx, ny, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Center sigil motif
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = talisman.primaryHex;
      ctx.lineWidth = 2.2;
      if (talisman.symbolMotif === 'lotus') {
        for (let p = 0; p < 8; p += 1) {
          ctx.save();
          ctx.rotate((p / 8) * Math.PI * 2 + elapsed * 0.08);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(22, -46, 0, -82);
          ctx.quadraticCurveTo(-22, -46, 0, 0);
          ctx.stroke();
          ctx.restore();
        }
      } else if (talisman.symbolMotif === 'crescent') {
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 0.34, 0.35, Math.PI * 1.65);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(14, -8, baseR * 0.25, 0.4, Math.PI * 1.6);
        ctx.stroke();
      } else if (talisman.symbolMotif === 'hourglass') {
        ctx.beginPath();
        ctx.moveTo(-42, -56);
        ctx.lineTo(42, -56);
        ctx.lineTo(-42, 56);
        ctx.lineTo(42, 56);
        ctx.closePath();
        ctx.stroke();
      } else {
        // Lantern / Compass 8-pointed star
        for (let k = 0; k < 8; k += 1) {
          const ang = (k / 8) * Math.PI * 2 + elapsed * 0.06;
          const len = k % 2 === 0 ? baseR * 0.38 : baseR * 0.22;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Titles on canvas
      ctx.textAlign = 'center';
      ctx.fillStyle = '#D4A359';
      ctx.font = '600 13px "Cinzel", Georgia, serif';
      ctx.fillText(talisman.latinMotto.toUpperCase(), cx, 48);

      ctx.fillStyle = '#F4EFE6';
      ctx.font = '600 20px "Noto Serif Thai", "Anuphan", sans-serif';
      ctx.fillText(talisman.titleTh, cx, h - 38);

      if (isAnimating) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [aspect, isAnimating, talisman]);

  const handleGenerateTalisman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 3) {
      setErrorMsg('กรุณาพิมพ์นิมิตหรือคำสำคัญอย่างน้อย 3 ตัวอักษร');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/abbot/talisman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          domainSlot,
          activeLens,
        }),
      });
      const data = (await res.json()) as OmenTalismanMeta & { error?: string };
      if (!res.ok) throw new Error(data.error || 'สร้างยันต์นิมิตไม่สำเร็จ');
      setTalisman(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างยันต์นิมิต');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `abbot-omen-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleToggleSoundscape = () => {
    if (!soundscapeRef.current) {
      soundscapeRef.current = new TempleAmbientSoundscape();
    }
    if (soundPlaying) {
      soundscapeRef.current.stop();
      setSoundPlaying(false);
    } else {
      soundscapeRef.current.start(soundVolume);
      setSoundPlaying(true);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-6 space-y-4">
        <form onSubmit={handleGenerateTalisman} className="space-y-3">
          <label htmlFor="omen-prompt" className="block text-xs font-medium text-[#D4A359]">
            เสกยันต์นิมิตประจำใจ (Procedural Canvas + คำทำนายเชิงเปรียบเทียบจากเจ้าอาวาส)
          </label>
          <textarea
            id="omen-prompt"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="เช่น ฝันว่าถือตะเกียงเดินข้ามสะพานไม้กลางสายฝน หรือ รู้สึกติดอยู่หน้าทางแยก..."
            className="w-full rounded-lg border border-[#C0C5CE]/20 bg-[#1C1F24] p-3 text-sm text-[#F4EFE6] placeholder:text-[#C0C5CE]/50 focus:border-[#D4A359] focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#1C1F24] border border-[#C0C5CE]/15">
              {(['1:1', '16:9', '9:16'] as TalismanAspect[]).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspect(ratio)}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    aspect === ratio ? 'bg-[#D4A359] text-[#1C1F24]' : 'text-[#C0C5CE]'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            <label className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#C0C5CE]/25 bg-[#1C1F24] text-xs text-[#F4EFE6] hover:border-[#D4A359]/60 cursor-pointer inline-flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#D4A359]" />
              <span>{uploadedPreviewUrl ? 'เปลี่ยนภาพซ้อน' : 'แนบภาพอ้างอิง'}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#D4A359] text-[#1C1F24] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>เสกยันต์นิมิต</span>
            </button>
          </div>

          {errorMsg && <p className="text-xs text-rose-300">{errorMsg}</p>}
        </form>

        <div className="rounded-lg border border-[#C0C5CE]/15 bg-[#1C1F24] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#F4EFE6] flex items-center gap-1.5">
                <Music className="w-4 h-4 text-[#D4A359]" />
                <span>เสียงภาวนาสระบัว & ขันสำริด (Web Audio สังเคราะห์สด)</span>
              </p>
              <p className="text-[11px] text-[#C0C5CE] mt-0.5">
                เสียงฝนค่ำคืน คลื่นความถี่ต่ำ และเสียงกบในสระ (เล่นเมื่อคุณกดเท่านั้น)
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSoundscape}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[#D4A359]/50 bg-[#2A2E35] text-xs text-[#F4EFE6] inline-flex items-center gap-1.5 shrink-0"
            >
              {soundPlaying ? <Pause className="w-3.5 h-3.5 text-[#D4A359]" /> : <Play className="w-3.5 h-3.5 text-[#D4A359]" />}
              <span>{soundPlaying ? 'ปิดเสียง' : 'เปิดเสียงภาวนา'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#C0C5CE]">
            <Volume2 className="w-4 h-4 text-[#D4A359]" />
            <input
              type="range"
              min={0.05}
              max={0.55}
              step={0.05}
              value={soundVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSoundVolume(v);
                soundscapeRef.current?.setVolume(v);
              }}
              aria-label="ระดับเสียงสระบัว"
              className="w-full accent-[#D4A359]"
            />
          </div>
        </div>

        <p className="text-[11px] text-[#C0C5CE]/75 leading-relaxed">
          หมายเหตุ: ทำงานด้วยโหมดภาพเชิงเรขาคณิตและเสียงสังเคราะห์ Web Audio แบบฟรี (ไม่ใช้โมเดล Imagen/Veo/Lyria แบบเสียค่าใช้จ่าย)
        </p>
      </div>

      <div className="lg:col-span-6 space-y-3">
        <div className="rounded-xl border border-[#D4A359]/30 bg-[#14171B] p-3 flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[320px] rounded-lg object-contain"
          />
          <p className="mt-3 text-xs text-[#F4EFE6] text-center italic">“{talisman.abbotNoteTh}”</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAnimating((v) => !v)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#C0C5CE]/25 text-xs text-[#F4EFE6] inline-flex items-center gap-1.5"
            >
              {isAnimating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAnimating ? 'หยุดการหมุน' : 'เล่นการหมุน'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#D4A359] text-[#1C1F24] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>บันทึกภาพ PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
