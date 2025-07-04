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
      el.subtitles = videoData.subtitles;
      if (el.style && el.style.backgroundColor === "__ACCENT__") {
        el.style.backgroundColor = videoData.accentColor;
      }
    }
    return el;
  });
  return cloned;
} 