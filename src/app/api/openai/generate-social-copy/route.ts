import { NextResponse } from 'next/server';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    console.log('[generate-social-copy] INICIO');
    const { script } = await req.json();

    if (!script) {
      return new NextResponse('Script is required', { status: 400 });
    }

    // Generate Short Copy
    const shortCopyPromptTemplate = await readPromptTemplate('copy-corto');
    const shortCopyPrompt = replacePromptPlaceholders(shortCopyPromptTemplate, { script });
    
    const shortCopyResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: shortCopyPrompt }],
    });
    const shortCopy = shortCopyResponse.choices[0].message.content?.trim() || '';
    console.log('[generate-social-copy] Short copy OK');

    // Generate Long Copy
    const longCopyPromptTemplate = await readPromptTemplate('copy-largo');
    const longCopyPrompt = replacePromptPlaceholders(longCopyPromptTemplate, { script });

    const longCopyResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: longCopyPrompt }],
    });
    const longCopy = longCopyResponse.choices[0].message.content?.trim() || '';
    console.log('[generate-social-copy] Long copy OK');

    return NextResponse.json({ shortCopy, longCopy });
  } catch (error) {
    console.error('[generate-social-copy] ERROR:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 