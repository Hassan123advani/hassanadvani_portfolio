import { describe, expect, it } from 'vitest';
import { cdn, publishState, readingTime, slugify, youtubeId } from './format.js';

describe('format helpers', () => {
  it('slugifies titles', () => {
    expect(slugify('  Héllo, World! ')).toBe('hello-world');
  });

  it('extracts YouTube ids from common URL shapes', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://vimeo.com/123')).toBe('');
  });

  it('derives publish state including scheduling', () => {
    expect(publishState({ status: 'draft' })).toBe('draft');
    expect(publishState({ status: 'published', publishedAt: new Date(Date.now() - 1000).toISOString() })).toBe('published');
    expect(publishState({ status: 'published', publishedAt: new Date(Date.now() + 864e5).toISOString() })).toBe('scheduled');
  });

  it('estimates reading time', () => {
    expect(readingTime('<p>word</p>'.repeat(660))).toBe(3);
  });

  it('only rewrites Cloudinary URLs', () => {
    expect(cdn('https://res.cloudinary.com/demo/image/upload/v1/x.jpg', { w: 400 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400,c_fill/v1/x.jpg',
    );
    expect(cdn('/assets/profile.jpeg', { w: 400 })).toBe('/assets/profile.jpeg');
  });
});
