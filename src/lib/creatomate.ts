export const CREATOMATE_API_URL = 'https://api.creatomate.com/v1';

interface CreatomateRenderParams {
  templateId: string;
  modifications: {
    [key: string]: any;
  };
  webhookUrl?: string;
  metadata?: string;
  outputFormat?: string;
  frameRate?: number;
  renderScale?: number;
  maxWidth?: number;
  maxHeight?: number;
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
      console.log('Creating Creatomate render with params:', params);
      
      const requestBody: any = {
        template_id: params.templateId,
        modifications: params.modifications,
      };

      // Agregar parámetros opcionales solo si están definidos
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

      const response = await this.request('/renders', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Creatomate render response:', data);

      // La respuesta puede ser un array o un objeto individual
      const renderData = Array.isArray(data) ? data[0] : data;

      return {
        id: renderData.id,
        status: renderData.status || 'idle',
        url: renderData.url,
        error: renderData.error,
      };
    } catch (error) {
      console.error('Error in createRender:', error);
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
      // Template ID para videos con subtítulos y efectos
      const templateId = process.env.CREATOMATE_TEMPLATE_ID || '273cdd5f-f40a-4c72-9a08-55245e49bfbc';
      
      // Procesar el script para subtítulos - dividir en frases más cortas
      const processedScript = this.processScriptForSubtitles(script);
      
      // Crear subtítulos sincronizados
      const synchronizedSubtitles = this.createSynchronizedSubtitles(script, videoDuration);
      const subtitlesText = this.formatSubtitlesForCreatomate(synchronizedSubtitles);
      
      console.log(`[Subtitles] Script length: ${script.length} characters`);
      console.log(`[Subtitles] Generated ${synchronizedSubtitles.length} subtitle segments`);
      console.log(`[Subtitles] Sample segments:`, synchronizedSubtitles.slice(0, 3));
      
      const modifications = {
        // Configuración específica para tu template de noticias
        'Imagen-Total.source': heygenVideoUrl, // Usar el video de HeyGen como imagen principal
        'Imagen-Noticia-1.source': '',
        'Imagen-Noticia-2.source': '',
        'Imagen-Noticia-3.source': '',
        'Imagen-Noticia-4.source': '',
        'Safe-Area.source': 'https://creatomate.com/files/assets/1ccbd1de-1637-41c2-ab01-6644c87594f1',
        'Imagen-Portada-Abajo.source': '',
        'Imagen-Portada-Arriba.source': '',
        'Fecha.text': new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        'Contenido-Noticia-Portada.text': processedScript || videoTitle || 'Contenido generado automáticamente',
        // Campos adicionales para asegurar que el template funcione
        'Titulo-Noticia.text': videoTitle || 'Noticia Importante',
        'Subtitulo-Noticia.text': processedScript.substring(0, 100) || 'Información relevante',
        
        // 🎯 SUBTÍTULOS SINCRONIZADOS
        'subtitles.text': subtitlesText, // Elemento de subtítulos dinámicos
        'subtitles.transcript_source': 'text', // Usar el texto como fuente de transcripción
        'subtitles.transcript_effect': 'color', // Efecto de color para resaltar palabras
        'subtitles.transcript_split': 'word', // Dividir por palabras
        'subtitles.transcript_placement': 'static', // Posición estática
        'subtitles.transcript_maximum_length': 50, // Máximo 50 caracteres por línea
        'subtitles.transcript_color': '#e74c3c' // Color de resaltado
      };

      console.log('Creatomate modifications:', modifications);
      console.log(`[Subtitles] Final subtitles text: ${subtitlesText.substring(0, 200)}...`);

      return await this.createRender({
        templateId,
        modifications,
        webhookUrl,
        metadata: videoId, // Incluir videoId como metadata para identificación
        outputFormat: 'mp4', // Formato de salida específico
        frameRate: 30, // Frame rate para videos fluidos
        renderScale: 1.0, // Escala al 100%
      });
    } catch (error) {
      console.error('Error creating video from HeyGen:', error);
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
  private createSynchronizedSubtitles(script: string, videoDuration?: number): Array<{text: string, startTime: number, duration: number}> {
    // Dividir el script en oraciones
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
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
    // Dividir por comas, puntos y comas, y conectores
    const phrases = sentence.split(/[,;]|\s+(y|o|pero|sin embargo|además|también|por eso|por lo tanto|que|cuando|donde|como|porque|ya que|puesto que)\s+/i);
    
    // Filtrar frases vacías y limpiar
    const cleanedPhrases = phrases
      .map(phrase => phrase.trim())
      .filter(phrase => phrase.length > 0 && phrase.length < 80); // Reducido a 80 caracteres
    
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