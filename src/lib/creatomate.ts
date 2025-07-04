export const CREATOMATE_API_URL = 'https://api.creatomate.com/v1';

interface CreatomateRenderParams {
  templateId?: string;
  modifications?: {
    [key: string]: any;
  };
  webhookUrl?: string;
  metadata?: string;
  outputFormat?: string;
  frameRate?: number;
  renderScale?: number;
  maxWidth?: number;
  maxHeight?: number;
  source?: any;
}

interface CreatomateRenderResponse {
  id: string;
  status: string;
  url?: string;
  error?: string;
}

interface CreatomateRenderStatusResponse {
  id: string;
  status: 'idle' | 'rendering' | 'completed' | 'failed';
  progress?: number;
  url?: string;
  error?: string;
}

export class CreatomateAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.CREATOMATE_API_KEY || '';
    this.baseUrl = CREATOMATE_API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Creatomate API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  async createRender(params: CreatomateRenderParams): Promise<CreatomateRenderResponse> {
    try {
      console.log('[Creatomate][API] createRender - Parámetros de entrada:', params);
      
      const requestBody: any = {};
      if (params.source) {
        requestBody.source = params.source;
      }
      if (params.templateId) {
        requestBody.template_id = params.templateId;
      }
      if (params.modifications) {
        requestBody.modifications = params.modifications;
      }
      if (params.webhookUrl) {
        requestBody.webhook_url = params.webhookUrl;
      }
      if (params.metadata) {
        requestBody.metadata = params.metadata;
      }
      if (params.outputFormat) {
        requestBody.output_format = params.outputFormat;
      }
      if (params.frameRate) {
        requestBody.frame_rate = params.frameRate;
      }
      if (params.renderScale) {
        requestBody.render_scale = params.renderScale;
      }
      if (params.maxWidth) {
        requestBody.max_width = params.maxWidth;
      }
      if (params.maxHeight) {
        requestBody.max_height = params.maxHeight;
      }

      console.log('[Creatomate][API] createRender - requestBody:', requestBody);

      const response = await this.request('/renders', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('[Creatomate][API] createRender - Respuesta completa:', data);

      // La respuesta puede ser un array o un objeto individual
      const renderData = Array.isArray(data) ? data[0] : data;

      return {
        id: renderData.id,
        status: renderData.status || 'idle',
        url: renderData.url,
        error: renderData.error,
      };
    } catch (error) {
      console.error('[Creatomate][API] createRender - Error:', error);
      throw error;
    }
  }

  async checkRenderStatus(renderId: string): Promise<CreatomateRenderStatusResponse> {
    try {
      console.log('Checking Creatomate render status for:', renderId);
      
      const response = await this.request(`/renders/${renderId}`, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('Creatomate render status response:', data);

      return {
        id: data.id,
        status: data.status || 'idle',
        progress: data.progress,
        url: data.url,
        error: data.error,
      };
    } catch (error) {
      console.error('Error checking Creatomate render status:', error);
      throw error;
    }
  }

  async createVideoFromHeyGen(
    heygenVideoUrl: string,
    script: string,
    videoTitle: string,
    webhookUrl?: string,
    videoDuration?: number,
    videoId?: string
  ): Promise<CreatomateRenderResponse> {
    try {
      console.log('[Creatomate][API] createVideoFromHeyGen - Parámetros:', { heygenVideoUrl, script: script.substring(0, 100), videoTitle, webhookUrl, videoDuration, videoId });
      // [ELIMINADO] Template ID fijo, ahora se usa plantilla personalizada
      // const templateId = process.env.CREATOMATE_TEMPLATE_ID || '273cdd5f-f40a-4c72-9a08-55245e49bfbc';
      // ...resto de la función...
      // [Opcional: aquí podrías lanzar un error si alguien intenta usar esta función sin plantilla personalizada]
      throw new Error('createVideoFromHeyGen ya no debe usarse. Usa createRender con source personalizado.');
    } catch (error) {
      console.error('[Creatomate][API] createVideoFromHeyGen - Error:', error);
      throw error;
    }
  }

  private processScriptForSubtitles(script: string): string {
    // Dividir el script en frases más cortas para subtítulos
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Tomar las primeras 2-3 frases para el contenido de noticia
    const shortScript = sentences.slice(0, 3).join('. ').trim();
    
    // Limitar a 200 caracteres para que quepa bien en el template
    if (shortScript.length > 200) {
      return shortScript.substring(0, 197) + '...';
    }
    
    return shortScript;
  }

  /**
   * Divide el script en subtítulos sincronizados para Creatomate
   * @param script - El script completo generado por OpenAI
   * @param videoDuration - Duración del video en segundos (opcional)
   * @returns Array de subtítulos con timing
   */
  public createSynchronizedSubtitles(script: string, videoDuration?: number): Array<{text: string, startTime: number, duration: number}> {
    // Validar que el script no sea undefined o null
    if (!script || typeof script !== 'string') {
      console.warn('[Subtitles] Script inválido:', script);
      return [];
    }
    
    // Dividir el script en oraciones
    const sentences = script.split(/[.!?]+/).filter(s => s && s.trim().length > 0);
    
    const subtitles: Array<{text: string, startTime: number, duration: number}> = [];
    let currentTime = 0;
    
    // Calcular palabras totales para distribuir el tiempo
    const totalWords = script.split(/\s+/).length;
    
    // Si tenemos duración del video, usar distribución proporcional
    if (videoDuration && videoDuration > 0) {
      const wordsPerSecond = totalWords / videoDuration;
      console.log(`[Subtitles] Video duration: ${videoDuration}s, Total words: ${totalWords}, Words per second: ${wordsPerSecond.toFixed(2)}`);
      
      sentences.forEach((sentence, index) => {
        const trimmedSentence = sentence.trim();
        if (trimmedSentence.length === 0) return;
        
        const wordCount = trimmedSentence.split(/\s+/).length;
        const duration = Math.max(1.5, wordCount / wordsPerSecond); // Mínimo 1.5 segundos
        
        // Dividir oraciones largas
        if (wordCount > 12) {
          const phrases = this.splitLongSentence(trimmedSentence);
          phrases.forEach(phrase => {
            const phraseWordCount = phrase.split(/\s+/).length;
            const phraseDuration = Math.max(1, phraseWordCount / wordsPerSecond);
            
            subtitles.push({
              text: phrase,
              startTime: currentTime,
              duration: phraseDuration
            });
            
            currentTime += phraseDuration;
          });
        } else {
          subtitles.push({
            text: trimmedSentence,
            startTime: currentTime,
            duration: duration
          });
          
          currentTime += duration;
        }
      });
    } else {
      // Fallback: usar estimación estándar
      const wordsPerSecond = 2.5; // ~150 palabras por minuto
      
      sentences.forEach((sentence, index) => {
        const trimmedSentence = sentence.trim();
        if (trimmedSentence.length === 0) return;
        
        const wordCount = trimmedSentence.split(/\s+/).length;
        const duration = Math.max(2, wordCount / wordsPerSecond);
        
        if (wordCount > 15) {
          const phrases = this.splitLongSentence(trimmedSentence);
          phrases.forEach(phrase => {
            const phraseWordCount = phrase.split(/\s+/).length;
            const phraseDuration = Math.max(1.5, phraseWordCount / wordsPerSecond);
            
            subtitles.push({
              text: phrase,
              startTime: currentTime,
              duration: phraseDuration
            });
            
            currentTime += phraseDuration;
          });
        } else {
          subtitles.push({
            text: trimmedSentence,
            startTime: currentTime,
            duration: duration
          });
          
          currentTime += duration;
        }
      });
    }
    
    console.log(`[Subtitles] Generated ${subtitles.length} subtitle segments for script`);
    console.log(`[Subtitles] Total subtitle duration: ${currentTime.toFixed(2)}s`);
    
    return subtitles;
  }

  /**
   * Divide oraciones largas en frases más manejables
   * @param sentence - Oración larga a dividir
   * @returns Array de frases más cortas
   */
  private splitLongSentence(sentence: string): string[] {
    // Validar que la oración no sea undefined o null
    if (!sentence || typeof sentence !== 'string') {
      console.warn('[splitLongSentence] Oración inválida:', sentence);
      return [];
    }
    
    // Dividir por comas, puntos y comas, y conectores
    const phrases = sentence.split(/[,;]|\s+(y|o|pero|sin embargo|además|también|por eso|por lo tanto|que|cuando|donde|como|porque|ya que|puesto que)\s+/i);
    
    // Filtrar frases vacías y limpiar
    const cleanedPhrases = phrases
      .map(phrase => phrase && phrase.trim())
      .filter(phrase => phrase && phrase.length > 0 && phrase.length < 80); // Reducido a 80 caracteres
    
    // Si las frases siguen siendo muy largas, dividir por espacios
    const finalPhrases: string[] = [];
    cleanedPhrases.forEach(phrase => {
      if (phrase.length > 60) {
        // Dividir en grupos de palabras
        const words = phrase.split(/\s+/);
        const midPoint = Math.ceil(words.length / 2);
        finalPhrases.push(words.slice(0, midPoint).join(' '));
        finalPhrases.push(words.slice(midPoint).join(' '));
      } else {
        finalPhrases.push(phrase);
      }
    });
    
    return finalPhrases;
  }

  /**
   * Crea el formato de subtítulos para Creatomate
   * @param subtitles - Array de subtítulos con timing
   * @returns String formateado para Creatomate
   */
  private formatSubtitlesForCreatomate(subtitles: Array<{text: string, startTime: number, duration: number}>): string {
    // Formato: "texto1|texto2|texto3" donde cada | representa un cambio de subtítulo
    return subtitles.map(subtitle => subtitle.text).join('|');
  }
}

// Función helper para obtener una instancia de la API
export function getCreatomateClient(): CreatomateAPI {
  return new CreatomateAPI();
} 