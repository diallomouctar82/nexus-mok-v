
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EXPERTS } from '../constants';
import { Expert, Message, Artifact, ExpertId, GroundingSource, AppAction } from '../types';
import { gemini, GeminiService } from '../services/geminiService';

const SYNERGY_V28_STYLES = `
  .synergy-grid { display: grid; grid-template-columns: 340px 1fr 460px; gap: 2rem; height: 100%; }
  .neural-arena { background: radial-gradient(circle at center, rgba(37, 99, 235, 0.08) 0%, transparent 80%); position: relative; }
  
  .breakthrough-tag {
    position: absolute; left: -40px; top: 0; width: 28px; height: 28px; background: #3b82f6; border: 2px solid white; border-radius: 6px;
    display: flex; align-items: center; justify-content: center; transform: rotate(45deg); box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); z-index: 50; cursor: help;
  }
  .breakthrough-tag i { transform: rotate(-45deg); font-size: 10px; }

  .anchor-card {
    background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 2rem; padding: 1.5rem;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); cursor: pointer; position: relative; overflow: hidden;
  }
  .anchor-card:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); transform: translateX(8px); }
  .anchor-impact-high { border-left: 4px solid #3b82f6; }

  .synergy-summary-box {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 2.5rem; padding: 2rem; position: relative;
  }

  .spectre-assistant {
    position: fixed; bottom: 120px; right: 500px; width: 70px; height: 70px;
    background: rgba(139, 92, 246, 0.15); backdrop-filter: blur(30px); border: 1px solid rgba(139, 92, 246, 0.4);
    border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: pointer;
    animation: spectreFloat 4s ease-in-out infinite; box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
  }
  @keyframes spectreFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-15px) scale(1.1); box-shadow: 0 0 50px rgba(139, 92, 246, 0.6); } }

  .manifesto-view {
    background: #000; border: 2px solid #3b82f6; border-radius: 4rem; padding: 3rem; max-width: 950px; max-height: 85vh;
    overflow-y: auto; position: relative; box-shadow: 0 0 150px rgba(59, 130, 246, 0.4);
  }

  .neural-canvas { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5; }
  
  .processing-aura {
    position: absolute; inset: -10px; border-radius: 50%; border: 2px solid #3b82f6;
    animation: auraPulse 1.5s infinite; opacity: 0;
  }
  @keyframes auraPulse { 0% { transform: scale(0.9); opacity: 0.8; } 100% { transform: scale(1.3); opacity: 0; } }

  .assistance-badge {
    background: #ef4444; color: white; padding: 4px 10px; border-radius: 8px; font-size: 8px; font-weight: 900;
    text-transform: uppercase; position: absolute; top: -10px; right: 10px; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }
`;

type ProtocolType = 'DEBATE' | 'SOLVE' | 'INVENT';

export const NexusSynergy: React.FC<{ onAction?: (a: AppAction) => void }> = ({ onAction }) => {
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(['diallo', 'maitre_diallo']);
  const [query, setQuery] = useState('');
  const [synergyLog, setSynergyLog] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [protocol, setProtocol] = useState<ProtocolType>('SOLVE');
  const [activeThinkerId, setActiveThinkerId] = useState<string | null>(null);
  
  // v28.0 Neural States
  const [breakthroughs, setBreakthroughs] = useState<{ messageId: string, insight: string, impact: string }[]>([]);
  const [anchors, setAnchors] = useState<{ id: string, title: string, description: string, impact: 'high' | 'medium' }[]>([]);
  const [synergySummary, setSynergySummary] = useState<string>("");
  const [consensusScore, setConsensusScore] = useState(50);
  const [detailedConsensus, setDetailedConsensus] = useState<{ expertId: string, score: number, reasoning: string }[]>([]);
  const [isForgingManifest, setIsForgingManifest] = useState(false);
  const [forgedManifest, setForgedManifest] = useState<any | null>(null);
  const [biasData, setBiasData] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let animFrame: number;
    const particles: {x: number, y: number, vx: number, vy: number, life: number}[] = [];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const density = isProcessing ? 5 : 1;
      for(let i=0; i<density; i++) {
        if (Math.random() > 0.8) {
          particles.push({ 
            x: Math.random() * canvas.width * 0.1, 
            y: Math.random() * canvas.height, 
            vx: (isProcessing ? 6 : 2) + Math.random() * 4, 
            vy: (Math.random() - 0.5) * 1, 
            life: 1 
          });
        }
      }
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.008;
        if(p.life <= 0) particles.splice(i, 1);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.life * (isProcessing ? 0.8 : 0.2)})`;
        ctx.shadowBlur = isProcessing ? 10 : 0;
        ctx.shadowColor = "#3b82f6";
        ctx.beginPath(); ctx.arc(p.x, p.y, isProcessing ? 2 : 1, 0, Math.PI * 2); ctx.fill();
      });
      animFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animFrame);
  }, [isProcessing]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [synergyLog, isProcessing]);

  const runAnalysis = async (history: Message[]) => {
    try {
      const selectedExperts = EXPERTS.filter(e => selectedExpertIds.includes(e.id));
      const [oracle, consensus, bt, bias, extractedAnchors, summary] = await Promise.all([
        gemini.generateSynergyOracle(history),
        gemini.getDetailedConsensus(history, selectedExperts),
        gemini.identifyBreakthroughs(history),
        gemini.auditSynergyBias(history),
        gemini.extractStrategicAnchors(history),
        gemini.generateSynergySummary(history)
      ]);
      setConsensusScore(oracle.consensusScore);
      setDetailedConsensus(consensus);
      setBreakthroughs(bt);
      setBiasData(bias);
      setAnchors(extractedAnchors);
      setSynergySummary(summary);
    } catch (e) { console.error(e); }
  };

  const handleForgeManifest = async () => {
    if (synergyLog.length < 3 || isForgingManifest) return;
    setIsForgingManifest(true);
    try {
      const manifest = await gemini.generateActionManifest(synergyLog);
      setForgedManifest(manifest);
    } catch (e) { console.error(e); } finally { setIsForgingManifest(false); }
  };

  const handleExportToStrategy = () => {
    if (!forgedManifest || !onAction) return;
    onAction({
      type: 'NAVIGATE',
      target: 'strategy',
      payload: { prefillGoal: forgedManifest.title, prefillSummary: forgedManifest.vision }
    });
  };

  const runSynergy = async (customQuery?: string) => {
    const textToSend = customQuery || query;
    if (!textToSend.trim() || selectedExpertIds.length < 2 || isProcessing) return;
    setIsProcessing(true);
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() };
    setSynergyLog(prev => [...prev, userMsg]);
    setQuery('');

    try {
      const selectedExperts = EXPERTS.filter(e => selectedExpertIds.includes(e.id));
      let collectiveHistory = [...synergyLog, userMsg];

      for (let i = 0; i < selectedExperts.length; i++) {
        const expert = selectedExperts[i];
        setActiveThinkerId(expert.id);
        const response = await gemini.sendMessage(expert, textToSend, collectiveHistory, { useThinking: protocol !== 'DEBATE' });
        const newMsg: Message = { id: (Date.now() + i).toString(), role: 'model', content: response.text, timestamp: Date.now(), expertId: expert.id, isSynergy: true };
        setSynergyLog(prev => [...prev, newMsg]);
        collectiveHistory.push(newMsg);
        await new Promise(r => setTimeout(r, 600)); 
      }
      await runAnalysis(collectiveHistory);
    } catch (e) { console.error(e); } finally {
      setIsProcessing(false);
      setActiveThinkerId(null);
    }
  };

  return (
    <div className="h-full bg-[#020208] text-white rounded-[4rem] p-12 overflow-hidden flex flex-col gap-10 shadow-2xl border border-white/5 relative font-inter">
      <style>{SYNERGY_V28_STYLES}</style>
      <canvas ref={canvasRef} width={1400} height={900} className="neural-canvas" />

      {/* Spectre Assistant Float */}
      <div className="spectre-assistant" title="Meta-Analyse du Spectre" onClick={() => alert(`Spectre Status: ${biasData?.dominantBias || 'Analyse en cours...'}\nRecommendation: ${biasData?.recommendation || 'Continuez le débat.'}`)}>
         {isProcessing && <div className="processing-aura"></div>}
         <i className="fas fa-ghost text-indigo-400 text-2xl"></i>
      </div>

      {/* Manifesto Overlay */}
      {forgedManifest && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 p-10 animate-in fade-in duration-500">
           <div className="manifesto-view">
              <header className="flex justify-between items-center mb-10 pb-8 border-b border-white/10">
                 <h2 className="text-4xl font-black italic uppercase text-blue-500 tracking-tighter">Manifeste <span className="text-white">d'Action Collective</span></h2>
                 <button onClick={() => setForgedManifest(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"><i className="fas fa-times"></i></button>
              </header>
              <div className="space-y-12">
                 <div className="space-y-4">
                    <h3 className="text-3xl font-black uppercase text-glow">{forgedManifest.title}</h3>
                    <p className="text-xl text-slate-300 italic leading-relaxed bg-white/5 p-10 rounded-[3rem] border border-white/10">"{forgedManifest.vision}"</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.4em]">Feuille de Route Tactique</h4>
                       <div className="space-y-4">
                          {forgedManifest.roadmap.map((step: string, i: number) => (
                            <div key={i} className="flex gap-5 items-start p-4 hover:bg-white/5 rounded-2xl transition-all">
                               <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0">{i+1}</span>
                               <p className="text-sm font-medium leading-relaxed">{step}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.4em]">Facteurs de Succès Critiques</h4>
                       <div className="space-y-4">
                          {forgedManifest.criticalSuccessFactors.map((f: string, i: number) => (
                            <div key={i} className="p-6 bg-emerald-600/5 border border-emerald-500/20 rounded-[2rem] text-sm font-medium italic relative">
                               <i className="fas fa-star text-emerald-500 absolute -top-2 -left-2 text-xs"></i>
                               {f}
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
              <footer className="mt-16 pt-10 border-t border-white/10 flex gap-6 justify-center">
                 <button onClick={handleExportToStrategy} className="px-16 py-7 bg-blue-600 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all">Déployer dans Strategic Hub</button>
                 <button className="px-16 py-7 bg-white/5 border border-white/10 rounded-[2.5rem] font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">Archiver Ledger</button>
              </footer>
           </div>
        </div>
      )}

      <header className="flex items-center justify-between z-50">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 bg-blue-600 rounded-[3.5rem] flex items-center justify-center text-5xl shadow-[0_0_80px_rgba(59,130,246,0.3)] animate-pulse">🛰️</div>
          <div>
            <h2 className="text-5xl font-black italic font-orbitron uppercase tracking-tighter">NEXUS <span className="text-blue-500">SYNERGY</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] mt-3">Collective Intelligence v28.0 "Collective Matrix"</p>
          </div>
        </div>
        <div className="flex items-center gap-10">
           <div className="text-right">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Convergence Neurale</span>
              <div className="flex items-center gap-5 mt-2">
                 <div className="w-40 h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-[2s]" style={{ width: `${consensusScore}%` }}></div></div>
                 <span className="text-2xl font-black font-orbitron text-blue-400">{consensusScore}%</span>
              </div>
           </div>
           <div className="flex bg-white/5 p-2 rounded-3xl border border-white/10 shadow-inner">
              {(['DEBATE', 'SOLVE', 'INVENT'] as ProtocolType[]).map(p => (
                <button key={p} onClick={() => setProtocol(p)} className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${protocol === p ? 'bg-blue-600 text-white shadow-2xl' : 'text-slate-500 hover:text-white'}`}>
                  {p === 'SOLVE' ? 'Résolution' : p === 'INVENT' ? 'Invention' : 'Débat'}
                </button>
              ))}
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden synergy-grid z-10">
        {/* Left: Expert Roster & Recommendations */}
        <aside className="bg-black/40 border border-white/5 rounded-[4rem] p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
           <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest px-4">Le Conseil Actif</h3>
              <div className="space-y-4">
                 {EXPERTS.map(expert => (
                   <button 
                      key={expert.id} 
                      onClick={() => setSelectedExpertIds(prev => prev.includes(expert.id) ? (prev.length > 2 ? prev.filter(id => id !== expert.id) : prev) : [...prev, expert.id])}
                      className={`w-full p-6 rounded-[3rem] border transition-all flex items-center gap-6 relative group/node ${selectedExpertIds.includes(expert.id) ? 'active bg-blue-600/10 border-blue-500/40 shadow-xl' : 'bg-white/5 border-transparent opacity-40 hover:opacity-100'}`}
                   >
                      {activeThinkerId === expert.id && <div className="processing-aura"></div>}
                      <div className="relative">
                         <img src={expert.avatar} className={`w-16 h-16 rounded-[1.8rem] object-cover border-2 transition-all ${selectedExpertIds.includes(expert.id) ? 'border-blue-400 scale-110' : 'border-white/10'}`} alt="" />
                         {selectedExpertIds.includes(expert.id) && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-[#020208] animate-pulse"></div>}
                      </div>
                      <div className="text-left overflow-hidden">
                         <div className="text-[14px] font-black uppercase text-white truncate">{expert.name}</div>
                         <div className="text-[9px] font-bold text-slate-500 uppercase truncate tracking-tighter">{expert.role}</div>
                      </div>
                   </button>
                 ))}
              </div>
           </div>

           {biasData && (
             <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] space-y-4">
                <h4 className="text-[9px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-3"><i className="fas fa-microchip"></i> Audit Cognitif</h4>
                <p className="text-[11px] text-slate-400 italic leading-relaxed">"{biasData.recommendation}"</p>
             </div>
           )}
        </aside>

        {/* Center: Neural Timeline & Summaries */}
        <div className="flex flex-col gap-8 neural-arena">
           <div ref={scrollRef} className="flex-1 bg-black/60 rounded-[4.5rem] border border-white/5 p-16 overflow-y-auto custom-scrollbar space-y-20 relative">
              {synergyLog.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-12 opacity-10">
                   <i className="fas fa-brain-circuit text-9xl text-blue-500 animate-pulse"></i>
                   <div className="space-y-4">
                      <p className="text-4xl font-black uppercase tracking-[0.5em] text-white">Prêt pour Fusion</p>
                      <p className="text-sm font-bold uppercase tracking-widest text-blue-400">Chronos Weaver Engine v28.0</p>
                   </div>
                </div>
              )}

              {synergyLog.map((m, idx) => {
                const expert = EXPERTS.find(e => e.id === m.expertId);
                const bt = breakthroughs.find(b => b.messageId === m.id);
                return (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} synergy-bubble relative animate-in slide-in-from-bottom-8 duration-700`} style={{ animationDelay: `${idx * 0.1}s` }}>
                     {bt && (
                        <div className="breakthrough-tag" title={bt.insight}><i className="fas fa-bolt-lightning text-white"></i></div>
                     )}
                     <div className={`max-w-[85%] flex gap-10 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {expert && <img src={expert.avatar} className="w-18 h-18 rounded-[2rem] border-2 border-blue-500/40 object-cover mt-2 shadow-2xl" alt="" />}
                        <div className={`p-10 rounded-[3.5rem] text-xl border shadow-2xl relative transition-all group/bubble ${m.role === 'user' ? 'bg-blue-600 border-blue-400 text-white rounded-tr-none' : 'bg-white/5 backdrop-blur-3xl text-slate-100 rounded-tl-none border-white/10 hover:border-blue-500/30'}`}>
                           {expert && <div className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-8 border-b border-white/5 pb-4">{expert.name}</div>}
                           <div className="whitespace-pre-wrap font-medium italic leading-relaxed">"{m.content}"</div>
                        </div>
                     </div>
                  </div>
                );
              })}
              {isProcessing && <div className="flex justify-start gap-4"><div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce shadow-lg"></div><div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-150 shadow-lg"></div><div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-300 shadow-lg"></div></div>}
           </div>

           {synergySummary && (
             <div className="synergy-summary-box animate-in slide-in-from-top-4">
                <div className="assistance-badge">Synthèse Temps Réel</div>
                <p className="text-sm font-black italic text-blue-100 leading-relaxed truncate group-hover:whitespace-normal transition-all">
                  <i className="fas fa-sparkles mr-3 text-blue-400"></i> {synergySummary}
                </p>
             </div>
           )}

           <div className="p-10 bg-black/40 border-t border-white/5 rounded-[4rem] shadow-2xl">
              <div className="max-w-5xl mx-auto flex gap-8">
                 <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSynergy()} placeholder="Lancez une problématique au Conseil Diallo..." className="flex-1 bg-white/5 border border-white/10 rounded-[3rem] px-14 py-8 text-2xl font-medium outline-none focus:border-blue-500 transition-all shadow-inner" />
                 <button onClick={() => runSynergy()} disabled={isProcessing || selectedExpertIds.length < 2 || !query.trim()} className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.6)] active:scale-90 transition-all hover:scale-105">
                    <i className="fas fa-bolt-auto text-3xl"></i>
                 </button>
              </div>
           </div>
        </div>

        {/* Right: Matrix, Anchors & Action Forge */}
        <aside className="assistant-panel rounded-[4rem] p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
           <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-lg">⚡</div>
                 <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Matrice de Fusion</h4>
              </div>
              <span className="text-[9px] font-black text-blue-500 uppercase">v28.0 Active</span>
           </div>

           {/* Strategic Anchors Section */}
           <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase text-slate-600 tracking-widest px-4">Ancres Stratégiques</h5>
              <div className="space-y-4">
                 {anchors.length === 0 ? (
                   <div className="py-16 text-center opacity-10 border-2 border-dashed border-white/10 rounded-[3rem]">En attente de décisions...</div>
                 ) : anchors.map(anchor => (
                   <div key={anchor.id} className={`anchor-card ${anchor.impact === 'high' ? 'anchor-impact-high' : ''}`}>
                      <h6 className="text-[13px] font-black uppercase italic mb-2 tracking-tight">{anchor.title}</h6>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">"{anchor.description}"</p>
                      {anchor.impact === 'high' && <span className="absolute top-4 right-4 text-[7px] font-black text-blue-400">CRITIQUE</span>}
                   </div>
                 ))}
              </div>
           </div>

           {/* Alignment Matrix */}
           <div className="space-y-6 pt-6 border-t border-white/5">
              <h5 className="text-[10px] font-black uppercase text-slate-600 tracking-widest px-4">Alignement Experts</h5>
              <div className="grid grid-cols-1 gap-4">
                 {detailedConsensus.map(c => (
                    <div key={c.expertId} className="matrix-item p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/40 transition-all cursor-help" title={c.reasoning}>
                       <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black uppercase text-white">{EXPERTS.find(e => e.id === c.expertId)?.name || c.expertId}</span>
                          <span className="text-xs font-black text-blue-400">{c.score}%</span>
                       </div>
                       <div className="h-1.5 bg-black rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 transition-all duration-1000" style={{ width: `${c.score}%` }}></div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Action Forge Section */}
           <div className="space-y-6 pt-10 border-t border-white/5">
              <h5 className="text-[10px] font-black uppercase text-slate-600 tracking-widest px-4">Nexus Action Forge</h5>
              <button 
                onClick={handleForgeManifest} 
                disabled={synergyLog.length < 3 || isForgingManifest}
                className="w-full py-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.02] transition-all disabled:opacity-30 shadow-[0_0_50px_rgba(59,130,246,0.3)] group"
              >
                 <span className="group-hover:tracking-[0.5em] transition-all duration-500">
                    {isForgingManifest ? 'Extraction Cognitve...' : 'Forger Manifeste Mondial'}
                 </span>
              </button>
              
              {breakthroughs.length > 0 && (
                 <div className="p-8 bg-emerald-600/5 border border-emerald-500/20 rounded-[3rem] space-y-6 animate-in slide-in-from-right-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
                    <h5 className="text-[9px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-3">
                       <i className="fas fa-atom animate-spin-slow"></i> Breakthrough Insight
                    </h5>
                    <p className="text-xs text-slate-300 italic leading-relaxed relative z-10">"{breakthroughs[breakthroughs.length-1].insight}"</p>
                 </div>
              )}
           </div>
        </aside>
      </main>

      <footer className="absolute bottom-6 left-12 right-12 h-10 bg-black/60 border-t border-white/5 rounded-full flex items-center px-12 overflow-hidden shadow-2xl">
         <div className="flex gap-32 animate-marquee whitespace-nowrap text-[10px] font-black uppercase text-slate-600 tracking-widest italic">
            <span>• SYNERGY MATRIX: v28.0 "COLLECTIVE SOUVEREIGNTY" ACTIVE</span>
            <span>• SPECTRE ASSISTANT: AUDIT DE BIAIS TEMPS RÉEL OPÉRATIONNEL</span>
            <span>• AGENTS EN LIAISON: {selectedExpertIds.join(' <> ').toUpperCase()}</span>
            <span>• ANCRES DÉTECTÉES: {anchors.length}</span>
            <span>• SOUVERAINETÉ DIALLO: CERTIFIÉE PAR LE NEXUS</span>
            <span>• PROTOCOLE CHRONOS: SYNC OK</span>
         </div>
      </footer>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 50s linear infinite; display: inline-flex; width: 200%; }
        .animate-spin-slow { animation: spin 10s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
