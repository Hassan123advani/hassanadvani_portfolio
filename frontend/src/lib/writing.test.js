import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, mergeCategories, wasUpdated, articlePath, CODE_LANGUAGES } from './writing.js';
import { uniqueId } from './articleHtml.js';

describe('writing helpers', () => {
  it('keeps default categories first and de-duplicates admin ones by slug', () => {
    const out = mergeCategories(['firebase', 'Career', 'My  Journey', 'Career']);
    expect(out.slice(0, DEFAULT_CATEGORIES.length)).toEqual(DEFAULT_CATEGORIES);
    expect(out.filter((c) => c === 'Career')).toHaveLength(1);
    expect(out).not.toContain('firebase');
    expect(out).toHaveLength(DEFAULT_CATEGORIES.length + 1);
  });

  it('only shows "Updated" for edits a day or more after publishing', () => {
    expect(wasUpdated({ publishedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T05:00:00Z' })).toBe(false);
    expect(wasUpdated({ publishedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' })).toBe(true);
    expect(wasUpdated({ publishedAt: null, updatedAt: '2026-01-03T00:00:00Z' })).toBe(false);
  });

  it('builds /writing article paths and unique heading ids', () => {
    expect(articlePath('hello')).toBe('/writing/hello');
    const used = new Set();
    expect([uniqueId('intro', used), uniqueId('intro', used), uniqueId('', used)]).toEqual(['intro', 'intro-2', 'section']);
  });

  it('offers a plain-text option and C for code blocks', () => {
    expect(CODE_LANGUAGES[0].value).toBe('');
    expect(CODE_LANGUAGES.map((l) => l.value)).toContain('c');
  });
});
