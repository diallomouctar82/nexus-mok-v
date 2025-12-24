
import React, { useState, useEffect, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { Type } from '@google/genai';

const SHOP_STYLES = `
  .shop-grid { display: grid; grid-template-columns: 1fr 420px; gap: 2rem; height: 100%; }
  .product-card { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 3rem;
    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .product-card:hover { 
    border-color: rgba(249, 115, 22, 0.4); 
    transform: translateY(-10px) scale(1.02);
    background: rgba(249, 115, 22, 0.05);
  }
  .forge-overlay {
    background: rgba(3, 3, 11, 0.95);
    backdrop-filter: blur(60px);
    z-index: 1000;
  }
  .merchant-badge {
    background: linear-gradient(135deg, #f97316 0%, #db2777 100%);
    box-shadow: 0 0 20px rgba(249, 115, 22, 0.4);
  }
  .ai-shine {
    position: relative;
    overflow: hidden;
  }
  .ai-shine::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: rotate(45deg);
    animation: shine 3s infinite;
  }
  @keyframes shine { 0% { left: -100%; } 100% { left: 100%; } }
`;

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  image: string;
  description: string;
  isAiGenerated?: boolean;
}

interface StoreConfig {
  name: string;
  niche: string;
  branding: string;
  themeColor: string;
}

export const ShopUniverse: React.FC = () => {
  const [view, setView] = useState<'market' | 'my-store' | 'forge'>('market');
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: "Nexus Watch v1", price: "299€", category: "Tech", description: "Montre connectée souveraine.", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600" },
    { id: '2', name: "Sac Cuir Nomade", price: "185€", category: "Mode", description: "Artisanat d'excellence.", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600" }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [forgePrompt, setForgePrompt] = useState("");
  const [myStore, setMyStore] = useState<StoreConfig | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // --- IA FORGE : CRÉATION DE BOUTIQUE ---
  const handleForgeStore = async () => {
    if (!forgePrompt.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      // 1. Générer la stratégie de marque
      const strategy = await gemini.sendMessage(
        EXPERTS[0], 
        `Agis en tant qu'expert business Aïcha. Crée une boutique en ligne basée sur ce concept : "${forgePrompt}". 
        Retourne un JSON avec: name, niche, branding (description visuelle), themeColor (hex).`,
        [],
        { useThinking: true }
      );
      
      const config = JSON.parse(strategy.text.match(/\{.*\}/s)?.[0] || '{"name":"Ma Boutique"}');
      
      // 2. Générer 3 produits de départ avec images professionnelles
      const productGen = await gemini.sendMessage(
        EXPERTS[0],
        `Génère une liste de 3 produits phares pour la boutique "${config.name}". 
        Pour chaque produit donne : name, price (en Mok), description courte.`,
        []
      );

      // 3. Générer une image de couverture pour la boutique (Imagen 3 Pro)
      const storeImage = await gemini.generateImage(
        `Professional high-end ecommerce storefront for a brand called ${config.name} selling ${config.niche}, cinematic lighting, architectural photography, 8k resolution`,
        { aspectRatio: '16:9', imageSize: '1K' }
      );

      setMyStore({ ...config, image: storeImage });
      setView('my-store');
      
    } catch (e) {
      console.error("Forge Error:", e);
      alert("Erreur lors du forgeage de la boutique.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- IA APPRAISAL : ANALYSE DE PRODUIT ---
  const handleAppraiseItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      try {
        const analysis = await gemini.analyzeMedia(
          "Identifie cet objet, estime sa valeur sur le marché européen et africain, et suggère une description de vente captivante.",
          { data: base64, mimeType: file.type }
        );
        alert(`Analyse d'Aïcha IA :\n\n${analysis}`);
      } catch (e) {
        alert("Échec de l'analyse visuelle.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] overflow-hidden flex flex-col border border-white/5 relative font-inter">
      <style>{SHOP_STYLES}</style>
      
      {/* Header Hub */}
      <header className="px-12 py-8 border-b border-white/5 bg-black/40 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-600 rounded-[2rem] flex items-center justify-center text-3xl shadow-2xl animate-pulse">
            <i className="fas fa-shop"></i>
          </div>
          <div>
            <h1 className="text-3xl font-black italic font-orbitron uppercase tracking-tighter">Shop <span className="text-orange-500">Universe</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-1">Économie Souveraine & Entreprenariat IA</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button onClick={() => setView('market')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'market' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Marché</button>
          <button onClick={() => setView('my-store')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'my-store' ? 'bg-pink-600 text-white' : 'text-slate-500 hover:text-white'}`}>Ma Boutique</button>
        </div>

        <div className="flex items-center gap-6">
           <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
              <span className="text-sm font-black font-orbitron text-orange-400">4,820 <span className="text-[8px] text-slate-500 uppercase">Mok</span></span>
           </div>
           <button className="relative w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-white/10 transition-all">
              <i className="fas fa-shopping-bag"></i>
              {cartCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-black">{cartCount}</span>}
           </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden shop-grid p-8">
        
        {/* Main Content Area */}
        <div className="overflow-y-auto custom-scrollbar pr-4 space-y-12">
          
          {view === 'market' && (
            <div className="animate-in fade-in duration-700 space-y-12">
               <div className="flex justify-between items-end">
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter">Offres <span className="text-orange-500">Mondiales</span></h2>
                  <div className="flex gap-4">
                     <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-orange-600 transition-all">Tout</button>
                     <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-orange-600 transition-all">Tech</button>
                     <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-orange-600 transition-all">Artisanat</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {products.map(p => (
                    <div key={p.id} className="product-card group overflow-hidden">
                       <div className="h-72 relative overflow-hidden">
                          <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                          <div className="absolute top-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-[9px] font-black uppercase border border-white/10">{p.category}</div>
                       </div>
                       <div className="p-10 space-y-6">
                          <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-2xl font-black uppercase">{p.name}</h3>
                                <p className="text-sm text-slate-500 italic mt-1">{p.description}</p>
                             </div>
                             <span className="text-3xl font-black text-orange-500 font-orbitron">{p.price}</span>
                          </div>
                          <div className="flex gap-4">
                             <button onClick={() => setCartCount(c => c + 1)} className="flex-1 py-5 bg-orange-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all">Acheter Maintenant</button>
                             <button className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white transition-all"><i className="fas fa-heart"></i></button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'my-store' && (
            <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-12">
               {!myStore ? (
                 <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-10 bg-white/5 border-2 border-dashed border-white/10 rounded-[4rem] p-20">
                    <div className="w-32 h-32 bg-orange-600/10 rounded-full flex items-center justify-center text-6xl text-orange-500 animate-bounce">🏗️</div>
                    <div className="space-y-4">
                       <h2 className="text-4xl font-black uppercase italic tracking-tighter">Votre Boutique n'est pas encore <span className="text-orange-500">Forgée</span></h2>
                       <p className="text-xl text-slate-500 max-w-xl mx-auto italic font-medium leading-relaxed">Utilisez l'IA pour créer votre empire commercial en quelques secondes.</p>
                    </div>
                    <button onClick={() => setView('forge')} className="px-16 py-6 bg-orange-600 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-105 transition-all">Initialiser la Forge IA</button>
                 </div>
               ) : (
                 <div className="space-y-12">
                    {/* Store Hero */}
                    <div className="relative h-[400px] rounded-[4rem] overflow-hidden border border-white/10 group">
                       <img src={(myStore as any).image} className="w-full h-full object-cover" alt="" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                       <div className="absolute bottom-12 left-12">
                          <span className="px-4 py-1 bg-orange-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 inline-block">Boutique Souveraine Certifiée</span>
                          <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white">{myStore.name}</h2>
                          <p className="text-xl text-slate-300 italic mt-2 font-medium">"{myStore.niche}"</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center space-y-4">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenus Totaux</h4>
                          <div className="text-4xl font-black font-orbitron text-orange-400">0.00 Mok</div>
                       </div>
                       <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center space-y-4">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visites Neurales</h4>
                          <div className="text-4xl font-black font-orbitron text-pink-400">12</div>
                       </div>
                       <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center space-y-4">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confiance IA</h4>
                          <div className="text-4xl font-black font-orbitron text-emerald-400">99.8%</div>
                       </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <h3 className="text-2xl font-black uppercase italic">Vos Produits</h3>
                       <button className="px-8 py-4 bg-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest"><i className="fas fa-plus mr-2"></i> Ajouter via IA</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 opacity-40">
                       <div className="h-64 border-2 border-dashed border-white/10 rounded-[3rem] flex items-center justify-center italic text-slate-700">Aucun produit en ligne</div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {view === 'forge' && (
            <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 space-y-16">
               <div className="text-center space-y-6">
                  <h2 className="text-7xl font-black uppercase italic tracking-tighter leading-none">Forgez votre <span className="text-orange-500">Empire</span>.</h2>
                  <p className="text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed italic">
                    Décrivez ce que vous souhaitez vendre. Aïcha IA s'occupe du branding, de la logistique et de la mise en rayon mondiale.
                  </p>
               </div>

               <div className="w-full max-w-4xl relative group">
                  <div className="absolute inset-0 bg-orange-600/20 blur-[100px] rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                  <div className="relative flex gap-6 p-4 bg-black/60 border border-white/10 rounded-[4rem] focus-within:border-orange-500/50 shadow-2xl transition-all backdrop-blur-3xl">
                     <input 
                        type="text" 
                        value={forgePrompt}
                        onChange={e => setForgePrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleForgeStore()}
                        placeholder="Ex: Je veux vendre du café guinéen premium aux entreprises tech à Paris..."
                        className="flex-1 bg-transparent px-10 py-8 text-2xl font-medium outline-none placeholder:text-slate-800"
                     />
                     <button 
                        onClick={handleForgeStore}
                        disabled={isProcessing || !forgePrompt.trim()}
                        className="px-16 bg-orange-600 rounded-[3rem] font-black uppercase text-xs tracking-[0.4em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
                     >
                        {isProcessing ? 'Calcul Neural...' : 'Forger Boutique'}
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
                  {[
                    { icon: 'fa-wand-sparkles', label: 'Branding IA', desc: 'Logo et identité générés' },
                    { icon: 'fa-globe', label: 'Export Mondial', desc: 'Logistique intégrée' },
                    { icon: 'fa-shield-halved', label: 'Scellage Nexus', desc: 'Ventes sécurisées' }
                  ].map(feat => (
                    <div key={feat.label} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center gap-4">
                       <i className={`fas ${feat.icon} text-orange-500 text-2xl`}></i>
                       <h4 className="text-[10px] font-black uppercase tracking-widest">{feat.label}</h4>
                       <p className="text-[9px] text-slate-500 font-bold uppercase">{feat.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

        </div>

        {/* AI Sales Agent Sidebar */}
        <aside className="border-l border-white/5 bg-black/20 flex flex-col p-10 gap-10 overflow-y-auto custom-scrollbar">
           <div className="p-12 product-card ai-shine flex flex-col items-center text-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none"></div>
              <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop" className="w-32 h-32 rounded-full border-4 border-orange-500/20 shadow-2xl object-cover" alt="" />
              <div>
                 <h3 className="text-3xl font-black italic uppercase text-orange-400">Aïcha IA</h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Intelligence Commerciale Souveraine</p>
              </div>
              <p className="text-sm text-slate-400 font-medium italic leading-relaxed">"Je suis votre bras droit. Je peux identifier n'importe quel objet et vous dire si c'est une bonne affaire."</p>
              
              <div className="w-full space-y-4">
                 <label className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all cursor-pointer flex items-center justify-center gap-4">
                    <i className="fas fa-camera text-orange-500"></i> Faire expertiser un objet
                    <input type="file" hidden accept="image/*" onChange={handleAppraiseItem} />
                 </label>
                 <button onClick={() => setView('forge')} className="w-full py-5 bg-orange-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Conseil de Croissance</button>
              </div>
           </div>

           <div className="space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-600 px-4">Tendances Nexus</h4>
              <div className="space-y-4">
                {[
                  { l: 'Luxe Africain', v: '+312%', c: 'text-emerald-500' },
                  { l: 'Composants IA', v: '+85%', c: 'text-orange-500' },
                  { l: 'Contrats Export', v: '+112%', c: 'text-emerald-500' }
                ].map((t, i) => (
                  <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-[2rem] flex items-center justify-between group cursor-default">
                     <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{t.l}</span>
                     <span className={`text-[10px] font-black ${t.c} uppercase`}>{t.v}</span>
                  </div>
                ))}
              </div>
           </div>

           <div className="p-10 bg-orange-600/10 border border-orange-500/20 rounded-[3.5rem] space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg"><i className="fas fa-certificate"></i></div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest">Souveraineté OK</h4>
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase italic">"Vos boutiques sont protégées par le protocole de scellage Maître Diallo."</p>
           </div>
        </aside>
      </main>

      {/* Marquee Footer */}
      <footer className="h-12 bg-black/60 border-t border-white/5 flex items-center px-12 overflow-hidden shadow-2xl relative">
         <div className="flex gap-24 animate-marquee whitespace-nowrap text-[9px] font-black uppercase text-slate-600 tracking-widest italic">
            <span>• SHOP UNIVERSE v12.0 STATUS: OPTIMAL</span>
            <span>• BTC/MOK: 43,120.12 ↑</span>
            <span>• NOUVELLE BOUTIQUE FORGÉE: "DAKAR LUXURY" (Aujourd'hui)</span>
            <span>• PROTOCOLE LOGISTIQUE MARSEILLE-CONAKRY: ACTIF</span>
            <span>• IA AICHA: ANALYSE DE TENDANCES TERMINÉE</span>
            <span>• MARCHÉ MONDIAL: 142 OFFRES ACTIVES</span>
         </div>
      </footer>
    </div>
  );
};
