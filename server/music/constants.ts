// 곡 수별 과금 정책을 한 곳에 모아 UI/서버가 같은 값을 사용하게 한다.
export const SINGLE_TRACK_GENERATION_COST = 500;
export const ADDITIONAL_TRACK_UNLOCK_COST = 200;
export const VIDEO_RENDER_COST = 100;
export const BONUS_TRACK_UNLOCK_WINDOW_DAYS = 7;
export const DOWNLOAD_DELAY_MS = 5 * 60 * 1000;

export function getMusicGenerationCost(_: 1 | 2 = 1) {
  return SINGLE_TRACK_GENERATION_COST;
}
