import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function readPromptTemplate(path: string): Promise<string> {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    if (!baseUrl) {
      throw new Error('BASE_URL environment variable is not set');
    }

    const fullUrl = new URL(path, baseUrl).toString();
    console.log('Intentando leer prompt desde:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to read prompt template: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error('Prompt template is empty');
    }

    return text;
  } catch (error) {
    console.error('Error reading prompt template:', error);
    throw new Error(`Failed to read prompt template: ${error instanceof Error ? error.message : String(error)}`);
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
        console.warn(`Missing value for placeholder: ${key}`);
        continue;
      }
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  } catch (error) {
    console.error('Error replacing prompt placeholders:', error);
    throw new Error(`Failed to replace prompt placeholders: ${error instanceof Error ? error.message : String(error)}`);
  }
} 