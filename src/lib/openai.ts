import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Lee el archivo desde public/Prompts/[fileName].txt
export async function readPromptTemplate(fileName: string): Promise<string> {
  // Intentar diferentes rutas para compatibilidad con App Hosting
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'Prompts', `${fileName}.txt`),
    path.join(process.cwd(), 'public', 'prompts', `${fileName}.txt`),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'Prompts', `${fileName}.txt`),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'prompts', `${fileName}.txt`),
    path.join('/workspace', '.next', 'standalone', 'public', 'Prompts', `${fileName}.txt`),
    path.join('/workspace', '.next', 'standalone', 'public', 'prompts', `${fileName}.txt`),
  ];

  console.log('📄 Intentando leer prompt desde múltiples rutas para:', fileName);
  console.log('📄 Directorio actual:', process.cwd());

  for (const filePath of possiblePaths) {
    try {
      console.log('📄 Intentando ruta:', filePath);
      const text = await fs.readFile(filePath, 'utf8');
      if (!text.trim()) {
        console.warn('⚠️ Archivo encontrado pero vacío:', filePath);
        continue;
      }
      console.log('✅ Archivo leído exitosamente desde:', filePath);
      return text;
    } catch (error) {
      console.log('❌ No se pudo leer desde:', filePath);
      continue;
    }
  }

  // Si ninguna ruta funciona, lanzar error
  const errorMessage = `No se pudo encontrar el archivo de prompt: ${fileName}.txt. Rutas intentadas: ${possiblePaths.join(', ')}`;
  console.error('❌ Error al leer el prompt:', errorMessage);
  throw new Error(errorMessage);
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
