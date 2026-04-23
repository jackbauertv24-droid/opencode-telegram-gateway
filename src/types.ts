export interface ApprovedUser {
  telegram_id: string;
  display_name: string | null;
  auto_approve: number;
  created_at: string;
}

export interface UserSession {
  id: string;
  telegram_id: string;
  opencode_session_id: string;
  is_active: number;
  title: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface PendingPermission {
  id: string;
  telegram_id: string;
  opencode_session_id: string;
  opencode_permission_id: string;
  action_type: string;
  action_detail: string | null;
  telegram_message_id: number | null;
  status: "pending" | "approved" | "denied" | "expired";
  created_at: string;
}

export interface MessageCache {
  id: string;
  telegram_id: string;
  opencode_session_id: string;
  full_content: string;
  chunks_count: number;
  created_at: string;
}

export interface OpenCodeSession {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  summary?: string;
  share?: string;
  title: string;
  version: number;
  time: {
    created: string;
    updated: string;
    compacting?: string;
  };
  revert?: unknown;
}

export interface OpenCodeMessage {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  time: { created: string; completed?: string };
  summary?: string;
  model?: { providerID: string; modelID: string };
  agent?: string;
  error?: string;
  parentID?: string;
  modelID?: string;
  providerID?: string;
  mode?: string;
  path?: { cwd: string; root: string };
  cost?: number;
  tokens?: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
  finish?: string;
}

export interface OpenCodePart {
  id: string;
  sessionID: string;
  messageID: string;
  type: string;
  text?: string;
  time?: { start: number; end: number };
}

export interface OpenCodePermission {
  id: string;
  type: string;
  pattern?: string;
  sessionID: string;
  messageID?: string;
  callID?: string;
  title: string;
  metadata?: Record<string, unknown>;
  time: { created: string };
}

export interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

export interface SendMessageRequest {
  messageID?: string;
  model?: { providerID: string; modelID: string };
  agent?: string;
  noReply?: boolean;
  system?: string;
  tools?: Record<string, boolean>;
  parts: Array<
    | { type: "text"; text: string }
    | { type: "file"; mime: string; url: string; filename: string }
    | { type: "agent"; name: string }
    | { type: "subtask"; prompt: string; description: string; agent: string }
  >;
}
