/**
 * Google Cloud Text-to-Speech Service
 * Provides native Cantonese (yue-HK) TTS support with Neural2 voices
 */

// Google Cloud TTS REST API endpoint
const TTS_API_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Available Cantonese voices (yue-HK)
export const CANTONESE_VOICES = {
  STANDARD_A: 'yue-HK-Standard-A', // Female
  STANDARD_B: 'yue-HK-Standard-B', // Male
  STANDARD_C: 'yue-HK-Standard-C', // Female
  STANDARD_D: 'yue-HK-Standard-D', // Male
} as const;

export type CantoneseVoice = typeof CANTONESE_VOICES[keyof typeof CANTONESE_VOICES];

interface TTSRequest {
  input: {
    text: string;
  };
  voice: {
    languageCode: string;
    name: string;
  };
  audioConfig: {
    audioEncoding: 'LINEAR16' | 'MP3' | 'OGG_OPUS';
    sampleRateHertz?: number;
    speakingRate?: number;
    pitch?: number;
  };
}

interface TTSResponse {
  audioContent: string; // Base64 encoded audio
}

/**
 * Generate speech audio from text using Google Cloud TTS
 * Returns Base64 encoded PCM audio data (LINEAR16, 24kHz, mono)
 *
 * @param text - Text to convert to speech (Cantonese)
 * @param voice - Voice to use (defaults to Standard-A female voice)
 * @param speakingRate - Speaking rate (0.25 to 4.0, default 0.95 for clarity)
 * @returns Base64 encoded PCM audio data
 */
export async function generateCantoneseSpeech(
  text: string,
  voice: CantoneseVoice = CANTONESE_VOICES.STANDARD_A,
  speakingRate: number = 0.95
): Promise<string | undefined> {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_TTS_API_KEY;

  if (!apiKey) {
    console.error('Missing VITE_GOOGLE_CLOUD_TTS_API_KEY environment variable');
    return undefined;
  }

  const requestBody: TTSRequest = {
    input: {
      text: text,
    },
    voice: {
      languageCode: 'yue-HK', // Cantonese (Hong Kong)
      name: voice,
    },
    audioConfig: {
      audioEncoding: 'LINEAR16', // PCM format compatible with current AudioNarration
      sampleRateHertz: 24000,   // Match current Gemini TTS sample rate
      speakingRate: speakingRate,
      pitch: 0, // Default pitch
    },
  };

  try {
    const response = await fetch(`${TTS_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Cloud TTS API error:', response.status, errorData);
      throw new Error(`TTS API error: ${response.status}`);
    }

    const data: TTSResponse = await response.json();
    return data.audioContent;
  } catch (error) {
    console.error('Google Cloud TTS Generation Error:', error);
    return undefined;
  }
}

/**
 * Check if Google Cloud TTS service is available
 */
export function isGoogleCloudTTSAvailable(): boolean {
  return !!import.meta.env.VITE_GOOGLE_CLOUD_TTS_API_KEY;
}

/**
 * Get list of available Cantonese voices
 */
export function getAvailableCantoneseVoices(): { name: CantoneseVoice; description: string }[] {
  return [
    { name: CANTONESE_VOICES.STANDARD_A, description: '女聲 A (Female A)' },
    { name: CANTONESE_VOICES.STANDARD_B, description: '男聲 B (Male B)' },
    { name: CANTONESE_VOICES.STANDARD_C, description: '女聲 C (Female C)' },
    { name: CANTONESE_VOICES.STANDARD_D, description: '男聲 D (Male D)' },
  ];
}
