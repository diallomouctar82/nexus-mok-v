
import React, { useState, useEffect } from 'react';
import { gemini } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { AppAction } from '../types';

export const DashboardComponent: React.FC = () => {
  const [progression, setProgression] = useState(0);
  const [prediction, setPrediction] = useState<AppAction | null>(null);
  const [architectInsight, setArchitectInsight] = useState<string>("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setProgression(84), 500);
    
    // Prediction rapide
    gemini.predictNextAction("L'utilisateur a validé son plan d'expatriation au Sénégal.")
      .then(setPrediction);

    // Insight profond de l'Architecte
    setIsInsightLoading(true);
    gemini.sendMessage(EXPERTS[0], "Analyse ma situation actuelle (expatriation Sénégal, documents en cours) et fournis un insight stratégique unique en mode Architecte.", [], { useThinking: true })
      .then(res => setArchitectInsight(res.text))
      .finally(() => setIsInsightLoading(false));

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-full bg-[#03030b] border border-white/5 rounded-[4rem] p-12 overflow-y-auto no-scrollbar relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 bg-blue-600 rounded-[3rem] flex items-center justify-center text-4xl shadow-2xl animate-pulse">📊</div>
          <div>
            <h2 className="text-5xl font-black text-white tracking-tighter italic font-orbitron uppercase">Ma <span className="text-blue-500">Situation</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Souveraineté Digitale & Vision Tactique</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-12 mb-12">
        <div className="xl:col-span-8 space-y-12">
          
          {/* Architect's Strategic Insight (Thinking Mode) */}
          <div className="bg-black/60 border border-blue-500/20 rounded-[4rem] p-12 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all duration-1000"></div>
            <div className="flex items-center gap-4 mb-8">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg"><i className="fas fa-microchip"></i></div>
               <h3 className="text-sm font-black uppercase tracking-[0.4em] text-blue-400">Insight de l'Architecte (Neural Core)</h3>
            </div>
            {isInsightLoading ? (
              <div className="flex gap-4 items-center py-6">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase text-slate-600 animate-pulse tracking-widest">Calcul de la matrice de destinée...</p>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                 <p className="text-xl font-medium italic text-slate-100 leading-relaxed">"{architectInsight}"</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="p-10 bg-white/5 border border-white/10 rounded-[3.5rem] hover:border-blue-500/30 transition-all group">
               <div className="flex justify-between items-center mb-8">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Documents Scellés</h4>
                 <i className="fas fa-file-shield text-blue-500"></i>
               </div>
               <div className="space-y-6">
                  {[
                    { l: 'Bail Commercial Dakar', s: 'Validé', c: 'text-emerald-500' },
                    { l: 'Visa Entrepreneur', s: 'En cours', c: 'text-blue-500' },
                    { l: 'Assurance Souveraine', s: 'À signer', c: 'text-amber-500' }
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between group/item">
                      <span className="text-sm font-bold text-slate-300 group-hover/item:text-white transition-colors">{doc.l}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${doc.c}`}>{doc.s}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-10 bg-white/5 border border-white/10 rounded-[3.5rem] hover:border-blue-500/30 transition-all">
               <div className="flex justify-between items-center mb-8">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Flux Économique</h4>
                 <i className="fas fa-chart-line text-emerald-500"></i>
               </div>
               <div className="flex items-end gap-3 h-32">
                  {[35, 65, 45, 85, 55, 95, 75].map((h, i) => (
                    <div key={i} className="flex-1 bg-white/5 rounded-2xl relative group/bar overflow-hidden">
                       <div className="absolute bottom-0 left-0 w-full bg-blue-600 rounded-2xl transition-all duration-1000 group-hover/bar:bg-blue-400" style={{ height: `${h}%` }}></div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-12">
          <div className="p-12 bg-white/5 border border-white/10 rounded-[4rem] flex flex-col items-center text-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="relative w-48 h-48 mb-10 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-white/5" />
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray={502} strokeDashoffset={502 - (progression/100)*502} strokeLinecap="round" className="text-blue-500 transition-all duration-1000 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white font-orbitron">{progression}%</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Harmonie Nexus</span>
                </div>
             </div>
             <h4 className="font-black text-2xl mb-4 italic uppercase tracking-tighter">Plan Convergence</h4>
             <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10">Votre trajectoire de vie est alignée sur les prédictions souveraines.</p>
             <button className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">Optimiser Trajectoire</button>
          </div>
          
          <div className="p-10 bg-black/40 border border-white/5 rounded-[3.5rem]">
             <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600 mb-8 border-b border-white/5 pb-6">Ledger d'Activité</h4>
             <div className="space-y-8">
                {[
                  { icon: '📝', t: 'Contrat scellé', d: 'Maître Diallo • 14:32' },
                  { icon: '🌐', t: 'Intel Marché Synchronisé', d: 'Architecte • 12:05' },
                  { icon: '🛡️', t: 'Souveraineté Certifiée', d: 'Nexus OS • 09:15' }
                ].map((log, i) => (
                  <div key={i} className="flex gap-6 group/log cursor-default">
                     <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl group-hover/log:scale-110 transition-transform">{log.icon}</div>
                     <div>
                        <div className="text-xs font-black text-white uppercase group-hover/log:text-blue-400 transition-colors">{log.t}</div>
                        <div className="text-[9px] text-slate-600 font-bold uppercase mt-1">{log.d}</div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
