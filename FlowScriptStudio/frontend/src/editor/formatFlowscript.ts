export function formatFlowScript(source: string): string {
  const lines = source.split(/\r?\n/);
  const formatted: string[] = [];
  let indent = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      formatted.push(line ? `${"    ".repeat(indent)}${line}` : "");
      continue;
    }

    const isElse = /^ELSE$/i.test(line);
    const isEnd = /^END$/i.test(line);

    if (isElse || isEnd) {
      indent = Math.max(0, indent - 1);
    }

    formatted.push(`${"    ".repeat(indent)}${line}`);

    if (/^WORKFLOW\b/i.test(line) || /^IF\b/i.test(line)) {
      indent++;
    }

    if (isElse) {
      indent++;
    }
  }

  return formatted.join("\n");
}
