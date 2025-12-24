
import React, { useState, useEffect, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { Message, GroundingSource, Artifact } from '../types';

const EXCHANGE_V19_STYLES = `
  .quantum-grid { display: grid; grid-template-columns: 1fr 450px; gap: 2rem; height: 100%; }
  .exchange-card { background: rgba(16, 185, 129, 0.03); border: 1px solid rgba(16, 185, 129, 0.1); transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1); }
  .exchange-card:hover { border-color: rgba(16, 185, 129, 0.4); transform: translateY(-5px) scale(1.02); }
  
  .neural-stage-v19 {
    background: #000;
    border-radius: 4rem;
    border: 1px solid rgba(16, 185, 129, 0.2);
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 100px rgba(0,0,0,0.8);
  }

  .hotspot {
    position: absolute;
    width: 24px;
    height: 24px;
    background: rgba(16, 185, 129, 0.6);
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 20px #10b981;
    animation: ping 2s infinite;
  }
  @keyframes ping {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
  }

  .scanning-laser {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, transparent, #10b981, transparent);
    box-shadow: 0 0 20px #10b981;
    z-index: 10;
    animation: laserMove 3s infinite linear;
  }
  @keyframes laserMove {
    0% { top: 0; }
    100% { top: 100%; }
  }

  .notary-seal-v19 {
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, #10b981, #065f46);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid rgba(255,255,255,0.2);
    box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
    font-weight: 900;
    font-family: 'Orbitron';
    text-align: center;
    color: white;
    font-size: 10px;
    transform: rotate(-15deg);
  }

  .mediation-room {
    background: linear-gradient(135deg, #1e1b4b 0%, #03030b 100%);
    border: 1px solid #4338ca;
  }

  .price-chart-bar {
    width: 20px;
    background: #10b981;
    border-radius: 4px 4px 0 0;
    transition: height 1s ease-out;
  }
`;

export const QuantumExchange: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'market' | 'verify' | 'negotiate' | 'contract' | 'ledger' | 'create'>('market');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [negotiationLog, setNegotiationLog] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [contractText, setContractText] = useState("");
  const [riskData, setRiskData] = useState<{score: number, risks: string[], advice: string} | null>(null);
  const [appraisalData, setAppraisalData] = useState<{suggestedPrice: string, reasoning: string, marketTrend: string} | null>(null);
  const [marketIntel, setMarketIntel] = useState<{text: string, sources: GroundingSource[]} | null>(null);
  const [tacticalSuggestions, setTacticalSuggestions] = useState<string[]>([]);
  const [clauseExplanation, setClauseExplanation] = useState<string | null>(null);
  const [logisticsData, setLogisticsData] = useState<any>(null);
  const [isMediationActive, setIsMediationActive] = useState(false);

  // Verification Hotspots
  const [hotspotReport, setHotspotReport] = useState<string | null>(null);

  // Listing Form State
  const [listingDescription, setListingDescription] = useState('');
  const [generatedListing, setGeneratedListing] = useState<any>(null);

  const [marketItems, setMarketItems] = useState([
    { id: 1, name: "Terrain à Conakry", price: "250,000,000 GNF", owner: "Ibrahim D.", image: "https://picsum.photos/seed/terrain/800/600", verified: true, desc: "Titre foncier sécurisé, 500m2 zone résidentielle." },
    { id: 2, name: "Conteneur High-Tech", price: "15,000 €", owner: "Fatou L.", image: "https://picsum.photos/seed/shipping/800/600", verified: true, desc: "Matériel informatique reconditionné, certifié CE." },
    { id: 3, name: "Expertise IA Dével.", price: "2,500 €", owner: "Moussa S.", image: "https://picsum.photos/seed/code/800/600", verified: false, desc: "Développement de smart contracts personnalisés." }
  ]);

  const [ledgerEntries, setLedgerEntries] = useState([
    { id: 'TX-901', item: 'Laptop Pro', price: '1200€', party: 'Sia N.', date: '14/05 12:30', status: 'SCELLÉ' },
    { id: 'TX-882', item: 'Bail Office', price: '800€/m', party: 'Diallo Group', date: '12/05 09:15', status: 'SCELLÉ' }
  ]);

  const handleSelectItem = async (item: any) => {
    setSelectedItem(item);
    setIsProcessing(true);
    setActiveTab('verify');
    setMarketIntel(null);
    setHotspotReport(null);
    try {
      const [risk, appraisal, intel, logistics] = await Promise.all([
        gemini.analyzeTradeRisk(item.name + " : " + item.desc),
        gemini.appraiseAsset(item.name + " : " + item.desc),
        gemini.getMarketIntelligence(item.name),
        gemini.predictNextAction(`Suggère des frais de douane et routes logistiques pour : ${item.name}`)
      ]);
      setRiskData(risk);
      setAppraisalData(appraisal);
      setMarketIntel(intel);
      setLogisticsData(logistics.payload);
      const suggestions = await gemini.getTacticalSuggestions([]);
      setTacticalSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHotspotClick = async (part: string) => {
    setIsProcessing(true);
    setHotspotReport(null);
    try {
      const report = await gemini.analyzeMedia(`Analyse visuelle spécifique de la partie "${part}" de cet actif : ${selectedItem.name}.`, { data: selectedItem.image.split(',')[1] || "base64placeholder", mimeType: 'image/jpeg' });
      setHotspotReport(report);
    } catch (e) {
      setHotspotReport("Analyse visuelle indisponible pour ce secteur.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateListing = async () => {
    if (!listingDescription.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const [appraisal, image] = await Promise.all([
        gemini.appraiseAsset(listingDescription),
        gemini.generateImage(`Ultra realistic product catalog photo of: ${listingDescription}, cinematic lighting, 8k, professional staging`, { aspectRatio: '16:9', imageSize: '1K' })
      ]);

      const newListing = {
        id: Date.now(),
        name: listingDescription.split(' ').slice(0, 3).join(' '),
        price: appraisal.suggestedPrice,
        owner: "Moi",
        image: image,
        verified: true,
        desc: listingDescription
      };
      setGeneratedListing(newListing);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmListing = () => {
    if (generatedListing) {
      setMarketItems(prev => [generatedListing, ...prev]);
      setGeneratedListing(null);
      setListingDescription('');
      setActiveTab('market');
    }
  };

  const handleNegotiate = async (tactic?: string) => {
    const textToSend = tactic || userInput;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() };
    setNegotiationLog(prev => [...prev, userMsg]);
    setUserInput('');
    setIsProcessing(true);

    try {
      const response = await gemini.negotiateTrade(negotiationLog, textToSend, tactic);
      const modelMsg: Message = { id: Date.now().toString(), role: 'model', content: response, timestamp: Date.now() };
      setNegotiationLog(prev => [...prev, modelMsg]);
      const suggestions = await gemini.getTacticalSuggestions([...negotiationLog, userMsg, modelMsg]);
      setTacticalSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const callMediation = async () => {
    setIsMediationActive(true);
    setIsProcessing(true);
    try {
      const mediationRes = await gemini.mediateConflict(negotiationLog);
      const modelMsg: Message = { 
        id: Date.now().toString(), 
        role: 'model', 
        content: `⚖️ MAÎTRE DIALLO INTERVIENT : ${mediationRes}`, 
        timestamp: Date.now() 
      };
      setNegotiationLog(prev => [...prev, modelMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeSeal = () => {
    const newEntry = {
      id: `TX-${Math.floor(Math.random() * 900) + 100}`,
      item: selectedItem.name,
      price: selectedItem.price,
      party: selectedItem.owner,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString().slice(0, 5),
      status: 'SCELLÉ'
    };
    setLedgerEntries(prev => [newEntry, ...prev]);
    setActiveTab('ledger');
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] p-12 overflow-hidden flex flex-col gap-10 font-inter relative">
      <style>{EXCHANGE_V19_STYLES}</style>
      
      {/* Background FX */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Create Modal */}
      {activeTab === 'create' && (
        <div className="absolute inset-0 create-overlay p-20 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
           <div className="w-full max-w-5xl bg-black/80 border border-white/10 rounded-[4rem] p-20 space-y-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10b981]"></div>
              <header className="flex justify-between items-center">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-600/20 rounded-[2rem] flex items-center justify-center text-4xl text-emerald-500 shadow-inner">
                       <i className="fas fa-microchip"></i>
                    </div>
                    <div>
                       <h3 className="text-4xl font-black uppercase italic tracking-tighter font-orbitron">Nexus <span className="text-emerald-500">Forge</span></h3>
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-1">Génération d'Actif Souverain v19</p>
                    </div>
                 </div>
                 <button onClick={() => setActiveTab('market')} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"><i className="fas fa-times"></i></button>
              </header>

              <main className="grid grid-cols-1 md:grid-cols-2 gap-16">
                 <div className="space-y-10">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Manifeste de l'Actif</label>
                       <textarea 
                          value={listingDescription}
                          onChange={e => setListingDescription(e.target.value)}
                          placeholder="Décrivez votre bien (ex: Appartement F4 à Dakar Plateau, vue mer...)"
                          className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-8 py-8 text-lg font-medium outline-none focus:border-emerald-500 h-52 transition-all resize-none shadow-inner"
                       />
                    </div>
                    <button 
                      onClick={handleGenerateListing}
                      disabled={isProcessing || !listingDescription.trim()}
                      className="w-full py-8 bg-emerald-600 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all"
                    >
                      {isProcessing ? 'Forgeage Neural...' : 'Initialiser l\'IA Forge'}
                    </button>
                 </div>

                 <div className="bg-white/5 border border-white/10 rounded-[4rem] p-12 flex flex-col items-center justify-center text-center relative overflow-hidden group border-dashed">
                    {generatedListing ? (
                      <div className="space-y-10 animate-in zoom-in-90 duration-700">
                         <div className="relative rounded-[3rem] overflow-hidden border-4 border-white/10 shadow-2xl">
                            <img src={generatedListing.image} className="w-full h-64 object-cover" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                         </div>
                         <div className="space-y-2">
                            <h4 className="text-2xl font-black uppercase italic">{generatedListing.name}</h4>
                            <p className="text-3xl font-black text-emerald-500 font-orbitron">{generatedListing.price}</p>
                         </div>
                         <button onClick={confirmListing} className="w-full py-5 bg-white text-emerald-900 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-emerald-50 transition-all">Lancer l'Offre Mondiale</button>
                      </div>
                    ) : (
                      <div className="opacity-10 space-y-8">
                         <i className="fas fa-atom text-9xl animate-spin-slow"></i>
                         <p className="text-sm font-black uppercase tracking-widest">En attente des paramètres de forge</p>
                      </div>
                    )}
                    {isProcessing && <div className="scanning-laser"></div>}
                 </div>
              </main>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 bg-emerald-600 rounded-[3.5rem] flex items-center justify-center text-5xl shadow-[0_0_80px_rgba(16,185,129,0.2)] border border-white/20">🤝</div>
          <div>
            <h2 className="text-5xl font-black italic font-orbitron uppercase tracking-tighter">EXCHANGE <span className="text-emerald-500">.CORE</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Nexus Sovereign Protocol v19.0</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-2 rounded-3xl border border-white/10 shadow-inner">
           {['market', 'ledger', 'negotiate', 'contract'].map(t => (
             <button 
              key={t} 
              onClick={() => setActiveTab(t as any)}
              disabled={!selectedItem && t !== 'market' && t !== 'ledger'}
              className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white disabled:opacity-20'}`}
             >
               {t === 'ledger' ? 'Registre' : t}
             </button>
           ))}
           <button 
              onClick={() => setActiveTab('create')}
              className="px-10 py-4 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all ml-4"
           >
              Vendre Actif
           </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden quantum-grid z-10">
        <div className="flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-6">
           {activeTab === 'market' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-700">
                {marketItems.map(item => (
                  <div key={item.id} onClick={() => handleSelectItem(item)} className="exchange-card rounded-[4rem] overflow-hidden cursor-pointer group relative">
                     <div className="relative h-80 overflow-hidden">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                        {item.verified && (
                          <div className="absolute top-6 left-6 px-6 py-2 bg-emerald-600/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20 flex items-center gap-3">
                             <i className="fas fa-check-double text-white animate-pulse"></i> Souveraineté OK
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                           <span className="text-4xl font-black text-white font-orbitron">{item.price}</span>
                        </div>
                     </div>
                     <div className="p-10 space-y-6">
                        <h3 className="text-2xl font-black uppercase italic tracking-tight">{item.name}</h3>
                        <p className="text-sm text-slate-400 font-medium italic">"{item.desc}"</p>
                        <div className="flex items-center justify-between border-t border-white/5 pt-6">
                            <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-500">
                               <img src={`https://picsum.photos/seed/${item.owner}/40/40`} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
                               {item.owner}
                            </div>
                            <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest group-hover:bg-emerald-600 transition-all">Auditer & Négocier</button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           )}

           {activeTab === 'verify' && selectedItem && (
             <div className="h-full flex flex-col gap-8 animate-in zoom-in-95 duration-700">
                <div className="flex-1 neural-stage-v19 flex flex-col lg:flex-row">
                   <div className="relative flex-1">
                      <img src={selectedItem.image} className="w-full h-full object-cover opacity-80" alt="" />
                      <div className="scanning-laser"></div>
                      
                      {/* Diagnostic Hotspots */}
                      <div className="hotspot" style={{ top: '30%', left: '40%' }} onClick={() => handleHotspotClick('Structure Principale')}></div>
                      <div className="hotspot" style={{ top: '60%', left: '70%' }} onClick={() => handleHotspotClick('Certifications')}></div>
                      <div className="hotspot" style={{ top: '80%', left: '20%' }} onClick={() => handleHotspotClick('Provenance')}></div>
                   </div>

                   <div className="w-full lg:w-96 p-12 bg-black/60 border-l border-white/10 space-y-10 overflow-y-auto custom-scrollbar">
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter text-emerald-500">Audit Visuel <span className="text-white">Interactif</span></h3>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed italic">
                        Cliquez sur les hotspots pour une analyse IA granulaire de l'actif.
                      </p>
                      
                      {isProcessing ? (
                         <div className="flex items-center gap-4 text-emerald-500">
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Calcul Neural...</span>
                         </div>
                      ) : hotspotReport ? (
                         <div className="p-8 bg-emerald-600/10 border border-emerald-500/20 rounded-3xl animate-in fade-in">
                            <h4 className="text-[10px] font-black uppercase text-emerald-400 mb-4 tracking-widest">Rapport Diagnostic</h4>
                            <p className="text-sm italic font-medium leading-relaxed">"{hotspotReport}"</p>
                         </div>
                      ) : (
                         <div className="opacity-20 text-center py-20 italic text-sm">Prêt pour inspection...</div>
                      )}

                      <div className="pt-10 border-t border-white/5 flex flex-col gap-4">
                         <button onClick={() => setActiveTab('negotiate')} className="w-full py-5 bg-emerald-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all">Lancer Négociation</button>
                         <button onClick={() => setActiveTab('market')} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">Retour</button>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'negotiate' && selectedItem && (
             <div className="flex flex-col h-full gap-8 animate-in slide-in-from-bottom-6">
                <div className={`flex-1 rounded-[4rem] border p-10 overflow-y-auto space-y-8 custom-scrollbar transition-all duration-700 ${isMediationActive ? 'mediation-room' : 'bg-black/40 border-white/5'}`}>
                   {isMediationActive && (
                     <div className="flex items-center gap-6 mb-10 p-6 bg-indigo-600/20 border border-indigo-400/30 rounded-3xl animate-in slide-in-from-top-4">
                        <img src={EXPERTS.find(e => e.id === 'maitre_diallo')?.avatar} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                        <div>
                           <h4 className="text-xl font-black uppercase text-indigo-400">Salle de Médiation</h4>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Maître Diallo préside la séance</p>
                        </div>
                     </div>
                   )}

                   {negotiationLog.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-center opacity-10 space-y-8">
                        <i className="fas fa-handshake-alt-slash text-9xl text-emerald-500"></i>
                        <p className="text-xl font-black uppercase tracking-widest max-w-sm">Démarrage du protocole de négociation souverain</p>
                     </div>
                   )}

                   {negotiationLog.map(m => (
                     <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-right-4`}>
                        <div className={`max-w-[80%] p-8 rounded-[3rem] text-base leading-relaxed border ${m.role === 'user' ? 'bg-emerald-600 border-emerald-400 text-white rounded-tr-none shadow-xl' : 'bg-white/5 text-slate-100 border-white/10 rounded-tl-none backdrop-blur-xl'}`}>
                           {m.role === 'model' && <div className="text-[9px] font-black uppercase text-emerald-400 mb-3 tracking-widest">{isMediationActive ? 'Médiateur Diallo' : 'Négociateur IA'}</div>}
                           <div className="font-medium italic">"{m.content}"</div>
                        </div>
                     </div>
                   ))}
                   {isProcessing && (
                     <div className="flex justify-start">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex gap-3 animate-pulse">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                           <div className="w-2 h-2 bg-emerald-500 rounded-full delay-150"></div>
                           <div className="w-2 h-2 bg-emerald-500 rounded-full delay-300"></div>
                        </div>
                     </div>
                   )}
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {tacticalSuggestions.map((t, i) => (
                        <button key={i} onClick={() => handleNegotiate(t)} className="flex-shrink-0 px-8 py-3 bg-emerald-600/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase text-emerald-400 tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg">
                          <i className="fas fa-bolt-lightning mr-2 text-[8px]"></i> {t}
                        </button>
                      ))}
                  </div>
                  {!isMediationActive && <button onClick={callMediation} className="flex-shrink-0 px-8 py-3 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-[9px] font-black uppercase text-indigo-400 tracking-widest hover:bg-indigo-600 hover:text-white transition-all">⚖️ Médiation Diallo</button>}
                </div>

                <div className="flex gap-6">
                   <input 
                    type="text" 
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNegotiate()}
                    placeholder="Tapez votre proposition..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] px-12 py-8 text-xl font-medium outline-none focus:border-emerald-500 transition-all shadow-inner"
                   />
                   <button onClick={() => handleNegotiate()} disabled={isProcessing} className="w-24 h-24 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl active:scale-95"><i className="fas fa-paper-plane text-2xl"></i></button>
                </div>
             </div>
           )}

           {activeTab === 'contract' && (
             <div className="flex flex-col h-full gap-8 animate-in zoom-in-95">
                <div className="flex-1 bg-black/60 rounded-[4rem] border border-white/5 p-20 overflow-y-auto custom-scrollbar relative">
                   {isProcessing ? (
                     <div className="h-full flex flex-col items-center justify-center gap-8">
                        <div className="w-24 h-24 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xl font-black uppercase text-emerald-500 animate-pulse tracking-[0.4em]">Validation Notariale v19...</p>
                     </div>
                   ) : (
                     <div className="max-w-4xl mx-auto space-y-16 pb-32">
                        <div className="flex justify-between items-start border-b border-white/10 pb-12">
                           <h3 className="text-5xl font-black italic uppercase tracking-tighter">CONTRAT DE <span className="text-emerald-500">SOUVERAINETÉ</span></h3>
                           <div className="notary-seal-v19">SCELLÉ PAR<br/>ME DIALLO</div>
                        </div>
                        <div className="space-y-8">
                           {contractText.split('[SECTION]').map((section, idx) => section.trim() && (
                             <div key={idx} className="p-10 bg-white/5 rounded-[3rem] border border-white/5 hover:bg-white/10 transition-all cursor-help group">
                                <div className="text-slate-200 leading-relaxed text-xl font-medium whitespace-pre-wrap italic">"{section}"</div>
                                <div className="mt-4 text-[8px] font-black uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-all">Analyse Juridique Instantanée Disponible</div>
                             </div>
                           ))}
                        </div>
                        <div className="pt-20 flex flex-col items-center gap-12">
                           <div className="w-full h-52 bg-black/40 rounded-[3rem] border-2 border-dashed border-white/10 flex items-center justify-center text-slate-700 italic text-lg uppercase tracking-[0.5em]">Validation Biométrique Requise</div>
                           <button onClick={finalizeSeal} className="px-24 py-10 bg-emerald-600 rounded-[3rem] font-black uppercase text-sm tracking-[0.5em] shadow-[0_0_80px_rgba(16,185,129,0.5)] hover:scale-105 transition-all">SCELLER L'ACCORD</button>
                        </div>
                     </div>
                   )}
                </div>
             </div>
           )}

           {activeTab === 'ledger' && (
             <div className="h-full flex flex-col gap-10 animate-in fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[4rem] p-16 space-y-12">
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter text-emerald-500 border-b border-white/5 pb-10">REGISTRE SOUVERAIN</h3>
                      <div className="space-y-12 overflow-y-auto custom-scrollbar pr-4" style={{ maxHeight: '600px' }}>
                        {ledgerEntries.map(entry => (
                          <div key={entry.id} className="ledger-entry flex justify-between items-center group">
                             <div className="space-y-3">
                                <div className="text-[11px] font-black text-slate-600 tracking-widest">{entry.id} • {entry.date}</div>
                                <div className="text-2xl font-black uppercase italic group-hover:text-emerald-400 transition-colors">{entry.item}</div>
                                <div className="text-sm font-bold text-slate-400 italic">Partie : {entry.party} • Valeur : {entry.price}</div>
                             </div>
                             <div className="text-right">
                                <span className="px-8 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest">{entry.status}</span>
                                <div className="mt-4 text-[9px] font-black text-slate-700 font-mono tracking-tighter">SIG: {Math.random().toString(36).slice(2, 18).toUpperCase()}</div>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-10">
                      <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 space-y-8">
                         <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Analytics Marché Global</h4>
                         <div className="flex items-end justify-between h-40 px-6">
                            {[40, 60, 45, 80, 55, 95, 75].map((h, i) => (
                               <div key={i} className="price-chart-bar" style={{ height: `${h}%`, opacity: 0.3 + (i * 0.1) }}></div>
                            ))}
                         </div>
                         <div className="flex justify-between text-[9px] font-black text-slate-700 uppercase">
                            <span>2022</span>
                            <span>Aujourd'hui</span>
                         </div>
                         <div className="pt-6 border-t border-white/5 text-center">
                            <div className="text-2xl font-black text-emerald-500 font-orbitron">+24.5%</div>
                            <div className="text-[8px] font-black text-slate-600 uppercase mt-1">Croissance Catégorie</div>
                         </div>
                      </div>

                      <div className="p-10 bg-emerald-600/10 border border-emerald-500/20 rounded-[4rem] text-center space-y-6">
                         <i className="fas fa-medal text-4xl text-emerald-500"></i>
                         <h4 className="text-xl font-black uppercase italic">Taux de Confiance 100%</h4>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed italic">"Toutes vos transactions sont scellées dans le marbre du Nexus."</p>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        <aside className="space-y-8">
           {selectedItem ? (
             <div className="space-y-8 animate-in slide-in-from-right-10">
               <div className="exchange-card p-12 rounded-[4rem] space-y-12">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-4"><i className="fas fa-shield-halved"></i> Audit de Souveraineté</h4>
                  <div className="space-y-8 border-b border-white/5 pb-10">
                     <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-500">Juste Valeur IA</span><div className="appraisal-badge">{appraisalData?.marketTrend === 'up' ? '📈 TENDANCE HAUSSE' : '⚖️ MARCHÉ STABLE'}</div></div>
                     <div className="text-4xl font-black font-orbitron text-white">{appraisalData?.suggestedPrice}</div>
                     <p className="text-[11px] text-slate-400 font-medium italic leading-relaxed">"{appraisalData?.reasoning}"</p>
                  </div>
                  {riskData && (
                    <div className="space-y-8">
                       <div className="flex justify-between items-end"><span className="text-xs font-black uppercase text-slate-500">Indice de Confiance Nexus</span><span className="text-4xl font-black font-orbitron text-emerald-500">{riskData.score}%</span></div>
                       <div className="risk-meter"><div className="risk-fill bg-emerald-500" style={{ width: `${riskData.score}%` }}></div></div>
                       <div className="p-8 bg-white/5 rounded-[2.5rem] italic text-[11px] text-slate-300 border border-white/5 leading-relaxed">⚖️ {riskData.advice}</div>
                    </div>
                  )}
               </div>

               {logisticsData && (
                 <div className="p-12 bg-indigo-600/10 border border-indigo-500/20 rounded-[4rem] space-y-8 animate-in slide-in-from-right-20">
                    <h4 className="text-[12px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-4"><i className="fas fa-route"></i> Logistique Souveraine</h4>
                    <div className="p-8 bg-black/40 rounded-[2.5rem] space-y-6">
                       <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-slate-600">Corridor</span><span className="text-white">Dakar <> Marseille</span></div>
                       <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-slate-600">Douane Est.</span><span className="text-indigo-400">12.5%</span></div>
                       <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-slate-600">Délai Sync</span><span className="text-white">48h Neural</span></div>
                    </div>
                    <button className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl">Activer Protocole Transport</button>
                 </div>
               )}

               {marketIntel && (
                 <div className="market-intel-panel space-y-8 animate-in fade-in">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-4"><i className="fab fa-google"></i> Market Grounding</h4>
                    <p className="text-sm text-slate-400 leading-relaxed italic">"{marketIntel.text.slice(0, 180)}..."</p>
                    <div className="flex flex-col gap-3">
                       {marketIntel.sources.slice(0, 2).map((s, i) => (
                         <a key={i} href={s.uri} target="_blank" className="text-[10px] font-black text-sky-500 uppercase flex items-center gap-3 hover:text-white transition-all"><i className="fas fa-link"></i> {s.title}</a>
                       ))}
                    </div>
                 </div>
               )}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-10 p-20 space-y-12 border-2 border-dashed border-white/10 rounded-[5rem]">
                <i className="fas fa-handshake-angle text-9xl text-emerald-500"></i>
                <p className="text-lg font-black uppercase tracking-widest leading-loose">Initialisez le protocole d'échange en sélectionnant un actif du marché mondial.</p>
             </div>
           )}
        </aside>
      </main>

      <footer className="absolute bottom-6 left-12 right-12 h-10 bg-black/60 border-t border-white/5 rounded-full flex items-center px-10 overflow-hidden shadow-2xl">
         <div className="flex gap-24 animate-marquee whitespace-nowrap text-[9px] font-black uppercase text-slate-600 tracking-widest italic">
            <span>• EXCHANGE CORE v19.0 STATUS: OPTIMAL</span>
            <span>• SOUVERAINETÉ DIALLO: CERTIFIÉE</span>
            <span>• BTC/MOK: 43,120.12 ↑</span>
            <span>• DERNIER BLOC SCÉLLÉ: {ledgerEntries[0]?.id || 'N/A'}</span>
            <span>• ANALYSE TERRAIN: VALEUR ESTIMÉE +12% VS MARCHE MONDIAL</span>
            <span>• PROTOCOLE SILK ROAD: LIAISON DAKAR-MARSEILLE STABLE</span>
         </div>
      </footer>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 40s linear infinite; display: inline-flex; width: 200%; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
