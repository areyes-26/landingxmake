import { NextResponse } from 'next/server';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { VideoData } from '@/types/video';

interface TitleResponse {
  title: string;
}

interface ApiError {
  error: string;
  status: number;
  details?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { originalTitle, topic, description, tone, videoId } = body;

    if (!originalTitle || !topic || !description || !tone || !videoId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Obtener el guion y el copy generados
    const completionRef = doc(db, 'completion_results_videos', videoId);
    const completionDoc = await getDoc(completionRef);
    
    let script = '';
    let socialCopy = '';
    
    if (completionDoc.exists()) {
      const completionData = completionDoc.data();
      script = completionData.script || '';
      // Obtener los copys sociales
      const socialCopies = completionData.socialContent?.socialCopies || [];
      socialCopy = socialCopies.map((copy: { content: string }) => copy.content).join('\n\n');
    }

    // Leer y procesar el template del prompt
    const promptTemplate = await readPromptTemplate('/Prompts/generate-title.txt');
    
    // Reemplazar placeholders con los datos del video
    const prompt = replacePromptPlaceholders(promptTemplate, {
      originalTitle,
      topic,
      description,
      tone,
      script: script || '',
      socialCopy: socialCopy || ''
    });

    console.log('Prompt preparado:', prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const title = completion.choices[0].message.content?.trim();

    if (!title) {
      throw new Error('No se pudo generar el título');
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error en generate-title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 