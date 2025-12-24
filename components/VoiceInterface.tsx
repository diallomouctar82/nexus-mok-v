
import React, { useState, useRef, useCallback } from 'react';
import { Expert } from '../types';
import { GeminiService } from '../services/geminiService';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface VoiceInterfaceProps {
  expert: Expert;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ expert }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopSession = useCallback(() => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (inputAudioCtxRef.current) { inputAudioCtxRef.current.close(); inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { outputAudioCtxRef.current.close(); outputAudioCtxRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
    nextStartTimeRef.current = 0;
  }, []);

  const startVoiceSession = async () => {
    if (isActive || isConnecting) { stopSession(); return; }
    setIsConnecting(true);

    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsActive(true);
      setIsConnecting(false);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const downsampled = GeminiService.downsample(inputData, inputCtx.sampleRate, 16000);
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) int16[i] = downsampled[i] * 32767;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: GeminiService.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
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
              sourcesRef.current.add(source);
            }
          },
          onerror: () => stopSession(),
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: expert.voiceName } } },
          systemInstruction: `Tu es ${expert.name}. Réponds de manière vocale et naturelle.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopSession(); }
  };

  return (
    <div className="flex flex-col items-center gap-8 p-12 glass-panel rounded-[4rem] border-blue-500/20 shadow-2xl">
      <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 border-4 ${isActive ? 'bg-blue-600/10 border-blue-500 scale-110 shadow-[0_0_80px_rgba(59,130,246,0.3)]' : 'border-white/10'}`}>
        {isConnecting ? (
          <i className="fas fa-circle-notch animate-spin text-6xl text-blue-500"></i>
        ) : isActive ? (
          <div className="flex items-end gap-2 h-16">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="w-2 bg-blue-400 rounded-full animate-bounce" style={{ height: `${20 + Math.random()*80}%`, animationDelay: `${i*0.1}s` }}></div>
             ))}
          </div>
        ) : (
          <img src={expert.avatar} className="w-40 h-40 rounded-full object-cover grayscale opacity-50" alt="" />
        )}
      </div>

      <div className="text-center space-y-4">
        <h3 className="text-3xl font-black italic uppercase tracking-tighter">{isActive ? 'Liaison Active' : `Parler à ${expert.name}`}</h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em]">{isActive ? 'Écoute neuronale en cours...' : 'Initialisez le pont vocal'}</p>
      </div>

      <button
        onClick={startVoiceSession}
        className={`px-16 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-red-600' : 'bg-blue-600'}`}
      >
        {isConnecting ? 'Synchronisation...' : isActive ? 'Couper la liaison' : 'Activer Microphone'}
      </button>
    </div>
  );
};
