// Notable — parse an Anthropic-style SSE stream into text deltas.

import type { StreamChunk } from "./types";

/**
 * Reads an SSE Response body and yields a StreamChunk per `content_block_delta`,
 * followed by a final `done` chunk.
 */
export async function* parseStream(response: Response): AsyncGenerator<StreamChunk> {
  const body = response.body;
  if (!body) {
    yield { delta: "", done: true };
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line; keep the trailing partial event.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const delta = extractDelta(event);
      if (delta !== null) {
        yield { delta, done: false };
      }
    }
  }

  yield { delta: "", done: true };
}

function extractDelta(event: string): string | null {
  const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
  if (!dataLine) return null;

  const payload = dataLine.slice("data:".length).trim();
  if (!payload || payload === "[DONE]") return null;

  try {
    const parsed = JSON.parse(payload) as {
      type?: string;
      delta?: { text?: string };
    };
    if (parsed.type === "content_block_delta" && parsed.delta?.text) {
      return parsed.delta.text;
    }
    return null;
  } catch {
    return null;
  }
}

/** Convenience: drain a stream into a single string. */
export async function collectStream(response: Response): Promise<string> {
  let out = "";
  for await (const chunk of parseStream(response)) {
    out += chunk.delta;
  }
  return out;
}
