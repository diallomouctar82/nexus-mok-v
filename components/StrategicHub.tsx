
import React, { useState, useEffect } from 'react';
import { gemini } from '../services/geminiService';
import { DocumentExporter } from '../services/documentExporter';
import { StrategicPlan, ViewType, AppAction, Artifact, GroundingSource } from '../types';

const STRATEGY_STYLES = `
  .strategy-grid { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; height: 100%; }
  .mission-control-panel { background: rgba(13, 13, 28, 0.7); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 3rem; }
  .hologram-card { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1); }
  .artifact-item { border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.3s ease; cursor: pointer; }
  .artifact-item:hover { background: rgba(59, 130, 246, 0.1); }
  .artifact-viewer { background: rgba(3, 3, 11, 0.98); backdrop-filter: blur(80px); z-index: 1000; }
  .searching-animation { animation: searchingPulse 2s infinite; }
  @keyframes searchingPulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
  
  .export-btn { 
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); 
    padding: 12px 24px; border-radius: 16px; font-size: 10px; font-weight: 900; 
    text-transform: uppercase; transition: all 0.3s; display: flex; align-items: center; gap: 10px;
  }
  .export-btn:hover { background: #3b82f6; border-color: #60a5fa; transform: translateY(-2px); }
`;

interface StrategicHubProps {
  onNavigate: (view: ViewType) => void;
  onExecute: (action: AppAction) => void;
  externalGoal: string | null;
  onGoalConsumed: () => void;
  initialArtifacts?: Artifact[];
}

export const StrategicHub: React.FC<StrategicHubProps> = ({ 
  onNavigate, 
  onExecute, 
  externalGoal, 
  onGoalConsumed,
  initialArtifacts = []
}) => {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<StrategicPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [localArtifacts, setLocalArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (externalGoal) {
      setGoal(externalGoal);
      handleGenerate(externalGoal);
      onGoalConsumed?.();
    }
  }, [externalGoal]);

  const allArtifacts = [...localArtifacts, ...initialArtifacts];

  const handleGenerate = async (forcedGoal?: string) => {
    const finalGoal = forcedGoal || goal;
    if (!finalGoal.trim()) return;
    setIsGenerating(true);
    try {
      const result = await gemini.generateStrategicPlan(finalGoal);
      setPlan(result);
    } catch (e) {
      console.error("Génération plan échouée:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'pptx') => {
    if (!selectedArtifact || isExporting) return;
    setIsExporting(true);
    try {
      await DocumentExporter.export(selectedArtifact, format);
    } finally {
      setIsExporting(false);
    }
  };

  const forgeArtifact = async (type: string) => {
    if (!plan || isGenerating) return;
    setIsGenerating(true);
    try {
      const art = await gemini.generateProjectArtifact(plan, type, "Génération par étape stratégique.");
      setLocalArtifacts(prev => [art, ...prev]);
      setSelectedArtifact(art);
      onExecute({ type: 'MEMORIZE', payload: art });
    } finally {
      setIsGenerating(false);
    }
  };

  const researchDonors = async () => {
    if (!plan || isResearching) return;
    setIsResearching(true);
    try {
      const res = await gemini.researchProjectResources(plan.goal);
      const art: Artifact = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'analysis',
        title: 'Rapport Bailleurs & Investisseurs',
        content: res.text,
        expertId: 'maitre_diallo',
        metadata: { sources: res.sources }
      };
      setLocalArtifacts(prev => [art, ...prev]);
      setSelectedArtifact(art);
      onExecute({ type: 'MEMORIZE', payload: art });
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] p-12 overflow-hidden flex flex-col border border-white/5 relative font-inter">
      <style>{STRATEGY_STYLES}</style>
      
      {selectedArtifact && (
        <div className="absolute inset-0 artifact-viewer p-20 flex flex-col animate-in fade-in duration-500">
           <header className="flex justify-between items-center mb-10 pb-8 border-b border-white/10">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg"><i className="fas fa-file-contract"></i></div>
                 <div>
                    <h2 className="text-3xl font-black italic uppercase">{selectedArtifact.title}</h2>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedArtifact.type} • Souveraineté Nexus</span>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={() => handleExport('pdf')} className="export-btn"><i className="fas fa-file-pdf"></i> PDF</button>
                 <button onClick={() => handleExport('docx')} className="export-btn"><i className="fas fa-file-word"></i> DOC</button>
                 <button onClick={() => setSelectedArtifact(null)} className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-red-600 transition-all text-xl ml-4"><i className="fas fa-times"></i></button>
              </div>
           </header>
           <main className="flex-1 overflow-y-auto custom-scrollbar prose prose-invert max-w-none px-10 py-4 italic leading-relaxed text-xl text-slate-300">
              <div className="whitespace-pre-wrap">"{selectedArtifact.content}"</div>
              {selectedArtifact.metadata?.sources && selectedArtifact.metadata.sources.length > 0 && (
                <div className="mt-12 pt-8 border-t border-white/5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-blue-400">Sources Détectées</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedArtifact.metadata.sources.map((s: GroundingSource, i: number) => (
                      <a key={i} href={s.uri} target="_blank" className="p-4 bg-white/5 rounded-xl text-xs hover:text-blue-400 truncate">{s.title}</a>
                    ))}
                  </div>
                </div>
              )}
           </main>
        </div>
      )}

      <header className="flex items-center justify-between z-10 mb-12">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 bg-blue-600 rounded-[3rem] flex items-center justify-center text-5xl shadow-[0_0_80px_rgba(59,130,246,0.3)] border border-white/20">🏛️</div>
          <div>
            <h1 className="text-5xl font-black italic font-orbitron uppercase tracking-tighter">MISSION <span className="text-blue-500">CONTROL</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Gestion de Cycle & Exportation Livrables</p>
          </div>
        </div>
        {plan && (
          <button onClick={() => setPlan(null)} className="px-8 py-4 bg-white/5 border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Nouveau Projet</button>
        )}
      </header>

      {!plan ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-16 animate-in zoom-in-95 duration-700">
           <div className="text-center space-y-8">
              <i className="fas fa-rocket text-9xl text-blue-600/20"></i>
              <h2 className="text-6xl font-black uppercase italic leading-none tracking-tighter">Lancez votre <span className="text-blue-500">Ambition</span>.</h2>
              <p className="text-slate-400 text-2xl font-medium max-w-2xl mx-auto italic">De la conception à l'exportation de vos rapports officiels.</p>
           </div>
           <div className="w-full relative flex gap-4 p-3 bg-black/60 border border-white/10 rounded-[3.5rem] focus-within:border-blue-500/50 shadow-2xl transition-all">
              <input type="text" value={goal} onChange={e => setGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()} placeholder="Décrivez votre vision de bout en bout..." className="flex-1 bg-transparent px-10 py-6 text-xl outline-none" />
              <button onClick={() => handleGenerate()} disabled={isGenerating} className="px-16 bg-blue-600 rounded-[2.8rem] font-black uppercase text-xs tracking-widest transition-all">{isGenerating ? 'Initialisation...' : 'Forger Mission'}</button>
           </div>
        </div>
      ) : (
        <main className="flex-1 strategy-grid overflow-hidden z-10 animate-in slide-in-from-bottom-12 duration-1000">
           <div className="overflow-y-auto custom-scrollbar pr-10 space-y-12 pb-20">
              <div className="p-12 hologram-card rounded-[4rem] border-blue-500/20">
                 <p className="text-3xl font-black italic leading-tight text-white/90">"{plan.summary}"</p>
              </div>

              <div className="space-y-6">
                 <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] px-6">Feuille de Route Tactique</h3>
                 <div className="grid grid-cols-1 gap-6">
                    {plan.steps.map((step, idx) => (
                      <div key={step.id} onClick={() => setActiveStepIdx(idx)} className={`p-10 hologram-card rounded-[3.5rem] cursor-pointer border ${activeStepIdx === idx ? 'border-blue-500/40 bg-blue-600/5' : 'opacity-50'}`}>
                         <div className="flex justify-between items-center mb-6">
                            <h4 className="text-2xl font-black uppercase italic">{step.title}</h4>
                            <span className="text-3xl font-black text-white/5">0{idx + 1}</span>
                         </div>
                         <p className="text-base text-slate-400 italic mb-6">"{step.description}"</p>
                         <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{step.status}</span>
                            <div className="flex gap-3">
                               <button onClick={(e) => { e.stopPropagation(); forgeArtifact('Email de prospection'); }} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase hover:bg-blue-600 transition-all">Rédiger Email</button>
                               <button onClick={(e) => { e.stopPropagation(); forgeArtifact('Rapport d\'étape'); }} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase hover:bg-emerald-600 transition-all">Rapport</button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <aside className="space-y-8 flex flex-col h-full">
              <div className="mission-control-panel p-10 flex-1 flex flex-col gap-8 overflow-hidden">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400 border-b border-white/5 pb-6 flex items-center justify-between">
                    <span><i className="fas fa-folder-open mr-3"></i> Artefacts de Mission</span>
                    <span className="text-slate-600">{allArtifacts.length} scellés</span>
                 </h4>
                 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {allArtifacts.map((art, idx) => (
                      <div key={`${art.id}-${idx}`} onClick={() => setSelectedArtifact(art)} className="artifact-item p-6 group">
                         <div className="flex justify-between items-center">
                            <div className="flex flex-col overflow-hidden">
                               <span className="text-[11px] font-black text-white uppercase truncate">{art.title}</span>
                               <span className="text-[8px] font-bold text-slate-600 uppercase mt-1">{art.type}</span>
                            </div>
                            <i className="fas fa-chevron-right text-[10px] opacity-0 group-hover:opacity-100 transition-all text-blue-500"></i>
                         </div>
                      </div>
                    ))}
                    {allArtifacts.length === 0 && <div className="text-center py-20 opacity-10 italic text-[10px] uppercase">Aucun document généré</div>}
                 </div>
              </div>

              <div className="p-10 bg-black/60 border border-blue-500/20 rounded-[3.5rem] space-y-8">
                 <button onClick={researchDonors} disabled={isResearching} className={`w-full py-5 bg-emerald-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-4 ${isResearching ? 'searching-animation' : ''}`}>
                    <i className="fas fa-magnifying-glass-dollar"></i> {isResearching ? 'Recherche...' : 'Chercher Bailleurs'}
                 </button>
                 <button onClick={() => forgeArtifact('Rapport Final')} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all">Générer Rapport Final</button>
              </div>
           </aside>
        </main>
      )}
    </div>
  );
};
