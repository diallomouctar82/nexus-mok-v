
import React, { useState, useEffect, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { Message, GroundingSource } from '../types';

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
  const [hotspotReport, setHotspotReport] = useState<string | null>(null);
  const [logisticsData, setLogisticsData] = useState<any>(null);
  const [isMediationActive, setIsMediationActive] = useState(false);

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
    if (!selectedItem) return;
    setIsProcessing(true);
    setHotspotReport(null);
    try {
      const report = await gemini.analyzeMedia(`Analyse visuelle spécifique de la partie "${part}" de cet actif : ${selectedItem.name}.`, { data: "base64placeholder", mimeType: 'image/jpeg' });
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
        gemini.generateImage(`Professional high-end product catalog photo of: ${listingDescription}, cinematic lighting, 8k`, { aspectRatio: '16:9', imageSize: '1K' })
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
    if (!selectedItem) return;
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
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      {activeTab === 'create' && (
        <div className="absolute inset-0 z-[100] p-20 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setActiveTab('market')}></div>
           <div className="relative w-full max-w-5xl bg-black/80 border border-white/10 rounded-[4rem] p-20 space-y-12 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10b981]"></div>
              <header className="flex justify-between items-center">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-600/20 rounded-[2rem] flex items-center justify-center text-4xl text-emerald-500">
                       <i className="fas fa-microchip"></i>
                    </div>
                    <div>
                       <h3 className="text-4xl font-black uppercase italic tracking-tighter font-orbitron text-white">Nexus <span className="text-emerald-500">Forge</span></h3>
                    </div>
                 </div>
                 <button onClick={() => setActiveTab('market')} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"><i className="fas fa-times"></i></button>
              </header>

              <main className="grid grid-cols-1 md:grid-cols-2 gap-16">
                 <div className="space-y-10">
                    <textarea 
                      value={listingDescription}
                      onChange={e => setListingDescription(e.target.value)}
                      placeholder="Décrivez votre bien..."
                      className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-8 py-8 text-lg font-medium outline-none focus:border-emerald-500 h-52 transition-all resize-none shadow-inner text-white"
                    />
                    <button onClick={handleGenerateListing} disabled={isProcessing} className="w-full py-8 bg-emerald-600 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl">
                      {isProcessing ? 'Génération...' : 'Initialiser IA Forge'}
                    </button>
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-[4rem] p-12 flex flex-col items-center justify-center text-center relative border-dashed">
                    {generatedListing ? (
                      <div className="space-y-10 animate-in zoom-in-90 duration-700">
                         <img src={generatedListing.image} className="w-full h-64 object-cover rounded-3xl" alt="" />
                         <h4 className="text-2xl font-black uppercase italic">{generatedListing.name}</h4>
                         <button onClick={confirmListing} className="w-full py-5 bg-white text-emerald-900 rounded-3xl font-black uppercase text-[11px]">Lancer l'Offre</button>
                      </div>
                    ) : (
                      <div className="opacity-10 text-center space-y-8">
                         <i className="fas fa-atom text-9xl animate-spin"></i>
                      </div>
                    )}
                 </div>
              </main>
           </div>
        </div>
      )}

      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 bg-emerald-600 rounded-[3.5rem] flex items-center justify-center text-5xl shadow-2xl">🤝</div>
          <div>
            <h2 className="text-5xl font-black italic font-orbitron uppercase tracking-tighter">EXCHANGE <span className="text-emerald-500">.CORE</span></h2>
          </div>
        </div>

        <div className="flex bg-white/5 p-2 rounded-3xl border border-white/10">
           {['market', 'ledger', 'negotiate', 'contract'].map(t => (
             <button key={t} onClick={() => setActiveTab(t as any)} disabled={!selectedItem && t !== 'market' && t !== 'ledger'} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white disabled:opacity-20'}`}>
               {t === 'ledger' ? 'Registre' : t}
             </button>
           ))}
           <button onClick={() => setActiveTab('create')} className="px-10 py-4 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest ml-4">Vendre</button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden quantum-grid z-10">
        <div className="flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-6">
           {activeTab === 'market' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {marketItems.map(item => (
                  <div key={item.id} onClick={() => handleSelectItem(item)} className="exchange-card rounded-[4rem] overflow-hidden cursor-pointer group relative">
                     <img src={item.image} className="w-full h-80 object-cover group-hover:scale-105 transition-all duration-700" alt="" />
                     <div className="p-10 space-y-6">
                        <h3 className="text-2xl font-black uppercase italic">{item.name}</h3>
                        <p className="text-sm text-slate-400 font-medium italic">"{item.desc}"</p>
                        <div className="flex justify-between items-center text-3xl font-black text-emerald-500 font-orbitron">{item.price}</div>
                     </div>
                  </div>
                ))}
             </div>
           )}

           {activeTab === 'verify' && selectedItem && (
             <div className="h-full flex flex-col gap-8 animate-in zoom-in-95">
                <div className="flex-1 neural-stage-v19 flex flex-col lg:flex-row">
                   <div className="relative flex-1 bg-black">
                      <img src={selectedItem.image} className="w-full h-full object-cover opacity-60" alt="" />
                      <div className="scanning-laser"></div>
                      <div className="hotspot" style={{ top: '30%', left: '40%' }} onClick={() => handleHotspotClick('Structure')}></div>
                      <div className="hotspot" style={{ top: '60%', left: '70%' }} onClick={() => handleHotspotClick('Certificats')}></div>
                   </div>
                   <div className="w-full lg:w-96 p-12 bg-black/60 border-l border-white/10 space-y-10 overflow-y-auto custom-scrollbar">
                      <h3 className="text-2xl font-black uppercase italic text-emerald-500">Audit Visuel</h3>
                      {hotspotReport ? (
                         <div className="p-8 bg-emerald-600/10 border border-emerald-500/20 rounded-3xl italic text-sm">"{hotspotReport}"</div>
                      ) : (
                         <div className="opacity-20 text-center py-20 italic">Sélectionnez un point d'intérêt</div>
                      )}
                      <button onClick={() => setActiveTab('negotiate')} className="w-full py-5 bg-emerald-600 rounded-2xl font-black uppercase text-[10px]">Négocier</button>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'negotiate' && selectedItem && (
             <div className="flex flex-col h-full gap-8">
                <div className={`flex-1 rounded-[4rem] border p-10 overflow-y-auto space-y-8 custom-scrollbar ${isMediationActive ? 'mediation-room' : 'bg-black/40 border-white/5'}`}>
                   {negotiationLog.map(m => (
                     <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-8 rounded-[3rem] text-base border ${m.role === 'user' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 text-slate-100 border-white/10'}`}>
                           <div className="font-medium italic">"{m.content}"</div>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="flex gap-6">
                   <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNegotiate()} placeholder="Message..." className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] px-12 py-8 text-xl outline-none" />
                   <button onClick={() => handleNegotiate()} className="w-24 h-24 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl"><i className="fas fa-paper-plane"></i></button>
                </div>
             </div>
           )}

           {activeTab === 'contract' && selectedItem && (
             <div className="h-full bg-black/60 rounded-[4rem] border border-white/5 p-20 flex flex-col items-center justify-center text-center space-y-12">
                <div className="notary-seal-v19 mx-auto">SCELLÉ PAR<br/>ME DIALLO</div>
                <h3 className="text-5xl font-black uppercase italic">Protocole de Souveraineté</h3>
                <button onClick={finalizeSeal} className="px-24 py-10 bg-emerald-600 rounded-[3rem] font-black uppercase text-sm tracking-[0.5em] shadow-2xl">SCELLER L'ACCORD</button>
             </div>
           )}

           {activeTab === 'ledger' && (
             <div className="bg-white/5 border border-white/10 rounded-[4rem] p-16 flex flex-col gap-10 overflow-y-auto">
                <h3 className="text-4xl font-black uppercase italic text-emerald-500 border-b border-white/5 pb-10">REGISTRE SOUVERAIN</h3>
                {ledgerEntries.map(entry => (
                  <div key={entry.id} className="flex justify-between items-center p-8 bg-white/5 rounded-3xl">
                     <div>
                        <div className="text-[11px] font-black text-slate-600">{entry.id} • {entry.date}</div>
                        <div className="text-2xl font-black uppercase">{entry.item}</div>
                     </div>
                     <span className="px-8 py-3 bg-emerald-600/20 text-emerald-400 rounded-2xl text-[10px] font-black">{entry.status}</span>
                  </div>
                ))}
             </div>
           )}
        </div>

        <aside className="space-y-8">
           {selectedItem ? (
             <div className="exchange-card p-12 rounded-[4rem] space-y-12">
                <h4 className="text-[12px] font-black uppercase text-emerald-400 flex items-center gap-4"><i className="fas fa-shield-halved"></i> Audit Souverain</h4>
                <div className="text-4xl font-black font-orbitron text-white">{appraisalData?.suggestedPrice || selectedItem.price}</div>
                <p className="text-sm text-slate-400 italic">"{appraisalData?.reasoning || 'Analyse de valeur en attente...'}"</p>
                {riskData && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black"><span>CONFIANCE NEXUS</span><span>{riskData.score}%</span></div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${riskData.score}%` }}></div></div>
                  </div>
                )}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-10 border-2 border-dashed border-white/10 rounded-[5rem] p-20">
                <i className="fas fa-handshake-angle text-9xl"></i>
             </div>
           )}
        </aside>
      </main>

      <footer className="h-12 bg-black/60 border-t border-white/5 rounded-full flex items-center px-12 overflow-hidden">
         <div className="flex gap-24 whitespace-nowrap text-[9px] font-black uppercase text-slate-600 tracking-widest italic animate-marquee">
            <span>• EXCHANGE CORE v19.0 STATUS: OPTIMAL</span>
            <span>• SOUVERAINETÉ DIALLO: CERTIFIÉE</span>
            <span>• BTC/MOK: 43,120.12 ↑</span>
            <span>• PROTOCOLE SILK ROAD: LIAISON DAKAR-MARSEILLE STABLE</span>
            <span>• ANALYSE TERRAIN: VALEUR ESTIMÉE +12% VS MARCHE MONDIAL</span>
         </div>
      </footer>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; display: inline-flex; width: 200%; }
      `}</style>
    </div>
  );
};
