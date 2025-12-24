
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EXPERTS } from '../constants';
import { Expert, Message, Artifact, ExpertId } from '../types';
import { gemini } from '../services/geminiService';

const GENIUS_STYLES = `
  .genius-grid { display: grid; grid-template-columns: 340px 1fr 420px; gap: 1.5rem; height: 100%; }
  .expert-forge-overlay { background: rgba(3, 3, 11, 0.98); backdrop-filter: blur(80px); z-index: 1000; }
  .forge-glow { animation: forgePulse 3s infinite; }
  @keyframes forgePulse { 0% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.2); } 50% { box-shadow: 0 0 60px rgba(99, 102, 241, 0.5); } 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.2); } }
`;

export const GeniusHub: React.FC = () => {
  const [experts, setExperts] = useState<Expert[]>(EXPERTS);
  const [activeExperts, setActiveExperts] = useState<Expert[]>([EXPERTS[0]]);
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Forge State
  const [showForge, setShowForge] = useState(false);
  const [forgePrompt, setForgePrompt] = useState('');
  const [isForging, setIsForging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentExpert = activeExperts[0];
  const currentMessages = chatHistories[currentExpert.id] || [];

  const handleSynthesize = async () => {
    if (!forgePrompt.trim() || isForging) return;
    setIsForging(true);
    try {
      const newExpert = await gemini.synthesizeExpert(forgePrompt);
      setExperts(prev => [newExpert, ...prev]);
      setActiveExperts([newExpert]);
      setShowForge(false);
      setForgePrompt('');
    } catch (e) {
      alert("Échec du forgeage neural.");
    } finally {
      setIsForging(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setChatHistories(prev => ({ ...prev, [currentExpert.id]: [...(prev[currentExpert.id] || []), userMsg] }));
    setInput('');
    setIsProcessing(true);
    try {
      const response = await gemini.sendMessage(currentExpert, userMsg.content, currentMessages);
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: response.text, timestamp: Date.now(), expertId: currentExpert.id };
      setChatHistories(prev => ({ ...prev, [currentExpert.id]: [...(prev[currentExpert.id] || []), modelMsg] }));
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] overflow-hidden flex flex-col border border-white/5 relative font-inter">
      <style>{GENIUS_STYLES}</style>
      
      {/* Neural Forge Overlay */}
      {showForge && (
        <div className="absolute inset-0 expert-forge-overlay flex items-center justify-center p-20 animate-in fade-in zoom-in-95 duration-500">
           <div className="w-full max-w-4xl bg-black/60 border border-white/10 rounded-[4rem] p-16 flex flex-col items-center text-center gap-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 forge-glow"></div>
              <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl animate-pulse">⚒️</div>
              <div className="space-y-4">
                 <h2 className="text-5xl font-black italic uppercase tracking-tighter font-orbitron">Neural <span className="text-indigo-400">Forge</span></h2>
                 <p className="text-xl text-slate-400 font-medium italic">Décrivez l'expert que vous souhaitez synthétiser.</p>
              </div>
              <textarea 
                value={forgePrompt}
                onChange={e => setForgePrompt(e.target.value)}
                placeholder="Ex: Un expert en blockchain spécialisé dans les contrats agricoles au Sénégal, avec un ton protecteur et technique..."
                className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-10 py-10 text-xl font-medium outline-none focus:border-indigo-500 transition-all h-48 resize-none shadow-inner"
              />
              <div className="flex gap-6 w-full">
                 <button onClick={handleSynthesize} disabled={isForging || !forgePrompt.trim()} className="flex-1 py-6 bg-indigo-600 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
                    {isForging ? 'Synthèse en cours...' : 'Forger l\'Expert IA'}
                 </button>
                 <button onClick={() => setShowForge(false)} className="px-12 py-6 bg-white/5 border border-white/10 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">Annuler</button>
              </div>
           </div>
        </div>
      )}

      <header className="px-10 py-8 border-b border-white/5 bg-black/40 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl shadow-xl border border-white/20">🧠</div>
          <div>
            <h1 className="text-3xl font-black italic font-orbitron uppercase tracking-tighter text-indigo-400">Génie <span className="text-white">IA</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-1">Sovereign Expert Synthesis v15.0</p>
          </div>
        </div>
        <button onClick={() => setShowForge(true)} className="px-10 py-4 bg-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all">
           <i className="fas fa-plus mr-3"></i> Synthétiser Expert
        </button>
      </header>

      <main className="flex-1 overflow-hidden genius-grid p-8">
        <aside className="bg-white/5 rounded-[3rem] p-6 space-y-6 overflow-y-auto custom-scrollbar">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Experts Disponibles</h3>
           <div className="space-y-3">
              {experts.map(e => (
                <button 
                  key={e.id} 
                  onClick={() => setActiveExperts([e])}
                  className={`w-full p-4 rounded-3xl flex items-center gap-4 transition-all border ${activeExperts[0].id === e.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  <img src={e.avatar} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  <div className="text-left overflow-hidden">
                     <div className="text-xs font-black uppercase text-white truncate">{e.name}</div>
                     <div className="text-[8px] font-bold text-slate-500 uppercase truncate">{e.role}</div>
                  </div>
                </button>
              ))}
           </div>
        </aside>

        <div className="flex flex-col bg-black/40 rounded-[3rem] border border-white/5 overflow-hidden">
           <div className="px-10 py-6 border-b border-white/5 flex items-center gap-4">
              <img src={currentExpert.avatar} className="w-10 h-10 rounded-xl" alt="" />
              <h2 className="font-orbitron font-black text-white italic uppercase">{currentExpert.name}</h2>
           </div>
           <div ref={scrollRef} className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar">
              {currentMessages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm italic ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                      "{m.content}"
                   </div>
                </div>
              ))}
           </div>
           <div className="p-8 border-t border-white/5 flex gap-4">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={`Briefez ${currentExpert.name}...`} 
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500" 
              />
              <button onClick={handleSend} className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center"><i className="fas fa-paper-plane"></i></button>
           </div>
        </div>

        <aside className="bg-white/5 rounded-[3rem] p-10 space-y-10">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Propriétés de l'Expert</h3>
           <div className="text-center space-y-6">
              <img src={currentExpert.avatar} className="w-32 h-32 rounded-full mx-auto border-4 border-indigo-500 shadow-2xl" alt="" />
              <div className="space-y-2">
                 <h4 className="text-2xl font-black uppercase italic">{currentExpert.name}</h4>
                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{currentExpert.role}</p>
              </div>
              <p className="text-sm text-slate-400 italic font-medium leading-relaxed px-4">"{currentExpert.description}"</p>
           </div>
           <div className="pt-10 border-t border-white/5 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                 <span>Identité Neurale</span>
                 <span className="text-emerald-400">Certifiée</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                 <span>Empreinte Vocale</span>
                 <span className="text-indigo-400">{currentExpert.voiceName}</span>
              </div>
           </div>
        </aside>
      </main>
    </div>
  );
};
