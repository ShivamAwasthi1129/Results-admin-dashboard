import { isRegisteredSectionType } from './section-registry';
import type { HomePageDocument, HomeSection } from './types';

function keysSet(sections: HomeSection[]): Set<string> {
  return new Set(sections.map((s) => s.sectionKey));
}

export function validateHomePageForPublish(doc: unknown): string[] {
  const errors: string[] = [];
  if (!doc || typeof doc !== 'object') {
    return ['Document must be an object'];
  }
  const d = doc as Partial<HomePageDocument>;
  if (d.schemaVersion !== 'home_v1') {
    errors.push('schemaVersion must be "home_v1"');
  }
  if (!d.page || typeof d.page !== 'object') {
    errors.push('page is required');
    return errors;
  }
  if (typeof d.page.slug !== 'string' || !d.page.slug.trim()) {
    errors.push('page.slug is required');
  }
  if (typeof d.page.title !== 'string') {
    errors.push('page.title must be a string');
  }
  if (!Array.isArray(d.page.sections)) {
    errors.push('page.sections must be an array');
    return errors;
  }

  const keySet = keysSet(d.page.sections as HomeSection[]);
  if (keySet.size !== d.page.sections.length) {
    errors.push('Each section must have a unique sectionKey');
  }

  const orders = d.page.sections.map((s) => (s as HomeSection).order);
  if (orders.some((o) => typeof o !== 'number' || !Number.isFinite(o))) {
    errors.push('Every section needs a numeric order');
  }

  for (let i = 0; i < d.page.sections.length; i++) {
    const s = d.page.sections[i] as HomeSection;
    const p = `sections[${i}]`;
    if (!s || typeof s !== 'object') {
      errors.push(`${p} is invalid`);
      continue;
    }
    if (typeof s.sectionKey !== 'string' || !s.sectionKey.trim()) {
      errors.push(`${p}.sectionKey is required`);
    }
    if (typeof s.type !== 'string' || !s.type.trim()) {
      errors.push(`${p}.type is required`);
    } else if (!isRegisteredSectionType(s.type)) {
      errors.push(`${p}.type "${s.type}" is not a registered section type`);
    }
    if (typeof s.order !== 'number') {
      errors.push(`${p}.order must be a number`);
    }
    if (typeof s.enabled !== 'boolean') {
      errors.push(`${p}.enabled must be boolean`);
    }
    if (!s.data || typeof s.data !== 'object' || Array.isArray(s.data)) {
      errors.push(`${p}.data must be an object`);
    }
  }

  const enabled = (d.page.sections as HomeSection[]).filter((s) => s.enabled);
  for (const s of enabled) {
    if (s.type === 'impact_stats') {
      const cards = s.data.cards;
      if (!Array.isArray(cards) || cards.length < 1) {
        errors.push(`Section "${s.sectionKey}": impact_stats requires at least one card when enabled`);
      }
    }
    if (s.type === 'lifeline_features_grid') {
      const items = s.data.items;
      if (!Array.isArray(items)) {
        errors.push(`Section "${s.sectionKey}": lifeline_features_grid.items must be an array when enabled`);
      }
    }
    if (s.type === 'live_impact_updates') {
      const items = s.data.items;
      if (!Array.isArray(items)) {
        errors.push(`Section "${s.sectionKey}": live_impact_updates.items must be an array when enabled`);
      }
    }
  }

  return errors;
}
