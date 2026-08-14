import type { DisplayVariable, DuplicateInfo, GitStatus, JsonReport } from '../types.js';
import { isSensitiveClassification } from '../env/classifier.js';

export function toJsonReport(input: {
  file: string;
  variables: DisplayVariable[];
  git: GitStatus;
  duplicates: DuplicateInfo[];
}): JsonReport {
  return {
    file: input.file,
    variables: input.variables.map((variable) => {
      const entry: JsonReport['variables'][number] = {
        name: variable.name,
        classification: variable.classification,
        maskedValue: variable.maskedValue,
        empty: variable.empty,
        warnings: variable.warnings,
        occurrences: variable.occurrences,
      };
      if ('revealedValue' in variable && variable.classification !== 'private-key') {
        entry.revealedValue = variable.revealedValue;
      }
      return entry;
    }),
    security: {
      gitIgnored: input.git.ignored,
      gitTracked: input.git.tracked,
      sensitiveVariableCount: input.variables.filter(
        (variable) => isSensitiveClassification(variable.classification) && !variable.empty,
      ).length,
      privateKeyCount: input.variables.filter(
        (variable) => variable.classification === 'private-key',
      ).length,
    },
    duplicates: input.duplicates.map((item) => ({ name: item.name, count: item.count })),
  };
}

export function renderJson(report: JsonReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
