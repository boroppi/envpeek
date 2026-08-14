import type { Classification, ClassifyResult } from '../types.js';
import {
  detectCustom,
  detectName,
  detectValue,
  isPublicPrefix,
  isSuspiciousPublicName,
} from './detector.js';
import { maskValue } from './masker.js';
import type { DuplicateInfo, RawAssignment, SafeVariable } from '../types.js';

export function classify(
  name: string,
  rawValue: string,
  customPatterns: readonly string[] = [],
): ClassifyResult {
  const empty = rawValue.trim() === '';
  const warnings: string[] = [];

  const valueKind = detectValue(rawValue);
  if (valueKind === 'private-key') {
    return { classification: 'private-key', warnings, empty };
  }

  if (detectCustom(name, customPatterns)) {
    return { classification: 'secret', warnings, empty };
  }

  if (isPublicPrefix(name)) {
    if (isSuspiciousPublicName(name)) {
      warnings.push(`${name} appears to contain a credential.`);
    }
    return { classification: 'public', warnings, empty };
  }

  const fromName = detectName(name);
  if (fromName) {
    return { classification: fromName, warnings, empty };
  }

  if (valueKind === 'token') {
    return { classification: 'token', warnings, empty };
  }

  return { classification: 'unknown', warnings, empty };
}

export function toSafeVariables(
  assignments: RawAssignment[],
  _duplicates: DuplicateInfo[],
  customPatterns: readonly string[] = [],
): SafeVariable[] {
  const occurrenceByName = new Map<string, number>();
  for (const assignment of assignments) {
    occurrenceByName.set(assignment.name, (occurrenceByName.get(assignment.name) ?? 0) + 1);
  }

  const lastIndex = new Map<string, number>();
  assignments.forEach((assignment, index) => {
    lastIndex.set(assignment.name, index);
  });

  const result: SafeVariable[] = [];
  assignments.forEach((assignment, index) => {
    if (lastIndex.get(assignment.name) !== index) {
      return;
    }
    const classified = classify(assignment.name, assignment.rawValue, customPatterns);
    const suspiciousPublic =
      classified.classification === 'public' && isSuspiciousPublicName(assignment.name);
    result.push({
      name: assignment.name,
      classification: classified.classification,
      maskedValue: maskValue(
        assignment.rawValue,
        classified.classification,
        classified.empty,
        suspiciousPublic,
      ),
      empty: classified.empty,
      occurrences: occurrenceByName.get(assignment.name) ?? 1,
      warnings: classified.warnings,
    });
  });

  return result;
}

export function isSensitiveClassification(classification: Classification): boolean {
  return classification !== 'public' && classification !== 'unknown';
}
