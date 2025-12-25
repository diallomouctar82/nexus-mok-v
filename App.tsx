import React, { useState, useEffect, useCallback } from 'react';
import { EXPERTS } from './constants';
import { Expert, Message, ViewType, AppAction, Artifact } from './types';
import { DashboardComponent } from './components/DashboardComponent';
import { MokNetwork } from './components/MokNetwork';
import { LiveStudio } from './components/LiveStudio';
import { ArchitectBranch } from './components/ArchitectButton';
import { QuantumExchange } from './components/QuantumExchange';
import { NexusSynergy } from './components/NexusSynergy';
import { StrategicHub } from './components/StrategicHub';
import { NeuralCommandCenter } from './components/NeuralCommandCenter';
import { LinguaWorld } from './components/LinguaWorld';
import { ShopUniverse } from './components/ShopUniverse';
import { GeniusHub } from './components/GeniusHub';
import { InfluencerStudio } from './components/InfluencerStudio';
import { MediaLab } from './components/MediaLab';
import { ChatInterface } from './components/ChatInterface';
import { AdminDashboard } from './components/AdminDashboard';
import { SupabaseAuth } from './components/SupabaseAuth';
import { supabase, SupabaseService } from './services/supabase';

const ENTRY_POINTS = [
  { id: 'strategy', label: 'MON PROJET', desc: 'Ma stratégie de vie', icon: 'fa-map-location-dot', color: 'text-blue-400' },
  { id: 'expert-chat', label: 'DIALOGUE', desc: 'Souveraineté Active', icon: 'fa-comment-dots', color: 'text-emerald-400' },
  { id: 'lab', label: 'MEDIA LAB', desc: 'Génération IA', icon: 'fa-flask-vial', color: 'text-amber-400' },
  { id: 'genius', label: 'GENIUS CORE', desc: 'Hub des cerveaux', icon: 'fa-brain-circuit', color: 'text-indigo-400' },
  { id: 'shop', label: 'MARKET', desc: 'Économie Réelle', icon: 'fa-cart-shopping', color: 'text-orange-300' },
  { id: 'lingua', label: 'LINGUA', desc: 'Traduction Live', icon: 'fa-language', color: 'text-teal-400' },
  { id: 'influencers', label: 'STUDIO', desc: 'Avatars Influence', icon: 'fa-user-astronaut', color: 'text-pink-400' },
  { id: 'live', label: 'DIRECT', desc: 'Liaison Satellite', icon: 'fa-satellite-dish', color: 'text-red-400' },
  { id: 'mok', label: 'ACADEMY', desc: 'Savoir Souverain', icon: 'fa-graduation-cap', color: 'text-purple-400' },
  { id: 'synergy', label: 'SYNERGIE', desc: 'Fusion Cognitive', icon: 'fa-users-rays', color: 'text-emerald-400' },
  { id: 'exchange', label: 'EXCHANGE', desc: 'Contrats Notariés', icon: 'fa-handshake', color: 'text-amber-400' },
  { id: 'admin', label: 'ADMIN', desc: 'Contrôle Nexus', icon: 'fa-gears', color: 'text-red-500' },
];

const App: React.FC = () => {
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<ViewType>('strategy');
  
  const [isExpertBranchActive, setIsExpertBranchActive] = useState(false);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [activeExpert, setActiveExpert] = useState<Expert>(EXPERTS[0]);
  
  const [histories, setHistories] = useState<Record<string, Message[]>>({});
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [session, setSession] = useState<any>(null);
  const [pendingGoal, setPendingGoal] = useState<string | null>(null);

  useEffect(() => {
    const requestMicAccess = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn("Accès microphone refusé:", err);
      }
    };
    requestMicAccess();
  }, []);

  useEffect(() => {
    const initNexusMemory = async () => {
      if (!supabase) {
        setBooting(false);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      const loadedHistories: Record<string, Message[]> = {};
      for (const expert of EXPERTS) {
        const history = await SupabaseService.getChatHistory(expert.id);
        loadedHistories[expert.id] = history;
      }
      setHistories(loadedHistories);
      setBooting(false);
    };

    initNexusMemory();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initNexusMemory();
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleAction = useCallback((action: AppAction) => {
    if (action.type === 'NAVIGATE' && action.target) {
      if (action.target === 'expert-chat') {
        setIsExpertBranchActive(true);
      } else {
        setView(action.target);
        if (action.payload?.goal) {
          setPendingGoal(action.payload.goal);
        }
      }
    } else if (action.type === 'MEMORIZE') {
      if (action.payload?.content) {
        setArtifacts(prev => [action.payload, ...prev]);
      }
    }
  }, []);

  const handleNewMessage = useCallback((expertId: string, msg: Message) => {
    setHistories(prev => ({
      ...prev,
      [expertId]: [...(prev[expertId] || []), msg]
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandCenterOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (booting) {
    return (
      <div className="h-screen w-screen bg-[#03030b] flex flex-col items-center justify-center font-orbitron overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/10 blur-[150px] animate-pulse"></div>
          <div className="w-40 h-40 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[4rem] flex items-center justify-center text-7xl shadow-[0_0_100px_rgba(37,99,235,0.4)] animate-bounce relative z-10 border border-white/20">🛡️</div>
        </div>
        <h1 className="mt-20 text-4xl font-black text-white tracking-[0.5em] uppercase animate-pulse text-center px-12 italic">NEXUS DIALLO</h1>
        <p className="mt-4 text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Liaison à la Mémoire Souveraine...</p>
      </div>
    );
  }

  const getViewTitle = (v: ViewType) => {
    const point = ENTRY_POINTS.find(p => p.id === v);
    return point ? point.label : v.toUpperCase();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#03030b] text-white selection:bg-blue-500/30 font-inter">
      {isExpertBranchActive && (
        <div className="fixed inset-0 z-[5000] p-6 md:p-16 bg-black/80 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500 flex items-center justify-center">
          <div className="w-full h-full max-w-[1600px]">
            <ChatInterface 
              expert={activeExpert} 
              messages={histories[activeExpert.id] || []} 
              allHistories={histories}
              onNewMessage={(msg) => handleNewMessage(activeExpert.id, msg)} 
              onClearChat={() => setHistories(prev => ({ ...prev, [activeExpert.id]: [] }))} 
              onExpertChange={setActiveExpert}
              onExecuteAction={handleAction}
              onClose={() => setIsExpertBranchActive(false)}
              isSovereignBranch={true}
            />
          </div>
        </div>
      )}

      <NeuralCommandCenter isOpen={isCommandCenterOpen} onClose={() => setIsCommandCenterOpen(false)} onAction={handleAction} />

      <aside className={`w-28 h-full flex flex-col glass-panel border-r border-white/5 z-[100] py-10 items-center gap-6 transition-all duration-700 ${isExpertBranchActive ? 'blur-lg opacity-20 pointer-events-none scale-95' : ''}`}>
        <div 
          className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center text-2xl shadow-2xl cursor-pointer hover:rotate-12 transition-all active:scale-95 border border-white/20" 
          onClick={() => setView('dashboard')}
          title="Accueil"
        >
          🛡️
        </div>
        <div className="flex-1 flex flex-col gap-5 custom-scrollbar overflow-y-auto px-4 py-4">
          {ENTRY_POINTS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'expert-chat') setIsExpertBranchActive(true);
                else setView(item.id as ViewType);
              }}
              className={`relative group w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all border ${
                (view === item.id && !isExpertBranchActive) || (item.id === 'expert-chat' && isExpertBranchActive)
                  ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.4)] scale-110' 
                  : 'bg-white/5 border-transparent hover:border-white/20'
              }`}
            >
              <i className={`fas ${item.icon} text-xl ${view === item.id ? 'text-white' : item.color}`}></i>
              <div className="nexus-tooltip">
                <div className="font-black text-[11px] uppercase tracking-widest text-white mb-1">{item.label}</div>
                <div className="text-[8px] text-slate-500 uppercase font-bold">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 relative transition-all duration-700 ${isExpertBranchActive ? 'blur-2xl opacity-10 pointer-events-none' : ''}`}>
        <header className="h-32 px-16 flex items-center justify-between z-50 bg-gradient-to-b from-[#03030b] to-transparent">
           <div className="flex flex-col">
              <div className="flex items-center gap-4">
                 <h1 className="text-2xl font-black font-orbitron tracking-tighter italic uppercase">{getViewTitle(view)}</h1>
                 <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase text-emerald-500 tracking-widest">Branche Centrale Active</div>
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] mt-2">NEXUS SOUVERAIN OS v12.5</span>
           </div>
        </header>

        <div className="flex-1 overflow-hidden p-10 portal-view relative">
          <div className="relative h-full z-10">
            {(() => {
              switch(view) {
                case 'strategy': return <StrategicHub onNavigate={setView} onExecute={handleAction} externalGoal={pendingGoal} onGoalConsumed={() => setPendingGoal(null)} initialArtifacts={artifacts} />;
                case 'lab': return <MediaLab />;
                case 'genius': return <GeniusHub />;
                case 'shop': return <ShopUniverse />;
                case 'lingua': return <LinguaWorld />;
                case 'influencers': return <InfluencerStudio />;
                case 'live': return <LiveStudio />;
                case 'synergy': return <NexusSynergy onAction={handleAction} />;
                case 'exchange': return <QuantumExchange />;
                case 'dashboard': return <DashboardComponent />;
                case 'admin': return <AdminDashboard />;
                case 'auth': return <SupabaseAuth />;
                case 'mok': return <MokNetwork onClose={() => setView('dashboard')} />;
                default: return <DashboardComponent />;
              }
            })()}
          </div>
        </div>
      </main>

      <ArchitectBranch currentTab={view} setActiveTab={setView} onExecuteAction={handleAction} />
    </div>
  );
};

export default App;