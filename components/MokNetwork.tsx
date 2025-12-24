
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { gemini, GeminiService } from '../services/geminiService';
import { EXPERTS } from '../constants';
import { Message, Artifact, Flashcard, SkillMatrix, QuizQuestion, SimulationScenario, AcademyMission } from '../types';

const MOK_V21_STYLES = `
  .mok-gradient { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%); }
  .mok-card { background: rgba(139, 92, 246, 0.03); border: 1px solid rgba(139, 92, 246, 0.1); transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
  .mok-card:hover { border-color: rgba(139, 92, 246, 0.4); transform: translateY(-4px); }
  .module-reader { background: rgba(3, 3, 11, 0.98); backdrop-filter: blur(60px); z-index: 2000; }
  .arena-viewport { background: #000; border: 2px solid #ef4444; border-radius: 4rem; overflow: hidden; }
  .skill-radar-poly { fill: rgba(139, 92, 246, 0.3); stroke: #8B5CF6; stroke-width: 2; filter: drop-shadow(0 0 10px #8B5CF6); }
  .perspective-1000 { perspective: 1000px; }
  .preserve-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
  .whisper-bubble { position: fixed; bottom: 120px; left: 40px; background: rgba(139, 92, 246, 0.15); backdrop-filter: blur(20px); border: 1px solid rgba(139, 92, 246, 0.3); z-index: 5000; }
  .result-board { background: linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, rgba(3, 3, 11, 0.9) 100%); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 4rem; position: relative; overflow: hidden; }
  .result-row { border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.3s ease; }
  .result-row:hover { background: rgba(139, 92, 246, 0.1); }
  .scanning-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #8B5CF6; box-shadow: 0 0 15px #8B5CF6; animation: scanMove 4s infinite linear; z-index: 10; }
  @keyframes scanMove { 0% { top: 0; } 100% { top: 100%; } }
`;

const SkillRadar: React.FC<{ skills: SkillMatrix[] }> = ({ skills }) => {
  const size = 320;
  const center = size / 2;
  const radius = center - 50;
  const points = useMemo(() => skills.map((s, i) => {
    const angle = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
    const r = (s.value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  }), [skills, radius, center]);
  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <svg width={size} height={size} className="mx-auto overflow-visible">
      {[0.2, 0.4, 0.6, 0.8, 1].map(scale => <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="1" />)}
      {skills.map((s, i) => {
        const angle = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
        return (
          <g key={i}>
            <line x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="rgba(139, 92, 246, 0.2)" />
            <text x={center + (radius + 25) * Math.cos(angle)} y={center + (radius + 25) * Math.sin(angle)} textAnchor="middle" className="text-[8px] font-black uppercase fill-slate-500 tracking-tighter">{s.label}</text>
          </g>
        );
      })}
      <polygon points={polyPoints} className="skill-radar-poly" />
    </svg>
  );
};

interface MokNetworkProps {
  externalForgeTopic?: string | null;
  externalForgeVision?: string | null;
  onForgeComplete?: () => void;
  onClose?: () => void;
}

export const MokNetwork: React.FC<MokNetworkProps> = ({ externalForgeTopic, externalForgeVision, onForgeComplete, onClose }) => {
  const [activeTab, setActiveTab] = useState<'academy' | 'memory' | 'arena' | 'vault' | 'dashboard'>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progression, setProgression] = useState(38);
  const [query, setQuery] = useState('');
  const [forgeVision, setForgeVision] = useState<string | null>(null);
  
  // Application Data States
  const [course, setCourse] = useState<any | null>(null);
  const [activeModule, setActiveModule] = useState<any | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flippedCardIdx, setFlippedCardIdx] = useState<number | null>(null);
  const [missions, setMissions] = useState<AcademyMission[]>([]);
  const [certificates, setCertificates] = useState<Artifact[]>([]);
  const [skills, setSkills] = useState<SkillMatrix[]>([
    { label: 'Blockchain', value: 32 }, { label: 'Droit OHADA', value: 75 },
    { label: 'Finance IA', value: 25 }, { label: 'Logistique', value: 60 },
    { label: 'Souveraineté', value: 92 }, { label: 'Marketing', value: 48 }
  ]);

  // Arena States
  const [scenario, setScenario] = useState<SimulationScenario | null>(null);
  const [arenaLog, setArenaLog] = useState<Message[]>([]);
  const [arenaInput, setArenaInput] = useState('');
  const [arenaMetrics, setArenaMetrics] = useState({ logic: 80, persuasion: 70, ethics: 95 });

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalForgeTopic) {
      setForgeVision(externalForgeVision || "L'Architecte a lancé une génération stratégique.");
      handleCreateCourse(externalForgeTopic);
      onForgeComplete?.();
    }
  }, [externalForgeTopic]);

  useEffect(() => {
    gemini.generateDailyMissions().then(setMissions);
  }, []);

  const handleCreateCourse = async (topic?: string) => {
    const finalTopic = topic || query;
    if (!finalTopic.trim() || isGenerating) return;
    setIsGenerating(true);
    setActiveTab('dashboard');
    try {
      const res = await gemini.generateCourse(finalTopic);
      setCourse(res);
      const cards = await gemini.generateFlashcards(res.summary);
      setFlashcards(cards);
      setQuery('');
    } finally { setIsGenerating(false); }
  };

  const handleStartExam = async (mod: any) => {
    setIsGenerating(true);
    try {
      const q = await gemini.generateQuiz(mod.title, mod.content);
      setQuiz(q);
      setQuizIndex(0);
      setQuizScore(0);
    } finally { setIsGenerating(false); }
  };

  const handleStartSimulation = async () => {
    if (!course || isGenerating) return;
    setIsGenerating(true);
    try {
      const sc = await gemini.generateSimulationScenario(course.title);
      setScenario(sc);
      setArenaLog([{ id: 'start', role: 'model', content: `[SYSTÈME]: Scénario chargé. Context: ${sc.context}. Objectif: ${sc.goal}. Que faites-vous ?`, timestamp: Date.now(), expertId: 'maitre_diallo' }]);
      setActiveTab('arena');
    } finally { setIsGenerating(false); }
  };

  const sendArenaMsg = async () => {
    if (!arenaInput.trim() || isGenerating || !scenario) return;
    const msg = arenaInput;
    setArenaInput('');
    setArenaLog(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg, timestamp: Date.now() }]);
    setIsGenerating(true);
    try {
      const res = await gemini.sendMessage(EXPERTS.find(e => e.id === 'maitre_diallo')!, msg, arenaLog);
      setArenaLog(prev => [...prev, { id: Date.now().toString(), role: 'model', content: res.text, timestamp: Date.now(), expertId: 'maitre_diallo' }]);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] overflow-hidden flex flex-col border-4 border-purple-500/20 relative group font-inter shadow-[0_0_100px_rgba(139,92,246,0.3)]">
      <style>{MOK_V21_STYLES}</style>
      
      {/* Module Reader Overlay */}
      {activeModule && (
        <div className="absolute inset-0 module-reader p-12 flex flex-col animate-in fade-in duration-500">
           <header className="flex justify-between items-center mb-10 pb-8 border-b border-white/5">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-purple-600 rounded-3xl flex items-center justify-center text-2xl shadow-xl">📖</div>
                 <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">{activeModule.title}</h2>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Cursus : {course?.title}</span>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => handleStartExam(activeModule)} className="px-8 py-3 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Passer l'Examen</button>
                 <button onClick={() => setActiveModule(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-red-600 transition-all"><i className="fas fa-times"></i></button>
              </div>
           </header>
           <main className="flex-1 overflow-y-auto custom-scrollbar prose prose-invert max-w-none px-10 py-4 italic leading-relaxed text-xl text-slate-300">
              <div className="whitespace-pre-wrap">"{activeModule.content}"</div>
           </main>
        </div>
      )}

      {/* Header Hub */}
      <header className="px-12 py-10 border-b border-white/5 bg-gradient-to-b from-[#8B5CF610] to-transparent flex items-center justify-between z-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 mok-gradient rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl animate-pulse">🎓</div>
          <div>
            <h1 className="text-4xl font-black italic font-orbitron uppercase tracking-tighter">MOK <span className="text-purple-500">ACADEMY</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] mt-1">Branche Souveraine v21.0</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
          {[
            { id: 'dashboard', label: 'Overview', icon: 'fa-chart-pie' },
            { id: 'academy', label: 'Maîtrise', icon: 'fa-graduation-cap' },
            { id: 'arena', label: 'Arène', icon: 'fa-swords' },
            { id: 'memory', label: 'Mémoire', icon: 'fa-brain' },
            { id: 'vault', label: 'Vault', icon: 'fa-vault' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === t.id ? 'bg-purple-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>
              <i className={`fas ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-10">
           <div className="text-right">
              <div className="text-2xl font-black font-orbitron text-purple-400">{progression}%</div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Mastery Index</div>
           </div>
           {onClose && (
             <button onClick={onClose} className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-xl hover:bg-red-600 transition-all shadow-xl">
                <i className="fas fa-times"></i>
             </button>
           )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-[1fr_420px] z-10">
         <div className="p-12 overflow-y-auto custom-scrollbar">
            {activeTab === 'dashboard' && (
              <div className="space-y-12 animate-in fade-in duration-700">
                 {forgeVision && (
                   <div className="p-10 bg-purple-600/10 border border-purple-500/20 rounded-[3rem] animate-in slide-in-from-top-4 duration-700">
                      <div className="flex items-center gap-4 mb-4">
                         <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></div>
                         <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Vision Architecte</span>
                      </div>
                      <p className="text-lg italic font-medium text-slate-100">"{forgeVision}"</p>
                   </div>
                 )}

                 <div className="p-16 result-board rounded-[4rem] flex flex-col space-y-10 relative">
                    <div className="scanning-line"></div>
                    {!course ? (
                      <div className="text-center py-20 space-y-10">
                        <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none max-w-4xl mx-auto">Forger votre <span className="text-purple-400">Maîtrise Mondiale</span>.</h2>
                        <div className="w-full max-w-5xl flex gap-6 p-4 bg-black/60 border border-white/10 rounded-[3.5rem] backdrop-blur-3xl focus-within:border-purple-500/50 transition-all shadow-2xl mx-auto">
                           <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateCourse()} placeholder="Décrivez votre ambition..." className="flex-1 bg-transparent px-10 py-6 text-xl outline-none" />
                           <button onClick={() => handleCreateCourse()} disabled={isGenerating} className="px-16 bg-purple-600 rounded-[2.5rem] font-black uppercase text-xs tracking-widest transition-all">Générer Cursus</button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full text-left space-y-12">
                         <header className="flex justify-between items-end border-b border-white/10 pb-10">
                            <div>
                               <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.5em] mb-4 block">Cursus Actif</span>
                               <h2 className="text-5xl font-black uppercase italic tracking-tighter">{course.title}</h2>
                            </div>
                            <div className="flex gap-4">
                               <button onClick={handleStartSimulation} className="px-10 py-5 bg-red-600/10 text-red-500 border border-red-500/30 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-red-600 hover:text-white transition-all">Entrer Arène</button>
                            </div>
                         </header>
                         <div className="space-y-4">
                            {course.modules.map((m: any, i: number) => (
                              <div key={i} className="result-row grid grid-cols-12 px-10 py-8 rounded-3xl items-center cursor-pointer group" onClick={() => setActiveModule(m)}>
                                 <div className="col-span-1 text-slate-700 font-black">0{i+1}</div>
                                 <div className="col-span-7"><h4 className="text-xl font-bold uppercase group-hover:text-purple-400 transition-colors">{m.title}</h4></div>
                                 <div className="col-span-4 text-right"><i className="fas fa-play text-xs opacity-0 group-hover:opacity-100"></i></div>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>
              </div>
            )}
            {activeTab === 'arena' && (
              <div className="h-full flex flex-col gap-8 animate-in zoom-in-95">
                 {!scenario ? <div className="text-center opacity-10 py-40 italic text-2xl uppercase">Cursus requis pour activer l'Arène</div> : (
                   <div className="flex-1 arena-viewport flex flex-col relative">
                         <div ref={chatRef} className="flex-1 overflow-y-auto custom-scrollbar p-12 pt-40 space-y-12">
                            {arenaLog.map(m => (
                              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[85%] p-10 rounded-[3rem] text-lg border ${m.role === 'user' ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-100 border-white/10'}`}>"{m.content}"</div>
                              </div>
                            ))}
                         </div>
                         <div className="p-10 bg-black/80 border-t border-white/10 flex gap-6">
                            <input type="text" value={arenaInput} onChange={e => setArenaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendArenaMsg()} placeholder="Votre réponse tactique..." className="flex-1 bg-white/5 border border-white/10 rounded-3xl px-10 py-6 text-xl outline-none" />
                            <button onClick={sendArenaMsg} className="w-24 bg-red-600 rounded-2xl flex items-center justify-center text-3xl shadow-2xl transition-all"><i className="fas fa-paper-plane"></i></button>
                         </div>
                   </div>
                 )}
              </div>
            )}
         </div>

         <aside className="border-l border-white/5 bg-black/20 p-10 flex flex-col gap-10">
            <div className="p-10 mok-card rounded-[3.5rem] space-y-10 text-center relative overflow-hidden group">
               <h3 className="text-[11px] font-black uppercase tracking-widest text-purple-400">Matrice de Compétences</h3>
               <SkillRadar skills={skills} />
            </div>
            <div className="p-10 bg-indigo-600/10 border border-indigo-500/20 rounded-[3.5rem] flex flex-col items-center text-center gap-6">
               <i className="fas fa-handshake text-4xl text-indigo-400 animate-pulse"></i>
               <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Action Forge</h4>
               <p className="text-[11px] text-slate-400 leading-tight italic">Vos compétences sont reconnues mondialement par le Nexus.</p>
            </div>
         </aside>
      </main>
    </div>
  );
};
