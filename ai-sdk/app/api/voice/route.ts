import { fal } from "@ai-sdk/fal";
import { generateSpeech, transcribe } from "ai";
import { askAgno } from "@/lib/agno";

// One turn of the spike: audio (or text) in -> Agno session -> text + speech out.
export async function POST(req: Request) {
  const form = await req.formData();
  const sessionId = String(form.get("sessionId") ?? "");
  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });

  const timings: Record<string, number> = {};
  const t = async <T>(name: string, run: () => Promise<T>) => {
    const start = Date.now();
    try {
      return await run();
    } finally {
      timings[name] = Date.now() - start;
    }
  };

  try {
    const audio = form.get("audio");
    const typed = String(form.get("text") ?? "").trim();
    let transcript = typed;
    if (audio instanceof File && audio.size > 0) {
      const result = await t("transcribe", async () =>
        transcribe({
          model: fal.transcription("whisper"),
          audio: new Uint8Array(await audio.arrayBuffer()),
        }),
      );
      transcript = result.text.trim();
    }
    if (!transcript) return Response.json({ error: "nothing to say" }, { status: 400 });

    const reply = await t("agno", () => askAgno(transcript, sessionId));
    const speech = await t("speech", () =>
      generateSpeech({ model: fal.speech("fal-ai/minimax/speech-02-turbo"), text: reply }),
    );

    return Response.json({
      transcript,
      reply,
      audioBase64: speech.audio.base64,
      mediaType: speech.audio.mediaType,
      timings,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "unexpected failure", timings },
      { status: 502 },
    );
  }
}
