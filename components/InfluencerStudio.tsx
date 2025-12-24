
import React, { useState } from 'react';
import { gemini } from '../services/geminiService';

const INFLUENCER_STYLES = `
  .influencer-bg { background: linear-gradient(135deg, #FF0080 0%, #7928CA 100%); }
  .influencer-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 2.5rem; }
  .neon-glow { text-shadow: 0 0 20px rgba(255, 0, 128, 0.5); }
  .studio-viewport { background: #000; border: 1px solid rgba(255, 255, 255, 0.1); position: relative; }
`;

interface Influencer {
  id: string;
  name: string;
  niche: string;
  followers: string;
  avatar: string;
  status: 'live' | 'recording' | 'idle';
  bio: string;
}

const MOCK_INFLUENCERS: Influencer[] = [
  { id: '1', name: 'Aïcha Digital', niche: 'Fashion & Tech', followers: '1.2M', avatar: 'https://picsum.photos/seed/aicha/400/600', status: 'live', bio: "L'icône de la mode souveraine au Sénégal." },
  { id: '2', name: 'Diallo Jr', niche: 'Gaming & AI', followers: '850K', avatar: 'https://picsum.photos/seed/jr/400/600', status: 'idle', bio: "Le futur du gaming multi-agents." },
  { id: '3', name: 'Sia Nexus', niche: 'Lifestyle Luxury', followers: '2.5M', avatar: 'https://picsum.photos/seed/sia/400/600', status: 'recording', bio: "Redéfinir le luxe via l'intelligence artificielle." },
];

export const InfluencerStudio: React.FC = () => {
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer>(MOCK_INFLUENCERS[0]);
  const [activeTab, setActiveTab] = useState('gallery');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const handleGenerateCampaign = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      // Simulation d'une campagne publicitaire générée par l'IA
      const expertPrompt = `Tu es le stratège marketing de l'avatar IA ${selectedInfluencer.name}. 
      Génère un script de post Instagram et une légende percutante pour promouvoir ceci : "${prompt}".
      Le ton doit être ${selectedInfluencer.niche}.`;
      
      const response = await gemini.sendMessage(
        { 
          id: 'marketing' as any, 
          name: 'Marketing Bot', 
          avatar: '', 
          color: '', 
          voiceName: 'Kore', 
          role: 'Strategist', 
          description: '', 
          systemInstruction: 'Expert Marketing Viral' 
        }, 
        expertPrompt, 
        []
      );
      setGeneratedContent(response.text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full bg-[#050510] text-white rounded-[3.5rem] p-12 overflow-hidden flex flex-col gap-10 border border-white/5 relative">
      <style>{INFLUENCER_STYLES}</style>
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl animate-pulse">✨</div>
          <div>
            <h2 className="text-4xl font-black italic font-orbitron uppercase tracking-tighter">AVATARS IA <span className="text-pink-500">INFLUENCEUSES</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Studio de Création de Contenu Souverain</p>
          </div>
        </div>
        <div className="flex bg-black/40 p-2 rounded-3xl border border-white/10">
          {['gallery', 'studio', 'analytics'].map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-pink-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-12 z-10">
        <div className="overflow-y-auto custom-scrollbar pr-4">
          {activeTab === 'gallery' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
              {MOCK_INFLUENCERS.map(inf => (
                <div 
                  key={inf.id} 
                  onClick={() => setSelectedInfluencer(inf)}
                  className={`influencer-card p-6 cursor-pointer transition-all hover:scale-[1.02] border-2 ${selectedInfluencer.id === inf.id ? 'border-pink-500/50' : 'border-white/5'}`}
                >
                  <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-6">
                    <img src={inf.avatar} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-4 right-4 flex gap-2">
                       {inf.status === 'live' && <span className="bg-red-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase animate-pulse">En Direct</span>}
                       <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase">v2.4</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black mb-1">{inf.name}</h3>
                  <div className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-4">{inf.niche}</div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                    <span>{inf.followers} Followers</span>
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="flex flex-col gap-10 h-full animate-in zoom-in-95">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 flex-1">
                  <div className="studio-viewport rounded-[3rem] overflow-hidden flex flex-col items-center justify-center p-12">
                     {isGenerating ? (
                       <div className="text-center space-y-6">
                          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-pink-400 animate-pulse">Synchronisation Créative...</p>
                       </div>
                     ) : generatedContent ? (
                        <div className="w-full h-full p-10 bg-white/5 overflow-y-auto custom-scrollbar rounded-3xl border border-white/10">
                           <h4 className="text-pink-500 font-black uppercase text-[10px] mb-6 tracking-widest">Campagne Générée par IA</h4>
                           <p className="text-slate-300 whitespace-pre-wrap leading-relaxed italic">"{generatedContent}"</p>
                        </div>
                     ) : (
                       <div className="text-center space-y-4 opacity-30">
                          <i className="fas fa-magic text-6xl"></i>
                          <p className="text-xs font-black uppercase tracking-widest">Studio Prêt</p>
                       </div>
                     )}
                  </div>

                  <div className="influencer-card p-10 space-y-8 h-fit">
                     <h3 className="text-xl font-black italic uppercase">Configurateur de Campagne</h3>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produit à promouvoir (Shop Universe)</label>
                        <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Décrivez l'objet ou le service (ex: Nexus Watch Pro)..." 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:border-pink-500 transition-all h-32 resize-none"
                        />
                     </div>
                     <button 
                        onClick={handleGenerateCampaign}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full py-6 bg-pink-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                     >
                        Lancer Génération Neural
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>

        <aside className="space-y-8 animate-in slide-in-from-right-10">
           <div className="influencer-card p-10 space-y-10">
              <div className="text-center">
                 <img src={selectedInfluencer.avatar} className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-pink-500/20 object-cover shadow-2xl" alt="" />
                 <h4 className="text-2xl font-black">{selectedInfluencer.name}</h4>
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">{selectedInfluencer.followers} Impact Global</div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed text-center italic">"{selectedInfluencer.bio}"</p>
              
              <div className="space-y-4 pt-6 border-t border-white/5">
                 <button className="w-full py-5 bg-pink-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all">Démarrer Stream Neural</button>
                 <button className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">Éditer Profil</button>
              </div>
           </div>

           <div className="influencer-card p-10">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-8">Performance Contenu</h4>
              <div className="space-y-6">
                 {[
                   { l: 'Engagement', v: '94%', c: 'text-emerald-400' },
                   { l: 'Reach Global', v: '4.2M', c: 'text-pink-400' },
                   { l: 'Revenue Sync', v: '€12.5K', c: 'text-emerald-400' }
                 ].map((stat, i) => (
                   <div key={i} className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">{stat.l}</span>
                      <span className={`text-sm font-black ${stat.c}`}>{stat.v}</span>
                   </div>
                 ))}
              </div>
           </div>
        </aside>
      </main>
    </div>
  );
};
