import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getCreatomateClient } from '@/lib/creatomate';
import { Timestamp } from 'firebase-admin/firestore';
import { getTemplateByPlan, PlanType } from '@/lib/creatomate/templates/getTemplateByPlan';
import { personalizeTemplate } from '@/lib/creatomate/templates/personalizeTemplate';
import { CreatomateAPI } from '@/lib/creatomate';
import { proTemplate, proTemplateV2 } from '@/lib/creatomate/templates/proTemplate';
import { basicTemplate } from '@/lib/creatomate/templates/basicTemplate';
import { freeTemplate } from '@/lib/creatomate/templates/freeTemplate';

// Template default del Studio de Creatomate (hardcodeado)
const DEFAULT_TEMPLATE_ID = '273cdd5f-f40a-4c72-9a08-55245e49bfbc';

export async function POST(req: Request) {
  let videoId: string | undefined;
  
  try {
    const body = await req.json();
    videoId = body.videoId;
    console.log(`[Creatomate][generate-video] POST body:`, body);

    if (!videoId) {
      console.warn(`[Creatomate][generate-video] videoId faltante en el body`);
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Obtener el video de Firestore
    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();
    console.log(`[Creatomate][generate-video] Buscando videoId: ${videoId}`);

    if (!videoDoc.exists) {
      console.warn(`[Creatomate][generate-video] Video no encontrado: ${videoId}`);
      return NextResponse.json(
        { error: 'Video no encontrado' },
        { status: 404 }
      );
    }

    const videoData = videoDoc.data();
    
    if (!videoData) {
      console.warn(`[Creatomate][generate-video] Datos del video no encontrados para: ${videoId}`);
      return NextResponse.json(
        { error: 'Datos del video no encontrados' },
        { status: 404 }
      );
    }
    
    // Verificar que el video de HeyGen esté completado
    if (!videoData.heygenResults?.videoUrl || videoData.heygenResults?.status !== 'completed') {
      console.error(`[Creatomate][generate-video] El video de HeyGen no está listo para editar. videoId: ${videoId}, heygenResults:`, videoData.heygenResults);
      return NextResponse.json(
        { error: 'El video de HeyGen no está listo para editar' },
        { status: 400 }
      );
    }

    // Obtener el script
    const completionRef = db.collection('completion_results_videos').doc(videoId);
    const completionDoc = await completionRef.get();
    const completionData = completionDoc.exists ? completionDoc.data() : {};
    const script = completionData?.script || '';
    console.log(`[Creatomate][generate-video] Script para videoId ${videoId}:`, script ? script.substring(0, 100) : '[VACÍO]');

    if (!script) {
      console.error(`[Creatomate][generate-video] Script no encontrado para videoId: ${videoId}`);
      return NextResponse.json(
        { error: 'No se encontró el script del video' },
        { status: 400 }
      );
    }

    // Obtener el plan del usuario (por ahora desde videoData, si no, setear 'free' por defecto)
    const plan: PlanType = videoData.plan || 'free';
    console.log(`[Creatomate][generate-video] Plan del usuario para videoId ${videoId}:`, plan);

    // Obtener el template seleccionado por el usuario
    const selectedTemplate = videoData.selectedTemplate;
    console.log(`[Creatomate][generate-video] Template seleccionado para videoId ${videoId}:`, selectedTemplate);

    // Subtítulos: si existen en Firestore, usarlos; si no, generarlos
    let subtitles = completionData?.subtitles || [];
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      const api = new CreatomateAPI();
      const videoDuration = videoData.heygenResults?.duration ? parseFloat(videoData.heygenResults.duration) : undefined;
      const generated = api.createSynchronizedSubtitles(script, videoDuration);
      // Mapear a formato {text, start, end} y filtrar subtítulos vacíos
      subtitles = generated
        .filter((s: any) => s.text && s.text.trim().length > 0)
        .map((s: any) => ({ text: s.text.trim(), start: s.startTime, end: s.startTime + s.duration }));
      console.log(`[Creatomate][generate-video] Subtítulos generados dinámicamente para videoId ${videoId}:`, subtitles.slice(0, 3));
    } else {
      // Si ya existen, asegurarse de que tengan el formato correcto y filtrar vacíos
      subtitles = subtitles
        .filter((s: any) => s.text && s.text.trim().length > 0)
        .map((s: any) => ({ 
          text: s.text.trim(), 
          start: s.start ?? s.startTime ?? 0, 
          end: s.end ?? (s.startTime !== undefined && s.duration !== undefined ? s.startTime + s.duration : 0) 
        }));
    }

    // Verificar que tengamos subtítulos válidos
    if (subtitles.length === 0) {
      console.warn(`[Creatomate][generate-video] No se generaron subtítulos válidos para videoId ${videoId}, usando script como fallback`);
      // Usar el script completo como fallback
      subtitles = [{ text: script.substring(0, 200), start: 0, end: 10 }];
    }

    const creatomate = getCreatomateClient();
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/creatomate/webhook`;

    let result;

    // Verificar si hay un template específico seleccionado por el usuario
    if (selectedTemplate && selectedTemplate !== 'main-template') {
      // Usar el template seleccionado por el usuario
      console.log(`[Creatomate][generate-video] Usando template seleccionado por usuario: ${selectedTemplate}`);
      
      // Buscar el template en las definiciones
      const templates = [proTemplate, proTemplateV2, basicTemplate, freeTemplate];
      const userTemplate = templates.find(t => 'templateId' in t && t.templateId === selectedTemplate);
      
      if (userTemplate && 'templateId' in userTemplate && userTemplate.templateId) {
        // Usar template de Creatomate con modificaciones
        const modifications = {
          "background.source": videoData?.heygenResults?.videoUrl || '',
          "avatar-video.source": videoData?.heygenResults?.videoUrl || '',
          "branding-logo.source": videoData?.logoUrl || '',
          "subtitles-container.background_color": videoData?.accentColor || '#e74c3c',
          "subtitles-container.transcript_color": videoData?.accentColor || '#e74c3c',
          "subtitles-container.transcript_source": "avatar-video",
          "subtitles-container.transcript_effect": "fade",
          "subtitles-container.transcript_maximum_length": 12,
          "subtitles-container.fill_color": "#ffffff",
          "subtitles-container.stroke_color": "#000000",
          "subtitles-container.stroke_width": "0.5 vmin"
        };
        
        console.log(`[Creatomate][generate-video] Llamando a creatomate.createRender con templateId: ${userTemplate.templateId}`);
        result = await creatomate.createRender({
          templateId: userTemplate.templateId,
          modifications,
          webhookUrl,
          metadata: videoId,
          outputFormat: 'mp4',
        });
        console.log(`[Creatomate][generate-video] createRender con templateId completado exitosamente`);
      } else {
        console.warn(`[Creatomate][generate-video] Template no encontrado: ${selectedTemplate}, usando template por defecto`);
        // Fallback al template por defecto
        await useDefaultTemplate();
      }
    } else {
      // Usar template personalizado por defecto según el plan
      console.log(`[Creatomate][generate-video] Usando template personalizada para plan ${plan}`);
      await useDefaultTemplate();
    }
    
    async function useDefaultTemplate() {
    // Armar el objeto videoData para los placeholders
    const personalizedVideoData = {
      avatarUrl: videoData?.heygenResults?.videoUrl || '',
      backgroundUrl: videoData?.backgroundUrl || '',
      logoUrl: videoData?.logoUrl || '',
      accentColor: videoData?.accentColor || '#e74c3c',
      subtitles,
    };

    // Seleccionar y personalizar la plantilla
    const baseTemplate = getTemplateByPlan(plan);
    const personalizedTemplate = personalizeTemplate(baseTemplate, personalizedVideoData);
    console.log(`[Creatomate][generate-video] Plantilla personalizada para videoId ${videoId}:`, personalizedTemplate);

    // Enviar la plantilla personalizada como 'source' a Creatomate
    console.log(`[Creatomate][generate-video] Llamando a creatomate.createRender con source personalizado`);
    result = await creatomate.createRender({
      webhookUrl,
      metadata: videoId,
      outputFormat: 'mp4',
      source: personalizedTemplate,
    });
    console.log(`[Creatomate][generate-video] createRender con source completado exitosamente`);
    }

    if (!result) {
      throw new Error('No se recibió respuesta de Creatomate');
    }
    
    console.log(`[Creatomate][generate-video] Respuesta de Creatomate:`, result);

    // Actualizar el estado en Firestore
    const updateData = {
      status: 'editing',
      creatomateResults: {
        status: 'rendering',
        renderId: result.id,
        generatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    };

    console.log(`[Creatomate][generate-video] Actualizando Firestore para videoId ${videoId} con:`, updateData);

    await videoRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Video enviado a Creatomate para edición',
      creatomateRenderId: result.id,
    });
  } catch (error) {
    console.error(`[Creatomate][generate-video] Error${videoId ? ` en videoId ${videoId}` : ''}:`, error);
    console.error(`[Creatomate][generate-video] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    
    // Determinar si es un error temporal de Creatomate
    const isCreatomateError = error instanceof Error && (
      error.message.includes('502') || 
      error.message.includes('503') || 
      error.message.includes('504') ||
      error.message.includes('Bad Gateway')
    );
    
    const statusCode = isCreatomateError ? 503 : 500;
    const errorMessage = isCreatomateError 
      ? 'Creatomate está temporalmente no disponible. Inténtalo de nuevo en unos minutos.'
      : 'Error al enviar el video a Creatomate';
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
        retryable: isCreatomateError,
      },
      { status: statusCode }
    );
  }
} 