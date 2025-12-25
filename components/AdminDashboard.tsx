
import React, { useState, useEffect } from 'react';
import { SettingsService } from '../services/settingsService';
import { ArchitectConfig, AppSettings, ArchitectSkill } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architect' | 'app' | 'logs'>('architect');
  const [archConfig, setArchConfig] = useState<ArchitectConfig>(SettingsService.getArchitectConfig());
  const [appSettings, setAppSettings] = useState<AppSettings>(SettingsService.getAppSettings());
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveArchitect = () => {
    SettingsService.saveArchitectConfig(archConfig);
    triggerSaveNotify();
  };

  const handleSaveApp = () => {
    SettingsService.saveAppSettings(appSettings);
    triggerSaveNotify();
  };

  const triggerSaveNotify = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const toggleSkill = (id: string) => {
    const next = archConfig.capabilities.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setArchConfig({ ...archConfig, capabilities: next });
  };

  const updateSkillInstruction = (id: string, val: string) => {
    const next = archConfig.capabilities.map(s => s.id === id ? { ...s, instruction: val } : s);
    setArchConfig({ ...archConfig, capabilities: next });
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] p-12 overflow-hidden flex flex-col border border-white/5 relative font-inter shadow-2xl">
      <header className="flex items-center justify-between mb-12 z-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-red-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(220,38,38,0.3)]">⚙️</div>
          <div>
            <h1 className="text-4xl font-black italic font-orbitron uppercase tracking-tighter">NEXUS <span className="text-red-500">CONTROL</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Gouvernance Neurale & Écosystème</p>
          </div>
        </div>
        <div className="flex bg-white/5 p-2 rounded-2xl border border-white/10">
           {(['architect', 'app', 'logs'] as const).map(t => (
             <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'}`}>
               {t === 'architect' ? 'Architecte' : t === 'app' ? 'Plateforme' : 'Ledger'}
             </button>
           ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar pr-6 z-10">
        {activeTab === 'architect' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <h3 className="text-xl font-black italic uppercase text-red-500 tracking-widest flex items-center gap-4">
                      <i className="fas fa-id-card"></i> Identité Neurale
                   </h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-4">Nom de l'Agent</label>
                         <input type="text" value={archConfig.name} onChange={e => setArchConfig({...archConfig, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-4 text-lg font-bold outline-none focus:border-red-500" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-4">Rôle Stratégique</label>
                         <input type="text" value={archConfig.role} onChange={e => setArchConfig({...archConfig, role: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-4 text-lg font-bold outline-none focus:border-red-500" />
                      </div>
                   </div>
                </div>

                <div className="space-y-8">
                   <h3 className="text-xl font-black italic uppercase text-red-500 tracking-widest flex items-center gap-4">
                      <i className="fas fa-microchip"></i> Paramètres Moteur
                   </h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl">
                         <div>
                            <span className="text-sm font-bold block">Grounding Web Google</span>
                            <span className="text-[9px] text-slate-500 uppercase">Recherche temps réel obligatoire</span>
                         </div>
                         <button onClick={() => setArchConfig({...archConfig, searchEnabled: !archConfig.searchEnabled})} className={`w-14 h-8 rounded-full transition-all relative ${archConfig.searchEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${archConfig.searchEnabled ? 'right-1' : 'left-1'}`}></div>
                         </button>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-4">Niveau de Confiance</label>
                         <select value={archConfig.confidenceLevel} onChange={e => setArchConfig({...archConfig, confidenceLevel: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-4 outline-none">
                            <option value="conservative">Conservateur (Strictement sourcé)</option>
                            <option value="balanced">Équilibré</option>
                            <option value="creative">Créatif (Moins rigoureux)</option>
                         </select>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-8">
                <h3 className="text-xl font-black italic uppercase text-blue-500 tracking-widest flex items-center gap-4">
                   <i className="fas fa-brain"></i> Compétences Intégrées (Skills)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {archConfig.capabilities.map(skill => (
                     <div key={skill.id} className={`p-8 rounded-[2.5rem] border transition-all ${skill.isActive ? 'bg-blue-600/10 border-blue-500/40' : 'bg-white/5 border-white/5 opacity-50'}`}>
                        <div className="flex justify-between items-center mb-6">
                           <div>
                              <h4 className="text-lg font-black uppercase">{skill.label}</h4>
                              <p className="text-[10px] text-slate-500 uppercase mt-1">{skill.description}</p>
                           </div>
                           <button onClick={() => toggleSkill(skill.id)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${skill.isActive ? 'bg-blue-600' : 'bg-slate-800'}`}>
                              {skill.isActive ? 'ON' : 'OFF'}
                           </button>
                        </div>
                        <textarea 
                           value={skill.instruction} 
                           onChange={e => updateSkillInstruction(skill.id, e.target.value)}
                           className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xs italic font-medium h-24 resize-none outline-none focus:border-blue-500"
                           placeholder="Instruction spécifique..."
                        />
                     </div>
                   ))}
                </div>
             </div>

             <div className="flex justify-center pt-8">
                <button onClick={handleSaveArchitect} className="px-24 py-8 bg-red-600 rounded-[3rem] font-black uppercase text-sm tracking-[0.5em] shadow-[0_0_80px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95 transition-all">
                   Déployer Mise à Jour Neurale
                </button>
             </div>
          </div>
        )}

        {activeTab === 'app' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in">
             <h3 className="text-2xl font-black italic uppercase text-red-500 border-b border-white/5 pb-6">Réglages Système</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase ml-4">Nom du Projet</label>
                   <input type="text" value={appSettings.projectName} onChange={e => setAppSettings({...appSettings, projectName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase ml-4">Tagline</label>
                   <input type="text" value={appSettings.tagline} onChange={e => setAppSettings({...appSettings, tagline: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none" />
                </div>
             </div>
             <button onClick={handleSaveApp} className="w-full py-6 bg-white/5 border border-white/10 rounded-[2.5rem] font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all">Sauvegarder Paramètres Globaux</button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-8 animate-in fade-in opacity-30 text-center py-40">
             <i className="fas fa-database text-9xl mb-8"></i>
             <p className="text-2xl font-black uppercase tracking-widest">Registre d'audit en cours de synchronisation...</p>
          </div>
        )}
      </main>

      {isSaved && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 px-12 py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl animate-in fade-in slide-in-from-bottom-4">
           Configuration Appliquée au Nexus Core
        </div>
      )}
    </div>
  );
};
