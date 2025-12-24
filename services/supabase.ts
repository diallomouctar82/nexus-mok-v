
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://oaqvmgfdqgddtmfkkpoo.supabase.co";
const supabaseAnonKey = "sb_publishable_SXHV4UdU5qUpBuD0AKhMxw_knGXXB2k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SupabaseService = {
  /**
   * Sauvegarde une opération technique ou un briefing
   */
  async saveOperation(operation: any) {
    if (!supabase) return { error: "Non connecté" };
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('architect_memory')
      .insert([{ 
        user_id: user?.id || 'anonymous_sovereign', 
        ...operation,
        timestamp: new Date().toISOString()
      }]);
    return { data, error };
  },

  /**
   * Sauvegarde un message de chat dans la base souveraine
   */
  async saveChatMessage(expertId: string, role: 'user' | 'model', content: string, sources: any[] = []) {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('chat_history')
      .insert([{
        user_id: user?.id || 'anonymous_sovereign',
        expert_id: expertId,
        role,
        content,
        sources: JSON.stringify(sources),
        timestamp: new Date().toISOString()
      }]);
  },

  /**
   * Récupère l'historique de chat pour un expert spécifique
   */
  async getChatHistory(expertId: string, limit = 50) {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('expert_id', expertId)
      .eq('user_id', user?.id || 'anonymous_sovereign')
      .order('timestamp', { ascending: true })
      .limit(limit);
      
    if (error) return [];
    return data.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp).getTime(),
      sources: m.sources ? JSON.parse(m.sources) : []
    }));
  },

  /**
   * Récupère la mémoire technique de l'Architecte
   */
  async getMemory(limit = 50) {
    if (!supabase) return { data: [] };
    const { data, error } = await supabase
      .from('architect_memory')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    return { data: data || [], error };
  }
};
