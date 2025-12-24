
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiService } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { AppAction, ViewType } from '../types';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';

interface ArchitectButtonProps {
  currentTab: ViewType;
  setActiveTab: (tab: ViewType) => void;
  onExecuteAction: (action: AppAction) => void;
}

type ArchitectState = 'idle' | 'syncing' | 'active' | 'summoning' | 'rewinding' | 'error';

interface ManifestedArtifact {
  id: string;
  type: 'strategy' | 'contract' | 'vision';
  label: string;
}

export const ArchitectBranch: React.FC<ArchitectButtonProps> = ({
  currentTab,
  setActiveTab,
  onExecuteAction,
}) => {
  const [state, setState] = useState<ArchitectState>('idle');
  const [vibeLevel, setVibeLevel] = useState(0);
  const [neuralLog, setNeuralLog] = useState<string>("VEILLE CHRONOS...");
  const [summonedExpert, setSummonedExpert] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ManifestedArtifact[]>([]);
  const [biasScore, setBiasScore] = useState(12);
  
  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameIntervalRef = useRef<number | null>(null);
  const orbCanvasRef = useRef<HTMLCanvasElement>(null);

  const agentTools = {
    navigate_to: (args: { target: ViewType }) => {
      setActiveTab(args.target);
      setNeuralLog(`NAVIGATION TEMPORELLE VERS ${args.target.toUpperCase()}...`);
      return `Navigation effectuée.`;
    },
    rollback_version: (args: { reason: string }) => {
      setState('rewinding');
      onExecuteAction({ type: 'ROLLBACK', payload: { reason: args.reason } });
      setNeuralLog(`RÉTABLISSEMENT TIMELINE : ${args.reason.toUpperCase()}`);
      setTimeout(() => setState('active'), 2000);
      return "Protocole de rollback initié.";
    },
    summon_expert: (args: { expertId: string, reason: string }) => {
      const exp = EXPERTS.find(e => e.id === args.expertId);
      if (exp) {
        setSummonedExpert(exp.avatar);
        setTimeout(() => setSummonedExpert(null), 8000);
        setNeuralLog(`INVOCATION DE ${exp.name}...`);
        return `Expert invoqué.`;
      }
      return "Expert introuvable.";
    },
    manifest_artifact: (args: { label: string, type: 'strategy' | 'contract' | 'vision' }) => {
      const newArt: ManifestedArtifact = { id: Math.random().toString(36).substr(2, 9), ...args };
      setArtifacts(prev => [newArt, ...prev].slice(0, 3));
      return `Artefact matérialisé.`;
    },
    audit_bias: (args: { score: number }) => {
      setBiasScore(args.score);
      return "Analyse de biais mise à jour.";
    }
  };

  useEffect(() => {
    if (!orbCanvasRef.current || state === 'idle') return;
    const canvas = orbCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() * 0.002;
      const radius = 50 + (vibeLevel / 4) + Math.sin(time * 2) * 5;
      ctx.save();
      ctx.translate(100, 100);
      if (state === 'rewinding') ctx.rotate(-time * 10);
      else ctx.rotate(time * 0.5);
      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, radius + 40);
      grad.addColorStop(0, state === 'rewinding' ? '#ef4444' : (state === 'summoning' ? '#a855f7' : '#3b82f6'));
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [state, vibeLevel]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (frameIntervalRef.current) { window.clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (inputAudioCtxRef.current) { inputAudioCtxRef.current.close(); inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { outputAudioCtxRef.current.close(); outputAudioCtxRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setState('idle');
  }, []);

  const startArchitect = async () => {
    if (state !== 'idle') return;
    setState('syncing');

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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setState('active');
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
              setVibeLevel(85);
              setTimeout(() => setVibeLevel(0), 400);
            }
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                const tool = (agentTools as any)[fc.name];
                if (tool) {
                  const result = await tool(fc.args);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
                }
              }
            }
            if (message.serverContent?.outputTranscription) setNeuralLog(message.serverContent.outputTranscription.text);
          },
          onerror: () => stopSession(),
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [
            { name: 'navigate_to', parameters: { type: Type.OBJECT, properties: { target: { type: Type.STRING } }, required: ['target'] } },
            { name: 'rollback_version', parameters: { type: Type.OBJECT, properties: { reason: { type: Type.STRING } }, required: ['reason'] } },
            { name: 'summon_expert', parameters: { type: Type.OBJECT, properties: { expertId: { type: Type.STRING }, reason: { type: Type.STRING } }, required: ['expertId', 'reason'] } },
            { name: 'manifest_artifact', parameters: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, type: { type: Type.STRING, enum: ['strategy', 'contract', 'vision'] } }, required: ['label', 'type'] } },
            { name: 'audit_bias', parameters: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER } }, required: ['score'] } }
          ] as any }],
          systemInstruction: `ARCHITECTE v32. Tu vois via cam. Actions: 'navigate_to', 'rollback_version', 'summon_expert', 'manifest_artifact'.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopSession(); }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] font-inter">
      {state !== 'idle' && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-5xl flex justify-between items-start pointer-events-auto px-12">
           <div className="glass-panel border-blue-500/20 rounded-[3rem] p-8 w-80 space-y-4 shadow-2xl">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Plan de Destinée</span>
              <div className="space-y-3">
                 {artifacts.map(art => (
                   <div key={art.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${art.type === 'strategy' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                      <span className="text-[10px] font-bold text-slate-200 uppercase">{art.label}</span>
                   </div>
                 ))}
              </div>
           </div>
           <div className="glass-panel border-red-500/20 rounded-[3rem] p-8 w-64 shadow-2xl">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block text-center mb-4">Risque Cognitif</span>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${biasScore}%` }}></div>
              </div>
           </div>
        </div>
      )}

      {state !== 'idle' && state !== 'syncing' && (
        <div className="absolute bottom-12 left-12 pointer-events-auto">
           <div className="relative w-64 aspect-video rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-2xl bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-125 scale-x-[-1]" />
              <div className="absolute top-3 left-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-[8px] font-black text-white uppercase">Vision v32</span></div>
           </div>
        </div>
      )}

      {state !== 'idle' && (
        <div className="absolute bottom-44 left-16 max-w-2xl">
           <div className="p-8 bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl">
              <p className="text-xl font-medium italic text-blue-100 leading-relaxed">"{neuralLog}"</p>
           </div>
        </div>
      )}

      <div className="absolute bottom-12 right-12 flex flex-col items-end gap-6 pointer-events-auto">
        <div className="relative group cursor-pointer" onClick={state === 'active' || state === 'summoning' ? stopSession : startArchitect}>
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 shadow-2xl border-4 ${
            state === 'active' ? 'bg-[#03030b] border-blue-500 scale-110' : 
            state === 'rewinding' ? 'bg-red-900/20 border-red-500 scale-125 rotate-180' :
            'bg-blue-600 border-white/20 hover:scale-105'
          }`}>
            <canvas ref={orbCanvasRef} width={200} height={200} className="absolute inset-0 w-full h-full rounded-full" />
            <i className={`fas ${state === 'idle' ? 'fa-shield-halved' : state === 'syncing' ? 'fa-circle-notch animate-spin' : 'fa-brain'} text-4xl text-white`}></i>
          </div>
        </div>
      </div>
    </div>
  );
};
