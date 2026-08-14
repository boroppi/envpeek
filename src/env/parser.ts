import type { DuplicateInfo, ParseResult, RawAssignment } from '../types.js';

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseEnv(content: string, file: string): ParseResult {
  const logicalLines = splitLogicalLines(content);
  const assignments: RawAssignment[] = [];

  for (const entry of logicalLines) {
    if (entry.kind === 'invalid') {
      return { ok: false, file, line: entry.line };
    }
    if (entry.kind === 'assignment') {
      assignments.push({
        name: entry.name,
        rawValue: entry.value,
        line: entry.line,
      });
    }
  }

  return {
    ok: true,
    file,
    assignments,
    duplicates: collectDuplicates(assignments),
  };
}

type LogicalLine =
  | { kind: 'skip' }
  | { kind: 'invalid'; line: number }
  | { kind: 'assignment'; line: number; name: string; value: string };

function splitLogicalLines(content: string): LogicalLine[] {
  const rawLines = content.split(/\r?\n/);
  const result: LogicalLine[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const startLine = i + 1;
    const line = rawLines[i] ?? '';
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      result.push({ kind: 'skip' });
      i += 1;
      continue;
    }

    const assignment = matchAssignmentStart(line);
    if (!assignment) {
      result.push({ kind: 'invalid', line: startLine });
      return result;
    }

    if (assignment.quote === '"') {
      const consumed = consumeDoubleQuoted(rawLines, i, assignment.valueStart);
      if (!consumed) {
        result.push({ kind: 'invalid', line: startLine });
        return result;
      }
      result.push({
        kind: 'assignment',
        line: startLine,
        name: assignment.name,
        value: consumed.value,
      });
      i = consumed.nextIndex;
      continue;
    }

    if (assignment.quote === "'") {
      const consumed = consumeSingleQuoted(rawLines, i, assignment.valueStart);
      if (!consumed) {
        result.push({ kind: 'invalid', line: startLine });
        return result;
      }
      result.push({
        kind: 'assignment',
        line: startLine,
        name: assignment.name,
        value: consumed.value,
      });
      i = consumed.nextIndex;
      continue;
    }

    result.push({
      kind: 'assignment',
      line: startLine,
      name: assignment.name,
      value: parseUnquoted(assignment.rest),
    });
    i += 1;
  }

  return result;
}

function matchAssignmentStart(line: string): {
  name: string;
  quote: '"' | "'" | null;
  valueStart: number;
  rest: string;
} | null {
  let body = line;
  const exportMatch = /^(?:export)\s+/.exec(body);
  if (exportMatch) {
    body = body.slice(exportMatch[0].length);
  } else {
    body = body.replace(/^\s+/, '');
  }

  const eq = body.indexOf('=');
  if (eq <= 0) {
    return null;
  }

  const name = body.slice(0, eq).trimEnd();
  if (!NAME_RE.test(name)) {
    return null;
  }

  const afterEq = body.slice(eq + 1);
  const trimmedStart = afterEq.replace(/^[ \t]*/, '');
  const first = trimmedStart[0];
  const prefixLen = line.length - afterEq.length + (afterEq.length - trimmedStart.length);

  if (first === '"' || first === "'") {
    return {
      name,
      quote: first,
      valueStart: prefixLen + 1,
      rest: trimmedStart,
    };
  }

  return {
    name,
    quote: null,
    valueStart: prefixLen,
    rest: trimmedStart,
  };
}

function consumeDoubleQuoted(
  lines: string[],
  startIndex: number,
  valueStart: number,
): { value: string; nextIndex: number } | null {
  let assembled = '';
  let escaping = false;

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const from = i === startIndex ? valueStart : 0;
    for (let j = from; j < line.length; j += 1) {
      const ch = line[j] ?? '';
      if (escaping) {
        assembled += unescapeDouble(ch);
        escaping = false;
        continue;
      }
      if (ch === '\\') {
        escaping = true;
        continue;
      }
      if (ch === '"') {
        return { value: assembled, nextIndex: i + 1 };
      }
      assembled += ch;
    }
    if (escaping) {
      escaping = false;
    }
    assembled += '\n';
  }

  return null;
}

function unescapeDouble(ch: string): string {
  switch (ch) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    case 'r':
      return '\r';
    case '"':
    case "'":
    case '\\':
      return ch;
    default:
      return ch;
  }
}

function consumeSingleQuoted(
  lines: string[],
  startIndex: number,
  valueStart: number,
): { value: string; nextIndex: number } | null {
  let assembled = '';

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const from = i === startIndex ? valueStart : 0;
    for (let j = from; j < line.length; j += 1) {
      const ch = line[j] ?? '';
      if (ch === '\\' && line[j + 1] === "'") {
        assembled += "'";
        j += 1;
        continue;
      }
      if (ch === "'") {
        return { value: assembled, nextIndex: i + 1 };
      }
      assembled += ch;
    }
    assembled += '\n';
  }

  return null;
}

function parseUnquoted(rest: string): string {
  const comment = rest.indexOf(' #');
  const withoutComment = comment === -1 ? rest : rest.slice(0, comment);
  return withoutComment.replace(/[ \t]+$/, '');
}

function collectDuplicates(assignments: RawAssignment[]): DuplicateInfo[] {
  const map = new Map<string, number[]>();
  for (const assignment of assignments) {
    const lines = map.get(assignment.name) ?? [];
    lines.push(assignment.line);
    map.set(assignment.name, lines);
  }

  const duplicates: DuplicateInfo[] = [];
  for (const [name, lines] of map) {
    if (lines.length > 1) {
      duplicates.push({ name, lines, count: lines.length });
    }
  }
  return duplicates;
}
