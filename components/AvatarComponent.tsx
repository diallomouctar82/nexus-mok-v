
import React from 'react';
import { Expert } from '../types';
import { gemini } from '../services/geminiService';

interface AvatarComponentProps {
  expert: Expert;
  setAvatarResponse: (response: string) => void;
  onNavigate: (view: 'dashboard') => void;
}

/**
 * Composant AvatarComponent - Exécuté selon votre code
 * Simule l'envoi d'une commande au "backend" (via geminiService pour cet environnement)
 * et met à jour le tableau de bord avec la réponse obtenue.
 */
export const AvatarComponent: React.FC<AvatarComponentProps> = ({ expert, setAvatarResponse, onNavigate }) => {
  const handleClick = async () => {
    const command = 'Ouvrir le tableau de bord';
    
    // Logique de communication (votre fetch simulé)
    try {
      setAvatarResponse("📡 Communication avec le serveur Diallo...");
      
      // Simuler le délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Appel au service Gemini qui agit ici comme notre intelligence métier
      const reply = await gemini.sendMessage(expert, command, []);
      
      // FIX: Access the .text property as setAvatarResponse expects a string, not a response object.
      // Mise à jour de la réponse pour le tableau de bord via le callback
      setAvatarResponse(reply.text);
      
      // Navigation automatique pour voir le résultat
      onNavigate('dashboard');
      
    } catch (error) {
      console.error('Erreur lors de la communication avec le backend :', error);
      setAvatarResponse('Erreur de communication. Veuillez réessayer.');
    }
  };

  return (
    <div className="avatar-component relative group" onClick={handleClick}>
      <div className={`w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg transition-all active:scale-95 group-hover:scale-105 cursor-pointer ${expert.color}`}>
        <img 
          src={expert.avatar} 
          alt={expert.name} 
          className="w-full h-full object-cover" 
        />
      </div>
      
      {/* Badge d'état */}
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
      
      {/* Bouton transparent pour l'accessibilité */}
      <button 
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Activer la commande vocale"
      >
        Activer la commande vocale
      </button>

      {/* Tooltip flottant */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-slate-800 text-white text-[11px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap shadow-2xl pointer-events-none">
        🎙️ PARLER À {expert.name}
      </div>
    </div>
  );
};

export default AvatarComponent;
