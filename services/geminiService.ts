
import { GoogleGenAI, Type, Modality, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { Message, Expert, GroundingSource, ViewType, AppAction, StrategicPlan, QuizQuestion, SimulationScenario, Flashcard, Artifact, AcademyMission } from "../types";
import { EXPERTS } from "../constants";
import { SettingsService } from "./settingsService";

export interface ToolResponse {
  text: string;
  sources: GroundingSource[];
  functionCalls?: any[];
}

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private getDynamicSystemInstruction() {
    const config = SettingsService.getArchitectConfig();
    return SettingsService.buildSystemPrompt(config);
  }

  private safeParseJson(text: string | undefined, fallback: any = {}) {
    if (!text) return fallback;
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { return fallback; }
      }
      return fallback;
    }
  }

  private getArchitectTools(): FunctionDeclaration[] {
    return [
      {
        name: 'orchestrate_mission',
        description: 'Lancer une mission stratégique complète impliquant plusieurs experts.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            goal: { type: Type.STRING, description: 'L\'objectif final.' },
            involvedExperts: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Experts à mobiliser.' }
          },
          required: ['goal', 'involvedExperts']
        }
      },
      {
        name: 'summon_expert',
        description: 'Appeler un expert spécifique pour une consultation immédiate.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            expertId: { type: Type.STRING, description: 'L\'ID de l\'expert (ex: maitre_diallo).' },
            reason: { type: Type.STRING, description: 'Pourquoi l\'appeler.' }
          },
          required: ['expertId']
        }
      }
    ];
  }

  async sendDeepArchitectMessage(message: string, history: Message[]): Promise<ToolResponse> {
    const ai = this.getClient();
    const config = SettingsService.getArchitectConfig();
    
    // Utilisation de Gemini 3 Pro pour le Deep Thinking
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: this.getDynamicSystemInstruction(),
        thinkingConfig: { thinkingBudget: 32768 }, // Budget maximal pour l'innovation extrême
        tools: config.searchEnabled ? [{ googleSearch: {} }] : []
      }
    });

    let sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      sources = chunks.map((chunk: any) => (chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)).filter((s): s is GroundingSource => s !== null);
    }

    return { text: response.text || "", sources, functionCalls: response.functionCalls };
  }

  async sendMessage(
    expert: Expert, 
    message: string, 
    history: Message[], 
    options?: { 
      useThinking?: boolean, 
      enableTools?: boolean,
      useSearch?: boolean
    }
  ): Promise<ToolResponse> {
    const ai = this.getClient();
    const archConfig = SettingsService.getArchitectConfig();
    let model = (options?.useThinking || expert.id === 'diallo') ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const config: any = { 
      systemInstruction: this.getDynamicSystemInstruction() + "\n" + expert.systemInstruction,
      tools: archConfig.searchEnabled ? [{ googleSearch: {} }] : []
    };

    if (options?.useThinking) {
      config.thinkingConfig = { thinkingBudget: archConfig.thinkingBudget };
    }

    if (options?.enableTools || expert.id === 'diallo') {
      config.tools.push({ functionDeclarations: expert.id === 'diallo' ? this.getArchitectTools() : [] });
    }

    const contents = [
      ...history.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({ model, contents, config });
    
    let sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      sources = chunks.map((chunk: any) => (chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)).filter((s): s is GroundingSource => s !== null);
    }

    return { 
      text: response.text || "", 
      sources,
      functionCalls: response.functionCalls 
    };
  }

  async generateStrategicPlan(goal: string): Promise<StrategicPlan> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère un plan stratégique RÉEL et ACTIONNABLE pour : "${goal}".` }] }],
      config: { 
        systemInstruction: this.getDynamicSystemInstruction(),
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16000 }
      }
    });
    return this.safeParseJson(response.text, { goal, summary: "Plan stratégique en cours...", steps: [] });
  }

  async generateProjectArtifact(plan: StrategicPlan, type: string, context: string): Promise<Artifact> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Rédige un artefact de type "${type}" pour le projet : "${plan.goal}". Context: ${context}` }] }],
      config: { 
        systemInstruction: this.getDynamicSystemInstruction(),
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 8000 }
      }
    });
    const result = this.safeParseJson(response.text, { title: "Document Nexus", content: "..." });
    return {
      id: Math.random().toString(36).substr(2, 9),
      expertId: 'diallo',
      ...result
    };
  }

  async researchProjectResources(query: string): Promise<{ text: string, sources: GroundingSource[] }> {
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
    return { text: response.text || "", sources };
  }

  async predictNextAction(context: string): Promise<AppAction> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Quelle est la prochaine étape pour : "${context}"?` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { type: 'NOTIFY', payload: { message: "Analyse terminée." } });
  }

  async generateCourse(topic: string): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Génère un cursus pour : ${topic}` }] }],
      config: { responseMimeType: "application/json" }
    });
    return this.safeParseJson(response.text, { title: topic, modules: [] });
  }

  async generateDailyMissions(): Promise<AcademyMission[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Génère 3 missions quotidiennes d'apprentissage stimulantes.",
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateFlashcards(summary: string): Promise<Flashcard[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère 5 flashcards basées sur : ${summary}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateQuiz(topic: string, content: string): Promise<QuizQuestion[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crée un quiz de 3 questions sur : ${topic}. Contenu: ${content}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateSimulationScenario(topic: string): Promise<SimulationScenario> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère un scénario de simulation pour : ${topic}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, { id: 'sim-1', title: 'Simulation', context: '', goal: '', difficulty: 'medium' });
  }

  async synthesizeExpert(prompt: string): Promise<Expert> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Synthétise un expert IA basé sur : ${prompt}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, EXPERTS[0]);
  }

  async generateImage(prompt: string, config: { aspectRatio: string, imageSize: string }): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any,
          imageSize: config.imageSize as any
        }
      }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Génération d'image échouée");
  }

  async analyzeMedia(prompt: string, media: { data: string, mimeType: string }): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: media.data, mimeType: media.mimeType } },
          { text: prompt }
        ]
      }
    });
    return response.text || "";
  }

  async generateVocabList(lang: string, context: string): Promise<{word: string, translation: string, example: string, tip: string}[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère 10 mots de vocabulaire en ${lang} pour : ${context}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, []);
  }

  async getMarketIntelligence(query: string): Promise<{ text: string, sources: GroundingSource[] }> {
    return this.researchProjectResources(query);
  }

  async generateVideo(prompt: string, aspectRatio: string, sourceFile?: { data: string, mimeType: string }): Promise<string> {
    const ai = this.getClient();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      image: sourceFile ? { imageBytes: sourceFile.data, mimeType: sourceFile.mimeType } : undefined,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: (aspectRatio === '16:9' || aspectRatio === '9:16') ? aspectRatio : '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async editImage(data: string, mimeType: string, prompt: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: prompt }
        ]
      }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Édition d'image échouée");
  }

  async analyzeVideo(data: string, mimeType: string, prompt: string): Promise<string> {
    return this.analyzeMedia(prompt, { data, mimeType });
  }

  async analyzeImage(data: string, mimeType: string, prompt: string): Promise<string> {
    return this.analyzeMedia(prompt, { data, mimeType });
  }

  async analyzeTradeRisk(context: string): Promise<{score: number, risks: string[], advice: string}> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyse les risques de transaction pour : ${context}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, { score: 50, risks: [], advice: "" });
  }

  async appraiseAsset(context: string): Promise<{suggestedPrice: string, reasoning: string, marketTrend: string}> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Estime la valeur de cet actif : ${context}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, { suggestedPrice: "Prix non estimé", reasoning: "", marketTrend: "" });
  }

  async negotiateTrade(history: Message[], userInput: string, tactic?: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: tactic ? `Tactic: ${tactic}. Message: ${userInput}` : userInput }] }
      ] as any,
      config: {
        systemInstruction: "Tu es un négociateur expert Diallo. Sois juste mais ferme."
      }
    });
    return response.text || "";
  }

  async generateSynergyOracle(history: Message[]): Promise<{consensusScore: number}> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => `${m.role}: ${m.content}`).join("\n"),
      config: {
        systemInstruction: "Calcule le score de consensus global de 0 à 100 pour cette discussion.",
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, { consensusScore: 50 });
  }

  async getDetailedConsensus(history: Message[], experts: Expert[]): Promise<{ expertId: string, score: number, reasoning: string }[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => `${m.role}: ${m.content}`).join("\n"),
      config: {
        systemInstruction: "Analyse l'alignement individuel des experts sur la discussion.",
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, []);
  }

  async identifyBreakthroughs(history: Message[]): Promise<{ messageId: string, insight: string, impact: string }[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => `${m.role}: ${m.content}`).join("\n"),
      config: {
        systemInstruction: "Identifie les points de rupture créatifs ou insights majeurs.",
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, []);
  }

  async auditSynergyBias(history: Message[]): Promise<{ dominantBias: string, recommendation: string }> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => `${m.role}: ${m.content}`).join("\n"),
      config: {
        systemInstruction: "Audit des biais cognitifs dans l'échange de groupe.",
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, { dominantBias: "Aucun détecté", recommendation: "" });
  }

  async extractStrategicAnchors(history: Message[]): Promise<{ id: string, title: string, description: string, impact: 'high' | 'medium' }[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => `${m.role}: ${m.content}`).join("\n"),
      config: {
        systemInstruction: "Extrais les ancres stratégiques validées par le conseil.",
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, []);
  }

  async generateSynergySummary(history: Message[]): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => `${m.role}: ${m.content}`).join("\n"),
      config: { systemInstruction: "Résume la discussion synergique en une phrase." }
    });
    return response.text || "";
  }

  async generateActionManifest(history: Message[]): Promise<any> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: history.map(m => `${m.role}: ${m.content}`).join("\n"),
      config: {
        systemInstruction: "Génère un manifeste d'action complet basé sur la session de synergie.",
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, {});
  }

  async parseOmniCommand(input: string): Promise<{ target: ViewType, params: any }> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Interprète cette commande : "${input}"`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return this.safeParseJson(response.text, { target: 'dashboard', params: {} });
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
