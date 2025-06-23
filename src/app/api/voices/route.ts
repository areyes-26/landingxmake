import { NextResponse } from 'next/server';
import { getVoices } from '@/lib/heygen';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userPlan = searchParams.get('plan') || 'free';
    
    console.log('Fetching voices from HeyGen...');
    console.log('User plan:', userPlan);
    
    const voices = await getVoices();
    console.log('Total voices received:', voices.length);
    
    // Filter voices based on user plan
    const filteredVoices = filterVoicesByPlan(voices, userPlan);
    console.log('Filtered voices for plan', userPlan + ':', filteredVoices.length);
    
    return NextResponse.json({ 
      data: filteredVoices,
      totalVoices: voices.length,
      filteredCount: filteredVoices.length,
      userPlan: userPlan
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}

function filterVoicesByPlan(voices: any[], userPlan: string): any[] {
  const planLimits = {
    free: 20,
    premium: 100,
    pro: Infinity // All voices
  };
  
  const limit = planLimits[userPlan as keyof typeof planLimits] || planLimits.free;
  
  if (limit === Infinity) {
    return voices; // Return all voices for pro plan
  }
  
  // For free and premium plans, prioritize high-quality voices
  // Sort voices by quality indicators
  const sortedVoices = [...voices].sort((a, b) => {
    // Priority 1: Professional voices (containing "Professional" in name)
    const aIsProfessional = a.name.toLowerCase().includes('professional');
    const bIsProfessional = b.name.toLowerCase().includes('professional');
    if (aIsProfessional && !bIsProfessional) return -1;
    if (!aIsProfessional && bIsProfessional) return 1;
    
    // Priority 2: Lifelike voices (containing "Lifelike" in name)
    const aIsLifelike = a.name.toLowerCase().includes('lifelike');
    const bIsLifelike = b.name.toLowerCase().includes('lifelike');
    if (aIsLifelike && !bIsLifelike) return -1;
    if (!aIsLifelike && bIsLifelike) return 1;
    
    // Priority 3: English voices first (for better global accessibility)
    const aIsEnglish = a.language.toLowerCase() === 'english';
    const bIsEnglish = b.language.toLowerCase() === 'english';
    if (aIsEnglish && !bIsEnglish) return -1;
    if (!aIsEnglish && bIsEnglish) return 1;
    
    // Priority 4: Voices with preview URLs
    const aHasPreview = !!a.preview_url;
    const bHasPreview = !!b.preview_url;
    if (aHasPreview && !bHasPreview) return -1;
    if (!aHasPreview && bHasPreview) return 1;
    
    // Priority 5: Alphabetical by name
    return a.name.localeCompare(b.name);
  });
  
  // Return the top voices based on the plan limit
  return sortedVoices.slice(0, limit);
} 