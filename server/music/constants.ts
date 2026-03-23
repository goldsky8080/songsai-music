export const SINGLE_TRACK_GENERATION_COST = 500;
export const DOUBLE_TRACK_GENERATION_COST = 700;

export function getMusicGenerationCost(trackCount: 1 | 2) {
  return trackCount === 2 ? DOUBLE_TRACK_GENERATION_COST : SINGLE_TRACK_GENERATION_COST;
}
