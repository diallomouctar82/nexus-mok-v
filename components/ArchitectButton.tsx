
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiService, gemini } from '../services/geminiService';
import { AppAction, ViewType, Message } from '../types';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SettingsService } from '../services/settingsService';

interface ArchitectButtonProps {
  currentTab: ViewType;
  setActiveTab: (tab: ViewType) => void;
  onExecuteAction: (action: AppAction) => void;
}

type ArchitectState = 'idle' | 'syncing' | 'active' | 'thinking' | 'searching' | 'writing' | 'orchestrating' | 'error';

export const ArchitectBranch: React.FC<ArchitectButtonProps> = ({
  currentTab,
  setActiveTab,
  onExecuteAction,
}) => {
  const [state, setState] = useState<ArchitectState>('idle');
  const [vibeLevel, setVibeLevel] = useState(0);
  const [userVibeLevel, setUserVibeLevel] = useState(0);
  const [neuralLog, setNeuralLog] = useState("SYSTÈME EN VEILLE");
  const [deepThought, setDeepThought] = useState("");
  const [coherenceIndex, setCoherenceIndex] = useState(99.8);
  const [signalStrength, setSignalStrength] = useState(100);
  
  const sessionRef = useRef<any>(null);
  const isUserTerminated = useRef<boolean>(false);
  const orbCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const archConfig = SettingsService.getArchitectConfig();

  // Animation Orb Neural Hyper-Innovation
  useEffect(() => {
    if (!orbCanvasRef.current || state === 'idle') return;
    const canvas = orbCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() * 0.002;
      const center = { x: canvas.width / 2, y: canvas.height / 2 };
      
      // Halo de fond
      const bgGrad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 150);
      bgGrad.addColorStop(0, state === 'thinking' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fractales Dynamiques
      for (let i = 0; i < 3; i++) {
        const radius = 60 + (vibeLevel / 4) + Math.sin(time + i) * 10;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = i === 0 ? 'rgba(59, 130, 246, 0.5)' : i === 1 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 10]);
        ctx.lineDashOffset = time * 20 * (i + 1);
        ctx.stroke();
      }

      // Noyau Stable
      const coreRadius = 40 + (userVibeLevel / 10);
      const coreGrad = ctx.createRadialGradient(center.x, center.y, 10, center.x, center.y, coreRadius);
      coreGrad.addColorStop(0, '#fff');
      coreGrad.addColorStop(0.5, '#3b82f6');
      coreGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(center.x, center.y, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      frame = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(frame);
  }, [state, vibeLevel, userVibeLevel]);

  const stopSession = useCallback(() => {
    isUserTerminated.current = true;
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (inputAudioCtxRef.current) { try { inputAudioCtxRef.current.close(); } catch(e) {} inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { try { outputAudioCtxRef.current.close(); } catch(e) {} outputAudioCtxRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    
    setState('idle');
    setNeuralLog("LIAISON COUPÉE.");
    setDeepThought("");
  }, []);

  const startArchitect = async () => {
    if (state !== 'idle') { stopSession(); return; }
    
    isUserTerminated.current = false;
    setState('syncing');
    setNeuralLog("INITIALISATION DU SHELL NEURAL...");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputAudioCtxRef.current = inputCtx; 
      outputAudioCtxRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setState('active');
            setNeuralLog("LIAISON SOUVERAINE ÉTABLIE.");
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
              setUserVibeLevel(sum * 20);

              const downsampled = GeminiService.downsample(inputData, inputCtx.sampleRate, 16000);
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) int16[i] = Math.max(-1, Math.min(1, downsampled[i])) * 32767;
              
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: GeminiService.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              })).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            // Audio Output Handling
            const base64Audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              const audioBuffer = await GeminiService.decodeAudioData(GeminiService.decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource(); 
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              
              const now = outputCtx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              
              setVibeLevel(100); 
              setTimeout(() => setVibeLevel(0), audioBuffer.duration * 1000);
            }

            // Deep Thinking Emulation (via transcription stream)
            if (m.serverContent?.outputTranscription) {
              setNeuralLog(m.serverContent.outputTranscription.text);
            }
          },
          onerror: () => stopSession(),
          onclose: () => { if (!isUserTerminated.current) stopSession(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: SettingsService.buildSystemPrompt(archConfig) + "\nINSTRUCTION SPECIALE : Tu as le contrôle total du shell. Anticipe les besoins de l'utilisateur."
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopSession(); }
  };

  return (
    <div className={`fixed inset-0 z-[9999] transition-all duration-1000 ${state === 'idle' ? 'pointer-events-none' : 'pointer-events-auto'}`}>
      
      {/* Immersive Overlay Shell */}
      <div className={`absolute inset-0 bg-black/90 backdrop-blur-3xl transition-opacity duration-1000 ${state === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
         
         {/* Télémétrie Top Bar */}
         <div className="absolute top-12 left-12 right-12 flex justify-between items-center animate-in slide-in-from-top-10 duration-700">
            <div className="flex items-center gap-8">
               <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-2xl">🛡️</div>
               <div>
                  <h2 className="text-3xl font-black font-orbitron italic uppercase tracking-tighter">Architecte <span className="text-blue-500">Souverain</span></h2>
                  <div className="flex items-center gap-3 mt-1">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Protocol v16.0 Active</span>
                  </div>
               </div>
            </div>
            <div className="flex gap-12 text-right">
               <div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Index de Cohérence</div>
                  <div className="text-2xl font-black font-orbitron text-blue-400">{coherenceIndex}%</div>
               </div>
               <div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Signal Neural</div>
                  <div className="text-2xl font-black font-orbitron text-white">{signalStrength}%</div>
               </div>
            </div>
         </div>

         {/* Central Intelligence Shell */}
         <div className="absolute inset-0 flex flex-col items-center justify-center p-20">
            <div className="relative w-[600px] h-[600px] flex items-center justify-center">
               <canvas ref={orbCanvasRef} width={600} height={600} className="absolute inset-0 w-full h-full" />
               <div className={`transition-all duration-1000 text-center z-10 ${state === 'thinking' ? 'scale-110' : 'scale-100'}`}>
                  <p className="text-5xl font-black italic font-orbitron text-glow uppercase tracking-tighter mb-8">
                    {state === 'thinking' ? 'Deep Thinking...' : state === 'syncing' ? 'Syncing...' : 'System Online'}
                  </p>
               </div>
            </div>

            {/* Transcription / Neural Log Bubble */}
            <div className="max-w-4xl w-full mt-20 animate-in slide-in-from-bottom-10 duration-700 delay-300">
               <div className="p-16 bg-white/[0.03] border border-white/10 rounded-[4rem] backdrop-blur-md shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                  <p className="text-4xl font-medium italic text-blue-100 leading-relaxed text-center">
                    "{neuralLog || 'Liaison neuronale stable...'}"
                  </p>
               </div>
            </div>
         </div>

         {/* Vision Feed (Caméra) */}
         <div className="absolute bottom-12 left-12 w-80 aspect-video rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-2xl group">
            <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-red-600 rounded-lg text-[8px] font-black uppercase">Vision IA Active</div>
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-125 scale-x-[-1]" />
            <div className="absolute inset-0 border-[10px] border-blue-500/0 group-hover:border-blue-500/10 transition-all"></div>
         </div>

         {/* Action Sidebar (Summon) */}
         <div className="absolute bottom-12 right-12 flex flex-col items-end gap-6">
            <button onClick={stopSession} className="px-12 py-5 bg-red-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Désactiver Shell</button>
         </div>

      </div>

      {/* Floating Summoner Orb (Idle State) */}
      {state === 'idle' && (
        <div className="absolute bottom-12 right-12 group pointer-events-auto">
          <div className="nexus-tooltip mb-4 mr-12 bg-blue-600 text-white font-black text-xs px-6 py-3 rounded-full">INITIALISER SHELL ARCHITECTE</div>
          <button 
            onClick={startArchitect}
            className="w-28 h-28 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(59,130,246,0.5)] hover:scale-110 active:scale-90 transition-all border-4 border-white/20 animate-bounce"
          >
            <i className="fas fa-brain-circuit"></i>
          </button>
        </div>
      )}

      <style>{`
        .text-glow { text-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
