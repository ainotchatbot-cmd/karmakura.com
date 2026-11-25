import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import type { DomainSlot, PerspectiveLens } from '../config/site.config';
import type { AbbotChatResponse } from '../lib/abbot-ai';
import type { VoicePersona } from '../lib/gemini-thai-voice';
import {
  appendAbbotMessage,
  createAbbotThread,
  subscribeThreadMessages,
  type AbbotDepthMode,
} from '../lib/firestoreStore';
import { base64Pcm16ToAudioBuffer, float32ToBase64Pcm16 } from '../lib/templeAudio';
import { AbbotOmenStudio } from './AbbotOmenStudio';
import {
  FrogAbbotStage,
  resolveAbbotAnimState,
  type AbbotAnimState,
  type AbbotMood,
} from './FrogAbbotStage';

interface ChatTurn {
  id: string;
  role: 'user' | 'abbot';
  text: string;
  quipTh?: string;
  suggestedActionTh?: string;
  modality: 'text' | 'voice' | 'transcript';
  audioBase64Wav?: string;
  voicePersonaUsed?: VoicePersona;
}

interface SanctuaryLeftStageProps {
  domainSlot: DomainSlot;
  activeLens: PerspectiveLens;
  voicePersona: VoicePersona;
  onVoicePersonaChange: (persona: VoicePersona) => void;
  externalMood: AbbotMood | null;
  externalSpeechAmp?: number;
  gazeBiasX: number;
  bannerQuoteTh: string;
  onBannerQuoteChange: (quote: string) => void;
  googleUser: User | null;
  personalContext?: string;
  externalAskAbbot?: { prompt: string; nonce: number } | null;
}

const POKE_QUIPS_TH = [
  'อ๊บ... จิ้มทำไมเล่าโยม นี่เจ้าอาวาสนะ ไม่ใช่กบยางบีบแล้วร้อง',
  'ใจเย็นโยม แค่ตะเกียงแกว่งเฉยๆ มองที่ภาพตรงหน้าก่อนเถิด',
  'อ๊บ! แตะตัวแล้วมีสติขึ้นไหม หรือแค่อยากลองใจอาตมา?',
  'โยม... ลองฟังใจตัวเองดูก่อนว่าภาพไหนที่ดึงสายตาไว้ตั้งแต่แรก',
];

export function SanctuaryLeftStage({
  domainSlot,
  activeLens,
  voicePersona,
  onVoicePersonaChange,
  externalMood,
  externalSpeechAmp = 0,
  gazeBiasX,
  bannerQuoteTh,
  onBannerQuoteChange,
  googleUser,
  personalContext,
  externalAskAbbot,
}: SanctuaryLeftStageProps) {
  const [overlayOpen, setOverlayOpen] = useState<'none' | 'chat' | 'omen'>('none');
  const [localMood, setLocalMood] = useState<AbbotMood>('idle');
  const [localSpeechAmp, setLocalSpeechAmp] = useState(0);

  const [depthMode, setDepthMode] = useState<AbbotDepthMode>('balanced');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [speakBannerLoading, setSpeakBannerLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'abbot',
      modality: 'text',
      quipTh: 'ตะเกียงสระบัวจุดรอไว้แล้วโยม',
      text: 'เลือกภาพตามสัญชาตญาณทางขวาได้เลย หรือจะพิมพ์/พูดคุยสดกับอาตมาตรงนี้ก็ได้ — ไม่ขายความกลัว แค่ช่วยส่องกระจกให้เห็นใจตัวเองชัดขึ้น',
      suggestedActionTh: 'ปล่อยใจสบายๆ แล้วเลือกภาพที่ดึงสายตาก่อนโดยไม่ต้องคิดซ้ำ',
    },
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);

  // CSS Animation Controller state: manages smooth transitions across idle / listening / talking / thinking
  const [animState, setAnimState] = useState<AbbotAnimState>('idle');
  const [isStateTransitioning, setIsStateTransitioning] = useState(false);
  const [pokeTalkBurst, setPokeTalkBurst] = useState(false);
  const animReleaseTimerRef = useRef<number | null>(null);
  const animTransitionTimerRef = useRef<number | null>(null);
  const pokeBurstTimerRef = useRef<number | null>(null);

  // Live voice refs
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveConnecting, setLiveConnecting] = useState(false);
  const [liveStatusTh, setLiveStatusTh] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveConnectedRef = useRef(false);

  // Mic clip transcribe
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [transcribingClip, setTranscribingClip] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!googleUser) {
      setActiveThreadId(null);
      return;
    }
    if (!activeThreadId) return;
    const unsubMsgs = subscribeThreadMessages(googleUser.uid, activeThreadId, (rows) => {
      if (rows.length > 0) {
        setMessages(
          rows.map((r) => ({
            id: r.id,
            role: r.role,
            text: r.text,
            modality: r.modality,
          }))
        );
      }
    });
    return () => unsubMsgs();
  }, [googleUser, activeThreadId]);

  const stopLiveVoice = () => {
    liveConnectedRef.current = false;
    setLiveConnected(false);
    setLiveConnecting(false);
    setLocalMood('idle');
    setLocalSpeechAmp(0);

    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    activeSourcesRef.current.clear();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close();
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      void outputCtxRef.current.close();
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    nextStartTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      stopLiveVoice();
      replyAudioRef.current?.pause();
      if (animReleaseTimerRef.current !== null) window.clearTimeout(animReleaseTimerRef.current);
      if (animTransitionTimerRef.current !== null) window.clearTimeout(animTransitionTimerRef.current);
      if (pokeBurstTimerRef.current !== null) window.clearTimeout(pokeBurstTimerRef.current);
    };
  }, []);

  const persistTurnIfSignedIn = async (
    role: 'user' | 'abbot',
    text: string,
    modality: 'text' | 'voice' | 'transcript'
  ) => {
    if (!googleUser) return;
    let threadId = activeThreadIdRef.current;
    if (!threadId) {
      threadId = await createAbbotThread({
        uid: googleUser.uid,
        title: text.slice(0, 60),
        domainSlot,
        depthMode,
      });
      activeThreadIdRef.current = threadId;
      setActiveThreadId(threadId);
    }
    await appendAbbotMessage({
      uid: googleUser.uid,
      threadId,
      role,
      modality,
      text,
      lens: activeLens,
    });
  };

  const playAbbotWav = (base64Wav: string) => {
    replyAudioRef.current?.pause();
    const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
    replyAudioRef.current = audio;
    setLocalMood('speaking');
    setLocalSpeechAmp(0.65);
    audio.onended = () => {
      setLocalMood('idle');
      setLocalSpeechAmp(0);
    };
    audio.onerror = () => {
      setLocalMood('idle');
      setLocalSpeechAmp(0);
    };
    audio.play().catch(() => {
      setLocalMood('idle');
      setLocalSpeechAmp(0);
    });
  };

  const handleToggleLiveVoice = async () => {
    if (liveConnected || liveConnecting) {
      stopLiveVoice();
      setLiveStatusTh('วางสายสนทนาสดแล้ว');
      return;
    }

    setChatError(null);
    setLiveConnecting(true);
    setLiveStatusTh('กำลังเปิดสายตรงกุฏิเจ้าอาวาส...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const profileQuery = personalContext?.trim()
        ? `&profile=${encodeURIComponent(personalContext.trim().slice(0, 480))}`
        : '';
      const ws = new WebSocket(
        `${proto}//${window.location.host}/ws/abbot-live?persona=${encodeURIComponent(voicePersona)}${profileQuery}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (ev) => {
          if (!liveConnectedRef.current || ws.readyState !== WebSocket.OPEN) return;
          const samples = ev.inputBuffer.getChannelData(0);
          const base64 = float32ToBase64Pcm16(samples);
          ws.send(JSON.stringify({ audio: base64 }));
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as {
          type?: string;
          data?: string;
          text?: string;
          error?: string;
        };

        if (msg.type === 'ready') {
          liveConnectedRef.current = true;
          setLiveConnecting(false);
          setLiveConnected(true);
          setLocalMood('listening');
          setLiveStatusTh('สายตรงเปิดแล้ว — พูดใส่ไมค์ได้เลยโยม');
        } else if (msg.type === 'inputTranscript' && msg.text) {
          setLastTranscript(msg.text);
        } else if (msg.type === 'outputTranscript' && msg.text) {
          onBannerQuoteChange(msg.text);
        } else if (msg.type === 'audio' && msg.data && outputCtxRef.current) {
          const ctx = outputCtxRef.current;
          const { buffer, rms } = base64Pcm16ToAudioBuffer(ctx, msg.data, 24000);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);

          const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
          src.start(startAt);
          nextStartTimeRef.current = startAt + buffer.duration;
          activeSourcesRef.current.add(src);
          setLocalMood('speaking');
          setLocalSpeechAmp(Math.min(1, rms * 4.5));

          src.onended = () => {
            activeSourcesRef.current.delete(src);
            if (activeSourcesRef.current.size === 0 && liveConnectedRef.current) {
              setLocalMood('listening');
              setLocalSpeechAmp(0);
            }
          };
        } else if (msg.type === 'interrupted') {
          for (const src of activeSourcesRef.current) {
            try {
              src.stop();
            } catch {
              // ignore
            }
          }
          activeSourcesRef.current.clear();
          if (outputCtxRef.current) {
            nextStartTimeRef.current = outputCtxRef.current.currentTime;
          }
          setLocalMood('listening');
          setLocalSpeechAmp(0);
        } else if (msg.type === 'error') {
          setChatError(msg.error || 'การสนทนาเสียงสดขัดข้อง');
          stopLiveVoice();
        } else if (msg.type === 'closed') {
          stopLiveVoice();
        }
      };

      ws.onerror = () => {
        setChatError('ไม่สามารถเชื่อมต่อเสียงสดกับท่านเจ้าอาวาสได้');
        stopLiveVoice();
      };
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'กรุณาอนุญาตการใช้ไมโครโฟนเพื่อคุยเสียงสด'
      );
      stopLiveVoice();
    }
  };

  const handleToggleMicTranscribe = async () => {
    if (isRecordingClip) {
      mediaRecorderRef.current?.stop();
      setIsRecordingClip(false);
      return;
    }

    setChatError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (blob.size < 200) return;

        setTranscribingClip(true);
        setLocalMood('thinking');
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const str = String(reader.result || '');
              const idx = str.indexOf(',');
              resolve(idx >= 0 ? str.slice(idx + 1) : str);
            };
            reader.onerror = () => reject(new Error('อ่านไฟล์เสียงไม่สำเร็จ'));
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/abbot/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType }),
          });
          const data = (await res.json()) as { transcriptTh?: string; error?: string };
          if (!res.ok || !data.transcriptTh) {
            throw new Error(data.error || 'ถอดความเสียงไม่สำเร็จ');
          }
          setLastTranscript(data.transcriptTh);
          setChatInput(data.transcriptTh);
          setOverlayOpen('chat');
          onBannerQuoteChange(`อ๊บ... อาตมาได้ยินว่า: "${data.transcriptTh}"`);
        } catch (err) {
          setChatError(err instanceof Error ? err.message : 'ถอดความเสียงไม่สำเร็จ');
        } finally {
          setTranscribingClip(false);
          setLocalMood('idle');
        }
      };

      recorder.start();
      setIsRecordingClip(true);
      setLocalMood('listening');
    } catch {
      setChatError('กรุณาอนุญาตการใช้ไมโครโฟนเพื่ออัดเสียงถอดความ');
    }
  };

  const submitMessageToAbbot = async (rawText: string, overrideVoice = false) => {
    const text = rawText.trim();
    if (!text || chatLoading) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      modality: lastTranscript === text ? 'transcript' : 'text',
    };

    setMessages((prev) => [...prev, userTurn]);
    setChatInput('');
    setChatError(null);
    setChatLoading(true);
    setLocalMood('thinking');

    try {
      void persistTurnIfSignedIn('user', text, userTurn.modality).catch(() => {});

      const res = await fetch('/api/abbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          depthMode,
          domainSlot,
          activeLens,
          includeVoice: overrideVoice,
          persona: voicePersona,
          personalContext: personalContext?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as AbbotChatResponse & { error?: string };
      if (!res.ok || !data.replyTh) {
        throw new Error(data.error || 'เจ้าอาวาสกำลังนั่งสมาธิ ลองส่งใหม่อีกครั้ง');
      }

      const abbotTurn: ChatTurn = {
        id: `a-${Date.now()}`,
        role: 'abbot',
        text: data.replyTh,
        quipTh: data.quipTh,
        suggestedActionTh: data.suggestedActionTh,
        modality: 'text',
        audioBase64Wav: data.audioBase64Wav,
        voicePersonaUsed: data.voicePersonaUsed,
      };
      setMessages((prev) => [...prev, abbotTurn]);
      onBannerQuoteChange(`${data.quipTh} ${data.replyTh}`);
      void persistTurnIfSignedIn('abbot', data.replyTh, 'text').catch(() => {});

      if (data.audioBase64Wav) {
        playAbbotWav(data.audioBase64Wav);
      } else {
        setLocalMood('idle');
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสนทนา');
      setLocalMood('idle');
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (!externalAskAbbot?.prompt) return;
    setOverlayOpen('chat');
    void submitMessageToAbbot(externalAskAbbot.prompt, false);
  }, [externalAskAbbot?.nonce]);

  const handleSpeakBannerQuote = async () => {
    if (speakBannerLoading || !bannerQuoteTh.trim()) return;
    setSpeakBannerLoading(true);
    setChatError(null);
    setLocalMood('thinking');
    try {
      const res = await fetch('/api/abbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: bannerQuoteTh,
          speakOnly: true,
          persona: voicePersona,
        }),
      });
      const data = (await res.json()) as AbbotChatResponse & { error?: string };
      if (!res.ok || !data.audioBase64Wav) {
        throw new Error(data.error || 'ไม่สามารถสังเคราะห์เสียงบรรยายได้');
      }
      playAbbotWav(data.audioBase64Wav);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'ไม่สามารถสังเคราะห์เสียงบรรยายได้');
      setLocalMood('idle');
    } finally {
      setSpeakBannerLoading(false);
    }
  };

  const handleSpeakReply = async (turn: ChatTurn) => {
    if (turn.audioBase64Wav && turn.voicePersonaUsed === voicePersona) {
      playAbbotWav(turn.audioBase64Wav);
      return;
    }
    setLocalMood('thinking');
    try {
      const res = await fetch('/api/abbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: turn.quipTh ? `${turn.quipTh} ${turn.text}` : turn.text,
          speakOnly: true,
          persona: voicePersona,
        }),
      });
      const data = (await res.json()) as AbbotChatResponse;
      if (data.audioBase64Wav) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === turn.id
              ? { ...m, audioBase64Wav: data.audioBase64Wav, voicePersonaUsed: voicePersona }
              : m
          )
        );
        playAbbotWav(data.audioBase64Wav);
      } else {
        setLocalMood('idle');
      }
    } catch {
      setLocalMood('idle');
    }
  };

  const rawTargetMood: AbbotMood = pokeTalkBurst
    ? 'speaking'
    : localMood !== 'idle'
      ? localMood
      : (externalMood ?? 'idle');
  const desiredAnimState: AbbotAnimState = resolveAbbotAnimState(rawTargetMood);
  const effectiveAmp = pokeTalkBurst
    ? Math.max(0.45, localSpeechAmp, externalSpeechAmp)
    : localSpeechAmp > 0
      ? localSpeechAmp
      : externalSpeechAmp;

  // CSS Animation Controller: apply immediate escalation (idle -> listening/talking)
  // and damped release (talking/listening -> idle) with smooth transition tracking.
  useEffect(() => {
    if (animReleaseTimerRef.current !== null) {
      window.clearTimeout(animReleaseTimerRef.current);
      animReleaseTimerRef.current = null;
    }

    if (desiredAnimState === animState) return;

    const commitState = (next: AbbotAnimState) => {
      setAnimState(next);
      setIsStateTransitioning(true);
      if (animTransitionTimerRef.current !== null) {
        window.clearTimeout(animTransitionTimerRef.current);
      }
      animTransitionTimerRef.current = window.setTimeout(() => {
        setIsStateTransitioning(false);
        animTransitionTimerRef.current = null;
      }, 420);
    };

    if (desiredAnimState === 'idle') {
      animReleaseTimerRef.current = window.setTimeout(() => {
        commitState('idle');
        animReleaseTimerRef.current = null;
      }, 170);
      return;
    }

    commitState(desiredAnimState);
  }, [desiredAnimState, animState]);

  const handleAbbotTap = () => {
    const pick = POKE_QUIPS_TH[Math.floor(Math.random() * POKE_QUIPS_TH.length)];
    onBannerQuoteChange(pick);
    setPokeTalkBurst(true);
    if (pokeBurstTimerRef.current !== null) {
      window.clearTimeout(pokeBurstTimerRef.current);
    }
    pokeBurstTimerRef.current = window.setTimeout(() => {
      setPokeTalkBurst(false);
      pokeBurstTimerRef.current = null;
    }, 950);
  };

  const moodLabelTh =
    animState === 'talking'
      ? 'กำลังเอ่ยคำทำนาย'
      : animState === 'listening'
        ? 'กำลังจับสัญญาณใจ'
        : animState === 'thinking'
          ? 'กำลังนิมิตอ่านไพ่'
          : 'ประจำตะเกียง';

  return (
    <section
      aria-label="กุฏิท่านเจ้าอาวาสกบเฒ่า"
      className="relative h-full min-h-0 flex flex-col rounded-xl border border-[var(--theme-accent)]/25 bg-[#090B0F] overflow-hidden shadow-2xl"
    >
      {/* Unobstructed Hyper-Realistic Square Frog Oracle Frame + Floating Overlay */}
      <div className="relative flex-1 min-h-0 bg-[#090B0F] flex flex-col">
        <FrogAbbotStage
          mood={rawTargetMood}
          animState={animState}
          isStateTransitioning={isStateTransitioning}
          speechAmplitude={effectiveAmp}
          voicePersona={voicePersona}
          gazeBiasX={gazeBiasX}
          className="flex-1 min-h-0 w-full"
          onPokeAbbot={handleAbbotTap}
        />

        {/* Sleek Quote Strip Below Portrait (Zero Obstruction of Face/Hat/Lantern) */}
        <div className="shrink-0 border-t border-[var(--theme-accent)]/20 bg-[#10141C] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[var(--theme-accent)] truncate">
              ท่านเจ้าอาวาสกบเฒ่า · {moodLabelTh}
            </span>
            <button
              type="button"
              disabled={speakBannerLoading}
              onClick={() => void handleSpeakBannerQuote()}
              className="shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border border-[var(--theme-accent)]/40 bg-[#161B25] text-[#F4EFE6] hover:border-[var(--theme-accent)] disabled:opacity-60"
            >
              {speakBannerLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-[var(--theme-accent)]" />
              ) : (
                <Volume2 className="w-3 h-3 text-[var(--theme-accent)]" />
              )}
              <span>{voicePersona === 'male_sage' ? 'ฟัง Sage' : 'ฟัง Oracle'}</span>
            </button>
          </div>
          <p className="mt-1 text-xs text-[#F4EFE6]/95 leading-snug line-clamp-2">
            “{bannerQuoteTh}”
          </p>
          {liveStatusTh && (
            <p className="mt-0.5 text-[10px] text-[#C0C5CE] truncate">{liveStatusTh}</p>
          )}
        </div>

        {/* Compact Floating Chat / Omen Overlay Inside Left Column (Zero outer page expansion) */}
        {overlayOpen !== 'none' && (
          <div
            className="absolute inset-2 z-20 rounded-lg border border-[var(--theme-accent)]/45 bg-[#12161D] flex flex-col overflow-hidden shadow-2xl"
            role="dialog"
            aria-label="กุฏิสนทนาและยันต์นิมิต"
          >
            <div className="shrink-0 px-3 py-2 border-b border-[#C0C5CE]/15 bg-[#171C26] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOverlayOpen('chat')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    overlayOpen === 'chat'
                      ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                      : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                  }`}
                >
                  สนทนากับเจ้าอาวาส
                </button>
                <button
                  type="button"
                  onClick={() => setOverlayOpen('omen')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    overlayOpen === 'omen'
                      ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                      : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                  }`}
                >
                  ยันต์นิมิต &amp; เสียงสระบัว
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOverlayOpen('none')}
                aria-label="ปิดหน้าต่างสนทนา"
                className="p-1.5 rounded text-[#C0C5CE] hover:text-[#F4EFE6] hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {overlayOpen === 'chat' ? (
              <div className="flex-1 min-h-0 flex flex-col p-3 gap-2.5">
                <div className="flex items-center justify-between text-[11px] text-[#C0C5CE] shrink-0">
                  <span>โหมดคำตอบ:</span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'quick', label: 'ไว' },
                        { id: 'balanced', label: 'สมดุล' },
                        { id: 'deep', label: 'ลึก' },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDepthMode(d.id)}
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          depthMode === d.id
                            ? 'bg-[var(--theme-moss)] text-[#F4EFE6]'
                            : 'bg-[#1C1F24] text-[#C0C5CE]'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto sanctuary-scroll space-y-2.5 pr-1">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg p-3 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'ml-auto max-w-[88%] bg-[#1C222D] border border-[#C0C5CE]/20 text-[#F4EFE6]'
                          : 'mr-auto max-w-[94%] parchment-sheet border border-[var(--theme-accent)]/40'
                      }`}
                    >
                      {m.role === 'abbot' && (
                        <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-semibold text-[#4A5D4E]">
                          <span>ท่านเจ้าอาวาสกบเฒ่า</span>
                          <button
                            type="button"
                            onClick={() => void handleSpeakReply(m)}
                            className="inline-flex items-center gap-1 text-[#1C1F24] hover:underline"
                          >
                            <Volume2 className="w-3 h-3 text-[#B68332]" />
                            <span>ฟังเสียง</span>
                          </button>
                        </div>
                      )}
                      {m.quipTh && <p className="italic text-[#4A5D4E] mb-1">“{m.quipTh}”</p>}
                      <p>{m.text}</p>
                      {m.suggestedActionTh && (
                        <p className="mt-1.5 pt-1.5 border-t border-[#1C1F24]/15 text-[11px] text-[#4A5D4E]">
                          <strong>ก้าวเล็กๆ:</strong> {m.suggestedActionTh}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitMessageToAbbot(chatInput, false);
                  }}
                  className="shrink-0 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="ถามเจ้าอาวาสเพิ่มเติม..."
                    className="flex-1 min-h-[38px] rounded-lg border border-[#C0C5CE]/25 bg-[#1C1F24] px-3 text-xs text-[#F4EFE6] placeholder:text-[#C0C5CE]/50 focus:border-[var(--theme-accent)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="min-h-[38px] px-3 rounded-lg bg-[var(--theme-accent)] text-[#0D1015] text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {chatLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>ส่ง</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto sanctuary-scroll p-3">
                <AbbotOmenStudio domainSlot={domainSlot} activeLens={activeLens} />
              </div>
            )}
          </div>
        )}
      </div>

      {chatError && (
        <div className="shrink-0 px-3 py-1.5 bg-rose-950/80 border-t border-rose-500/30 text-[11px] text-rose-200 truncate">
          {chatError}
        </div>
      )}

      {/* Sleek Compact Bottom Dock */}
      <div className="shrink-0 border-t border-[#C0C5CE]/15 bg-[var(--theme-surface)] px-2.5 py-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleLiveVoice}
            disabled={liveConnecting}
            className={`min-h-[34px] px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
              liveConnected
                ? 'bg-rose-700 text-white hover:bg-rose-600'
                : 'bg-[var(--theme-accent)] text-[#0D1015] lantern-glow'
            }`}
          >
            {liveConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : liveConnected ? (
              <PhoneOff className="w-3.5 h-3.5" />
            ) : (
              <PhoneCall className="w-3.5 h-3.5" />
            )}
            <span>{liveConnected ? 'วางสาย' : 'คุยเสียงสด'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMicTranscribe}
            disabled={transcribingClip}
            title="อัดเสียงถอดความ"
            className={`min-h-[34px] px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap ${
              isRecordingClip
                ? 'border-rose-400 bg-rose-950 text-rose-100'
                : 'border-[#C0C5CE]/20 bg-[#1C1F24] text-[#F4EFE6] hover:border-[var(--theme-accent)]/60'
            }`}
          >
            {transcribingClip ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-accent)]" />
            ) : isRecordingClip ? (
              <MicOff className="w-3.5 h-3.5 text-rose-300" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
            )}
            <span className="hidden sm:inline">{isRecordingClip ? 'หยุดอัด' : 'ไมค์'}</span>
          </button>

          <button
            type="button"
            onClick={() => setOverlayOpen((v) => (v === 'chat' ? 'none' : 'chat'))}
            className={`min-h-[34px] px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap ${
              overlayOpen === 'chat'
                ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[#F4EFE6]'
                : 'border-[#C0C5CE]/20 bg-[#1C1F24] text-[#F4EFE6] hover:border-[var(--theme-accent)]/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
            <span>ถามเจ้าอาวาส</span>
          </button>

          <button
            type="button"
            onClick={() => setOverlayOpen((v) => (v === 'omen' ? 'none' : 'omen'))}
            title="เสกยันต์นิมิต & เสียงสระบัว"
            className={`min-h-[34px] px-2 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap ${
              overlayOpen === 'omen'
                ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[#F4EFE6]'
                : 'border-[#C0C5CE]/20 bg-[#1C1F24] text-[#F4EFE6] hover:border-[var(--theme-accent)]/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
            <span className="hidden md:inline">ยันต์</span>
          </button>
        </div>

        {/* Voice Persona Compact Switcher */}
        <div
          role="group"
          aria-label="เลือกโทนเสียงเจ้าอาวาส"
          className="flex items-center gap-0.5 p-0.5 rounded-md bg-[#1C1F24] border border-[#C0C5CE]/20"
        >
          <button
            type="button"
            aria-pressed={voicePersona === 'male_sage'}
            onClick={() => onVoicePersonaChange('male_sage')}
            className={`min-h-[28px] px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
              voicePersona === 'male_sage'
                ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
            }`}
          >
            Sage
          </button>
          <button
            type="button"
            aria-pressed={voicePersona === 'female_oracle'}
            onClick={() => onVoicePersonaChange('female_oracle')}
            className={`min-h-[28px] px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
              voicePersona === 'female_oracle'
                ? 'bg-[var(--theme-accent)] text-[#0D1015] font-semibold'
                : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
            }`}
          >
            Oracle
          </button>
        </div>
      </div>
    </section>
  );
}
