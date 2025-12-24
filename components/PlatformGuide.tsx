
import React, { useState, useEffect } from 'react';
import { AppAction } from '../types';
import { mcpService } from '../services/mcpService';

interface PlatformGuideProps {
  onNavigate: (tab: any) => void;
  currentTab: string;
  onExecuteAction: (action: AppAction) => void;
}

export const PlatformGuide: React.FC<PlatformGuideProps> = ({ onNavigate, currentTab, onExecuteAction }) => {
  const [sync, setSync] = useState(99.98);
  const [memoryUsage, setMemoryUsage] = useState(12);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSync(prev => Math.min(100, Math.max(99.95, prev + (Math.random() * 0.02 - 0.01))));
      setMemoryUsage(prev => Math.min(100, Math.max(10, prev + (Math.random() * 2 - 1))));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-24 right-12 w-96 z-[9998] pointer-events-none font-inter">
      <div className="glass-panel border border-white/10 rounded-[3.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] opacity-100 pointer-events-auto hover:border-blue-500/40 transition-all duration-700">
        
        {/* HUD Header Diagnostic */}
        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
          <div className="flex items-center gap-5">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              <div className="relative w-6 h-6 bg-blue-600 rounded-full shadow-[0_0_20px_#3b82f6] border-2 border-white/20"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-black text-white uppercase tracking-[0.5em] leading-none font-orbitron">NEXUS v8.2</span>
              <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                 <i className="fas fa-link animate-pulse"></i> SOVEREIGN LINK ACTIVE
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-emerald-400 tracking-tighter leading-none">{sync.toFixed(2)}%</span>
            <div className="text-[7px] font-black text-slate-500 uppercase mt-2 tracking-[0.2em]">Neural Convergence</div>
          </div>
        </div>
        
        {/* Memory Bar */}
        <div className="mb-10 px-2">
           <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">
              <span>Neural Load</span>
              <span>{memoryUsage.toFixed(0)} MB/s</span>
           </div>
           <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-700" style={{width: `${memoryUsage}%`}}></div>
           </div>
        </div>
        
        {/* Navigation Branches */}
        <div className="space-y-4 overflow-y-auto max-h-[500px] no-scrollbar pr-1">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.6em] mb-4 px-4">Neural Entry Points</p>
          
          <button 
            onClick={() => onNavigate('lingua')}
            className={`w-full flex items-center justify-between p-6 rounded-[2.2rem] transition-all duration-500 border group ${
              currentTab === 'lingua' ? 'bg-teal-600 border-teal-400 text-white shadow-2xl shadow-teal-900/40 scale-105' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${currentTab === 'lingua' ? 'bg-white/20' : 'bg-teal-500/10 text-teal-400'}`}>
                <i className="fas fa-globe-africa"></i>
              </div>
              <div className="text-left">
                <span className="text-[13px] font-black uppercase tracking-tight block">Lingua World</span>
                <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-1">Multi-Dialect Translation</span>
              </div>
            </div>
            <i className="fas fa-chevron-right text-[10px] opacity-40 group-hover:translate-x-1 transition-transform"></i>
          </button>

          <button 
            onClick={() => onNavigate('shop')}
            className={`w-full flex items-center justify-between p-6 rounded-[2.2rem] transition-all duration-500 border group ${
              currentTab === 'shop' ? 'bg-orange-600 border-orange-400 text-white shadow-2xl shadow-orange-900/40 scale-105' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${currentTab === 'shop' ? 'bg-white/20' : 'bg-orange-500/10 text-orange-400'}`}>
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="text-left">
                <span className="text-[13px] font-black uppercase tracking-tight block">Shop Universe</span>
                <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-1">AI-Powered Marketplace</span>
              </div>
            </div>
            <i className="fas fa-chevron-right text-[10px] opacity-40 group-hover:translate-x-1 transition-transform"></i>
          </button>

          <button 
            onClick={() => onNavigate('live')}
            className={`w-full flex items-center justify-between p-6 rounded-[2.2rem] transition-all duration-500 border group ${
              currentTab === 'live' ? 'bg-rose-600 border-rose-400 text-white shadow-2xl shadow-rose-900/40 scale-105' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${currentTab === 'live' ? 'bg-white/20' : 'bg-rose-500/10 text-rose-400'}`}>
                <i className="fas fa-video"></i>
              </div>
              <div className="text-left">
                <span className="text-[13px] font-black uppercase tracking-tight block">Live Studio</span>
                <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-1">Immersive Streaming Hub</span>
              </div>
            </div>
            <i className="fas fa-chevron-right text-[10px] opacity-40 group-hover:translate-x-1 transition-transform"></i>
          </button>
          
          <div className="pt-6">
             <button 
               onClick={() => mcpService.initHandshake()}
               className="w-full flex items-center gap-5 p-6 rounded-[2.2rem] bg-slate-800 border border-white/10 text-white hover:bg-slate-700 transition-all group"
             >
               <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">
                  <i className="fas fa-satellite"></i>
               </div>
               <div className="text-left">
                 <span className="text-[13px] font-black uppercase tracking-tight block">MCP Satellite Bridge</span>
                 <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-1">Connect External Host</span>
               </div>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
