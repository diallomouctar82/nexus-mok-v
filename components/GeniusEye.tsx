
import React, { useState, useRef } from 'react';
import { gemini } from '../services/geminiService';

export const GeniusEye: React.FC = () => {
  const [media, setMedia] = useState<{data: string, type: string} | null>(null);
  const [prompt, setPrompt] = useState("Analyse cet élément en détail pour l'expertise Diallo.");
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setMedia({ data: e.target?.result as string, type: file.type });
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!media) return;
    setIsAnalyzing(true);
    try {
      const res = await gemini.analyzeMedia(prompt, { 
        data: media.data.split(',')[1], 
        mimeType: media.type 
      });
      setAnalysis(res);
    } catch (e) {
      setAnalysis("Échec de la vision neuronale.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full bg-white/5 border border-white/5 rounded-[3.5rem] p-12 flex flex-col gap-10 overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-8">
        <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl animate-pulse">👁️</div>
        <div>
          <h2 className="text-4xl font-black italic font-orbitron uppercase">Genius <span className="text-blue-500">Eye</span></h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] mt-2">Vision Multimodale Pro v10.0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 flex-1">
        <div className="space-y-8">
          <div 
            onClick={() => fileRef.current?.click()}
            className="aspect-video bg-black/40 rounded-[3rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden relative group"
          >
            {media ? (
              media.type.startsWith('image') ? (
                <img src={media.data} className="w-full h-full object-cover" alt="" />
              ) : (
                <video src={media.data} className="w-full h-full object-cover" controls />
              )
            ) : (
              <>
                <i className="fas fa-expand text-6xl opacity-10 mb-6 group-hover:scale-110 transition-transform"></i>
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Déposer Image ou Vidéo</span>
              </>
            )}
            <input type="file" ref={fileRef} hidden onChange={handleFile} accept="image/*,video/*" />
          </div>

          <div className="flex gap-4">
             <input 
              type="text" 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-sm outline-none focus:border-blue-500 transition-all"
             />
             <button 
              onClick={startAnalysis}
              disabled={isAnalyzing || !media}
              className="px-10 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50"
             >
              {isAnalyzing ? "Analyse..." : "Scanner"}
             </button>
          </div>
        </div>

        <div className="bg-black/60 rounded-[3rem] border border-white/5 p-12 overflow-y-auto custom-scrollbar">
           <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-8">Intelligence Extraite</h3>
           {analysis ? (
             <div className="prose prose-invert max-w-none text-slate-300 leading-loose animate-in fade-in slide-in-from-right-4">
                {analysis}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center opacity-10 text-center">
                <i className="fas fa-brain text-7xl mb-6"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">En attente de données sensorielles...</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
