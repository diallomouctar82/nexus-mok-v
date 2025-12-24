
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiService, gemini } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { AppAction, ViewType } from '../types';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';

interface ArchitectButtonProps {
  currentTab: ViewType;
  setActiveTab: (tab: ViewType) => void;
  onExecuteAction: (action: AppAction) => void;
}

type ArchitectState = 'idle' | 'syncing' | 'active' | 'searching' | 'writing' | 'error';

export const ArchitectBranch: React.FC<ArchitectButtonProps> = ({
  currentTab,
  setActiveTab,
  onExecuteAction,
}) => {
  const [state, setState] = useState<ArchitectState>('idle');
  const [vibeLevel, setVibeLevel] = useState(0);
  const [neuralLog, setNeuralLog] = useState("ARCHITECTURE EN VEILLE...");
  const [lastInsight, setLastInsight] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const orbCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // --- OUTILS DE L'AGENT ---
  const agentTools = {
    navigate: (args: { target: ViewType }) => {
      setActiveTab(args.target);
      setNeuralLog(`NAVIGATION VERS ${args.target.toUpperCase()}...`);
      return `Navigation effectuée vers ${args.target}.`;
    },
    research_investors: async (args: { context: string }) => {
      setState('searching');
      setNeuralLog(`RECHERCHE DE BAILLEURS : ${args.context.toUpperCase()}`);
      const res = await gemini.researchProjectResources(args.context);
      setState('active');
      setLastInsight(res.text);
      return `Résultats trouvés : ${res.text.slice(0, 100)}... Sources : ${res.sources.length}`;
    },
    draft_mission_email: (args: { to: string, context: string }) => {
      setState('writing');
      setNeuralLog(`RÉDACTION EMAIL POUR ${args.to.toUpperCase()}`);
      // Simulé pour le live, l'artefact sera visible dans StrategicHub
      setTimeout(() => setState('active'), 2000);
      return `Email rédigé pour ${args.to} basé sur le contexte.`;
    },
    open_session: (args: { target: string }) => {
      setNeuralLog(`OUVERTURE SESSION : ${args.target.toUpperCase()}`);
      return "Session initialisée.";
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
      const radius = 50 + (vibeLevel / 3) + Math.sin(time * 3) * 8;
      ctx.save();
      ctx.translate(100, 100);
      ctx.rotate(time * 0.4);
      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, radius + 50);
      const color = state === 'searching' ? '#10b981' : (state === 'writing' ? '#f59e0b' : '#3b82f6');
      grad.addColorStop(0, color);
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
    if (inputAudioCtxRef.current) { inputAudioCtxRef.current.close(); inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { outputAudioCtxRef.current.close(); outputAudioCtxRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); }
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
              setVibeLevel(90);
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
            { name: 'navigate', parameters: { type: Type.OBJECT, properties: { target: { type: Type.STRING } }, required: ['target'] } },
            { name: 'research_investors', parameters: { type: Type.OBJECT, properties: { context: { type: Type.STRING } }, required: ['context'] } },
            { name: 'draft_mission_email', parameters: { type: Type.OBJECT, properties: { to: { type: Type.STRING }, context: { type: Type.STRING } }, required: ['to', 'context'] } },
            { name: 'open_session', parameters: { type: Type.OBJECT, properties: { target: { type: Type.STRING } }, required: ['target'] } }
          ] as any }],
          systemInstruction: `Tu es l'ARCHITECTE v42, gestionnaire de projet de bout en bout. 
          Tu accompagnes l'utilisateur du concept au rapport final. 
          Capacités : recherche d'investisseurs réels, rédaction d'emails stratégiques, navigation dans l'app.
          Utilise 'research_investors' pour trouver des partenaires réels sur le web.`
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
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Statut Mission</span>
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-200 uppercase">{state}</span>
              </div>
           </div>
           {lastInsight && (
             <div className="glass-panel border-emerald-500/20 rounded-[3rem] p-8 w-96 shadow-2xl animate-in slide-in-from-top-4">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-4">Insight Détecté</span>
                <p className="text-[11px] text-slate-300 italic truncate group-hover:whitespace-normal">{lastInsight}</p>
             </div>
           )}
        </div>
      )}

      {state !== 'idle' && state !== 'syncing' && (
        <div className="absolute bottom-12 left-12 pointer-events-auto">
           <div className="relative w-72 aspect-video rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-125 scale-x-[-1]" />
              <div className="absolute top-3 left-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-[8px] font-black text-white uppercase">Neural Sight ON</span></div>
           </div>
        </div>
      )}

      {state !== 'idle' && (
        <div className="absolute bottom-48 left-16 max-w-2xl">
           <div className="p-10 bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] shadow-2xl">
              <p className="text-xl font-medium italic text-blue-100 leading-relaxed">"{neuralLog}"</p>
           </div>
        </div>
      )}

      <div className="absolute bottom-12 right-12 flex flex-col items-end gap-6 pointer-events-auto">
        <div className="relative group cursor-pointer" onClick={state === 'active' ? stopSession : startArchitect}>
          <div className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 shadow-2xl border-4 ${
            state === 'active' ? 'bg-[#03030b] border-blue-500 scale-110' : 
            state === 'searching' ? 'bg-emerald-900/20 border-emerald-500 scale-125' :
            'bg-blue-600 border-white/20 hover:scale-105'
          }`}>
            <canvas ref={orbCanvasRef} width={200} height={200} className="absolute inset-0 w-full h-full rounded-full" />
            <i className={`fas ${state === 'idle' ? 'fa-rocket' : state === 'syncing' ? 'fa-circle-notch animate-spin' : 'fa-brain-circuit'} text-5xl text-white`}></i>
          </div>
          {state === 'idle' && (
            <div className="absolute right-full mr-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 pointer-events-none">
               <div className="glass-panel p-6 rounded-2xl whitespace-nowrap">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Invoquer l'Architecte de Mission</span>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
