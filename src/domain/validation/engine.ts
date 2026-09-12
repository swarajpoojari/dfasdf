import { VALIDATION_RULES } from './rules';
import type { ValidationContext, ValidationReport, ValidationRule } from './types';

/**
 * Runs every check and returns both the tick-list the user sees and the
 * findings behind it.
 *
 * A poster with any `error` finding cannot be exported. This is deliberate: an
 * association poster that goes out on WhatsApp with a missing logo or a clipped
 * name cannot be recalled.
 */
export function validatePoster(
  context: ValidationContext,
  rules: readonly ValidationRule[] = VALIDATION_RULES,
): ValidationReport {
  const findings = rules.flatMap((rule) => rule.run(context));

  const checks = rules.map((rule) => ({
    ruleId: rule.id,
    title: rule.title,
    severity: rule.severity,
    passed: !findings.some((f) => f.ruleId === rule.id),
  }));

  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  return { checks, findings, errors, warnings, canExport: errors.length === 0 };
}

export function summariseReport(report: ValidationReport): string {
  if (report.errors.length > 0) {
    const count = report.errors.length;
    return `${count} problem${count === 1 ? '' : 's'} must be fixed before this poster can be exported.`;
  }
  if (report.warnings.length > 0) {
    const count = report.warnings.length;
    return `Ready to export. ${count} suggestion${count === 1 ? '' : 's'} you may want to look at.`;
  }
  return 'Every check passed. This poster is ready to export.';
}
