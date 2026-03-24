// 곡 수별 과금 정책을 한 곳에 모아 UI/서버가 같은 값을 사용하게 한다.
export const SINGLE_TRACK_GENERATION_COST = 500;
export const DOUBLE_TRACK_GENERATION_COST = 700;

export function getMusicGenerationCost(trackCount: 1 | 2) {
  return trackCount === 2 ? DOUBLE_TRACK_GENERATION_COST : SINGLE_TRACK_GENERATION_COST;
}
