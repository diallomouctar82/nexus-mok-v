
import { GoogleGenAI, GenerateContentResponse, Type, Modality, FunctionDeclaration } from "@google/genai";
import { Message, Expert, GroundingSource, ViewType, AppAction, StrategicPlan, QuizQuestion, SimulationScenario, Flashcard, Artifact, AcademyMission } from "../types";
import { EXPERTS } from "../constants";

export interface ToolResponse {
  text: string;
  sources: GroundingSource[];
  functionCalls?: any[];
}

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private safeParseJson(text: string | undefined, fallback: any = {}) {
    if (!text) return fallback;
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn("Échec du parsing JSON Gemini, tentative d'extraction brute...", e);
      const match = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { return fallback; }
      }
      return fallback;
    }
  }

  private getProjectTools(): FunctionDeclaration[] {
    return [
      {
        name: 'research_web',
        description: 'Rechercher des informations réelles sur internet (bailleurs, partenaires, données marché).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'La recherche spécifique à effectuer.' }
          },
          required: ['query']
        }
      },
      {
        name: 'generate_artifact',
        description: 'Générer un document officiel (email, rapport, plan stratégique).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['email', 'report', 'plan', 'contract', 'analysis'], description: 'Type de document.' },
            title: { type: Type.STRING, description: 'Titre du document.' },
            context: { type: Type.STRING, description: 'Contenu détaillé ou contexte pour la rédaction.' }
          },
          required: ['type', 'title', 'context']
        }
      },
      {
        name: 'app_navigation',
        description: 'Naviguer vers une vue spécifique de l\'application.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            target: { type: Type.STRING, description: 'La vue cible (ex: shop, strategy, mok, exchange, lab).' }
          },
          required: ['target']
        }
      },
      {
        name: 'trigger_multimodal',
        description: 'Lancer un appel vocal ou vidéo avec l\'expert actuel.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            mode: { type: Type.STRING, enum: ['voice', 'video'] }
          },
          required: ['mode']
        }
      }
    ];
  }

  async sendMessage(
    expert: Expert, 
    message: string, 
    history: Message[], 
    options?: { 
      useThinking?: boolean, 
      useFastMode?: boolean,
      useSearch?: boolean, 
      useMaps?: boolean,
      enableTools?: boolean,
      latLng?: { latitude: number, longitude: number }
    }
  ): Promise<ToolResponse> {
    const ai = this.getClient();
    let model = options?.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const config: any = { 
      systemInstruction: expert.systemInstruction + "\nTu as accès à des outils de gestion de projet. Utilise-les si nécessaire pour aider l'utilisateur (recherche, documents, navigation).",
    };

    if (options?.useThinking) {
      config.thinkingConfig = { thinkingBudget: 16384 };
    }

    if (options?.enableTools) {
      config.tools = [{ functionDeclarations: this.getProjectTools() }, { googleSearch: {} }];
    } else if (options?.useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const contents = [
      ...history.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({ model, contents, config });
    
    let sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      sources = chunks.map((chunk: any) => {
        if (chunk.web) return { uri: chunk.web.uri, title: chunk.web.title };
        if (chunk.maps) return { uri: chunk.maps.uri, title: chunk.maps.title };
        return null;
      }).filter((s): s is GroundingSource => s !== null);
    }

    return { 
      text: response.text || "", 
      sources,
      functionCalls: response.functionCalls 
    };
  }

  async generateProjectArtifact(plan: StrategicPlan, type: string, context: string): Promise<Artifact> {
    const ai = this.getClient();
    const prompt = `Agis en tant que gestionnaire de projet expert. Basé sur le plan stratégique : "${plan.goal}" et le contexte actuel : "${context}".
    Génère un artefact de type "${type}" (ex: Email, Rapport, Liste de Bailleurs, Business Plan).
    Réponds EXCLUSIVEMENT en JSON avec : title, content (Markdown), type.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 8192 }
      }
    });
    const result = this.safeParseJson(response.text, { title: "Nouveau Document", content: "...", type: "document" });
    return {
      id: Math.random().toString(36).substr(2, 9),
      expertId: 'maitre_diallo',
      ...result
    };
  }

  async researchProjectResources(query: string): Promise<{ text: string, sources: GroundingSource[] }> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Recherche des bailleurs de fonds, investisseurs ou partenaires réels pour : "${query}". Donne des détails précis et des liens.` }] }],
      config: { tools: [{ googleSearch: {} }] }
    });
    
    let sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      sources = chunks.map((chunk: any) => (chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)).filter((s): s is GroundingSource => s !== null);
    }
    return { text: response.text || "Aucun résultat trouvé.", sources };
  }

  async analyzeMedia(prompt: string, media: { data: string, mimeType: string }): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ inlineData: { data: media.data, mimeType: media.mimeType } }, { text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 4096 } }
    });
    return response.text || "Analyse impossible.";
  }

  async analyzeImage(data: string, mimeType: string, prompt: string): Promise<string> {
    return this.analyzeMedia(prompt, { data, mimeType });
  }

  async transcribeAudio(data: string, mimeType: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ inlineData: { data, mimeType } }, { text: "Transcris cet audio mot à mot." }] }]
    });
    return response.text || "";
  }

  async generateSpeech(text: string, voiceName: string = 'Zephyr'): Promise<string | undefined> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch {
      return undefined;
    }
  }

  async generateImage(prompt: string, config: { aspectRatio: string, imageSize: string }): Promise<string> {
    const ai = this.getClient();
    const model = (config.imageSize === '2K' || config.imageSize === '4K') ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { imageConfig: { aspectRatio: config.aspectRatio as any, imageSize: config.imageSize as any } }
    });
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Échec de génération d'image.");
  }

  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16', sourceImage?: { data: string, mimeType: string }): Promise<string> {
    const ai = this.getClient();
    const params: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    };
    if (sourceImage) params.image = { imageBytes: sourceImage.data, mimeType: sourceImage.mimeType };
    let operation = await ai.models.generateVideos(params);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    return `${downloadLink}&key=${process.env.API_KEY}`;
  }

  async generateStrategicPlan(goal: string): Promise<StrategicPlan> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère un plan stratégique JSON structuré pour l'ambition suivante : "${goal}". Réflexion par étape.` }] }],
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16384 }
      }
    });
    return this.safeParseJson(response.text, { goal, summary: "Plan en cours...", steps: [] });
  }

  async refineStrategicPlan(plan: StrategicPlan, request: string): Promise<StrategicPlan> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        { role: 'user', parts: [{ text: `Plan actuel : ${JSON.stringify(plan)}. Demande de raffinement : ${request}. Réponds avec le plan JSON complet mis à jour.` }] }
      ],
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 8192 }
      }
    });
    return this.safeParseJson(response.text, plan);
  }

  async predictNextAction(context: string): Promise<AppAction> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Basé sur ce contexte : "${context}", quelle est la prochaine action Nexus ? Réponds en JSON (type, target, payload).` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { type: 'NOTIFY', payload: { message: "Action terminée." } });
  }

  async parseOmniCommand(input: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Parse cette commande utilisateur en un objet de navigation (target: ViewType, params: object) : "${input}"` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { target: 'dashboard', params: {} });
  }

  async generateCourse(topic: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Crée un cursus de formation complet sur : "${topic}". Réflexion pédagogique. Réponds en JSON.` }] }],
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 16384 } }
    });
    return this.safeParseJson(response.text, { title: topic, modules: [] });
  }

  async getMarketIntelligence(query: string): Promise<{ text: string, sources: GroundingSource[] }> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: { tools: [{ googleSearch: {} }] }
    });
    let sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      sources = chunks.map((chunk: any) => (chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)).filter((s): s is GroundingSource => s !== null);
    }
    return { text: response.text || "Données indisponibles.", sources };
  }

  async analyzeTradeRisk(description: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Analyse les risques pour : "${description}". JSON: {score, risks, advice}.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { score: 50, risks: [], advice: "Prudence recommandée." });
  }

  async appraiseAsset(description: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Estime la valeur : "${description}". JSON: {suggestedPrice, reasoning, marketTrend}.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { suggestedPrice: "Prix inconnu", reasoning: "Analyse impossible.", marketTrend: "Stable" });
  }

  async negotiateTrade(history: Message[], userInput: string, tactic?: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: tactic ? `Tactic: ${tactic}. Input: ${userInput}` : userInput }] }
      ]
    });
    return response.text || "Désolé, je n'ai pas pu formuler d'offre.";
  }

  async synthesizeExpert(prompt: string): Promise<Expert> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Synthétise un expert IA Diallo pour : "${prompt}". JSON complet selon interface Expert.` }] }],
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 4096 } }
    });
    return this.safeParseJson(response.text, EXPERTS[0]);
  }

  async generateDailyMissions(): Promise<AcademyMission[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: "Génère 3 missions quotidiennes pour une académie de formation à la souveraineté. JSON: [{id, title, reward, difficulty, completed: false}]." }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateFlashcards(summary: string): Promise<Flashcard[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère 5 flashcards à partir de ce texte : "${summary}". JSON: [{id, front, back, difficulty: 1}].` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateQuiz(title: string, content: string): Promise<QuizQuestion[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Crée un quiz de 5 questions sur : "${title}". Contenu : "${content}". JSON: [{id, question, options, correctAnswer, explanation}]. Les options sont un tableau de 4 chaînes.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateSimulationScenario(courseTitle: string): Promise<SimulationScenario> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Crée un scénario de simulation complexe pour le cours : "${courseTitle}". JSON: {id, title, context, goal, difficulty}.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { id: '1', title: 'Simulation', context: '...', goal: 'Gagner', difficulty: 'medium' });
  }

  async generateVocabList(lang: string, context: string): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère une liste de 10 mots essentiels en ${lang} pour le contexte : "${context}". JSON: [{word, translation, example, tip}].` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, []);
  }

  async editImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType } },
          { text: prompt },
        ],
      },
    });
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Échec de l'édition d'image.");
  }

  async analyzeVideo(data: string, mimeType: string, prompt: string): Promise<string> {
    return this.analyzeMedia(prompt, { data, mimeType });
  }

  async generateSynergyOracle(history: Message[]): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Analyse cette conversation de groupe et donne un score de consensus global. Historique : ${JSON.stringify(history.slice(-10))}. JSON: {consensusScore: number (0-100)}.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { consensusScore: 50 });
  }

  async getDetailedConsensus(history: Message[], selectedExperts: Expert[]): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Pour chaque expert, évalue son score d'alignement sur la solution finale. Experts: ${JSON.stringify(selectedExperts.map(e => e.name))}. Historique : ${JSON.stringify(history.slice(-10))}. JSON: [{expertId, score, reasoning}].` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, []);
  }

  async identifyBreakthroughs(history: Message[]): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Identifie les moments clés de rupture ou d'innovation dans cette discussion. JSON: [{messageId, insight, impact}].` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, []);
  }

  async auditSynergyBias(history: Message[]): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Analyse les biais cognitifs dominants dans cette discussion. JSON: {dominantBias, recommendation}.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { dominantBias: "Aucun détecté", recommendation: "Poursuivre." });
  }

  async extractStrategicAnchors(history: Message[]): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Extrais les décisions stratégiques immuables (ancres) de cette session. JSON: [{id, title, description, impact: "high" | "medium"}].` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateSynergySummary(history: Message[]): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: "Résume synthétiquement les points d'accord majeurs de cette discussion." }, ...history.slice(-5).map(m => ({ text: m.content }))] }],
    });
    return response.text || "Résumé indisponible.";
  }

  async generateActionManifest(history: Message[]): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère un Manifeste d'Action Collective basé sur ces échanges. JSON: {title, vision, roadmap, criticalSuccessFactors}. roadmap et criticalSuccessFactors sont des tableaux de chaînes.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { title: "Manifeste", vision: "...", roadmap: [], criticalSuccessFactors: [] });
  }

  static downsample(data: Float32Array, inputSR: number, outputSR: number): Float32Array {
    if (inputSR === outputSR) return data;
    const ratio = inputSR / outputSR;
    const res = new Float32Array(Math.round(data.length / ratio));
    for (let i = 0; i < res.length; i++) res[i] = data[Math.round(i * ratio)];
    return res;
  }
  static encode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  static decode(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  static async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }
}

export const gemini = new GeminiService();
