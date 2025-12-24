
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';
import { GeminiService, gemini } from '../services/geminiService';
import { QuizQuestion, Flashcard, GroundingSource } from '../types';

const LINGUA_STYLES = `
  .lingua-gradient { background: linear-gradient(135deg, #00D4AA 0%, #0EA5E9 50%, #8B5CF6 100%); }
  .lingua-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease; }
  .lingua-text-gradient {
      background: linear-gradient(135deg, #00D4AA 0%, #0EA5E9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
  }
  
  .nexus-orb-container {
    position: relative;
    width: 200px; height: 200px;
    display: flex; align-items: center; justify-content: center;
  }

  .nexus-core-orb {
    width: 110px; height: 110px;
    background: radial-gradient(circle, #00D4AA, #0EA5E9);
    border-radius: 50%;
    z-index: 10;
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 0 30px rgba(0, 212, 170, 0.4);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: 4px solid rgba(255, 255, 255, 0.2);
  }

  .nexus-core-orb.active {
    animation: orbPulse 2s infinite;
    box-shadow: 0 0 60px rgba(0, 212, 170, 0.8);
    background: radial-gradient(circle, #10b981, #0EA5E9);
  }

  @keyframes orbPulse {
    0%, 100% { transform: scale(1.1); }
    50% { transform: scale(1.25); }
  }

  .neural-wave-container {
    position: absolute;
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }

  .neural-wave {
    position: absolute;
    border: 2px solid #00D4AA;
    border-radius: 50%;
    opacity: 0;
    width: 110px; height: 110px;
  }

  .nexus-core-orb.active ~ .neural-wave-container .neural-wave {
    animation: waveExpand 3s infinite;
  }

  @keyframes waveExpand {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.5); opacity: 0; }
  }

  .chat-bubble-v2 {
    max-width: 80%;
    padding: 1.5rem 2rem;
    border-radius: 2.5rem;
    font-size: 1.1rem;
    line-height: 1.6;
    position: relative;
    animation: slideIn 0.4s ease-out;
  }

  @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  .lang-tag {
    font-size: 9px; font-weight: 900; text-transform: uppercase;
    letter-spacing: 0.15em; padding: 4px 10px; border-radius: 8px;
    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);
    margin-bottom: 0.5rem; display: inline-block;
  }

  .perspective-1000 { perspective: 1000px; }
  .preserve-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }

  .vocab-card {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 2rem; padding: 2rem; transition: all 0.3s ease;
  }
  .vocab-card:hover { border-color: #00D4AA; background: rgba(0,212,170,0.05); transform: translateY(-5px); }

  .intel-result-box {
    background: rgba(13, 13, 28, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(14, 165, 233, 0.2);
    border-radius: 3rem;
  }

  .translation-live-banner {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    padding: 10px 24px;
    border-radius: 100px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
`;

const LANGUAGES = [
  'Français', 'Anglais', 'Pulaar (Peul)', 'Wolof', 'Malinké', 'Soninké', 'Susu', 'Bambara', 
  'Arabe', 'Espagnol', 'Portugais', 'Allemand', 'Italien', 'Chinois', 'Japonais'
];

interface ChatEntry {
  id: string;
  role: 'user' | 'ai';
  text: string;
  lang: string;
  isTranslation?: boolean;
  timestamp: number;
}

export const LinguaWorld: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'tests' | 'intel'>('chat');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [langA, setLangA] = useState('Français');
  const [langB, setLangB] = useState('Anglais');
  const [conversation, setConversation] = useState<ChatEntry[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Vocabulary & Test States
  const [testMode, setTestMode] = useState<'setup' | 'list' | 'flashcards' | 'quiz'>('setup');
  const [vocabContext, setVocabContext] = useState('Voyage & Tourisme');
  const [vocabList, setVocabList] = useState<{word: string, translation: string, example: string, tip: string}[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flippedCardIdx, setFlippedCardIdx] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Intel States
  const [intelQuery, setIntelQuery] = useState('');
  const [intelResult, setIntelResult] = useState<{ text: string, sources: GroundingSource[] } | null>(null);
  const [isSearchingIntel, setIsSearchingIntel] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversation]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    setIsLiveActive(false);
    setIsConnecting(false);
    setIsAiSpeaking(false);
    nextStartTimeRef.current = 0;
  }, []);

  const startTranslation = async () => {
    if (isConnecting || isLiveActive) return;
    setIsConnecting(true);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const nativeSampleRate = audioCtx.sampleRate;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const outputNode = audioCtx.createGain();
      outputNode.gain.value = 1.5;
      outputNode.connect(audioCtx.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsLiveActive(true);
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!isLiveActive || isAiSpeaking) return; // Prevent echoing back translated audio
              const inputData = e.inputBuffer.getChannelData(0);
              const downsampled = GeminiService.downsample(inputData, nativeSampleRate, 16000);
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) int16[i] = Math.max(-1, Math.min(1, downsampled[i])) * 32767;
              
              sessionPromise.then(s => {
                if (sessionRef.current === s) {
                  s.sendRealtimeInput({ 
                    media: { data: GeminiService.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
                  });
                }
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioCtx) {
              setIsAiSpeaking(true);
              const audioBuffer = await GeminiService.decodeAudioData(GeminiService.decode(base64Audio), audioCtx, 24000, 1);
              const now = audioCtx.currentTime;
              if (nextStartTimeRef.current < now) nextStartTimeRef.current = now + 0.1;
              const source = audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.onended = () => {
                // Short timeout to avoid instant reactivating of mic after audio ends
                setTimeout(() => setIsAiSpeaking(false), 300);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }

            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                setConversation(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'user' && !last.isTranslation && (Date.now() - last.timestamp < 3000)) {
                    return [...prev.slice(0, -1), { ...last, text: last.text + " " + text, timestamp: Date.now() }];
                  }
                  return [...prev, { id: Date.now().toString(), role: 'user', text, lang: 'Original', timestamp: Date.now() }];
                });
              }
            }

            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text && message.serverContent.turnComplete) {
                setConversation(prev => [...prev, { id: Date.now().toString(), role: 'ai', text, lang: 'Traduction', isTranslation: true, timestamp: Date.now() }]);
              }
            }
          },
          onerror: () => stopSession(),
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `Tu es le Traducteur Universel Diallo, un moteur de traduction bidirectionnelle ultra-rapide.
          TES LANGUES : ${langA} et ${langB}.
          COMPORTEMENT : 
          1. Détecte automatiquement laquelle des deux langues est parlée.
          2. Traduis instantanément vers l'autre langue.
          3. Ne dis rien d'autre que la traduction. Pas de "Voici la traduction", pas de politesses.
          4. Ton but est de rendre la conversation invisible entre les deux locuteurs.
          5. Si tu entends du ${langA}, parle en ${langB}. Si tu entends du ${langB}, parle en ${langA}.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopSession(); }
  };

  // Language Tests Logic
  const handleGenerateVocab = async () => {
    setIsGenerating(true);
    try {
      const list = await gemini.generateVocabList(langB, vocabContext);
      setVocabList(list);
      setTestMode('list');
    } catch (e) { console.error(e); }
    finally { setIsGenerating(false); }
  };

  const startFlashcards = async () => {
    if (vocabList.length === 0) return;
    setIsGenerating(true);
    try {
      const cards = vocabList.map((v, i) => ({
        id: i.toString(),
        front: v.word,
        back: v.translation,
        difficulty: 1
      }));
      setFlashcards(cards);
      setTestMode('flashcards');
    } catch (e) { console.error(e); }
    finally { setIsGenerating(false); }
  };

  const startQuiz = async () => {
    if (vocabList.length === 0) return;
    setIsGenerating(true);
    try {
      const content = vocabList.map(v => `${v.word}: ${v.translation}`).join(', ');
      const q = await gemini.generateQuiz(`Vocabulaire ${langB} - ${vocabContext}`, content);
      setCurrentQuiz(q);
      setQuizIdx(0);
      setQuizScore(0);
      setTestMode('quiz');
    } catch (e) { console.error(e); }
    finally { setIsGenerating(false); }
  };

  const submitQuizAnswer = (idx: number) => {
    if (idx === currentQuiz[quizIdx].correctAnswer) setQuizScore(s => s + 1);
    if (quizIdx < currentQuiz.length - 1) setQuizIdx(i => i + 1);
    else {
      alert(`Test Terminé ! Votre score : ${Math.round(((quizScore + (idx === currentQuiz[quizIdx].correctAnswer ? 1 : 0)) / currentQuiz.length) * 100)}%`);
      setTestMode('list');
    }
  };

  // Language Intel Logic
  const handleSearchIntel = async () => {
    if (!intelQuery.trim() || isSearchingIntel) return;
    setIsSearchingIntel(true);
    setIntelResult(null);
    try {
      const res = await gemini.getMarketIntelligence(intelQuery);
      setIntelResult(res);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la recherche d'intelligence marché.");
    } finally {
      setIsSearchingIntel(false);
    }
  };

  return (
    <div className="h-full bg-[#03030b] text-white rounded-[4rem] overflow-hidden flex flex-col shadow-2xl border border-white/5 font-inter">
      <style>{LINGUA_STYLES}</style>
      
      <header className="px-12 py-10 border-b border-white/5 bg-black/40 flex items-center justify-between z-50">
        <div className="flex items-center gap-10">
          <div className="w-16 h-16 lingua-gradient rounded-[1.5rem] flex items-center justify-center text-4xl shadow-xl">🌍</div>
          <div>
            <h1 className="font-orbitron text-3xl font-black italic lingua-text-gradient uppercase tracking-tighter">Nexus Dialogue</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Bidirectional Interpreter Core v16.0</p>
          </div>
        </div>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button onClick={() => setActiveTab('chat')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Dialogue</button>
          <button onClick={() => setActiveTab('tests')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tests' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Tests Langue</button>
          <button onClick={() => setActiveTab('intel')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'intel' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Intelligence</button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative p-10">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-12 items-center bg-white/[0.02] p-10 rounded-[4rem] border border-white/5 relative">
              <div className="text-center space-y-4">
                 <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em]">Locuteur A</span>
                 <select value={langA} onChange={e => setLangA(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-2xl font-black outline-none appearance-none text-center cursor-pointer hover:border-emerald-500/40 transition-all">
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                 </select>
              </div>

              <div className="nexus-orb-container">
                 <button 
                  onClick={isLiveActive ? stopSession : startTranslation} 
                  disabled={isConnecting}
                  className={`nexus-core-orb ${isLiveActive ? 'active' : ''}`}
                 >
                    {isConnecting ? <i className="fas fa-circle-notch animate-spin text-3xl"></i> : <i className={`fas ${isLiveActive ? 'fa-stop' : 'fa-microphone'} text-3xl text-white`}></i>}
                 </button>
                 <div className="neural-wave-container">
                   <div className="neural-wave" style={{ animationDelay: '0s' }}></div>
                   <div className="neural-wave" style={{ animationDelay: '1s' }}></div>
                   <div className="neural-wave" style={{ animationDelay: '2s' }}></div>
                 </div>
              </div>

              <div className="text-center space-y-4">
                 <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">Locuteur B</span>
                 <select value={langB} onChange={e => setLangB(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-2xl font-black outline-none appearance-none text-center cursor-pointer hover:border-blue-500/40 transition-all">
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                 </select>
              </div>
            </div>

            {isLiveActive && (
              <div className="flex justify-center animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="translation-live-banner">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Mode Traduction Universelle Actif</span>
                  <div className="w-px h-4 bg-white/10 mx-2"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{langA} <i className="fas fa-arrows-left-right mx-2"></i> {langB}</span>
                </div>
              </div>
            )}

            <div className="flex-1 bg-black/40 rounded-[4rem] border border-white/5 p-12 overflow-hidden flex flex-col">
               <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-6">
                  {conversation.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 text-center gap-8">
                       <i className="fas fa-language text-9xl"></i>
                       <p className="text-2xl font-black uppercase tracking-widest max-w-xl">Initialisez le pont linguistique en activant le micro.</p>
                    </div>
                  )}
                  {conversation.map((entry) => (
                    <div key={entry.id} className={`flex ${entry.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                       <div className={`chat-bubble-v2 ${entry.role === 'user' ? 'bg-white/5 border border-white/10 text-slate-300 italic' : 'bg-emerald-600/20 border border-emerald-500/30 text-white font-medium shadow-2xl'}`}>
                          <div className={`lang-tag ${entry.role === 'ai' ? 'text-emerald-400' : ''}`}>{entry.lang}</div>
                          <p>"{entry.text}"</p>
                       </div>
                    </div>
                  ))}
                  {isAiSpeaking && (
                    <div className="flex justify-end animate-pulse">
                      <div className="px-6 py-3 bg-emerald-600/10 border border-emerald-500/20 rounded-full">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Synthèse Vocale...</span>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
           <div className="h-full flex flex-col gap-10 animate-in fade-in duration-500">
              {testMode === 'setup' && (
                <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-12">
                   <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-6 border border-blue-500/20 shadow-2xl">🎓</div>
                      <h2 className="text-5xl font-black uppercase italic tracking-tighter">Tests de <span className="text-blue-500">Maîtrise</span></h2>
                      <p className="text-xl text-slate-400 font-medium italic">Générez du vocabulaire ciblé et testez vos connaissances en {langB}.</p>
                   </div>
                   <div className="w-full space-y-8 bg-white/[0.02] p-12 rounded-[3.5rem] border border-white/10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Contexte de l'examen / Thématique</label>
                        <select 
                          value={vocabContext} 
                          onChange={e => setVocabContext(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold outline-none focus:border-blue-500 transition-all"
                        >
                           <option>Voyage & Tourisme</option>
                           <option>Droit & Administration</option>
                           <option>Santé & Médecine</option>
                           <option>Business & Finance</option>
                           <option>École & Études</option>
                           <option>Informatique & Tech</option>
                        </select>
                      </div>
                      <button 
                        onClick={handleGenerateVocab}
                        disabled={isGenerating}
                        className="w-full py-6 bg-blue-600 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isGenerating ? 'Calcul Neural...' : 'Générer Vocabulaire IA'}
                      </button>
                   </div>
                </div>
              )}

              {testMode === 'list' && (
                <div className="h-full flex flex-col gap-10">
                   <header className="flex justify-between items-end">
                      <div>
                         <h3 className="text-4xl font-black uppercase italic tracking-tighter">Vocabulaire : <span className="text-blue-500">{vocabContext}</span></h3>
                         <p className="text-slate-500 mt-2 italic">10 mots essentiels pour réussir votre examen de {langB}.</p>
                      </div>
                      <div className="flex gap-4">
                         <button onClick={startFlashcards} className="px-8 py-3 bg-purple-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Flashcards</button>
                         <button onClick={startQuiz} className="px-8 py-3 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Passer Quiz</button>
                         <button onClick={() => setTestMode('setup')} className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest">Nouveau</button>
                      </div>
                   </header>
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {vocabList.map((v, i) => (
                        <div key={i} className="vocab-card space-y-4">
                           <div className="flex justify-between items-start">
                              <h4 className="text-2xl font-black text-blue-400 italic">{v.word}</h4>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">#{i+1}</span>
                           </div>
                           <p className="text-lg font-bold text-white uppercase tracking-tight">{v.translation}</p>
                           <div className="pt-4 border-t border-white/5">
                              <p className="text-xs text-slate-400 italic leading-relaxed mb-4">"{v.example}"</p>
                              <div className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-lightbulb"></i> Astuce : {v.tip}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {testMode === 'flashcards' && (
                <div className="h-full flex flex-col items-center justify-center gap-12">
                   <div className="text-center">
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter">Mémorisation Active</h3>
                      <p className="text-slate-500 mt-2">Cliquez sur une carte pour voir la traduction.</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                      {flashcards.slice(0, 6).map((card, i) => (
                        <div key={i} onClick={() => setFlippedCardIdx(flippedCardIdx === i ? null : i)} className="relative perspective-1000 h-64 cursor-pointer">
                           <div className={`w-full h-full relative preserve-3d transition-transform duration-700 ${flippedCardIdx === i ? 'rotate-y-180' : ''}`}>
                              <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center backface-hidden shadow-2xl">
                                 <span className="text-[9px] font-black text-blue-500 uppercase mb-4 tracking-widest">Question</span>
                                 <p className="text-2xl font-black italic">"{card.front}"</p>
                              </div>
                              <div className="absolute inset-0 bg-blue-600 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 shadow-xl">
                                 <span className="text-[9px] font-black text-white uppercase mb-4 tracking-widest">Réponse</span>
                                 <p className="text-2xl font-black italic text-white uppercase tracking-tight">{card.back}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                   <button onClick={() => setTestMode('list')} className="px-16 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Retour à la liste</button>
                </div>
              )}

              {testMode === 'quiz' && currentQuiz.length > 0 && (
                <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto space-y-12">
                   <div className="w-full space-y-6">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Question {quizIdx + 1} / {currentQuiz.length}</span>
                         <span className="text-2xl font-black font-orbitron">{quizScore} Score</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${((quizIdx+1)/currentQuiz.length)*100}%` }}></div>
                      </div>
                   </div>
                   <div className="w-full bg-white/[0.02] border border-white/10 rounded-[4rem] p-16 space-y-12 shadow-2xl">
                      <h4 className="text-3xl font-black italic leading-tight text-center">"{currentQuiz[quizIdx].question}"</h4>
                      <div className="grid grid-cols-1 gap-4">
                         {currentQuiz[quizIdx].options.map((opt, i) => (
                           <button 
                            key={i} 
                            onClick={() => submitQuizAnswer(i)}
                            className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl text-left text-lg font-bold hover:bg-blue-600 hover:border-transparent transition-all group flex items-center justify-between"
                           >
                             {opt}
                             <i className="fas fa-chevron-right text-xs opacity-0 group-hover:opacity-100 transition-all"></i>
                           </button>
                         ))}
                      </div>
                   </div>
                   <button onClick={() => setTestMode('list')} className="text-[10px] font-black uppercase text-slate-600 hover:text-red-500 tracking-widest transition-all">Abandonner le test</button>
                </div>
              )}
           </div>
        )}

        {activeTab === 'intel' && (
          <div className="h-full flex flex-col gap-10 animate-in fade-in duration-500">
            <div className="flex flex-col items-center justify-center max-w-4xl mx-auto space-y-10 w-full">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-sky-600/10 rounded-full flex items-center justify-center text-4xl mx-auto border border-sky-500/20 shadow-2xl">🕵️‍♂️</div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Langue <span className="text-sky-500">Intelligence</span></h2>
                <p className="text-lg text-slate-400 font-medium italic">Explorez la popularité, les tendances et les données réelles sur n'importe quelle langue.</p>
              </div>

              <div className="w-full flex gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-[3rem] shadow-2xl focus-within:border-sky-500/50 transition-all">
                <input 
                  type="text" 
                  value={intelQuery}
                  onChange={(e) => setIntelQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchIntel()}
                  placeholder="Ex: Popularité du Malinké en France..."
                  className="flex-1 bg-transparent px-8 py-4 text-xl outline-none"
                />
                <button 
                  onClick={handleSearchIntel}
                  disabled={isSearchingIntel || !intelQuery.trim()}
                  className="px-10 bg-sky-600 rounded-[2.2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSearchingIntel ? <i className="fas fa-circle-notch animate-spin"></i> : 'Scanner le Marché'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
              {isSearchingIntel && (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                   <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-xl font-black uppercase tracking-[0.3em] text-sky-400 animate-pulse italic">Interrogation du Nexus Mondial...</p>
                </div>
              )}

              {intelResult && (
                <div className="intel-result-box p-12 space-y-10 animate-in slide-in-from-bottom-6 duration-700">
                  <header className="flex justify-between items-center border-b border-white/5 pb-8">
                    <h3 className="text-2xl font-black uppercase text-sky-400 italic">Rapport d'Intelligence</h3>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sources Vérifiées par Gemini</span>
                  </header>
                  
                  <div className="prose prose-invert max-w-none text-xl leading-relaxed text-slate-200 italic font-medium">
                    {intelResult.text}
                  </div>

                  {intelResult.sources.length > 0 && (
                    <div className="pt-10 border-t border-white/5 space-y-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Sources & Références</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {intelResult.sources.map((source, i) => (
                          <a 
                            key={i} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-sky-600/10 hover:border-sky-500/30 transition-all"
                          >
                            <span className="text-xs font-bold text-slate-300 truncate max-w-[80%] group-hover:text-white">{source.title}</span>
                            <i className="fas fa-external-link-alt text-[10px] text-slate-600 group-hover:text-sky-400"></i>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!intelResult && !isSearchingIntel && (
                <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-20 gap-8">
                   <i className="fas fa-satellite-dish text-9xl"></i>
                   <p className="text-2xl font-black uppercase tracking-widest max-w-2xl">Entrez une requête pour obtenir des données en temps réel sur l'écosystème linguistique.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="px-12 py-6 bg-black/60 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
         <div className="flex gap-10">
            <span className="flex items-center gap-3"><i className="fas fa-bolt text-emerald-500"></i> Latence &lt; 150ms</span>
            <span className="flex items-center gap-3"><i className="fas fa-shield-halved text-blue-500"></i> Chiffrement Neural</span>
            <span className="flex items-center gap-3"><i className="fas fa-globe text-sky-500"></i> Google Search Grounding Actif</span>
         </div>
         <div className="italic">Sovereign Translation Matrix v16.0</div>
      </footer>
    </div>
  );
};
