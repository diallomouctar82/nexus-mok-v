
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Expert, Message, AppAction, Artifact } from '../types';
import { gemini, GeminiService } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { ExpertCard } from './ExpertCard';
import { SupabaseService } from '../services/supabase';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface ChatInterfaceProps {
  expert: Expert;
  messages: Message[];
  allHistories?: Record<string, Message[]>;
  onNewMessage: (msg: Message) => void;
  onClearChat: () => void;
  onExpertChange: (newExpert: Expert) => void;
  onExecuteAction?: (action: AppAction) => void;
  onClose?: () => void;
  isSovereignBranch?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  expert, 
  messages, 
  allHistories = {},
  onNewMessage, 
  onClearChat, 
  onExpertChange,
  onExecuteAction,
  onClose,
  isSovereignBranch = false
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [useThinking, setUseThinking] = useState(true);
  
  // Call States
  const [callMode, setCallMode] = useState<'text' | 'voice' | 'video'>('text');
  const [isConnecting, setIsConnecting] = useState(false);
  const [expertVibe, setExpertVibe] = useState(0);
  const [userVibe, setUserVibe] = useState(0);
  const [callTranscription, setCallTranscription] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const stopActiveCall = useCallback(() => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e){} sessionRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch(e){} audioCtxRef.current = null; }
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      localVideoRef.current.srcObject = null;
    }
    setCallMode('text');
    setIsConnecting(false);
    setCallTranscription("");
    nextStartTimeRef.current = 0;
  }, []);

  const startLiveCall = async (mode: 'voice' | 'video') => {
    if (callMode !== 'text') { stopActiveCall(); return; }
    setIsConnecting(true);
    setCallMode(mode);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioCtxRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: mode === 'video' 
      });

      if (mode === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(console.error);
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Visualizer logic
              const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
              setUserVibe(sum * 25);

              const downsampled = GeminiService.downsample(inputData, audioCtx.sampleRate, 16000);
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) int16[i] = Math.max(-1, Math.min(1, downsampled[i])) * 32767;
              
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: GeminiService.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              })).catch(() => {});
            };
            source.connect(scriptProcessor); scriptProcessor.connect(audioCtx.destination);

            if (mode === 'video') {
              frameIntervalRef.current = window.setInterval(() => {
                if (!frameCanvasRef.current || !localVideoRef.current) return;
                const canvas = frameCanvasRef.current;
                const video = localVideoRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                canvas.width = 320; canvas.height = 240;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                  if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = (reader.result as string).split(',')[1];
                      sessionPromise.then(s => s.sendRealtimeInput({
                        media: { data: base64, mimeType: 'image/jpeg' }
                      })).catch(() => {});
                    };
                    reader.readAsDataURL(blob);
                  }
                }, 'image/jpeg', 0.5);
              }, 1000);
            }
          },
          onmessage: async (m: LiveServerMessage) => {
             const base64Audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && audioCtx) {
                const audioBuffer = await GeminiService.decodeAudioData(GeminiService.decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                const now = audioCtx.currentTime;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                setExpertVibe(100);
                setTimeout(() => setExpertVibe(0), audioBuffer.duration * 1000);
             }
             if (m.serverContent?.outputTranscription) {
               setCallTranscription(m.serverContent.outputTranscription.text);
             }
          },
          onerror: () => stopActiveCall(),
          onclose: () => stopActiveCall()
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          systemInstruction: expert.systemInstruction,
          outputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { 
      console.error(err);
      stopActiveCall(); 
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    onNewMessage(userMsg);
    setInput('');
    setIsTyping(true);
    try {
      await SupabaseService.saveChatMessage(expert.id, 'user', userMsg.content);
      const response = await gemini.sendMessage(expert, userMsg.content, messages, { useThinking, enableTools: true });
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: response.text, timestamp: Date.now(), sources: response.sources };
      await SupabaseService.saveChatMessage(expert.id, 'model', modelMsg.content, modelMsg.sources);
      onNewMessage(modelMsg);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex h-full gap-6 relative">
      {/* Nexus Grid Presence Overlay */}
      {callMode !== 'text' && (
        <div className="fixed inset-0 z-[6000] bg-[#03030b]/98 backdrop-blur-3xl flex flex-col p-8 animate-in fade-in duration-500 overflow-hidden">
           <header className="flex justify-between items-center mb-8 px-6">
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                    <i className={`fas ${callMode === 'video' ? 'fa-video' : 'fa-microphone'} text-white text-xl`}></i>
                 </div>
                 <div>
                    <h2 className="text-3xl font-black italic font-orbitron uppercase tracking-tighter">Liaison <span className="text-blue-500">Nexus Live</span></h2>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Branche Centrale v14.2</span>
                       <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Chiffrement Souverain Actif</span>
                    </div>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={stopActiveCall} className="px-12 py-5 bg-red-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-red-500 hover:scale-105 active:scale-95 transition-all">Couper la liaison</button>
              </div>
           </header>

           <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-[1700px] mx-auto w-full pb-10">
              
              {/* SOUVERAIN (USER) Tile */}
              <div className="flex flex-col gap-4 animate-in slide-in-from-left-10 duration-700">
                 <div className="flex justify-between items-end px-4">
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">SOUVERAIN (VOUS)</span>
                       <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold font-orbitron italic">OPÉRATEUR ALPHA</h3>
                          <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 transition-all duration-75" style={{ width: `${Math.min(100, userVibe)}%` }}></div>
                          </div>
                       </div>
                    </div>
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                       <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Signal Stable</span>
                    </div>
                 </div>
                 
                 <div className="flex-1 relative bg-white/[0.02] border-2 border-white/5 rounded-[4rem] overflow-hidden shadow-2xl group transition-all duration-500 hover:border-blue-500/20">
                    <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-all duration-1000 ${callMode === 'video' ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} />
                    {callMode === 'voice' && (
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${userVibe > 10 ? 'bg-blue-600/20 border-blue-500/40' : 'bg-white/5 border-white/10'} border-2 shadow-2xl`}>
                             <i className={`fas fa-user text-7xl transition-all duration-300 ${userVibe > 10 ? 'text-blue-400 scale-110' : 'text-slate-700'}`}></i>
                          </div>
                       </div>
                    )}
                    <div className={`absolute inset-0 border-[10px] border-blue-500/0 transition-all duration-300 ${userVibe > 20 ? 'border-blue-500/10 shadow-[inset_0_0_100px_rgba(59,130,246,0.2)]' : ''}`}></div>
                    <canvas ref={frameCanvasRef} className="hidden" />
                 </div>
              </div>

              {/* NEURAL CORE (EXPERT) Tile */}
              <div className="flex flex-col gap-4 animate-in slide-in-from-right-10 duration-700">
                 <div className="flex justify-between items-end px-4">
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">NEURAL CORE</span>
                       <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold font-orbitron italic uppercase">{expert.name}</h3>
                          <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className={`h-full bg-purple-500 transition-all duration-500 ${expertVibe > 0 ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                          </div>
                       </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl transition-all duration-500 ${isConnecting ? 'bg-amber-500/10 border-amber-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
                       <span className={`text-[8px] font-black uppercase tracking-widest ${isConnecting ? 'text-amber-400' : 'text-purple-400'}`}>
                          {isConnecting ? 'Synchronisation...' : 'Liaison Active'}
                       </span>
                    </div>
                 </div>

                 <div className="flex-1 relative bg-black/60 border-2 border-purple-500/10 rounded-[4rem] overflow-hidden shadow-2xl group flex items-center justify-center transition-all duration-500 hover:border-purple-500/30">
                    <div className={`absolute inset-0 transition-all duration-1000 ${expertVibe > 0 ? 'bg-purple-600/5 opacity-100' : 'opacity-0'}`}></div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-10">
                       <div className={`w-64 h-64 rounded-full border-4 transition-all duration-700 flex items-center justify-center overflow-hidden ${expertVibe > 0 ? 'scale-105 border-purple-500 shadow-[0_0_100px_rgba(168,85,247,0.3)]' : 'border-white/5 shadow-none'}`}>
                          <img src={expert.avatar} className={`w-full h-full object-cover transition-all duration-1000 ${expertVibe > 0 ? 'grayscale-0 scale-100' : 'grayscale brightness-50 scale-110'}`} alt="" />
                       </div>
                       <div className="text-center space-y-2">
                          <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.5em]">{expert.role}</p>
                       </div>
                    </div>

                    <div className={`absolute inset-0 border-[10px] border-purple-500/0 transition-all duration-300 ${expertVibe > 0 ? 'border-purple-500/10 shadow-[inset_0_0_100px_rgba(168,85,247,0.2)]' : ''}`}></div>
                 </div>
              </div>
           </div>

           {/* Full Width Transcription & Feedback */}
           <footer className="mt-auto max-w-5xl mx-auto w-full flex flex-col items-center gap-8 pb-4 animate-in slide-in-from-bottom-10 duration-700">
              <div className="w-full p-10 bg-white/[0.02] border border-white/5 rounded-[3.5rem] backdrop-blur-xl min-h-[160px] flex items-center justify-center shadow-2xl relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-6 py-1 bg-blue-600 rounded-full">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white">Log Neural Temps Réel</span>
                 </div>
                 <p className="text-3xl font-medium italic text-slate-100 leading-relaxed text-center">
                   {isConnecting ? "Établissement du tunnel neural de souveraineté..." : callTranscription ? `"${callTranscription}"` : "Le Nexus est en attente de signaux vocaux..."}
                 </p>
              </div>
              <div className="flex gap-12 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
                 <span>Latence: 142ms</span>
                 <span>Protocole: Gemini 2.5 Multi-Modal</span>
                 <span>Sync: 99.9%</span>
              </div>
           </footer>
        </div>
      )}

      {showHistory && (
        <aside className="w-96 glass-panel rounded-[3.5rem] p-8 flex flex-col gap-8 animate-in slide-in-from-left-6">
          <header className="flex justify-between items-center border-b border-white/5 pb-6">
            <h2 className="text-xl font-black italic uppercase text-blue-400 font-orbitron">MÉMOIRE</h2>
            <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><i className="fas fa-angles-left"></i></button>
          </header>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {EXPERTS.map(exp => (
              <ExpertCard key={exp.id} expert={exp} isActive={expert.id === exp.id} lastMessage={(allHistories[exp.id] || []).at(-1)} onClick={() => onExpertChange(exp)} />
            ))}
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col glass-panel rounded-[3.5rem] overflow-hidden relative border border-white/10 shadow-2xl transition-all duration-700">
        <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-black/40 z-50">
          <div className="flex items-center gap-6">
            <img src={expert.avatar} alt="" className="w-14 h-14 rounded-2xl border border-white/10" />
            <div>
              <h2 className="font-orbitron font-black text-white uppercase italic">{expert.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                 <span className="text-[7px] font-black uppercase text-emerald-400 tracking-widest">Liaison Cyber-Souveraine</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => startLiveCall('voice')} title="Liaison Vocale" className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center transition-all bg-white/5 hover:bg-blue-600 hover:scale-110 active:scale-95 shadow-xl"><i className="fas fa-microphone"></i></button>
             <button onClick={() => startLiveCall('video')} title="Liaison Vidéo Vision" className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center transition-all bg-white/5 hover:bg-red-600 hover:scale-110 active:scale-95 shadow-xl"><i className="fas fa-video"></i></button>
             {onClose && <button onClick={onClose} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-red-600 transition-all text-slate-400 ml-2"><i className="fas fa-times"></i></button>}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar bg-black/10">
          {messages.map(m => (
            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] p-10 rounded-[3rem] border ${m.role === 'user' ? 'bg-blue-600 border-blue-400 text-white shadow-2xl' : 'bg-white/5 text-slate-100 border-white/10 shadow-xl'}`}>
                <div className="whitespace-pre-wrap font-medium italic text-xl leading-relaxed">"{m.content}"</div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">SOURCES GROUNDING WEB</span>
                    <div className="flex flex-wrap gap-3">
                      {m.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="px-5 py-2 bg-blue-600/10 border border-blue-600/30 rounded-xl text-[10px] text-blue-300 hover:bg-blue-600 hover:text-white transition-all truncate max-w-[240px] font-bold">{s.title}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && <div className="flex justify-start px-4"><div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce shadow-[0_0_15px_#3b82f6]"></div></div>}
        </div>

        <div className="p-10 bg-black/60 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex gap-6">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={`Briefez ${expert.name} sur votre vision...`} className={`flex-1 bg-white/5 border border-white/10 rounded-[3.5rem] px-14 py-8 text-xl font-medium outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-700`} />
            <button onClick={handleSend} disabled={isTyping} className="bg-blue-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
              <i className={`fas ${isTyping ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-3xl`}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
