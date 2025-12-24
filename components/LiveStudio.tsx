
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';
import { GeminiService } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { Expert } from '../types';

const LIVE_CORE_STYLES = `
  :root {
      --core-primary: #FF0050;
      --core-secondary: #00F5D4;
      --core-accent: #8B5CF6;
      --core-bg: #03030b;
  }
  .broadcast-grid { display: grid; grid-template-columns: 320px 1fr 400px; gap: 1.5rem; height: 100%; }
  .nexus-panel { background: rgba(10, 10, 25, 0.6); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 3rem; }
  .neural-stage { background: #000; border-radius: 4.5rem; border: 1px solid rgba(255, 255, 255, 0.1); position: relative; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.8); }
  .live-indicator { width: 12px; height: 12px; background: var(--core-primary); border-radius: 50%; position: relative; }
  .live-indicator::after { content: ''; position: absolute; inset: -4px; border: 2px solid var(--core-primary); border-radius: 50%; animation: pulse-live 1.5s infinite; }
  @keyframes pulse-live { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.6; } 100% { transform: scale(1); opacity: 1; } }
  .chat-flow::-webkit-scrollbar { width: 3px; }
  .chat-flow::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
`;

interface Interaction {
  id: string;
  user: string;
  avatar: string;
  content: string;
  type: 'chat' | 'gift' | 'question' | 'raid';
  value?: string;
  isAi?: boolean;
}

export const LiveStudio: React.FC = () => {
  const [mode, setMode] = useState<'launcher' | 'on-air'>('launcher');
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeExpert, setActiveExpert] = useState<Expert>(EXPERTS[0]);
  const [sessionTitle, setSessionTitle] = useState("STRATÉGIE NEXUS PRIME v10.5");
  const [transcription, setTranscription] = useState("");
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [metrics, setMetrics] = useState({ viewers: 0, likes: 0, uptime: "00:00:00" });

  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopLive = useCallback(() => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch(e) {} audioContextRef.current = null; }
    if (outputAudioContextRef.current) { try { outputAudioContextRef.current.close(); } catch(e) {} outputAudioContextRef.current = null; }
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); }
    setIsLive(false);
    setIsConnecting(false);
    setMode('launcher');
    setTranscription("");
  }, []);

  const startLive = async () => {
    if (isConnecting || isLive) return;
    setIsConnecting(true);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const nativeSampleRate = inputCtx.sampleRate;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsLive(true);
            setMode('on-air');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const downsampled = GeminiService.downsample(inputData, nativeSampleRate, 16000);
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) int16[i] = Math.max(-1, Math.min(1, downsampled[i])) * 32767;
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: GeminiService.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              })).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              const audioBuffer = await GeminiService.decodeAudioData(GeminiService.decode(base64Audio), outputCtx, 24000, 1);
              const now = outputCtx.currentTime;
              if (nextStartTimeRef.current < now) nextStartTimeRef.current = now + 0.05;
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
            if (message.serverContent?.outputTranscription) {
              setTranscription(message.serverContent.outputTranscription.text);
            }
          },
          onerror: () => stopLive(),
          onclose: () => stopLive()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: activeExpert.voiceName } } },
          systemInstruction: `Tu es l'HÔTE MAÎTRE de Live Core : ${activeExpert.name}. Diffuse sur "${sessionTitle}".`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopLive(); }
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[3.5rem] overflow-hidden flex flex-col font-inter">
      <style>{LIVE_CORE_STYLES}</style>
      <header className="px-12 py-8 border-b border-white/5 bg-black/40 flex items-center justify-between">
        <h1 className="font-orbitron text-2xl font-black italic">Live Core <span className="text-red-500">Nexus</span></h1>
        {isLive && <button onClick={stopLive} className="px-10 py-4 bg-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest">Couper Flux</button>}
      </header>

      <main className="flex-1 p-8">
        {mode === 'launcher' ? (
          <div className="h-full flex flex-col items-center justify-center max-w-5xl mx-auto space-y-12">
            <h2 className="text-6xl font-black uppercase italic text-center">Lancez votre <span className="text-red-500">Nexus</span> Direct.</h2>
            <div className="flex gap-4">
              {EXPERTS.slice(0, 4).map(e => (
                <button key={e.id} onClick={() => setActiveExpert(e)} className={`p-4 rounded-3xl border ${activeExpert.id === e.id ? 'border-red-600 bg-red-600/10' : 'border-white/10 opacity-40'}`}>
                  <img src={e.avatar} className="w-14 h-14 rounded-2xl" alt="" />
                </button>
              ))}
            </div>
            <button onClick={startLive} disabled={isConnecting} className="px-16 py-6 bg-red-600 rounded-3xl font-black uppercase text-xs tracking-widest">{isConnecting ? 'Syncing...' : 'Lancer le Live'}</button>
          </div>
        ) : (
          <div className="broadcast-grid">
            <div className="nexus-panel p-10 flex flex-col items-center gap-10">
               <img src={activeExpert.avatar} className="w-48 h-48 rounded-[3rem] object-cover border-4 border-red-500/20" alt="" />
               <div className="text-center">
                  <div className="text-xl font-black text-red-500">{activeExpert.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Live Host v10</div>
               </div>
            </div>
            <div className="neural-stage flex items-center justify-center p-20">
               <div className="text-center space-y-8">
                  <div className="live-indicator mx-auto"></div>
                  <p className="text-4xl font-medium italic text-red-100 leading-relaxed max-w-2xl">"{transcription || 'Liaison en cours...'}"</p>
               </div>
            </div>
            <div className="nexus-panel p-10">
               <h3 className="text-xs font-black uppercase text-slate-600 mb-6">Audience Feedback</h3>
               <div className="space-y-4 opacity-30">
                  <div className="h-10 bg-white/5 rounded-xl w-full"></div>
                  <div className="h-10 bg-white/5 rounded-xl w-3/4"></div>
                  <div className="h-10 bg-white/5 rounded-xl w-full"></div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
