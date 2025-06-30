export const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
export const HEYGEN_API_URL = 'https://api.heygen.com/v2';

export interface HeyGenVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  preview_url?: string;
}

export async function getVoices(): Promise<HeyGenVoice[]> {
  console.log('API Key present:', !!HEYGEN_API_KEY);
  
  if (!HEYGEN_API_KEY) {
    throw new Error('HeyGen API key is not configured');
  }

  const response = await fetch(`${HEYGEN_API_URL}/voices`, {
    headers: {
      'x-api-key': HEYGEN_API_KEY,
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch voices from HeyGen API:', await response.text());
    throw new Error(`Failed to fetch voices from HeyGen API: ${response.statusText}`);
  }

  const jsonResponse = await response.json();
  // The API documentation shows the list under a 'data' object.
  const allApiVoices = jsonResponse.data.voices as any[];

  if (!allApiVoices) {
    console.error("No 'voices' array found in HeyGen API response:", jsonResponse);
    return [];
  }

  const filteredAndMappedVoices: HeyGenVoice[] = allApiVoices
    .filter(voice => voice.preview_audio && typeof voice.preview_audio === 'string' && voice.preview_audio.includes('resource.heygen.ai'))
    .map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      language: voice.language,
      gender: voice.gender,
      preview_url: voice.preview_audio,
    }));
  
  return filteredAndMappedVoices;
}

interface HeyGenConfig {
  apiKey: string;
  baseUrl: string;
}

interface CreateAvatarFromTextParams {
  prompt: string;
  gender: 'male' | 'female';
  style: 'realistic' | 'cartoon';
  ethnicity?: 'White' | 'Black' | 'Asian American' | 'East Asian' | 'South East Asian' | 'South Asian' | 'Middle Eastern' | 'Pacific' | 'Hispanic' | 'Unspecified';
}

interface CreateAvatarFromImageParams {
  image: File;
}

interface AvatarGenerationResponse {
  error: null | string;
  data: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    msg: string | null;
    image_url_list: string[] | null;
    image_key_list: string[] | null;
  };
}

interface UploadAssetResponse {
  data: {
    image_key: string;
  };
}

interface CreateAvatarGroupResponse {
  data: {
    avatar_group_id: string;
  };
}

interface TrainAvatarGroupResponse {
  data: {
    train_id: string;
  };
}

interface GenerateLookResponse {
  data: {
    look_id: string;
  };
}

interface AvatarResponse {
  avatarUrl: string;
  status: string;
  generationId: string;
  totalWaitTime: number;
  allUrls: string[];
}

interface CreateAvatarFromImagesParams {
  images: File[];
}

interface GenerateVideoParams {
  script: string;
  videoTitle: string;
  voiceId: string;
  avatarId: string;
  lookId?: string;
  tone: string;
  duration: string;
  orientation?: 'vertical' | 'horizontal';
  resolution?: 'hd' | 'fullhd';
  dimension?: { width: number; height: number };
}

interface GenerateVideoResponse {
  taskId: string;
  status: string;
}

interface HeyGenVideoResponse {
  error: null | string;
  data: {
    video_id: string;
  };
}

interface VideoStatusResponse {
  status: string;
  videoUrl?: string;
  error?: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  duration?: string;
  captionUrl?: string;
}

export class HeyGenAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.HEYGEN_API_KEY || '';
    this.baseUrl = 'https://api.heygen.com';
    
    if (!this.apiKey) {
      throw new Error('HEYGEN_API_KEY is not defined');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('Making request to:', url);
    
    const headers = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    console.log('Request headers:', headers);
    console.log('Request options:', { ...options, headers });

    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HeyGen API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response;
  }

  private async checkGenerationStatus(generationId: string): Promise<AvatarGenerationResponse['data']> {
    console.log('Checking generation status for ID:', generationId);
    const response = await this.request(`/v2/photo_avatar/generation/${generationId}`);
    const json = await response.json();
  
    if (json.error) {
      throw new Error(`Error checking generation status: ${json.error}`);
    }
  
    return json.data;
  }

  /**
   * Sube una imagen como binario puro al endpoint correcto de HeyGen y retorna su image_key
   */
  private async uploadAsset(file: File): Promise<string> {
    console.log('Uploading asset...');
    const url = 'https://upload.heygen.com/v1/asset';

    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': file.type, // 'image/jpeg' o 'image/png'
        'name': file.name,         // Header requerido por la API
      },
      body: arrayBuffer,
    });

    const responseText = await response.text();
    console.log('Upload response:', responseText);

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    const json = JSON.parse(responseText);
    return json.data.image_key;
  }

  /**
   * Crea un grupo de avatar con un image_key y un nombre
   */
  private async createAvatarGroup(imageKey: string, name: string): Promise<string> {
    console.log('Creating avatar group...');
    const response = await this.request('/v2/photo_avatar/avatar_group/create', {
      method: 'POST',
      body: JSON.stringify({
        name, // Campo requerido por la API
        image_key: imageKey,
      }),
    });
  
    const json = await response.json();
    console.log('Create avatar group response:', json);
  
    if (json.error) {
      throw new Error(`HeyGen API error (createAvatarGroup): ${json.error}`);
    }
  
    return json.data.avatar_group_id;
  }
  

  private async trainAvatarGroup(avatarGroupId: string): Promise<string> {
    console.log('Training avatar group...');
    const response = await this.request('/v2/photo_avatar/train', {
      method: 'POST',
      body: JSON.stringify({
        avatar_group_id: avatarGroupId,
      }),
    });
  
    const json = await response.json();
    console.log('Train response:', json);
  
    if (json.error) {
      throw new Error(`HeyGen API error (trainAvatarGroup): ${json.error}`);
    }
  
    return json.data.train_id;
  }

  private async checkTrainingStatus(trainId: string): Promise<AvatarGenerationResponse> {
    console.log('Checking training status...');
    const response = await this.request(`/v2/photo_avatar/train/status?train_id=${trainId}`, {
      method: 'GET',
    });
  
    const json = await response.json();
    console.log('Training status response:', json);
  
    if (json.error) {
      throw new Error(`HeyGen API error (checkTrainingStatus): ${json.error}`);
    }
  
    return json;
  }
  

  private async generateLook(avatarGroupId: string, style: string): Promise<string> {
    console.log('Generating look...');
    const response = await this.request('/v2/photo_avatar/look/generate', {
      method: 'POST',
      body: JSON.stringify({
        avatar_group_id: avatarGroupId,
        style: style === 'realistic' ? 'Realistic' : 'Cartoon',
      }),
    });
  
    const json = await response.json();
    console.log('Generate look response:', json);
  
    if (json.error) {
      throw new Error(`HeyGen API error (generateLook): ${json.error}`);
    }
  
    return json.data.look_id;
  }
  

  private async checkLookStatus(lookId: string): Promise<AvatarGenerationResponse> {
    console.log('Checking look status...');
    const response = await this.request(`/v2/photo_avatar/look/status?look_id=${lookId}`, {
      method: 'GET',
    });
  
    const json = await response.json();
    console.log('Look status response:', json);
  
    if (json.error) {
      throw new Error(`HeyGen API error (checkLookStatus): ${json.error}`);
    }
  
    return json;
  }
  

  async createAvatarFromText(params: CreateAvatarFromTextParams) {
    console.log('Creating avatar from text with params:', params);
    
    try {
      const response = await this.request('/v2/photo_avatar/photo/generate', {
        method: 'POST',
        body: JSON.stringify({
          name: `Avatar-${Date.now()}`,
          age: "Young Adult",
          gender: params.gender === 'male' ? "Man" : "Woman",
          ethnicity: params.ethnicity || "Unspecified",
          orientation: "horizontal",
          pose: "half_body",
          style: params.style === 'realistic' ? "Realistic" : "Cartoon",
          appearance: params.prompt,
        }),
      });
  
      const json = await response.json();
      console.log('Initial generation response:', json);
  
      if (json.error) {
        throw new Error(`Error generating avatar: ${json.error}`);
      }
  
      if (!json.data?.generation_id) {
        throw new Error('No generation ID in response');
      }
  
      let statusResponse = await this.checkGenerationStatus(json.data.generation_id);
      let attempts = 0;
      const maxAttempts = 30;
      let waitTime = 2000;
      const maxWaitTime = 5000;
  
      while (statusResponse.status === 'in_progress' && attempts < maxAttempts) {
        console.log(`Attempt ${attempts + 1}/${maxAttempts}: Waiting... Status: ${statusResponse.status}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        waitTime = Math.min(waitTime + 1000, maxWaitTime);
        statusResponse = await this.checkGenerationStatus(json.data.generation_id);
        attempts++;
      }
  
      if (statusResponse.status === 'in_progress') {
        throw new Error('La generación del avatar está tomando más tiempo de lo esperado.');
      }
  
      if (statusResponse.status === 'failed') {
        throw new Error(`La generación del avatar falló: ${statusResponse.msg || 'Error desconocido'}`);
      }
  
      if (statusResponse.status !== 'success') {
        throw new Error(`Estado inesperado: ${statusResponse.status}`);
      }
  
      if (!statusResponse.image_url_list || statusResponse.image_url_list.length === 0) {
        throw new Error('No se recibieron URLs de avatar');
      }
  
      const totalWaitTime = attempts * waitTime;
  
      return {
        avatarUrl: statusResponse.image_url_list[0],
        status: statusResponse.status,
        generationId: json.data.generation_id,
        waitTime: totalWaitTime,
        allUrls: statusResponse.image_url_list,
        imageKeys: statusResponse.image_key_list,
      };
    } catch (error) {
      console.error('Error creating avatar from text:', error);
      throw error;
    }
  }
  

  async createAvatarFromImage(params: CreateAvatarFromImageParams): Promise<AvatarResponse> {
    console.log('Creating avatar from image with params:', params);
    
    try {
      // Paso 1: Subir la imagen
      const imageKey = await this.uploadAsset(params.image);
      console.log('Image uploaded with key:', imageKey);

      // Paso 2: Crear grupo de avatar con nombre generado
      const groupName = `Avatar-${Date.now()}`;
      const avatarGroupId = await this.createAvatarGroup(imageKey, groupName);
      console.log('Avatar group created with ID:', avatarGroupId);

      // Paso 3: Entrenar el grupo
      const trainId = await this.trainAvatarGroup(avatarGroupId);
      console.log('Training started with ID:', trainId);

      // Paso 4: Esperar a que termine el entrenamiento
      let trainingStatus = await this.checkTrainingStatus(trainId);
      let attempts = 0;
      const maxAttempts = 30;
      let waitTime = 2000; // 2 segundos inicial

      while (trainingStatus.data.status === 'in_progress' && attempts < maxAttempts) {
        console.log(`Training attempt ${attempts + 1}: Status = ${trainingStatus.data.status}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        trainingStatus = await this.checkTrainingStatus(trainId);
        attempts++;
        waitTime = Math.min(waitTime + 1000, 5000); // Incrementar hasta máximo 5 segundos
      }

      if (trainingStatus.data.status === 'failed') {
        throw new Error('El entrenamiento del avatar falló');
      }

      if (trainingStatus.data.status !== 'success') {
        throw new Error('El entrenamiento del avatar tomó demasiado tiempo');
      }

      // Paso 5: Generar el look
      const lookId = await this.generateLook(avatarGroupId, 'realistic');
      console.log('Look generation started with ID:', lookId);

      // Paso 6: Esperar a que termine la generación del look
      let lookStatus = await this.checkLookStatus(lookId);
      attempts = 0;
      waitTime = 2000;

      while (lookStatus.data.status === 'in_progress' && attempts < maxAttempts) {
        console.log(`Look generation attempt ${attempts + 1}: Status = ${lookStatus.data.status}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        lookStatus = await this.checkLookStatus(lookId);
        attempts++;
        waitTime = Math.min(waitTime + 1000, 5000);
      }

      if (lookStatus.data.status === 'failed') {
        throw new Error('La generación del look falló');
      }

      if (lookStatus.data.status !== 'success') {
        throw new Error('La generación del look tomó demasiado tiempo');
      }

      if (!lookStatus.data.image_url_list || lookStatus.data.image_url_list.length === 0) {
        throw new Error('No se generaron imágenes');
      }

      return {
        avatarUrl: lookStatus.data.image_url_list[0],
        status: 'success',
        generationId: lookId,
        totalWaitTime: attempts * waitTime,
        allUrls: lookStatus.data.image_url_list,
      };
    } catch (error) {
      console.error('Error creating avatar from image:', error);
      throw error;
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remover el prefijo "data:image/jpeg;base64," del string base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Error converting file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Sube múltiples imágenes y retorna sus image_keys
   */
  private async uploadAssets(files: File[]): Promise<string[]> {
    const imageKeys: string[] = [];
    for (const file of files) {
      const key = await this.uploadAsset(file);
      imageKeys.push(key);
    }
    return imageKeys;
  }

  /**
   * Agrega looks (imágenes) a un grupo de avatar existente, enviando un name único para el look
   * Retorna la lista de photo_avatar generados
   */
  private async addLooksToAvatarGroup(imageKeys: string[], groupId: string, name?: string): Promise<any[]> {
    if (imageKeys.length === 0) return [];
  
    const lookName = name || `Look-${Date.now()}`;
    const response = await this.request('/v2/photo_avatar/avatar_group/add', {
      method: 'POST',
      body: JSON.stringify({
        image_keys: imageKeys,
        group_id: groupId,
        name: lookName,
      }),
    });
  
    const json = await response.json();
    console.log('Add looks to group response:', json);
  
    if (json.error) {
      throw new Error(`HeyGen API error (addLooksToAvatarGroup): ${json.error}`);
    }
  
    return json.data?.photo_avatar_list || [];
  }
  

  /**
   * Flujo completo para crear y entrenar un grupo de avatar con múltiples imágenes
   * 1. Sube todas las imágenes
   * 2. Crea el grupo con la primera imagen y nombre generado
   * 3. Agrega el resto de imágenes al grupo
   * 4. Entrena el grupo
   * 5. Espera a que termine el entrenamiento
   * 6. Genera un look y espera a que termine
   */
  async createAvatarFromImages(params: CreateAvatarFromImagesParams): Promise<AvatarResponse & { groupId: string, groupName: string, looks: any[] }> {
    if (!params.images || params.images.length === 0) {
      throw new Error('Debes subir al menos una imagen');
    }
    // 1. Sube todas las imágenes y obtiene sus image_keys
    const imageKeys = await this.uploadAssets(params.images);
    console.log('Todos los image_keys:', imageKeys);

    // 2. Crea el grupo con la primera imagen y nombre generado
    const groupName = `Avatar-${Date.now()}`;
    const avatarGroupId = await this.createAvatarGroup(imageKeys[0], groupName);
    console.log('Avatar group creado con ID:', avatarGroupId);

    // 3. Agrega el resto de imágenes al grupo (si hay más de una)
    let looks: any[] = [];
    if (imageKeys.length > 1) {
      looks = await this.addLooksToAvatarGroup(imageKeys.slice(1), avatarGroupId, groupName + '-extra');
      console.log('Looks adicionales agregados al grupo:', looks);
    }

    // 4. Entrena el grupo
    const trainId = await this.trainAvatarGroup(avatarGroupId);
    console.log('Entrenamiento iniciado con ID:', trainId);

    // 5. Espera a que termine el entrenamiento
    let trainingStatus = await this.checkTrainingStatus(trainId);
    let attempts = 0;
    const maxAttempts = 30;
    let waitTime = 2000;
    while (trainingStatus.data.status === 'in_progress' && attempts < maxAttempts) {
      console.log(`Training attempt ${attempts + 1}: Status = ${trainingStatus.data.status}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      trainingStatus = await this.checkTrainingStatus(trainId);
      attempts++;
      waitTime = Math.min(waitTime + 1000, 5000);
    }
    if (trainingStatus.data.status === 'failed') {
      throw new Error('El entrenamiento del avatar falló');
    }
    if (trainingStatus.data.status !== 'success') {
      throw new Error('El entrenamiento del avatar tomó demasiado tiempo');
    }

    // 6. Genera el look
    const lookId = await this.generateLook(avatarGroupId, 'realistic');
    console.log('Generación de look iniciada con ID:', lookId);

    // 7. Espera a que termine la generación del look
    let lookStatus = await this.checkLookStatus(lookId);
    attempts = 0;
    waitTime = 2000;
    while (lookStatus.data.status === 'in_progress' && attempts < maxAttempts) {
      console.log(`Look generation attempt ${attempts + 1}: Status = ${lookStatus.data.status}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      lookStatus = await this.checkLookStatus(lookId);
      attempts++;
      waitTime = Math.min(waitTime + 1000, 5000);
    }
    if (lookStatus.data.status === 'failed') {
      throw new Error('La generación del look falló');
    }
    if (lookStatus.data.status !== 'success') {
      throw new Error('La generación del look tomó demasiado tiempo');
    }
    if (!lookStatus.data.image_url_list || lookStatus.data.image_url_list.length === 0) {
      throw new Error('No se generaron imágenes');
    }
    const avatarResult = {
      avatarUrl: lookStatus.data.image_url_list[0],
      status: 'success',
      generationId: lookId,
      totalWaitTime: attempts * waitTime,
      allUrls: lookStatus.data.image_url_list,
    };
    return {
      ...avatarResult,
      groupId: avatarGroupId,
      groupName,
      looks,
    };
  }

  async generateVideo(params: GenerateVideoParams): Promise<GenerateVideoResponse> {
    try {
      console.log('Generating video with params:', params);
      // Determinar dimension
      let dimension = params.dimension || { width: 720, height: 1280 };
      
      // Detectar si es un talking photo o avatar normal
      // Los talking photos tienen IDs que son hashes hexadecimales de 32 caracteres
      const isTalkingPhoto = /^[a-f0-9]{32}$/.test(params.avatarId);
      
      // Preparar el objeto character según el tipo
      const character: any = {};
      
      if (isTalkingPhoto) {
        // Para talking photos
        character.type = "talking_photo";
        character.talking_photo_id = params.avatarId;
      } else {
        // Para avatares normales
        character.type = "avatar";
        character.avatar_id = params.avatarId;
        character.avatar_style = "normal";
        
        // Agregar look_id si está presente (solo para avatares normales)
        if (params.lookId) {
          character.look_id = params.lookId;
        }
      }
      
      console.log('Character configuration:', character);
      
      const response = await this.request('/v2/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          video_inputs: [
            {
              character,
              voice: {
                type: "text",
                input_text: params.script,
                voice_id: params.voiceId,
                speed: 1.0
              }
            }
          ],
          dimension
        })
      });

      const data = await response.json() as HeyGenVideoResponse;
      console.log('Video generation response:', data);

      if (data.error) {
        throw new Error(`HeyGen API error: ${data.error}`);
      }

      if (!data.data?.video_id) {
        throw new Error('No video_id received from HeyGen');
      }

      return {
        taskId: data.data.video_id,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error in generateVideo:', error);
      throw error;
    }
  }

  async checkVideoStatus(videoId: string): Promise<VideoStatusResponse> {
    try {
      console.log('Checking video status for:', videoId);
      const response = await this.request(`/v1/video_status.get?video_id=${videoId}`, {
        method: 'GET'
      });

      const data = await response.json();
      console.log('Video status response:', data);

      if (!data || !data.data) {
        throw new Error('Invalid response format from HeyGen API');
      }

      return {
        status: data.data.status || 'unknown',
        videoUrl: data.data.video_url,
        error: data.data.error,
        thumbnailUrl: data.data.thumbnail_url,
        gifUrl: data.data.gif_url,
        duration: data.data.duration,
        captionUrl: data.data.caption_url
      };
    } catch (error) {
      console.error('Error checking video status:', error);
      throw error;
    }
  }
}

let heygenClient: HeyGenAPI | null = null;

export function getHeyGenClient(): HeyGenAPI {
  if (!heygenClient) {
    console.log('Initializing HeyGen client');
    
    heygenClient = new HeyGenAPI();
  }

  return heygenClient;
} 
import fs from 'fs';
import path from 'path';

/**
 * Lee un archivo de plantilla de prompt desde la carpeta public/prompts
 * @param name - Nombre del archivo sin extensión (ej. "generate-title")
 */
export function readPromptTemplate(name: string): string {
  const filePath = path.join(process.cwd(), 'public', 'prompts', `${name}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt template not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Reemplaza los valores {{key}} dentro del prompt por los valores del objeto `replacements`
 */
export function replacePromptPlaceholders(template: string, replacements: Record<string, string | undefined>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    return replacements[key.trim()] || '';
  });
}
