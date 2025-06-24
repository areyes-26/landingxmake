// src/lib/creditPricing.ts
// Centralized credit pricing logic for the application

export const CREDIT_COSTS = {
  baseVideo: 1,
  durations: {
    '30s': 0,
    '1min': 1,
    '1.5min': 3
  },
  extras: {
    withAvatar: 0, // Avatars are included in base cost
    withVoice: 0,  // Voices are included in base cost
    withCTA: 0     // Call to action is included in base cost
  }
} as const;

export type DurationKey = keyof typeof CREDIT_COSTS.durations;
export type ExtraKey = keyof typeof CREDIT_COSTS.extras;

export interface VideoOptions {
  duration: string;
  avatarId?: string;
  voiceId?: string;
  callToAction?: string;
  specificCallToAction?: string;
}

/**
 * Calculate the total credit cost for a video based on duration and extras
 * @param options Video options including duration and extras
 * @returns Total credit cost
 */
export function calculateCreditCost(options: VideoOptions): number {
  const { duration, avatarId, voiceId, callToAction } = options;
  
  // Normalize duration format
  let videoDuration = duration;
  if (videoDuration === '60s') videoDuration = '1min';
  if (videoDuration === '90s') videoDuration = '1.5min';
  
  // Calculate duration cost
  const durationCost = CREDIT_COSTS.durations[videoDuration as DurationKey] || 0;
  
  // Calculate extras cost
  const extrasCost = 
    (avatarId ? CREDIT_COSTS.extras.withAvatar : 0) +
    (voiceId ? CREDIT_COSTS.extras.withVoice : 0) +
    (callToAction ? CREDIT_COSTS.extras.withCTA : 0);
  
  return CREDIT_COSTS.baseVideo + durationCost + extrasCost;
}

/**
 * Check if a user can afford a specific video configuration
 * @param userCredits Current user credits
 * @param options Video options
 * @returns Boolean indicating if user can afford the video
 */
export function canAffordVideo(userCredits: number, options: VideoOptions): boolean {
  const cost = calculateCreditCost(options);
  return userCredits >= cost;
}

/**
 * Get the cost breakdown for a video
 * @param options Video options
 * @returns Detailed cost breakdown
 */
export function getCostBreakdown(options: VideoOptions) {
  const { duration, avatarId, voiceId, callToAction } = options;
  
  let videoDuration = duration;
  if (videoDuration === '60s') videoDuration = '1min';
  if (videoDuration === '90s') videoDuration = '1.5min';
  
  const durationCost = CREDIT_COSTS.durations[videoDuration as DurationKey] || 0;
  const avatarCost = avatarId ? CREDIT_COSTS.extras.withAvatar : 0;
  const voiceCost = voiceId ? CREDIT_COSTS.extras.withVoice : 0;
  const ctaCost = callToAction ? CREDIT_COSTS.extras.withCTA : 0;
  
  return {
    baseVideo: CREDIT_COSTS.baseVideo,
    duration: {
      cost: durationCost,
      label: `${duration} duration`
    },
    extras: {
      avatar: { cost: avatarCost, label: 'Avatar' },
      voice: { cost: voiceCost, label: 'Voice' },
      cta: { cost: ctaCost, label: 'Call to Action' }
    },
    total: CREDIT_COSTS.baseVideo + durationCost + avatarCost + voiceCost + ctaCost
  };
}

/**
 * Get available durations that a user can afford
 * @param userCredits Current user credits
 * @returns Array of affordable durations
 */
export function getAffordableDurations(userCredits: number): string[] {
  const availableDurations: string[] = [];
  
  Object.entries(CREDIT_COSTS.durations).forEach(([duration, cost]) => {
    const totalCost = CREDIT_COSTS.baseVideo + cost;
    if (userCredits >= totalCost) {
      availableDurations.push(duration);
    }
  });
  
  return availableDurations;
}

/**
 * Get the minimum credits required for any video
 * @returns Minimum credits needed
 */
export function getMinimumCreditsRequired(): number {
  const minDurationCost = Math.min(...Object.values(CREDIT_COSTS.durations));
  return CREDIT_COSTS.baseVideo + minDurationCost;
} 