
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { gemini } from '../services/geminiService';
import { EXPERTS } from '../constants';

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
const IMAGE_SIZES = ['1K', '2K', '4K'];

export const MediaLab: React.FC = () => {
  const [mode, setMode] = useState<'image' | 'video' | 'edit' | 'analyze'>('image');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  
  const [sourceFile, setSourceFile] = useState<{ data: string, mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKey = async () => {
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
      return true; // Assume success for race condition
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSourceFile({ 
          data: (ev.target?.result as string).split(',')[1], 
          mimeType: file.type 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const executeAction = async () => {
    if (!prompt.trim() && mode !== 'analyze') return;
    setIsProcessing(true);
    setResult(null);
    setAnalysis(null);

    try {
      await checkApiKey();
      
      switch (mode) {
        case 'image':
          const imgUrl = await gemini.generateImage(prompt, { aspectRatio, imageSize });
          setResult(imgUrl);
          break;
        case 'video':
          const vidUrl = await gemini.generateVideo(prompt, aspectRatio.includes('16:9') || aspectRatio.includes('21:9') ? '16:9' : '9:16', sourceFile || undefined);
          setResult(vidUrl);
          break;
        case 'edit':
          if (sourceFile) {
            const editUrl = await gemini.editImage(sourceFile.data, sourceFile.mimeType, prompt);
            setResult(editUrl);
          }
          break;
        case 'analyze':
          if (sourceFile) {
            const res = sourceFile.mimeType.startsWith('video') 
              ? await gemini.analyzeVideo(sourceFile.data, sourceFile.mimeType, prompt)
              : await gemini.analyzeImage(sourceFile.data, sourceFile.mimeType, prompt);
            setAnalysis(res);
          }
          break;
      }
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full bg-[#03030b] border border-white/5 rounded-[4rem] p-12 overflow-hidden flex flex-col gap-12 font-inter relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <header className="flex justify-between items-center z-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-purple-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl animate-pulse">🎨</div>
          <div>
            <h2 className="text-4xl font-black text-white italic font-orbitron uppercase tracking-tighter">Media <span className="text-purple-500">Lab</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Moteur de Génération Souverain v15.2</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-2 rounded-3xl border border-white/10 shadow-inner">
           {(['image', 'edit', 'video', 'analyze'] as const).map(m => (
             <button key={m} onClick={() => setMode(m)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-purple-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>
               {m === 'analyze' ? 'Intelligence' : m}
             </button>
           ))}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-12 z-10 overflow-hidden">
        <div className="flex flex-col gap-8">
           <div className="flex-1 bg-black/60 rounded-[4rem] border border-white/5 p-10 flex items-center justify-center relative overflow-hidden group">
              {isProcessing && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-8">
                   <div className="w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-xl font-black uppercase text-purple-400 animate-pulse tracking-[0.5em]">Nexus Fusion Processing...</p>
                </div>
              )}

              {result ? (
                mode === 'video' ? (
                  <video src={result} controls className="max-w-full max-h-full rounded-3xl shadow-2xl" />
                ) : (
                  <img src={result} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl" alt="Généré" />
                )
              ) : analysis ? (
                <div className="w-full h-full p-12 overflow-y-auto custom-scrollbar italic text-xl leading-relaxed text-slate-200">
                   <h3 className="text-[10px] font-black uppercase text-purple-400 mb-6 tracking-widest border-b border-white/5 pb-4">Rapport d'Analyse Multimodale</h3>
                   "{analysis}"
                </div>
              ) : (
                <div className="text-center opacity-10 space-y-8 group-hover:opacity-20 transition-opacity">
                   <i className={`fas ${mode === 'video' ? 'fa-clapperboard' : mode === 'analyze' ? 'fa-brain' : 'fa-wand-magic-sparkles'} text-9xl`}></i>
                   <p className="text-xl font-black uppercase tracking-widest">En attente de paramètres de scellage</p>
                </div>
              )}
           </div>

           <div className="flex gap-6 p-4 bg-white/5 border border-white/10 rounded-[3rem] focus-within:border-purple-500/50 transition-all shadow-2xl">
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={mode === 'analyze' ? "Décrivez ce que l'IA doit analyser..." : "Ex: Un paysage futuriste à Dakar, style cyberpunk, néons bleus..."}
                className="flex-1 bg-transparent px-8 py-6 text-lg font-medium outline-none resize-none h-24 placeholder:text-slate-800"
              />
              <button onClick={executeAction} disabled={isProcessing} className="w-24 bg-purple-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all">
                <i className="fas fa-bolt-auto text-3xl"></i>
              </button>
           </div>
        </div>

        <aside className="space-y-8 overflow-y-auto custom-scrollbar pr-4">
           {(mode === 'edit' || mode === 'video' || mode === 'analyze') && (
             <div className="p-10 bg-white/5 border border-white/5 rounded-[3.5rem] space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source Média</h4>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-black/40 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-all overflow-hidden"
                >
                   {sourceFile ? (
                     sourceFile.mimeType.startsWith('image') ? <img src={`data:${sourceFile.mimeType};base64,${sourceFile.data}`} className="w-full h-full object-cover" /> : <i className="fas fa-video text-4xl text-purple-500"></i>
                   ) : (
                     <i className="fas fa-cloud-arrow-up text-4xl opacity-20"></i>
                   )}
                </div>
                <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*,video/*" />
             </div>
           )}

           <div className="p-10 bg-white/5 border border-white/5 rounded-[3.5rem] space-y-10">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Configuration Neurale</h4>
              
              <div className="space-y-4">
                 <label className="text-[9px] font-black uppercase text-purple-400">Ratio d'Aspect</label>
                 <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(r => (
                      <button key={r} onClick={() => setAspectRatio(r)} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${aspectRatio === r ? 'bg-purple-600 border-transparent text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>
                        {r}
                      </button>
                    ))}
                 </div>
              </div>

              {mode === 'image' && (
                <div className="space-y-4">
                   <label className="text-[9px] font-black uppercase text-purple-400">Qualité Pro (Imagen 3)</label>
                   <div className="grid grid-cols-3 gap-2">
                      {IMAGE_SIZES.map(s => (
                        <button key={s} onClick={() => setImageSize(s)} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${imageSize === s ? 'bg-purple-600 border-transparent text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>
                          {s}
                        </button>
                      ))}
                   </div>
                </div>
              )}
           </div>

           <div className="p-10 bg-purple-600/10 border border-purple-500/20 rounded-[3.5rem] flex flex-col items-center text-center gap-6">
              <i className="fas fa-certificate text-3xl text-purple-500"></i>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Souveraineté Digitale</h4>
              <p className="text-[11px] text-slate-400 font-medium italic leading-relaxed">"Toutes vos créations sont scellées et vous appartiennent légalement via le protocole Nexus."</p>
           </div>
        </aside>
      </main>
    </div>
  );
};
