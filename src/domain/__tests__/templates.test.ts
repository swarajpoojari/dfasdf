import { templateRegistry } from '@/domain/templates/registry';
import { OFFICIAL_TEMPLATES } from '@/domain/templates/officialTemplates';
import { buildCommunityPosterTemplate } from '@/domain/templates/communityPoster';
import { DESIGN_CANVAS, SAFE_MARGIN, scaledCanvas } from '@/domain/types/canvas';
import { TEMPLATE_SCHEMA_VERSION } from '@/domain/types/template';
import { activeEventTypes } from '@/domain/eventTypes/eventTypes';
import { activeOffices } from '@/domain/offices/offices';
import { exportFileName } from '@/domain/export/filename';
import { rectBottom } from '@/domain/types/common';
import { isAssetBacked } from '@/domain/types/elements';

describe('official templates', () => {
  it('all use the design coordinate system and the current schema', () => {
    for (const template of OFFICIAL_TEMPLATES) {
      expect(template.canvas).toEqual(DESIGN_CANVAS);
      expect(template.schemaVersion).toBe(TEMPLATE_SCHEMA_VERSION);
      expect(template.official).toBe(true);
    }
  });

  it('all require the association logo', () => {
    for (const template of OFFICIAL_TEMPLATES) {
      expect(template.requiredSlotIds).toContain('slot.association.logo');
      expect(
        template.elements.some(
          (element) => isAssetBacked(element) && element.slotId === 'slot.association.logo',
        ),
      ).toBe(true);
    }
  });

  it('author every element inside the canvas', () => {
    for (const template of OFFICIAL_TEMPLATES) {
      for (const element of template.elements) {
        expect(element.frame.x).toBeGreaterThanOrEqual(0);
        expect(element.frame.y).toBeGreaterThanOrEqual(0);
        expect(element.frame.x + element.frame.width).toBeLessThanOrEqual(DESIGN_CANVAS.width);
        expect(rectBottom(element.frame)).toBeLessThanOrEqual(DESIGN_CANVAS.height - SAFE_MARGIN + 1);
      }
    }
  });

  it('give every element a unique id', () => {
    for (const template of OFFICIAL_TEMPLATES) {
      const ids = template.elements.map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('lock the official logo frames so they cannot be dragged by accident', () => {
    for (const template of OFFICIAL_TEMPLATES) {
      const logos = template.elements.filter((element) => element.type === 'OFFICIAL_LOGO');
      expect(logos.length).toBeGreaterThan(0);
      expect(logos.every((logo) => logo.locked)).toBe(true);
    }
  });

  it('offer at least one template for every active event type and office', () => {
    for (const office of activeOffices()) {
      for (const eventType of activeEventTypes()) {
        const matches = templateRegistry.query({ officeId: office.id, eventTypeId: eventType.id });
        const fallback = templateRegistry.query({ officeId: office.id });
        expect(matches.length + fallback.length).toBeGreaterThan(0);
      }
    }
  });

  it('builds a template with only the sections it was asked for', () => {
    const template = buildCommunityPosterTemplate({
      id: 'tpl.test',
      name: 'Test',
      description: '',
      eventTypes: ['festival'],
      version: 1,
      updatedAt: '2026-01-01',
      programme: { enabled: true, heading: 'PROGRAMME', weight: 1 },
    });

    expect(template.elements.some((element) => element.type === 'PROGRAMME_LIST')).toBe(true);
    expect(template.elements.some((element) => element.type === 'GUEST_LIST')).toBe(false);
    expect(template.elements.some((element) => element.type === 'FELICITATION_LIST')).toBe(false);
  });
});

describe('canvas and export helpers', () => {
  it('scales the design canvas without changing its aspect ratio', () => {
    const doubled = scaledCanvas(2);
    expect(doubled.width / doubled.height).toBeCloseTo(DESIGN_CANVAS.width / DESIGN_CANVAS.height, 5);
    expect(doubled.width).toBe(2160);
  });

  it('produces file names that are safe to share', () => {
    const name = exportFileName('172nd Guru Jayanthi — श्री नारायण गुरु', 'Navi Mumbai', 'jpeg');
    expect(name).toMatch(/^[a-z0-9_\-.]+\.jpg$/);
    expect(name).toContain('navi-mumbai');
  });
});
