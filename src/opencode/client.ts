import { config } from "../config.js";
import { logger } from "../logger.js";
import type {
  OpenCodeSession,
  OpenCodeMessage,
  OpenCodePermission,
  SendMessageRequest,
} from "../types.js";

const OPENCODE_URL = config.opencodeServeUrl;

async function opencodeFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${OPENCODE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenCode API error: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCODE_URL}/global/health`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listSessions(): Promise<OpenCodeSession[]> {
  return opencodeFetch<OpenCodeSession[]>("/session");
}

export async function createSession(title?: string): Promise<OpenCodeSession> {
  const body: { title?: string } = {};
  if (title) body.title = title;
  return opencodeFetch<OpenCodeSession>("/session", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getSession(sessionId: string): Promise<OpenCodeSession> {
  return opencodeFetch<OpenCodeSession>(`/session/${sessionId}`);
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  await opencodeFetch<boolean>(`/session/${sessionId}`, { method: "DELETE" });
  return true;
}

export async function abortSession(sessionId: string): Promise<boolean> {
  await opencodeFetch<boolean>(`/session/${sessionId}/abort`, {
    method: "POST",
  });
  return true;
}

export async function listMessages(
  sessionId: string,
  limit?: number
): Promise<Array<{ info: OpenCodeMessage; parts: unknown[] }>> {
  const params = limit ? `?limit=${limit}` : "";
  return opencodeFetch<Array<{ info: OpenCodeMessage; parts: unknown[] }>>(
    `/session/${sessionId}/message${params}`
  );
}

export async function sendMessage(
  sessionId: string,
  request: SendMessageRequest
): Promise<{ info: OpenCodeMessage; parts: unknown[] }> {
  return opencodeFetch<{ info: OpenCodeMessage; parts: unknown[] }>(
    `/session/${sessionId}/message`,
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );
}

export async function sendSimpleMessage(
  sessionId: string,
  text: string
): Promise<{ info: OpenCodeMessage; parts: unknown[] }> {
  return sendMessage(sessionId, {
    parts: [{ type: "text", text }],
  });
}

export async function sendAsyncMessage(
  sessionId: string,
  text: string,
  model?: { providerId: string; modelId: string }
): Promise<void> {
  const url = `${OPENCODE_URL}/session/${sessionId}/prompt_async`;
  const body: Record<string, unknown> = { parts: [{ type: "text", text }] };
  
  if (model) {
    body.model = { providerID: model.providerId, modelID: model.modelId };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenCode API error: ${response.status} ${text}`);
  }
}

export interface AvailableModel {
  providerId: string;
  modelId: string;
  name: string;
}

interface ProviderResponse {
  all: Array<{
    id: string;
    models: Record<string, { name?: string; id?: string }>;
  }>;
  connected: string[];
}

export async function getAvailableModels(): Promise<AvailableModel[]> {
  const data = await opencodeFetch<ProviderResponse>("/provider");
  const models: AvailableModel[] = [];
  const connectedSet = new Set(data.connected || []);
  
  for (const provider of data.all || []) {
    if (!connectedSet.has(provider.id)) continue;
    
    for (const [modelId, model] of Object.entries(provider.models || {})) {
      models.push({
        providerId: provider.id,
        modelId,
        name: model.name || model.id || modelId,
      });
    }
  }
  
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPermission(
  sessionId: string
): Promise<OpenCodePermission | undefined> {
  const permissions = await opencodeFetch<OpenCodePermission[]>(
    `/permission?sessionID=${sessionId}`
  );
  return permissions[0];
}

export async function replyPermission(
  sessionId: string,
  permissionId: string,
  response: "once" | "always" | "reject"
): Promise<boolean> {
  await opencodeFetch<boolean>(
    `/session/${sessionId}/permissions/${permissionId}`,
    {
      method: "POST",
      body: JSON.stringify({ response }),
    }
  );
  return true;
}

export async function compactSession(sessionId: string): Promise<boolean> {
  await opencodeFetch<boolean>(`/session/${sessionId}/summarize`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return true;
}
