import { config } from "../config.js";
import { logger } from "../logger.js";
import type { SSEEvent } from "../types.js";

const OPENCODE_URL = config.opencodeServeUrl;

export type SSEEventHandler = (event: SSEEvent) => void;

export class SSESubscriber {
  private controller: AbortController | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, SSEEventHandler[]> = new Map();
  private running = false;

  on(eventType: string, handler: SSEEventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  off(eventType: string, handler: SSEEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }

  private emit(event: SSEEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (err) {
        logger.error({ err, event }, "Error in SSE handler");
      }
    }
    const allHandlers = this.handlers.get("*") || [];
    for (const handler of allHandlers) {
      try {
        handler(event);
      } catch (err) {
        logger.error({ err, event }, "Error in SSE wildcard handler");
      }
    }
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  private async connect(): Promise<void> {
    while (this.running) {
      try {
        this.controller = new AbortController();
        const response = await fetch(`${OPENCODE_URL}/event`, {
          signal: this.controller.signal,
          headers: { Accept: "text/event-stream" },
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        this.reconnectAttempts = 0;
        logger.info("SSE connected to OpenCode serve");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (this.running) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const event = this.parseSSELine(line);
            if (event) {
              this.emit(event);
            }
          }
        }
      } catch (err: unknown) {
        if (!this.running) break;

        const error = err as Error;
        if (error.name === "AbortError") break;

        logger.error({ err }, "SSE connection error");
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error("Max SSE reconnect attempts reached");
          break;
        }

        const delay =
          this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        logger.info({ delay, attempt: this.reconnectAttempts }, "SSE reconnecting");
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private parseSSELine(line: string): SSEEvent | null {
    if (!line.startsWith("data:")) return null;

    const data = line.slice(5).trim();
    if (!data) return null;

    try {
      const parsed = JSON.parse(data) as SSEEvent;
      return parsed;
    } catch {
      logger.warn({ line }, "Failed to parse SSE event");
      return null;
    }
  }
}

export const sseSubscriber = new SSESubscriber();
