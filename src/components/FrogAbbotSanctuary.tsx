import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDownRight,
  BookMarked,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  PERSPECTIVE_LENSES,
  type DomainSlot,
  type PerspectiveLens,
} from '../config/site.config';
import type { AbbotChatResponse } from '../lib/abbot-ai';
import type { VoicePersona } from '../lib/gemini-thai-voice';
import {
  appendAbbotMessage,
  createAbbotThread,
  deleteSavedReading,
  subscribeAbbotThreads,
  subscribeSavedReadings,
  subscribeThreadMessages,
  type AbbotDepthMode,
  type StoredAbbotThread,
  type StoredSavedReading,
} from '../lib/firestoreStore';
import {
  base64Pcm16ToAudioBuffer,
  float32ToBase64Pcm16,
} from '../lib/templeAudio';
import { AbbotOmenStudio } from './AbbotOmenStudio';
import { FrogAbbotStage, type AbbotMood } from './FrogAbbotStage';
import { FROG_ABBOT_PORTRAIT_IMG, SHRINE_HORIZON_IMG } from './MysticArtifacts';

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

interface FrogAbbotSanctuaryProps {
  domainSlot: DomainSlot;
  activeLens: PerspectiveLens;
  trialAvailable: boolean;
  googleUser: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onSendTranscriptToStudio: (text: string) => void;
  personalContext?: string;
  activeDailyCardTh?: string | null;
  externalAskAbbot?: { prompt: string; nonce: number } | null;
}

type SanctuaryTab = 'chat' | 'omen' | 'archive';

const POKE_QUIPS_TH = [
  'อ๊บ... จิ้มทำไมเล่าโยม นี่เจ้าอาวาสนะ ไม่ใช่กบยางบีบแล้วร้อง',
  'ใจเย็นโยม แค่ตะเกียงแกว่งเฉยๆ ยังไม่ต้องรีบขอหวย',
  'อ๊บ! แตะตัวแล้วมีสติขึ้นไหม หรือแค่เหงา?',
  'โยม... ลองจิ้มใจตัวเองดูก่อนว่าตอนนี้กำลังกังวลเรื่องอะไรอยู่',
];

export function FrogAbbotSanctuary({
  domainSlot,
  activeLens,
  trialAvailable,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onSendTranscriptToStudio,
  personalContext,
  activeDailyCardTh,
  externalAskAbbot,
}: FrogAbbotSanctuaryProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SanctuaryTab>('chat');
  const [abbotMood, setAbbotMood] = useState<AbbotMood>('idle');
  const [speechAmp, setSpeechAmp] = useState(0);
  const [bannerQuoteTh, setBannerQuoteTh] = useState(
    'อ๊บ... เข้ามาถึงกุฏิแล้ว จะคุยฟรีหรือจ่าย PromptPay กบเฒ่าก็ฟังเหมือนกันหมด — ไหนเล่ามาซิ คืนนี้ใจติดเรื่องอะไร?'
  );

  // Chat state
  const [voicePersona, setVoicePersona] = useState<VoicePersona>('male_sage');
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
      text: 'มีเรื่องคาใจ ไพ่ที่อยากคุย หรือความฝันแปลกๆ ก็พิมพ์หรือพูดสดกับอาตมาได้เลย — ไม่ขายความกลัว ไม่ฟันธงมั่ว แค่ช่วยส่องกระจกให้เห็นชัดขึ้น',
      suggestedActionTh: 'ลองเลือกถาม 1 เรื่องที่วนเวียนอยู่ในหัวมากที่สุดวันนี้',
    },
  ]);

  // Firestore synced history
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [savedThreads, setSavedThreads] = useState<StoredAbbotThread[]>([]);
  const [savedReadings, setSavedReadings] = useState<StoredSavedReading[]>([]);
  const [authBusy, setAuthBusy] = useState(false);

  // Live voice refs & state
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
  const activeThreadIdRef = useRef<string | null>(null);

  // Mic transcription state
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [transcribingClip, setTranscribingClip] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // TTS playback for chat replies
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

  const combinedPersonalContext = [
    personalContext?.trim(),
    activeDailyCardTh ? `ไพ่เงาประจำวันที่เปิดได้: ${activeDailyCardTh}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!googleUser) {
      setSavedThreads([]);
      setSavedReadings([]);
      setActiveThreadId(null);
      return;
    }
    const unsubThreads = subscribeAbbotThreads(googleUser.uid, (list) => {
      setSavedThreads(list);
    });
    const unsubReadings = subscribeSavedReadings(googleUser.uid, (list) => {
      setSavedReadings(list);
    });
    return () => {
      unsubThreads();
      unsubReadings();
    };
  }, [googleUser]);

  useEffect(() => {
    if (!googleUser || !activeThreadId) return;
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
    setAbbotMood('idle');
    setSpeechAmp(0);

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
      const profileQuery = combinedPersonalContext
        ? `&profile=${encodeURIComponent(combinedPersonalContext.slice(0, 480))}`
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
          setAbbotMood('listening');
          setLiveStatusTh('สายตรงเปิดแล้ว — พูดใส่ไมค์ได้เลยโยม');
        } else if (msg.type === 'inputTranscript' && msg.text) {
          setLastTranscript(msg.text);
        } else if (msg.type === 'outputTranscript' && msg.text) {
          setBannerQuoteTh(msg.text);
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
          setAbbotMood('speaking');
          setSpeechAmp(Math.min(1, rms * 4.5));

          src.onended = () => {
            activeSourcesRef.current.delete(src);
            if (activeSourcesRef.current.size === 0 && liveConnectedRef.current) {
              setAbbotMood('listening');
              setSpeechAmp(0);
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
          setAbbotMood('listening');
          setSpeechAmp(0);
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
        setAbbotMood('thinking');
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
          setDrawerOpen(true);
          setActiveTab('chat');
          setBannerQuoteTh(`อ๊บ... อาตมาได้ยินว่า: "${data.transcriptTh}" — กดส่งถามหรือส่งเข้าห้องวิเคราะห์ได้เลย`);
        } catch (err) {
          setChatError(err instanceof Error ? err.message : 'ถอดความเสียงไม่สำเร็จ');
        } finally {
          setTranscribingClip(false);
          setAbbotMood('idle');
        }
      };

      recorder.start();
      setIsRecordingClip(true);
      setAbbotMood('listening');
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

    const nextHistory = [...messages, userTurn];
    setMessages(nextHistory);
    setChatInput('');
    setChatError(null);
    setChatLoading(true);
    setAbbotMood('thinking');

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
          personalContext: combinedPersonalContext || undefined,
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
      setBannerQuoteTh(`${data.quipTh} ${data.replyTh}`);
      void persistTurnIfSignedIn('abbot', data.replyTh, 'text').catch(() => {});

      if (data.audioBase64Wav) {
        playAbbotWav(data.audioBase64Wav);
      } else {
        setAbbotMood('idle');
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสนทนา');
      setAbbotMood('idle');
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (!externalAskAbbot?.prompt) return;
    setDrawerOpen(true);
    setActiveTab('chat');
    document.getElementById('abbot-sanctuary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void submitMessageToAbbot(externalAskAbbot.prompt, false);
  }, [externalAskAbbot?.nonce]);

  const handleSendChat = async (e?: React.FormEvent, overrideVoice = false) => {
    e?.preventDefault();
    await submitMessageToAbbot(chatInput, overrideVoice);
  };

  const playAbbotWav = (base64Wav: string) => {
    replyAudioRef.current?.pause();
    const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
    replyAudioRef.current = audio;
    setAbbotMood('speaking');
    setSpeechAmp(0.65);
    audio.onended = () => {
      setAbbotMood('idle');
      setSpeechAmp(0);
    };
    audio.onerror = () => {
      setAbbotMood('idle');
      setSpeechAmp(0);
    };
    audio.play().catch(() => {
      setAbbotMood('idle');
      setSpeechAmp(0);
    });
  };

  const handleSpeakReply = async (turn: ChatTurn) => {
    if (turn.audioBase64Wav && turn.voicePersonaUsed === voicePersona) {
      playAbbotWav(turn.audioBase64Wav);
      return;
    }
    setAbbotMood('thinking');
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
              ? {
                  ...m,
                  audioBase64Wav: data.audioBase64Wav,
                  voicePersonaUsed: voicePersona,
                }
              : m
          )
        );
        playAbbotWav(data.audioBase64Wav);
      } else {
        setAbbotMood('idle');
      }
    } catch {
      setAbbotMood('idle');
    }
  };

  const handleSpeakBannerQuote = async () => {
    if (speakBannerLoading || !bannerQuoteTh.trim()) return;
    setSpeakBannerLoading(true);
    setChatError(null);
    setAbbotMood('thinking');
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
      setAbbotMood('idle');
    } finally {
      setSpeakBannerLoading(false);
    }
  };

  const handlePokeAbbot = () => {
    const pick = POKE_QUIPS_TH[Math.floor(Math.random() * POKE_QUIPS_TH.length)];
    setBannerQuoteTh(pick);
  };

  const moodLabelTh =
    abbotMood === 'speaking'
      ? 'เจ้าอาวาสกำลังเอ่ยคำ'
      : abbotMood === 'listening'
        ? 'กำลังตั้งใจฟังโยม'
        : abbotMood === 'thinking'
          ? 'กำลังขบคิดอยู่เงียบๆ'
          : 'ประจำตะเกียง · พร้อมสนทนา';

  return (
    <section
      id="abbot-sanctuary"
      aria-label="กุฏิท่านเจ้าอาวาสกบเฒ่า 3 มิติ"
      className="mt-4 rounded-xl border border-[#D4A359]/30 bg-[#0D1015] overflow-hidden shadow-2xl"
    >
      {/* Top Bar Inside Sanctuary */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#C0C5CE]/12 bg-[#141820] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <img
            src={FROG_ABBOT_PORTRAIT_IMG}
            alt="ตราท่านเจ้าอาวาสกบเฒ่า"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-lg border border-[#D4A359]/45 object-cover shrink-0"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-semibold text-[#D4A359]">
              ท่านเจ้าอาวาสกบเฒ่า · The Wise Wizard Frog Abbot
            </span>
            <span aria-hidden="true" className="text-[#C0C5CE]/40">·</span>
            <span className="text-[#C0C5CE]">{moodLabelTh}</span>
            <span aria-hidden="true" className="text-[#C0C5CE]/40">·</span>
            <span className="text-[#C0C5CE]/80">
              {trialAvailable ? 'ใช้ฟรีได้ทั้งคุยกับกบ + ทดลองอ่านลึก 1 ครั้ง' : 'คุยกับท่านเจ้าอาวาสได้ฟรีเสมอ'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {googleUser ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#C0C5CE] hidden sm:inline">
                {googleUser.displayName || googleUser.email}
              </span>
              <button
                type="button"
                onClick={() => void onGoogleSignOut()}
                className="min-h-[34px] px-3 py-1 rounded-lg border border-[#C0C5CE]/25 text-[#F4EFE6] hover:border-[#D4A359]/60 inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-[#D4A359]" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={async () => {
                setAuthBusy(true);
                try {
                  await onGoogleSignIn();
                } finally {
                  setAuthBusy(false);
                }
              }}
              className="min-h-[34px] px-3 py-1 rounded-lg border border-[#D4A359]/45 bg-[#1C1F24] text-xs text-[#F4EFE6] hover:border-[#D4A359] inline-flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[#D4A359]" />
              <span>{authBusy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google เก็บประวัติ'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3D Stage + Compact Solid Overlay Caption & Action Dock (No backdrop-filter over WebGL) */}
      <div className="relative bg-[#0D1015]">
        <FrogAbbotStage
          mood={abbotMood}
          speechAmplitude={speechAmp}
          voicePersona={voicePersona}
          onPokeAbbot={handlePokeAbbot}
        />

        {/* Top-Left Moody Abbot Quote Bubble (Solid translucent surface, non-blocking pointer-events) */}
        <div className="pointer-events-none absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md">
          <div className="pointer-events-auto rounded-lg border border-[#D4A359]/35 bg-[#0D1015]/92 px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-[#D4A359]">
                เจ้าอาวาสกบเฒ่า (หมุนดูรอบตัวหรือแตะตัวกบได้)
              </div>
              <button
                type="button"
                disabled={speakBannerLoading}
                onClick={() => void handleSpeakBannerQuote()}
                className="shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border border-[#D4A359]/40 bg-[#141820] text-[#F4EFE6] hover:border-[#D4A359] disabled:opacity-60"
              >
                {speakBannerLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#D4A359]" />
                ) : (
                  <Volume2 className="w-3 h-3 text-[#D4A359]" />
                )}
                <span>{voicePersona === 'male_sage' ? 'ฟังเสียง Sage' : 'ฟังเสียง Oracle'}</span>
              </button>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#F4EFE6] leading-relaxed">
              “{bannerQuoteTh}”
            </p>
            {liveStatusTh && (
              <p className="mt-1.5 text-[11px] text-[#C0C5CE]">{liveStatusTh}</p>
            )}
          </div>
        </div>

        {/* Compact Bottom Action Dock (<= 15% height, solid surface) */}
        <div className="border-t border-[#C0C5CE]/15 bg-[#141820] px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleLiveVoice}
              disabled={liveConnecting}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                liveConnected
                  ? 'bg-rose-700 text-white hover:bg-rose-600'
                  : 'bg-[#D4A359] text-[#1C1F24] lantern-glow'
              }`}
            >
              {liveConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : liveConnected ? (
                <PhoneOff className="w-4 h-4" />
              ) : (
                <PhoneCall className="w-4 h-4" />
              )}
              <span>
                {liveConnecting
                  ? 'กำลังต่อสาย...'
                  : liveConnected
                    ? 'วางสายเสียงสด'
                    : 'คุยเสียงสด (Live)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleMicTranscribe}
              disabled={transcribingClip}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${
                isRecordingClip
                  ? 'border-rose-400 bg-rose-950 text-rose-100'
                  : 'border-[#C0C5CE]/25 bg-[#1C1F24] text-[#F4EFE6] hover:border-[#D4A359]/60'
              }`}
            >
              {transcribingClip ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#D4A359]" />
              ) : isRecordingClip ? (
                <MicOff className="w-4 h-4 text-rose-300" />
              ) : (
                <Mic className="w-4 h-4 text-[#D4A359]" />
              )}
              <span>
                {transcribingClip
                  ? 'กำลังถอดความ...'
                  : isRecordingClip
                    ? 'หยุดอัดเสียง'
                    : 'อัดเสียงถอดความ'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(true);
                setActiveTab('chat');
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-[#C0C5CE]/25 bg-[#1C1F24] text-xs font-medium text-[#F4EFE6] hover:border-[#D4A359]/60 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4 text-[#D4A359]" />
              <span>กุฏิสนทนา</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(true);
                setActiveTab('omen');
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-[#C0C5CE]/25 bg-[#1C1F24] text-xs font-medium text-[#F4EFE6] hover:border-[#D4A359]/60 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#D4A359]" />
              <span>ยันต์นิมิต & เสียงสระบัว</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(true);
                setActiveTab('archive');
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-[#C0C5CE]/25 bg-[#1C1F24] text-xs font-medium text-[#F4EFE6] hover:border-[#D4A359]/60 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <History className="w-4 h-4 text-[#D4A359]" />
              <span>คลังประวัติ ({savedThreads.length + savedReadings.length})</span>
            </button>

            <div
              role="group"
              aria-label="เลือกโทนเสียงเจ้าอาวาส"
              className="flex items-center gap-1 p-1 rounded-lg bg-[#1C1F24] border border-[#C0C5CE]/20"
            >
              <span className="px-2 text-[11px] text-[#C0C5CE] whitespace-nowrap">โทนเสียง:</span>
              <button
                type="button"
                aria-pressed={voicePersona === 'male_sage'}
                title="เสียงทุ้มต่ำ สุขุม (Sage)"
                onClick={() => {
                  setVoicePersona('male_sage');
                  if (liveConnected) {
                    setLiveStatusTh('เลือกโทน Sage แล้ว — วางสายแล้วต่อใหม่เพื่อให้เสียงสดเปลี่ยนตาม');
                  }
                }}
                className={`min-h-[30px] px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  voicePersona === 'male_sage'
                    ? 'bg-[#D4A359] text-[#1C1F24]'
                    : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                }`}
              >
                Sage · ทุ้มสุขุม
              </button>
              <button
                type="button"
                aria-pressed={voicePersona === 'female_oracle'}
                title="เสียงสูงกังวาน ลึกลับ (Oracle)"
                onClick={() => {
                  setVoicePersona('female_oracle');
                  if (liveConnected) {
                    setLiveStatusTh('เลือกโทน Oracle แล้ว — วางสายแล้วต่อใหม่เพื่อให้เสียงสดเปลี่ยนตาม');
                  }
                }}
                className={`min-h-[30px] px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  voicePersona === 'female_oracle'
                    ? 'bg-[#D4A359] text-[#1C1F24]'
                    : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                }`}
              >
                Oracle · กังวานใส
              </button>
            </div>

            <div
              role="group"
              aria-label="อากัปกิริยาเจ้าอาวาส 3 มิติ"
              className="flex items-center gap-1 p-1 rounded-lg bg-[#1C1F24] border border-[#C0C5CE]/20"
            >
              <span className="px-2 text-[11px] text-[#C0C5CE] whitespace-nowrap">กิริยา:</span>
              {(
                [
                  { id: 'idle', label: 'นิ่งสงบ' },
                  { id: 'listening', label: 'ตั้งใจฟัง' },
                  { id: 'speaking', label: 'เอ่ยคำ' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  aria-pressed={abbotMood === st.id}
                  onClick={() => {
                    setAbbotMood(st.id);
                    setSpeechAmp(st.id === 'speaking' ? 0.58 : 0);
                  }}
                  className={`min-h-[30px] px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    abbotMood === st.id
                      ? 'bg-[#4A5D4E] text-[#F4EFE6]'
                      : 'text-[#C0C5CE] hover:text-[#F4EFE6]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs text-[#D4A359] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>{drawerOpen ? 'พับกุฏิสนทนา' : 'เปิดกุฏิสนทนา'}</span>
            {drawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Transcript Quick Handoff Bar */}
      {lastTranscript && (
        <div className="px-4 sm:px-6 py-2.5 border-t border-[#C0C5CE]/10 bg-[#181B20] flex flex-wrap items-center justify-between gap-3 text-xs">
          <p className="text-[#C0C5CE]">
            <strong className="text-[#D4A359]">ข้อความที่ถอดได้:</strong> “{lastTranscript}”
          </p>
          <button
            type="button"
            onClick={() => onSendTranscriptToStudio(lastTranscript)}
            className="min-h-[34px] px-3 py-1 rounded-lg bg-[#4A5D4E] text-[#F4EFE6] font-medium inline-flex items-center gap-1.5 hover:bg-[#5A705F] whitespace-nowrap"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>ส่งข้อความนี้เข้าห้องวิเคราะห์ด้านล่าง</span>
          </button>
        </div>
      )}

      {chatError && (
        <div className="px-4 sm:px-6 py-2.5 bg-rose-950/60 border-t border-rose-500/30 text-xs text-rose-200">
          {chatError}
        </div>
      )}

      {/* Expandable Sanctuary Drawer */}
      {drawerOpen && (
        <div className="border-t border-[#C0C5CE]/15 bg-[#141820] p-4 sm:p-6 space-y-5">
          <div className="relative overflow-hidden rounded-lg border border-[#D4A359]/25 h-24 sm:h-28 flex items-end p-4">
            <img
              src={SHRINE_HORIZON_IMG}
              alt="ศาลาอารามสระบัวชุดเทายามค่ำคืน"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-55"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#0D1015]/95 via-[#0D1015]/70 to-[#0D1015]/50"
            />
            <div className="relative z-10 flex items-center gap-3">
              <img
                src={FROG_ABBOT_PORTRAIT_IMG}
                alt="ท่านเจ้าอาวาสกบเฒ่า"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg border border-[#D4A359]/50 object-cover shrink-0 shadow-lg"
              />
              <div>
                <p className="font-display text-sm sm:text-base font-semibold text-[#F4EFE6]">
                  ศาลาสนทนาและเสกยันต์นิมิตกลางสระบัว
                </p>
                <p className="text-[11px] text-[#C0C5CE]">
                  สนทนากับท่านเจ้าอาวาส · เสกยันต์สะท้อนใจ · คลังประวัติเชื่อมต่อ Cloud Firestore
                </p>
              </div>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C0C5CE]/15 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'chat', label: 'สนทนากับท่านเจ้าอาวาส' },
                  { id: 'omen', label: 'เสกยันต์นิมิต & เสียงสระบัว' },
                  { id: 'archive', label: 'ประวัติและบันทึก (Firestore)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-[#D4A359] text-[#1C1F24]'
                      : 'bg-[#1C1F24] text-[#C0C5CE] hover:text-[#F4EFE6]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'chat' && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#C0C5CE]">ความลึกคำตอบ:</span>
                {(
                  [
                    { id: 'quick', label: 'พูดไว' },
                    { id: 'balanced', label: 'สมดุล' },
                    { id: 'deep', label: 'ไตร่ตรองลึก' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDepthMode(d.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      depthMode === d.id
                        ? 'bg-[#4A5D4E] text-[#F4EFE6]'
                        : 'bg-[#1C1F24] text-[#C0C5CE]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-4 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'ml-auto max-w-[85%] bg-[#1C1F24] border border-[#C0C5CE]/20 text-[#F4EFE6]'
                        : 'mr-auto max-w-[90%] parchment-sheet border border-[#D4A359]/40'
                    }`}
                  >
                    {m.role === 'abbot' && (
                      <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] font-semibold text-[#4A5D4E]">
                        <span>ท่านเจ้าอาวาสกบเฒ่า</span>
                        <button
                          type="button"
                          onClick={() => void handleSpeakReply(m)}
                          className="inline-flex items-center gap-1 text-[#1C1F24] hover:underline"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#D4A359]" />
                          <span>ฟังเสียง</span>
                        </button>
                      </div>
                    )}
                    {m.quipTh && (
                      <p className="text-xs italic text-[#4A5D4E] mb-1">“{m.quipTh}”</p>
                    )}
                    <p>{m.text}</p>
                    {m.suggestedActionTh && (
                      <p className="mt-2 pt-2 border-t border-[#1C1F24]/15 text-xs text-[#4A5D4E]">
                        <strong>ก้าวเล็กๆ วันนี้:</strong> {m.suggestedActionTh}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => void handleSendChat(e, false)} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="ถามท่านเจ้าอาวาสเรื่องความฝัน ไพ่ที่จับได้ หรืออาการนอยด์วันนี้..."
                  className="flex-1 min-h-[44px] rounded-lg border border-[#C0C5CE]/25 bg-[#1C1F24] px-4 text-sm text-[#F4EFE6] placeholder:text-[#C0C5CE]/50 focus:border-[#D4A359] focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-[#D4A359] text-[#1C1F24] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                  >
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>ส่งข้อความ</span>
                  </button>
                  <button
                    type="button"
                    disabled={chatLoading || !chatInput.trim()}
                    onClick={() => void handleSendChat(undefined, true)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#D4A359]/50 bg-[#1C1F24] text-xs text-[#F4EFE6] inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Volume2 className="w-4 h-4 text-[#D4A359]" />
                    <span>ตอบเป็นเสียง</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'omen' && (
            <AbbotOmenStudio domainSlot={domainSlot} activeLens={activeLens} />
          )}

          {activeTab === 'archive' && (
            <div className="space-y-4">
              {!googleUser ? (
                <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#1C1F24] p-6 text-center space-y-3">
                  <p className="text-sm text-[#F4EFE6]">
                    เข้าสู่ระบบด้วย Google เพื่อบันทึกบทสนทนากับท่านเจ้าอาวาสและผลวิเคราะห์ของคุณไว้ใน Cloud Firestore
                  </p>
                  <button
                    type="button"
                    onClick={() => void onGoogleSignIn()}
                    className="min-h-[42px] px-5 py-2 rounded-lg bg-[#D4A359] text-[#1C1F24] text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบด้วย Google</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#1C1F24] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[#D4A359]">
                        วงสนทนาเจ้าอาวาส ({savedThreads.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveThreadId(null);
                          setMessages([
                            {
                              id: 'fresh',
                              role: 'abbot',
                              modality: 'text',
                              text: 'เปิดวงสนทนาใหม่แล้วโยม มีเรื่องไหนอยากหยิบมาวางบนโต๊ะตะเกียง?',
                            },
                          ]);
                          setActiveTab('chat');
                        }}
                        className="text-xs text-[#D4A359] hover:underline"
                      >
                        + เริ่มบทสนทนาใหม่
                      </button>
                    </div>
                    {savedThreads.length === 0 ? (
                      <p className="text-xs text-[#C0C5CE]/70">ยังไม่มีบทสนทนาที่บันทึกไว้</p>
                    ) : (
                      <div className="space-y-2">
                        {savedThreads.map((thr) => (
                          <button
                            key={thr.id}
                            type="button"
                            onClick={() => {
                              setActiveThreadId(thr.id);
                              setActiveTab('chat');
                            }}
                            className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
                              activeThreadId === thr.id
                                ? 'border-[#D4A359] bg-[#2A2E35]'
                                : 'border-[#C0C5CE]/15 hover:border-[#D4A359]/50'
                            }`}
                          >
                            <div className="font-medium text-[#F4EFE6] truncate">{thr.title}</div>
                            <div className="text-[11px] text-[#C0C5CE] mt-0.5">
                              {thr.messageCount} ข้อความ · {thr.depthMode}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#C0C5CE]/15 bg-[#1C1F24] p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-[#D4A359] flex items-center gap-1.5">
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>ผลวิเคราะห์ที่บันทึกไว้ ({savedReadings.length})</span>
                    </h4>
                    {savedReadings.length === 0 ? (
                      <p className="text-xs text-[#C0C5CE]/70">
                        หลังวิเคราะห์เสร็จในห้องด้านล่าง คุณสามารถกดปุ่ม “บันทึกลงคลังส่วนตัว” เพื่อเก็บไว้กลับมาทบทวนได้
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {savedReadings.map((item) => {
                          const lensName =
                            PERSPECTIVE_LENSES.find((l) => l.id === item.activeLens)?.labelTh ||
                            item.activeLens;
                          return (
                            <div
                              key={item.id}
                              className="rounded-lg border border-[#C0C5CE]/15 p-3 text-xs space-y-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-[#F4EFE6]">{item.headline}</span>
                                <button
                                  type="button"
                                  onClick={() => void deleteSavedReading(googleUser.uid, item.id)}
                                  aria-label="ลบบันทึกนี้"
                                  className="text-[#C0C5CE]/70 hover:text-rose-300 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-[#D4A359]">
                                {lensName} · {item.timeframe}
                              </p>
                              <p className="text-[#C0C5CE] line-clamp-2">{item.coreGuidance}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
