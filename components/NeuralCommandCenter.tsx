
import React, { useState, useEffect, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { ViewType, AppAction } from '../types';

interface NeuralCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: AppAction) => void;
}

export const NeuralCommandCenter: React.FC<NeuralCommandCenterProps> = ({ isOpen, onClose, onAction }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Planifie mon expatriation",
    "Génère un contrat de vente",
    "Analyse ce document",
    "Synergie sur le futur de l'IA"
  ]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await gemini.parseOmniCommand(input);
      onAction({
        type: 'NAVIGATE',
        target: result.target,
        payload: result.params
      });
      setInput('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-32 px-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-[#0a0a1a] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(37,99,235,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
        <form onSubmit={handleSubmit} className="p-8 border-b border-white/5 flex items-center gap-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
            {isProcessing ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-terminal"></i>}
          </div>
          <input 
            ref={inputRef}
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Que doit accomplir le Nexus ?"
            className="flex-1 bg-transparent border-none text-xl font-medium outline-none placeholder:text-slate-600"
          />
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-500 uppercase">CMD + K</div>
        </form>

        <div className="p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 ml-4">Suggestions Cognitives</div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button 
                key={i}
                onClick={() => setInput(s)}
                className="w-full text-left px-6 py-4 rounded-2xl hover:bg-white/5 text-sm font-medium transition-all flex items-center gap-4 group"
              >
                <i className="fas fa-chevron-right text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-all"></i>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-600/10 p-4 text-center">
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.5em]">Nexus OS Singularity v10.0</span>
        </div>
      </div>
    </div>
  );
};
