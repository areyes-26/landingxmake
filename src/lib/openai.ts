import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Lee el archivo desde public/prompts/[fileName].txt
export async function readPromptTemplate(fileName: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'prompts', `${fileName}.txt`);
  console.log('📄 Leyendo prompt desde:', filePath);
  console.log('📄 Directorio actual:', process.cwd());
  console.log('📄 Ruta completa:', filePath);

  try {
    const text = await fs.readFile(filePath, 'utf8');
    if (!text.trim()) {
      throw new Error('Prompt template is empty');
    }
    return text;
  } catch (error) {
    console.error('❌ Error al leer el prompt:', error);
    console.error('❌ Detalles del error:', {
      code: error instanceof Error ? (error as NodeJS.ErrnoException).code : 'unknown',
      message: error instanceof Error ? error.message : String(error),
      path: filePath
    });
    throw new Error(
      `Failed to read prompt template: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function replacePromptPlaceholders(
  template: string,
  replacements: Record<string, string>
): string {
  try {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      if (value === undefined || value === null) {
        console.warn(`⚠️ Missing value for placeholder: ${key}`);
        continue;
      }
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  } catch (error) {
    console.error('❌ Error replacing prompt placeholders:', error);
    throw new Error(
      `Failed to replace prompt placeholders: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
