import type { PosterTemplate } from '@/domain/types/template';
import { TEMPLATE_SCHEMA_VERSION, templateSupportsEventType, templateSupportsOffice } from '@/domain/types/template';
import { findOffice } from '@/domain/offices/offices';
import { OFFICIAL_TEMPLATES } from './officialTemplates';

export interface TemplateQuery {
  readonly officeId?: string;
  readonly eventTypeId?: string;
  readonly language?: string;
  readonly officialOnly?: boolean;
  readonly search?: string;
}

export class TemplateRegistry {
  private readonly templates = new Map<string, PosterTemplate>();

  constructor(initial: readonly PosterTemplate[] = []) {
    for (const template of initial) this.templates.set(template.id, template);
  }

  register(template: PosterTemplate): void {
    this.templates.set(template.id, template);
  }

  get(id: string): PosterTemplate | undefined {
    return this.templates.get(id);
  }

  all(): readonly PosterTemplate[] {
    return [...this.templates.values()];
  }

  query({ officeId, eventTypeId, language, officialOnly, search }: TemplateQuery = {}): readonly PosterTemplate[] {
    const office = officeId ? findOffice(officeId) : undefined;
    const allowList = office && office.templateIds.length > 0 ? new Set(office.templateIds) : undefined;
    const needle = search?.trim().toLowerCase();

    return this.all()
      .filter((template) => !officeId || templateSupportsOffice(template, officeId))
      .filter((template) => !allowList || allowList.has(template.id))
      .filter((template) => !eventTypeId || templateSupportsEventType(template, eventTypeId))
      .filter((template) => !language || template.languages.includes(language as never))
      .filter((template) => !officialOnly || template.official)
      .filter((template) => {
        if (!needle) return true;
        return `${template.name} ${template.description}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** A document authored against an older schema must be migrated before editing. */
  isSchemaCurrent(template: PosterTemplate): boolean {
    return template.schemaVersion === TEMPLATE_SCHEMA_VERSION;
  }
}

export const templateRegistry = new TemplateRegistry(OFFICIAL_TEMPLATES);
