
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, Expert, GroundingSource, ViewType, AppAction, StrategicPlan, QuizQuestion, SimulationScenario, Flashcard } from "../types";
import { EXPERTS } from "../constants";

export interface TacticalAssistance {
  subtasks: string[];
  advice: string;
  tools: string[];
}

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * CŒUR DE DIALOGUE : Utilise Pro pour la réflexion profonde ou Flash-Lite pour la vélocité.
   */
  async sendMessage(
    expert: Expert, 
    message: string, 
    history: Message[], 
    options?: { 
      useThinking?: boolean, 
      useFastMode?: boolean,
      useSearch?: boolean, 
      useMaps?: boolean,
      latLng?: { latitude: number, longitude: number }
    }
  ): Promise<{ text: string, sources: GroundingSource[], image?: string }> {
    const ai = this.getClient();
    let model = 'gemini-3-flash-preview';
    const config: any = { systemInstruction: expert.systemInstruction };

    if (options?.useThinking) {
      model = 'gemini-3-pro-preview';
      config.thinkingConfig = { thinkingBudget: 32768 };
    } else if (options?.useFastMode) {
      model = 'gemini-flash-lite-latest';
    }

    if (options?.useSearch) {
      model = 'gemini-3-flash-preview';
      config.tools = [{ googleSearch: {} }];
    } else if (options?.useMaps) {
      model = 'gemini-2.5-flash';
      config.tools = [{ googleMaps: {} }];
      if (options.latLng) {
        config.toolConfig = { retrievalConfig: { latLng: options.latLng } };
      }
    }

    const contents = [
      ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
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

    return { text: response.text || "...", sources };
  }

  async analyzeMedia(prompt: string, media: { data: string, mimeType: string }): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ inlineData: { data: media.data, mimeType: media.mimeType } }, { text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 4096 } }
    });
    return response.text || "";
  }

  async analyzeImage(data: string, mimeType: string, prompt: string): Promise<string> {
    return this.analyzeMedia(prompt, { data, mimeType });
  }

  async analyzeVideo(data: string, mimeType: string, prompt: string): Promise<string> {
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }

  async generateImage(prompt: string, config: { aspectRatio: string, imageSize: string }): Promise<string> {
    const ai = this.getClient();
    const model = (config.imageSize === '2K' || config.imageSize === '4K') ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { imageConfig: { aspectRatio: config.aspectRatio, imageSize: config.imageSize } }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Échec de génération d'image.");
  }

  async editImage(data: string, mimeType: string, prompt: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }]
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Échec de l'édition d'image.");
  }

  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16', sourceImage?: { data: string, mimeType: string }): Promise<string> {
    const ai = this.getClient();
    const params: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    };
    if (sourceImage) {
      params.image = { imageBytes: sourceImage.data, mimeType: sourceImage.mimeType };
    }

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
    return JSON.parse(response.text || "{}");
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
    return JSON.parse(response.text || "{}");
  }

  async predictNextAction(context: string): Promise<AppAction> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Basé sur ce contexte : "${context}", quelle est la prochaine action Nexus ? Réponds en JSON (type, target, payload).` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async generateStepAssistance(step: any, goal: string): Promise<TacticalAssistance> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Fournis une assistance tactique chirurgicale pour l'étape "${step.title}" du projet "${goal}". Réfléchis en mode architecte.` }] }],
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 8192 }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async parseOmniCommand(input: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Parse cette commande utilisateur en un objet de navigation (target: ViewType, params: object) : "${input}"` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async generateDailyMissions(): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: "Génère 3 missions d'apprentissage quotidiennes pour l'Académie Diallo. Réponds en JSON." }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  }

  async generateCourse(topic: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Crée un cursus de formation complet sur : "${topic}". Réfléchis à la structure pédagogique.` }] }],
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16384 }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async generateFlashcards(summary: string): Promise<Flashcard[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère une liste de flashcards (JSON array of {id, front, back, difficulty}) basée sur ce résumé : "${summary}"` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  }

  async generateQuiz(title: string, content: string): Promise<QuizQuestion[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère un quiz de 5 questions (JSON array of {id, question, options, correctAnswer, explanation}) pour le cours "${title}" basé sur : "${content}"` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  }

  async generateSimulationScenario(topic: string): Promise<SimulationScenario> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère un scénario de simulation réaliste (JSON: {id, title, context, goal, difficulty}) pour le sujet : "${topic}"` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async generateVocabList(language: string, context: string): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère une liste de 10 mots de vocabulaire en ${language} pour le contexte "${context}" (JSON array of {word, translation, example, tip})` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
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
      sources = chunks.map((chunk: any) => {
        if (chunk.web) return { uri: chunk.web.uri, title: chunk.web.title };
        return null;
      }).filter((s): s is GroundingSource => s !== null);
    }

    return { text: response.text || "...", sources };
  }

  async analyzeTradeRisk(description: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Analyse les risques commerciaux pour l'actif suivant : "${description}". Réponds en JSON: {score: number (0-100), risks: string[], advice: string}` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async appraiseAsset(description: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Estime la valeur de cet actif : "${description}". Réponds en JSON: {suggestedPrice: string, reasoning: string, marketTrend: string ('up'|'down'|'stable')}` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async getTacticalSuggestions(history: Message[]): Promise<string[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Suggère 3 tactiques de négociation courtes (JSON array of strings)." }] }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  }

  async negotiateTrade(history: Message[], userInput: string, tactic?: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: tactic ? `Utilise cette tactique : ${tactic}. Message : ${userInput}` : userInput }] }
      ]
    });
    return response.text || "";
  }

  async mediateConflict(history: Message[]): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Agis en tant que médiateur Maître Diallo. Propose un compromis équitable." }] }
      ]
    });
    return response.text || "";
  }

  async generateSynergyOracle(history: Message[]): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Calcule le score de consensus (0-100) pour cette synergie (JSON: {consensusScore: number})." }] }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async getDetailedConsensus(history: Message[], experts: Expert[]): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: `Détaille le consensus pour ces experts : ${experts.map(e => e.name).join(', ')} (JSON array of {expertId, score, reasoning}).` }] }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  }

  async identifyBreakthroughs(history: Message[]): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Identifie les percées stratégiques majeures (JSON array of {messageId, insight, impact})." }] }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  }

  async auditSynergyBias(history: Message[]): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Audit les biais cognitifs dans cette discussion (JSON: {dominantBias, recommendation})." }] }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async extractStrategicAnchors(history: Message[]): Promise<any[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Extrais les ancres stratégiques décidées (JSON array of {id, title, description, impact: 'high'|'medium'})." }] }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  }

  async generateSynergySummary(history: Message[]): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Résume brièvement la synergie en cours." }] }
      ]
    });
    return response.text || "";
  }

  async generateActionManifest(history: Message[]): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: "Forger un manifeste d'action mondial basé sur cette discussion (JSON: {title, vision, roadmap: string[], criticalSuccessFactors: string[]})." }] }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async synthesizeExpert(prompt: string): Promise<Expert> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Synthétise un nouvel expert IA Diallo basé sur : "${prompt}". Réponds en JSON avec id, name, role, description, systemInstruction, avatar, color, voiceName.` }] }],
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4096 }
      }
    });
    return JSON.parse(response.text || "{}");
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
