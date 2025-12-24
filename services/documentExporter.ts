import { Artifact } from "../types";

export class DocumentExporter {
  /**
   * Simule et gère l'exportation de documents. 
   * Dans une version de production complète, on utiliserait jsPDF, docx.js, pptxgenjs.
   * Ici nous créons un Blob formaté pour démontrer le flux de travail.
   */
  static async export(artifact: Artifact, format: 'pdf' | 'docx' | 'pptx') {
    console.log(`[EXPORTER] Préparation du fichier ${format.toUpperCase()} pour : ${artifact.title}`);
    
    // Simulation d'un délai de rendu neural
    await new Promise(resolve => setTimeout(resolve, 1500));

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
    link.download = `${artifact.title.replace(/\s+/g, '_')}_${new Date().getTime()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  }

  private static formatContent(artifact: Artifact, format: string): string {
    // Dans ce prototype, nous exportons le texte brut avec une bannière de certification Nexus
    return `
      NEXUS DIALLO - CERTIFICAT DE SOUVERAINETÉ DIGITALE
      -----------------------------------------------
      TITRE : ${artifact.title.toUpperCase()}
      TYPE : ${artifact.type.toUpperCase()}
      EXPERT : ${artifact.expertId}
      DATE : ${new Date().toLocaleString()}
      
      CONTENU DU DOCUMENT :
      ${artifact.content}
      
      -----------------------------------------------
      Généré par l'Architecte IA v42. Document scellé.
    `;
  }
}
