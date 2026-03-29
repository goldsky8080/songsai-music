// API 라우트가 provider 계층으로 넘기는 표준 입력 구조.
export type CreateMusicInput = {
  title: string;
  lyrics: string;
  stylePrompt: string;
  lyricMode?: "manual" | "auto" | "ai_lyrics";
  isMr?: boolean;
  vocalGender?: "auto" | "female" | "male";
  trackCount?: 1;
  modelVersion?: "v4_5_plus" | "v5" | "v5_5";
  userId: string;
};

// provider 구현이 공통으로 반환해야 하는 표준 결과 구조.
export type ProviderMusicResult = {
  providerTaskId: string;
  status: "queued" | "processing" | "completed" | "failed";
  mp3Url?: string;
  videoUrl?: string;
  imageUrl?: string;
  imageLargeUrl?: string;
  generatedLyrics?: string;
  providerPrompt?: string;
  providerDescriptionPrompt?: string;
  errorMessage?: string;
  tracks?: Array<{
    providerTaskId: string;
    status: "queued" | "processing" | "completed" | "failed";
    mp3Url?: string;
    videoUrl?: string;
    imageUrl?: string;
    imageLargeUrl?: string;
    generatedLyrics?: string;
    providerPrompt?: string;
    providerDescriptionPrompt?: string;
  }>;
};

export type ProviderAlignedLyricWord = {
  word: string;
  start_s: number;
  end_s: number;
};

// 향후 워커/배치 처리로 확장할 때 재사용 가능한 최소 상태 스냅샷 타입.
export type MusicStatusSnapshot = {
  id: string;
  providerTaskId: string | null;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: Date;
};
