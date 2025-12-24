
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const SupabaseAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert("Configuration Supabase manquante dans les variables d'environnement.");
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setMessage('Un lien magique a été envoyé dans votre boîte email !');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  if (!supabase) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="max-w-xl glass-panel p-16 rounded-[4rem] border-red-500/20 text-center space-y-8">
           <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto">
              <i className="fas fa-triangle-exclamation text-red-500"></i>
           </div>
           <h2 className="text-3xl font-black font-orbitron uppercase">Cloud <span className="text-red-500">Déconnecté</span></h2>
           <p className="text-slate-400 italic">Les variables d'environnement SUPABASE_URL et SUPABASE_ANON_KEY ne sont pas configurées. La persistance Cloud est désactivée.</p>
           <div className="p-6 bg-white/5 rounded-2xl text-[10px] font-mono text-blue-400 text-left">
              1. Créez un projet sur supabase.com<br/>
              2. Copiez l'URL et la clé ANON dans votre fichier .env
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-12">
      <div className="w-full max-w-xl glass-panel p-16 rounded-[4rem] border border-blue-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>
        
        <div className="text-center space-y-8 mb-12">
          <div className="w-24 h-24 bg-blue-600/20 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto shadow-inner">
             <i className="fas fa-cloud-bolt text-blue-500"></i>
          </div>
          <div>
            <h2 className="text-4xl font-black italic font-orbitron uppercase tracking-tighter">Identité <span className="text-blue-500">Nexus</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Synchronisation Cloud Supabase</p>
          </div>
        </div>

        {user ? (
          <div className="space-y-10 text-center animate-in fade-in zoom-in-95 duration-500">
             <div className="p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl">
                <p className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-2">Lien Établi</p>
                <p className="text-sm font-medium text-slate-300">{user.email}</p>
             </div>
             <div className="space-y-4">
                <button 
                   onClick={() => window.location.reload()} 
                   className="w-full py-6 bg-blue-600 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
                >
                   Accéder au Tableau de Bord
                </button>
                <button 
                   onClick={handleLogout} 
                   className="w-full py-6 bg-white/5 border border-white/10 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-red-500/20 transition-all text-slate-500 hover:text-red-400"
                >
                   Déconnexion
                </button>
             </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Email Souverain</label>
                <input 
                   type="email" 
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   placeholder="votre.nom@nexus.com"
                   required
                   className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-8 py-6 text-lg font-medium outline-none focus:border-blue-500 transition-all shadow-inner"
                />
             </div>

             {message && (
               <div className="p-6 bg-blue-600/10 border border-blue-500/30 rounded-2xl text-[11px] font-medium text-blue-400 italic">
                  {message}
               </div>
             )}

             <button 
               type="submit" 
               disabled={loading}
               className="w-full py-8 bg-blue-600 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
             >
               {loading ? 'Liaison...' : 'Envoyer Magic Link'}
             </button>
             
             <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-widest leading-relaxed">
                Vos données sont chiffrées et stockées sur votre instance Supabase personnelle.
             </p>
          </form>
        )}
      </div>
    </div>
  );
};
