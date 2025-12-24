
import React from 'react';
import { Expert, Message } from '../types';

interface ExpertCardProps {
  expert: Expert;
  isActive: boolean;
  lastMessage?: Message;
  onClick: () => void;
}

export const ExpertCard: React.FC<ExpertCardProps> = ({ expert, isActive, lastMessage, onClick }) => {
  const syncRate = Math.floor(Math.random() * 5) + 95;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-6 p-6 rounded-[2.8rem] transition-all duration-500 text-left border relative overflow-hidden group ${
        isActive 
          ? 'bg-blue-600/10 border-blue-500/40 shadow-2xl scale-[1.02]' 
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
      
      <div className="relative flex-shrink-0 z-10">
        <div className={`w-16 h-16 rounded-[1.8rem] overflow-hidden bg-slate-900 border transition-all duration-700 ${isActive ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 grayscale group-hover:grayscale-0'}`}>
          <img src={expert.avatar} alt="" className="w-full h-full object-cover" />
        </div>
        {isActive && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 border-4 border-[#03030b] rounded-full animate-pulse"></div>
        )}
      </div>

      <div className="flex-1 min-w-0 z-10">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className={`font-orbitron font-black text-[10px] uppercase tracking-widest ${isActive ? 'text-blue-400' : 'text-white'}`}>
            {expert.name} <span className="opacity-40">.AI</span>
          </h3>
          {lastMessage && (
            <span className="text-[7px] font-black text-slate-600 uppercase">
              {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        
        <div className="truncate text-[11px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
          {lastMessage ? lastMessage.content : expert.role}
        </div>
        
        {!lastMessage && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full bg-blue-500 transition-all duration-1000 ${isActive ? 'w-full' : 'w-1/3'}`}></div>
            </div>
            <span className="text-[6px] font-black text-slate-600 uppercase">{syncRate}% SYNC</span>
          </div>
        )}
      </div>
      
      {isActive && (
        <div className="ml-2 flex flex-col gap-1 items-center">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
           <div className="w-1 h-1 rounded-full bg-blue-500/40"></div>
        </div>
      )}
    </button>
  );
};
