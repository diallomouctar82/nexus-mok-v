
import React, { useState, useEffect, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { StrategicPlan, ViewType, AppAction, SovereignSnapshot } from '../types';
import { EXPERTS } from '../constants';

const STRATEGY_STYLES = `
  .strategy-grid { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; height: 100%; }
  .neural-timeline { position: relative; padding-left: 3rem; border-left: 2px solid rgba(59, 130, 246, 0.1); }
  .step-node { position: absolute; left: -11px; top: 0; width: 20px; height: 20px; border-radius: 50%; border: 4px solid #050515; transition: all 0.3s ease; }
  .node-active { background: #3b82f6; box-shadow: 0 0 20px #3b82f6; transform: scale(1.2); }
  .hologram-card { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1); }
  .hologram-card:hover { background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.3); transform: translateX(10px) translateY(-5px); }
  .chronos-ledger { background: rgba(13, 13, 28, 0.6); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 3rem; }
  .snapshot-item { border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.3s ease; }
  .snapshot-item:hover { background: rgba(59, 130, 246, 0.1); }
  .glitch-overlay {
    position: absolute; inset: 0; background: #3b82f6; mix-blend-mode: color-dodge; 
    opacity: 0; pointer-events: none; z-index: 500;
  }
  .glitch-active { animation: glitchAnim 0.4s linear forwards; }
  @keyframes glitchAnim {
    0% { opacity: 0; transform: translateX(0); }
    20% { opacity: 0.5; transform: translateX(-10px); }
    40% { opacity: 0.8; transform: translateX(10px); }
    100% { opacity: 0; transform: translateX(0); }
  }
`;

interface StrategicHubProps {
  onNavigate: (v: ViewType) => void;
  onExecute: (a: AppAction) => void;
  externalGoal?: string | null;
  onGoalConsumed?: () => void;
}

export const StrategicHub: React.FC<StrategicHubProps> = ({ onNavigate, onExecute, externalGoal, onGoalConsumed }) => {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<StrategicPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [refinementInput, setRefinementInput] = useState('');
  const [history, setHistory] = useState<SovereignSnapshot[]>([]);
  const [isGlitching, setIsGlitching] = useState(false);
  
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '> ARCHITECTE .CORE INITIALIZED',
    '> CHRONOS LEDGER ACTIVE'
  ]);

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalGoal) {
      setGoal(externalGoal);
      handleGenerate(externalGoal);
      onGoalConsumed?.();
    }
  }, [externalGoal]);

  const addLog = (msg: string) => setTerminalLogs(prev => [...prev.slice(-20), `> ${msg.toUpperCase()}`]);

  const saveSnapshot = (newPlan: StrategicPlan, label: string) => {
    const snap: SovereignSnapshot = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      label,
      plan: newPlan,
      view: 'strategy'
    };
    setHistory(prev => [snap, ...prev].slice(0, 10));
  };

  const handleRestore = (snap: SovereignSnapshot) => {
    setIsGlitching(true);
    setTimeout(() => {
      setPlan(snap.plan);
      setGoal(snap.plan.goal);
      addLog(`RESTAURATION VERSION : ${snap.label}`);
      setIsGlitching(false);
    }, 400);
  };

  const handleGenerate = async (forcedGoal?: string) => {
    const finalGoal = forcedGoal || goal;
    if (!finalGoal.trim()) return;
    setIsGenerating(true);
    addLog(`ANALYSE AMBITION : ${finalGoal}`);
    try {
      const result = await gemini.generateStrategicPlan(finalGoal);
      setPlan(result);
      saveSnapshot(result, `Init: ${finalGoal.slice(0, 20)}...`);
      addLog('CONVERGENCE RÉUSSIE. PLAN GÉNÉRÉ.');
    } catch (e) {
      addLog('ERREUR NEXUS : ÉCHEC CALCUL.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementInput.trim() || !plan || isGenerating) return;
    setIsGenerating(true);
    const req = refinementInput;
    setRefinementInput('');
    addLog(`REQUÊTE RAFFINEMENT : ${req}`);
    
    try {
      const updatedPlan = await gemini.refineStrategicPlan(plan, req);
      setPlan(updatedPlan);
      saveSnapshot(updatedPlan, `Modif: ${req.slice(0, 20)}...`);
      addLog('BRANCHE NEURALE MISE À JOUR.');
    } catch (e) {
      addLog('ERREUR RAFFINEMENT.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] p-12 overflow-hidden flex flex-col border border-white/5 relative font-inter cyber-grid">
      <style>{STRATEGY_STYLES}</style>
      <div className={`glitch-overlay ${isGlitching ? 'glitch-active' : ''}`}></div>
      
      <header className="flex items-center justify-between z-10 mb-12">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 bg-blue-600 rounded-[3rem] flex items-center justify-center text-5xl shadow-[0_0_80px_rgba(59,130,246,0.3)] animate-pulse border border-white/20">🏛️</div>
          <div>
            <h1 className="text-5xl font-black italic font-orbitron uppercase tracking-tighter text-white">HUB <span className="text-blue-500">STRATÉGIQUE</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Gestion des Timelines & Snapshots Souverains</p>
          </div>
        </div>
        
        {plan && (
          <div className="flex gap-4">
             <button onClick={() => setPlan(null)} className="px-8 py-4 bg-white/5 border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Nouveau Destin</button>
          </div>
        )}
      </header>

      {!plan ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-16 animate-in zoom-in-95 duration-700">
           <div className="text-center space-y-8">
              <i className="fas fa-clock-rotate-left text-9xl text-blue-600/20"></i>
              <h2 className="text-6xl font-black uppercase italic leading-none tracking-tighter">Réécrivez votre <span className="text-blue-500">Histoire</span>.</h2>
              <p className="text-slate-400 text-2xl font-medium max-w-2xl mx-auto italic">Chaque version de votre projet est scellée dans le registre temporel.</p>
           </div>
           
           <div className="w-full relative flex gap-4 p-3 bg-black/60 border border-white/10 rounded-[3.5rem] focus-within:border-blue-500/50 shadow-2xl transition-all">
              <input 
                 type="text" value={goal} onChange={e => setGoal(e.target.value)} 
                 onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                 placeholder="Ex: Devenir leader de l'énergie solaire au Mali..."
                 className="flex-1 bg-transparent px-10 py-6 text-xl outline-none"
              />
              <button onClick={() => handleGenerate()} disabled={isGenerating} className="px-16 bg-blue-600 rounded-[2.8rem] font-black uppercase text-xs tracking-widest transition-all">
                {isGenerating ? 'Convergence...' : 'Générer Vision'}
              </button>
           </div>
        </div>
      ) : (
        <main className="flex-1 strategy-grid overflow-hidden z-10 animate-in slide-in-from-bottom-12 duration-1000">
           <div className="overflow-y-auto custom-scrollbar pr-10 space-y-10">
              <div className="p-16 hologram-card rounded-[4rem] border-blue-500/20">
                 <p className="text-3xl font-black italic leading-tight text-white/90">"{plan.summary}"</p>
              </div>

              <div className="neural-timeline space-y-12 pb-20">
                 {plan.steps.map((step, idx) => (
                    <div key={step.id} className={`relative group/step transition-all ${activeStepIdx === idx ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98]'}`} onClick={() => setActiveStepIdx(idx)}>
                       <div className={`step-node ${activeStepIdx === idx ? 'node-active' : 'bg-slate-800'}`}></div>
                       <div className="hologram-card p-10 rounded-[3.5rem] cursor-pointer relative overflow-hidden">
                          <div className="flex justify-between items-start mb-6">
                             <h3 className="text-2xl font-black uppercase italic text-blue-400">{step.title}</h3>
                             <span className="text-4xl font-black text-white/5">0{idx + 1}</span>
                          </div>
                          <p className="text-base text-slate-400 font-medium italic mb-8">"{step.description}"</p>
                          <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${step.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></div>
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{step.status}</span>
                             </div>
                             <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest">Assistant Tactique</button>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <aside className="space-y-8 flex flex-col">
              <div className="chronos-ledger p-10 flex-1 flex flex-col gap-8 overflow-hidden">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400 border-b border-white/5 pb-6 flex items-center gap-4">
                    <i className="fas fa-history"></i> Registre Chronos
                 </h4>
                 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {history.map(snap => (
                      <div key={snap.id} onClick={() => handleRestore(snap)} className="snapshot-item p-6 cursor-pointer group">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-white uppercase truncate max-w-[150px]">{snap.label}</span>
                            <span className="text-[8px] font-bold text-slate-600">{new Date(snap.timestamp).toLocaleTimeString()}</span>
                         </div>
                         <div className="text-[7px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Rétablir Timeline</div>
                      </div>
                    ))}
                    {history.length === 0 && <div className="text-center py-20 opacity-10 italic text-xs uppercase tracking-widest">Aucun Snapshot scellé</div>}
                 </div>
              </div>

              <div className="p-10 bg-black/60 border border-blue-500/20 rounded-[3.5rem] space-y-6">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Raffinement de Ligne Temporelle</h4>
                 <div className="flex gap-4">
                    <input 
                      type="text" value={refinementInput} onChange={e => setRefinementInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRefine()}
                      placeholder="Modifier le destin..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase outline-none focus:border-blue-500"
                    />
                    <button onClick={handleRefine} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl"><i className="fas fa-chevron-right"></i></button>
                 </div>
              </div>
           </aside>
        </main>
      )}
    </div>
  );
};
