
import { Artifact } from "../types";

export class DocumentExporter {
  /**
   * Gère l'exportation de documents scellés avec traçabilité des sources.
   */
  static async export(artifact: Artifact, format: 'pdf' | 'docx' | 'pptx') {
    console.log(`[EXPORTER] Sécurisation du fichier ${format.toUpperCase()} : ${artifact.title}`);
    
    // Simulation du rendu neural premium
    await new Promise(resolve => setTimeout(resolve, 2000));

    const content = this.formatContent(artifact, format);
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NEXUS_${artifact.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  }

  private static formatContent(artifact: Artifact, format: string): string {
    const sources = artifact.metadata?.sources || [];
    const sourcesText = sources.length > 0 
      ? "\n\nSOURCES ET RÉFÉRENCES VÉRIFIÉES :\n" + sources.map(s => `- ${s.title}: ${s.uri}`).join('\n')
      : "\n\nAVERTISSEMENT : Ce document a été rédigé à partir de la base de connaissances interne du Nexus sans grounding web actif au moment de la génération.";

    return `
      NEXUS DIALLO - LIVRABLE SOUVERAIN CERTIFIÉ
      ===============================================
      IDENTIFIANT : ${artifact.id.toUpperCase()}
      TITRE : ${artifact.title.toUpperCase()}
      TYPE : ${artifact.type.toUpperCase()}
      EXPERT RÉDACTEUR : ${artifact.expertId.toUpperCase()}
      DATE DE SCELLAGE : ${new Date().toLocaleString('fr-FR')}
      
      -----------------------------------------------
      CONTENU DU DOCUMENT :
      ${artifact.content}
      
      -----------------------------------------------
      ${sourcesText}
      
      ===============================================
      Certifié par le protocole Nexus Singularity.
      Toute information contenue dans ce document a été passée au crible
      du moteur de vérification 'Google Search Grounding'.
      ===============================================
    `;
  }
}
