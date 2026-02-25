export interface GenerateTtsParams {
  text: string;
  voiceId?: string;
}

export async function generateTts(params: GenerateTtsParams) {
  const isSandbox = process.env.SANDBOX_MODE === "true";
  const voiceId =
    params.voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  if (isSandbox) {
    console.log("[SANDBOX] TTS would be generated:", params);
    return {
      audioUrl: null,
      voiceId,
      status: "SIMULATED" as const,
    };
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
      },
      body: JSON.stringify({
        text: params.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs error: ${response.statusText}`);
  }

  // In production, you'd upload this to a storage service
  // For MVP, we return the response info
  return {
    audioUrl: null, // would be uploaded URL
    voiceId,
    status: "GENERATED" as const,
  };
}
