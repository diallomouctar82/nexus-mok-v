
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Expert, Message } from '../types';
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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => { return () => stopActiveCall(); }, []);

  const stopActiveCall = useCallback(() => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (frameIntervalRef.current) { window.clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (inputAudioCtxRef.current) { inputAudioCtxRef.current.close(); inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { outputAudioCtxRef.current.close(); outputAudioCtxRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setCallMode('text');
    setIsConnecting(false);
    nextStartTimeRef.current = 0;
  }, []);

  const startLiveCall = async (mode: 'voice' | 'video') => {
    if (isConnecting) return;
    if (callMode !== 'text') { stopActiveCall(); return; }

    setIsConnecting(true);
    setCallMode(mode);

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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
      if (mode === 'video' && videoRef.current) videoRef.current.srcObject = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            
            // Audio Stream
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

            // Video Stream
            if (mode === 'video' && canvasRef.current && videoRef.current) {
              const canvas = canvasRef.current;
              const video = videoRef.current;
              const ctx = canvas.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (ctx && video.videoWidth) {
                  canvas.width = 320;
                  canvas.height = (video.videoHeight / video.videoWidth) * 320;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                  sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                }
              }, 1000 / 2);
            }
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
             if (message.serverContent?.outputTranscription && message.serverContent.turnComplete) {
                onNewMessage({ id: Date.now().toString(), role: 'model', content: `[CALL]: ${message.serverContent.outputTranscription.text}`, timestamp: Date.now() });
             }
          },
          onerror: () => stopActiveCall(),
          onclose: () => stopActiveCall()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: expert.voiceName } } },
          systemInstruction: `Tu es ${expert.name} en liaison audio/vidéo directe. Réagis à la voix et à l'image.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopActiveCall(); }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    onNewMessage(userMsg);
    setInput('');
    setIsTyping(true);

    try {
      await SupabaseService.saveChatMessage(expert.id, 'user', userMsg.content);
      const result = await gemini.sendMessage(expert, userMsg.content, messages, { useThinking });
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: result.text, timestamp: Date.now(), sources: result.sources };
      await SupabaseService.saveChatMessage(expert.id, 'model', modelMsg.content, modelMsg.sources);
      onNewMessage(modelMsg);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex h-full gap-6">
      <canvas ref={canvasRef} className="hidden" />
      {showHistory && (
        <aside className="w-96 glass-panel rounded-[3.5rem] p-8 flex flex-col gap-8 animate-in slide-in-from-left-6">
          <header className="flex justify-between items-center border-b border-white/5 pb-6">
            <h2 className="text-xl font-black italic uppercase text-blue-400 font-orbitron">Archives</h2>
            <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><i className="fas fa-angles-left"></i></button>
          </header>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {EXPERTS.map(exp => (
              <ExpertCard key={exp.id} expert={exp} isActive={expert.id === exp.id} lastMessage={(allHistories[exp.id] || []).at(-1)} onClick={() => onExpertChange(exp)} />
            ))}
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col glass-panel rounded-[3.5rem] overflow-hidden relative border border-white/10 shadow-2xl">
        <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-black/40 z-50">
          <div className="flex items-center gap-6">
            <img src={expert.avatar} alt="" className="w-14 h-14 rounded-2xl border border-white/10" />
            <div>
              <h2 className="font-orbitron font-black text-white uppercase italic">{expert.name}</h2>
              <button onClick={() => setUseThinking(!useThinking)} className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded border mt-1 ${useThinking ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10 text-slate-50'}`}>Deep Sync Mode</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => startLiveCall('voice')} 
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${callMode === 'voice' ? 'bg-blue-600 animate-pulse text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
             >
                <i className="fas fa-phone"></i>
             </button>
             <button 
                onClick={() => startLiveCall('video')} 
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${callMode === 'video' ? 'bg-emerald-600 animate-pulse text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
             >
                <i className="fas fa-video"></i>
             </button>
             {onClose && <button onClick={onClose} className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-red-600 transition-all text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar bg-black/10">
          {callMode === 'video' && (
            <div className="relative aspect-video bg-black/60 rounded-[3rem] border border-blue-500/30 overflow-hidden shadow-2xl mb-10">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/60 px-4 py-2 rounded-xl border border-white/10">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                 <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Liaison Multimodale Active</span>
              </div>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-8 rounded-[2.8rem] border ${m.role === 'user' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 text-slate-100 border-white/10 shadow-xl'}`}>
                <div className="whitespace-pre-wrap font-medium italic">"{m.content}"</div>
              </div>
            </div>
          ))}
          {isTyping && <div className="flex justify-start"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div></div>}
        </div>

        <div className="p-10 bg-black/60 border-t border-white/5">
          <div className="max-w-5xl mx-auto flex gap-6">
            <button 
              onClick={() => startLiveCall('voice')}
              className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all ${callMode !== 'text' ? 'bg-red-600' : 'bg-white/5 border border-white/10 text-slate-400'}`}
            >
              <i className={`fas ${callMode !== 'text' ? 'fa-phone-slash' : 'fa-microphone'} text-xl`}></i>
            </button>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              disabled={callMode !== 'text'}
              placeholder={callMode !== 'text' ? "Le Nexus vous écoute..." : `Commander ${expert.name} par texte...`} 
              className={`flex-1 bg-white/5 border border-white/10 rounded-[3rem] px-12 py-8 text-lg font-medium outline-none focus:border-blue-500 transition-all ${callMode !== 'text' ? 'opacity-30' : ''}`} 
            />
            <button onClick={handleSend} disabled={!input.trim() || isTyping || callMode !== 'text'} className="bg-blue-600 w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-xl active:scale-95 transition-all disabled:opacity-30">
              <i className={`fas ${isTyping ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-2xl`}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
