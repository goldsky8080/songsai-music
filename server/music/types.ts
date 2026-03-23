export type CreateMusicInput = {
  title: string;
  lyrics: string;
  stylePrompt: string;
  lyricMode?: "manual" | "auto";
  vocalGender?: "auto" | "female" | "male";
  trackCount?: 1 | 2;
  modelVersion?: "v4_5_plus" | "v5";
  userId: string;
};

export type ProviderMusicResult = {
  providerTaskId: string;
  status: "queued" | "processing" | "completed" | "failed";
  mp3Url?: string;
  errorMessage?: string;
  tracks?: Array<{
    providerTaskId: string;
    status: "queued" | "processing" | "completed" | "failed";
    mp3Url?: string;
  }>;
};

export type MusicStatusSnapshot = {
  id: string;
  providerTaskId: string | null;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: Date;
};
