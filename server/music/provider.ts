import { env } from "@/lib/env";
import type { CreateMusicInput, ProviderMusicResult } from "./types";

/**
 * 음악 생성 공급자 인터페이스.
 *
 * 현재 프로젝트는 mock 공급자와 실제 SONGS API 공급자를 모두 지원한다.
 * API 라우터와 서비스 계층은 이 인터페이스에만 의존하므로
 * 향후 다른 공급자를 붙이더라도 변경 범위를 최소화할 수 있다.
 */
export interface MusicProvider {
  createMusic(input: CreateMusicInput): Promise<ProviderMusicResult>;
  getMusicStatus(taskId: string): Promise<ProviderMusicResult>;
  cancelMusic(taskId: string): Promise<void>;
}

const SONGS_MODEL_V5 = "chirp-crow";
const SONGS_MODEL_V45_PLUS = "chirp-bluejay";

function resolveModelVersion(modelVersion?: "v4_5_plus" | "v5") {
  return modelVersion === "v4_5_plus" ? SONGS_MODEL_V45_PLUS : SONGS_MODEL_V5;
}

function inferVocalGender(stylePrompt: string): "f" | "m" | undefined {
  if (/(여성|여자|female|woman|girl)/i.test(stylePrompt)) {
    return "f";
  }

  if (/(남성|남자|male|man|boy)/i.test(stylePrompt)) {
    return "m";
  }

  return undefined;
}

function buildStyleTags(stylePrompt: string, vocalGender?: "f" | "m"): string {
  if (vocalGender === "f" && !/female vocal|female singer/i.test(stylePrompt)) {
    return `${stylePrompt}, female vocal, female singer`;
  }

  if (vocalGender === "m" && !/male vocal|male singer/i.test(stylePrompt)) {
    return `${stylePrompt}, male vocal, male singer`;
  }

  return stylePrompt;
}

class MockMusicProvider implements MusicProvider {
  async createMusic(input: CreateMusicInput): Promise<ProviderMusicResult> {
    const taskId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    void input;

    return {
      providerTaskId: taskId,
      status: "processing",
    };
  }

  async getMusicStatus(taskId: string): Promise<ProviderMusicResult> {
    const createdAtToken = Number(taskId.split("-")[1] ?? Date.now());
    const elapsedMs = Date.now() - createdAtToken;

    if (elapsedMs > 4000) {
      return {
        providerTaskId: taskId,
        status: "completed",
      };
    }

    return {
      providerTaskId: taskId,
      status: "processing",
    };
  }

  async cancelMusic(_: string): Promise<void> {}
}

export class SongsProvider implements MusicProvider {
  private buildHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (env.SONGS_COOKIE) {
      headers.Cookie = env.SONGS_COOKIE;
    }

    return headers;
  }

  async createMusic(input: CreateMusicInput): Promise<ProviderMusicResult> {
    if (!env.SONGS_API_BASE_URL) {
      throw new Error("SONGS API provider is not configured.");
    }

    const vocalGender =
      input.vocalGender === "female"
        ? "f"
        : input.vocalGender === "male"
          ? "m"
          : inferVocalGender(input.stylePrompt);
    const tags = buildStyleTags(input.stylePrompt, vocalGender);
    const songsModel = resolveModelVersion(input.modelVersion);
    const isAutoLyrics = input.lyricMode !== "manual";
    const autoLyricsPrompt = input.stylePrompt.trim()
      ? `${input.lyrics.trim()}\n스타일은 ${tags} 느낌으로 만들어줘.`
      : input.lyrics;

    const endpoint = `${env.SONGS_API_BASE_URL}/api/custom_generate`;

    const payload = isAutoLyrics
      ? {
          title: input.title,
          prompt: "",
          gpt_description_prompt: autoLyricsPrompt,
          tags,
          negative_tags: "",
          generation_type: "TEXT",
          make_instrumental: false,
          wait_audio: false,
          mv: songsModel,
          metadata: {
            create_mode: "custom",
            is_custom: true,
            mv: songsModel,
            vocal_gender: vocalGender,
            web_client_pathname: "/create",
          },
        }
      : {
          title: input.title,
          prompt: input.lyrics,
          tags,
          model: songsModel,
          negative_tags: "",
          generation_type: "TEXT",
          make_instrumental: false,
          wait_audio: false,
          metadata: {
            create_mode: "custom",
            is_custom: true,
            mv: songsModel,
            vocal_gender: vocalGender,
          },
        };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SONGS API music creation request failed. ${errorText}`);
    }

    const responseJson = (await response.json()) as
      | Array<{
          id?: string;
          status?: string;
          audio_url?: string;
        }>
      | {
          clips?: Array<{
            id?: string;
            status?: string;
            audio_url?: string;
          }>;
        };

    const data = Array.isArray(responseJson) ? responseJson : responseJson.clips ?? [];

    if (!Array.isArray(data) || data.length === 0 || !data[0]?.id) {
      throw new Error("SONGS API provider did not return track ids.");
    }

    return {
      providerTaskId: data
        .map((item) => item.id)
        .filter(Boolean)
        .join(","),
      status: "queued",
      mp3Url: data[0]?.audio_url,
      tracks: data
        .filter((item): item is { id: string; status?: string; audio_url?: string } => Boolean(item.id))
        .map((item) => ({
          providerTaskId: item.id,
          status:
            item.status?.toLowerCase() === "error" || item.status?.toLowerCase() === "failed"
              ? "failed"
              : item.status?.toLowerCase() === "complete" || item.status?.toLowerCase() === "completed"
                ? "completed"
                : item.status?.toLowerCase() === "processing"
                  ? "processing"
                  : "queued",
          mp3Url: item.audio_url,
        })),
    };
  }

  async getMusicStatus(taskId: string): Promise<ProviderMusicResult> {
    if (!env.SONGS_API_BASE_URL) {
      throw new Error("SONGS API provider is not configured.");
    }

    const response = await fetch(`${env.SONGS_API_BASE_URL}/api/get?ids=${encodeURIComponent(taskId)}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SONGS API status lookup failed. ${errorText}`);
    }

    const data = (await response.json()) as Array<{
      id?: string;
      status?: string;
      audio_url?: string;
      error_message?: string;
    }>;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("SONGS API provider returned no track status.");
    }

    const normalized = data.map((item) => item.status?.toLowerCase() ?? "queued");
    const hasFailure = normalized.some((status) => status === "failed" || status === "error");
    const isCompleted = normalized.every(
      (status) => status === "streaming" || status === "complete" || status === "completed",
    );
    const isProcessing = normalized.some(
      (status) => status === "submitted" || status === "queued" || status === "pending" || status === "processing",
    );

    return {
      providerTaskId: taskId,
      status: hasFailure ? "failed" : isCompleted ? "completed" : isProcessing ? "processing" : "queued",
      mp3Url: data[0]?.audio_url,
      errorMessage: data.find((item) => item.error_message)?.error_message,
    };
  }

  async cancelMusic(taskId: string): Promise<void> {
    void taskId;
    throw new Error("SONGS API cancellation is not supported by the configured wrapper.");
  }
}

export function getMusicProvider(): MusicProvider {
  if (env.MUSIC_PROVIDER_MODE === "songs") {
    return new SongsProvider();
  }

  return new MockMusicProvider();
}
