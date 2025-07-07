type Subtitle = { text: string; start: number; end: number };

interface VideoData {
  avatarUrl: string;
  backgroundUrl: string;
  logoUrl: string;
  accentColor: string;
  subtitles: Subtitle[];
}

export function personalizeTemplate(template: any, videoData: VideoData) {
  const cloned = structuredClone(template);
  cloned.elements = cloned.elements.map((el: any) => {
    if (typeof el.source === "string") {
      if (el.source === "__AVATAR__") el.source = videoData.avatarUrl;
      if (el.source === "__BG__") el.source = videoData.backgroundUrl;
      if (el.source === "__LOGO__") el.source = videoData.logoUrl;
    }
    
    // Manejar el elemento de subtítulos con transcript_source
    if (el.id === "subtitles-container" || el.transcript_source) {
      // Para elementos con transcript_source, no necesitamos pasar subtítulos manualmente
      // Creatomate los generará automáticamente basándose en el audio del video
      if (el.background_color === "__ACCENT__") {
        el.background_color = videoData.accentColor;
      }
      if (el.transcript_color === "__ACCENT__") {
        el.transcript_color = videoData.accentColor;
      }
    }
    
    // Manejar el elemento safe-area (mantener la URL original)
    if (el.id === "safe-area") {
      // No cambiar nada, mantener la URL original de Creatomate
    }
    
    // Mantener compatibilidad con el formato anterior
    if (el.id === "subtitles") {
      // Convertir el array de subtítulos al formato string que espera Creatomate
      // Formato: "texto1|texto2|texto3" donde cada | representa un cambio de subtítulo
      // Filtrar subtítulos vacíos y asegurar que haya contenido válido
      const validSubtitles = videoData.subtitles.filter(subtitle => 
        subtitle.text && subtitle.text.trim().length > 0
      );
      
      if (validSubtitles.length > 0) {
        const subtitlesString = validSubtitles.map(subtitle => subtitle.text.trim()).join('|');
        el.subtitles = subtitlesString;
      } else {
        // Si no hay subtítulos válidos, usar un texto por defecto
        el.subtitles = "Video generado automáticamente";
      }
      
      if (el.style && el.style.backgroundColor === "__ACCENT__") {
        el.style.backgroundColor = videoData.accentColor;
      }
    }
    return el;
  });
  return cloned;
} 