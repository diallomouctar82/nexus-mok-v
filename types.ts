export enum ExpertId {
  DIALLO = 'diallo',
  MAITRE_DIALLO = 'maitre_diallo',
  CONSEILLER_DIALLO = 'conseiller_diallo',
  PROFESSEUR_DIALLO = 'professeur_diallo',
  DOCTEUR_DIALLO = 'docteur_diallo',
  MONSIEUR_DIALLO = 'monsieur_diallo',
  GUIDE_DIALLO = 'guide_diallo',
  SYNTHESIZED = 'synthesized'
}

export interface Expert {
  id: ExpertId;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  avatar: string;
  color: string;
  voiceName: string;
  status?: 'idle' | 'thinking' | 'acting' | 'syncing' | 'summoned';
}

export interface Artifact {
  id: string;
  type: 'plan' | 'document' | 'code' | 'analysis' | 'project' | 'certificate' | 'portfolio' | 'mission' | 'token' | 'strategy' | 'contract' | 'vision';
  title: string;
  content: string;
  expertId: string;
  metadata?: any;
}

export interface SovereignSnapshot {
  id: string;
  timestamp: number;
  label: string;
  plan: StrategicPlan;
  view: ViewType;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  sources?: GroundingSource[];
  expertId?: string;
  isSynergy?: boolean;
  artifact?: Artifact;
}

export type ViewType = 
  | 'strategy' 
  | 'genius' 
  | 'expert-chat'
  | 'shop' 
  | 'lingua' 
  | 'influencers' 
  | 'live' 
  | 'mok' 
  | 'synergy' 
  | 'exchange' 
  | 'dashboard' 
  | 'eye' 
  | 'lab'
  | 'auth';

export interface AppAction {
  type: 'NAVIGATE' | 'GENERATE' | 'NOTIFY' | 'EXECUTE' | 'MEMORIZE' | 'SYNC' | 'EARN' | 'SIMULATE' | 'FORGE_CURSUS' | 'SUMMON' | 'ROLLBACK';
  target?: ViewType;
  payload?: any;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface SimulationScenario {
  id: string;
  title: string;
  context: string;
  goal: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: number;
}

export interface SkillMatrix {
  label: string;
  value: number; // 0-100
}

export interface StrategicStep {
  id: string;
  title: string;
  expert: string;
  description: string;
  status: string;
  actionTarget: ViewType;
  neuralToken?: string;
}

export interface StrategicPlan {
  goal: string;
  summary: string;
  steps: StrategicStep[];
}

export interface AcademyMission {
  id: string;
  title: string;
  reward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed: boolean;
}

// Fixed: Moved AIStudio interface to global scope to prevent subsequent property declaration conflicts on Window
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    /**
     * AI Studio environment bridge for API key management.
     * Optional to avoid conflicts with environmental definitions.
     */
    aistudio?: AIStudio;
  }
}