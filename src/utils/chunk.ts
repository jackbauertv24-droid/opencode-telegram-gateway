const MAX_CHUNK_SIZE = 4000;

export function chunkMessage(
  text: string,
  maxSize: number = MAX_CHUNK_SIZE
): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining);
      break;
    }

    let splitPoint = findSplitPoint(remaining, maxSize);

    if (splitPoint === -1) {
      splitPoint = maxSize;
    }

    chunks.push(remaining.slice(0, splitPoint).trim());
    remaining = remaining.slice(splitPoint).trim();
  }

  return chunks.map((chunk, i, arr) => {
    if (arr.length > 1) {
      return `[${i + 1}/${arr.length}]\n\n${chunk}`;
    }
    return chunk;
  });
}

function findSplitPoint(text: string, maxSize: number): number {
  const searchStart = Math.max(0, maxSize - 500);

  const codeBlockEnd = text.lastIndexOf("```", maxSize);
  if (codeBlockEnd > searchStart && codeBlockEnd < maxSize) {
    const codeBlockStart = text.lastIndexOf("```", codeBlockEnd - 1);
    if (codeBlockStart > searchStart) {
      return codeBlockEnd + 3;
    }
  }

  const paragraphBreak = text.lastIndexOf("\n\n", maxSize);
  if (paragraphBreak > searchStart) {
    return paragraphBreak + 2;
  }

  const lineBreak = text.lastIndexOf("\n", maxSize);
  if (lineBreak > searchStart) {
    return lineBreak + 1;
  }

  const sentenceEnd = findLastSentenceEnd(text, maxSize);
  if (sentenceEnd > searchStart) {
    return sentenceEnd + 1;
  }

  const spaceBreak = text.lastIndexOf(" ", maxSize);
  if (spaceBreak > searchStart) {
    return spaceBreak + 1;
  }

  return -1;
}

function findLastSentenceEnd(text: string, maxSize: number): number {
  const sentenceEnders = [".", "!", "?", "。", "！", "？"];
  let lastEnd = -1;

  for (const ender of sentenceEnders) {
    const idx = text.lastIndexOf(ender, maxSize);
    if (idx > lastEnd) {
      lastEnd = idx;
    }
  }

  return lastEnd;
}

export function truncateWithIndicator(
  text: string,
  maxSize: number
): string {
  if (text.length <= maxSize) {
    return text;
  }
  return text.slice(0, maxSize - 3) + "...";
}
