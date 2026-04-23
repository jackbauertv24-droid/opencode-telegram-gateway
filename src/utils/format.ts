export function escapeMarkdown(text: string): string {
  const specialChars = /[_*[\]()~`>#+\-=|{}.!\\]/g;
  return text.replace(specialChars, "\\$&");
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatCodeBlock(code: string, language = ""): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function formatBold(text: string): string {
  return `*${text}*`;
}

export function formatItalic(text: string): string {
  return `_${text}_`;
}

export function formatCode(text: string): string {
  return `\`${text}\``;
}

export function formatLink(text: string, url: string): string {
  return `[${text}](${url})`;
}

export function cleanTextForTelegram(text: string): string {
  let cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  const maxLen = 4000;
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen - 20) + "\n\n... (truncated)";
  }

  return cleaned;
}
