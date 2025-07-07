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
    if (typeof el.src === "string") {
      if (el.src === "__AVATAR__") el.src = videoData.avatarUrl;
      if (el.src === "__BG__") el.src = videoData.backgroundUrl;
      if (el.src === "__LOGO__") el.src = videoData.logoUrl;
    }
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