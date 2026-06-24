// Notable — thin wrapper around the Anthropic Messages API.

import type { AIMessage, CompletionRequest } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface AIClientOptions {
  apiKey: string;
  model?: string;
}

export class AIClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(opts: AIClientOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? DEFAULT_MODEL;
  }

  /** Non-streaming completion. Returns the concatenated text content. */
  async complete(messages: AIMessage[]): Promise<string> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.toWire(this.buildRequest(messages, false))),
    });
    if (!res.ok) {
      throw new Error(`AI request failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { content: Array<{ text: string }> };
    return json.content.map((c) => c.text).join("");
  }

  /** Streaming completion. Returns the raw SSE Response for `streaming.ts` to parse. */
  async stream(messages: AIMessage[]): Promise<Response> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.toWire(this.buildRequest(messages, true))),
    });
    if (!res.ok) {
      throw new Error(`AI stream failed: ${res.status} ${res.statusText}`);
    }
    return res;
  }

  private buildRequest(messages: AIMessage[], stream: boolean): CompletionRequest {
    return { model: this.model, messages, maxTokens: 1024, stream };
  }

  private toWire(req: CompletionRequest) {
    return {
      model: req.model,
      max_tokens: req.maxTokens,
      stream: req.stream ?? false,
      messages: req.messages,
    };
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
    };
  }
}
