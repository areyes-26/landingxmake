import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function readPromptTemplate(path: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fullUrl = new URL(path, baseUrl).toString();
    console.log('Intentando leer prompt desde:', fullUrl);
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to read prompt template: ${response.statusText}`);
    }
    return response.text();
  } catch (error) {
    console.error('Error reading prompt template:', error);
    throw error;
  }
}

export function replacePromptPlaceholders(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(`{{${key}}}`, value);
  }
  return result;
} 