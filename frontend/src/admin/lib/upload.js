import { adminApi } from '../../lib/api.js';

export const LIMITS = {
  image: { max: 10 * 1024 * 1024, accept: 'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml' },
  video: { max: 100 * 1024 * 1024, accept: 'video/mp4,video/webm,video/quicktime' },
  raw: { max: 10 * 1024 * 1024, accept: 'application/pdf,.vtt,text/vtt' },
};

export function resourceTypeFor(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'raw';
}

/**
 * Signed direct-to-Cloudinary upload:
 *   1. backend signs (secret stays on server)
 *   2. browser uploads the file straight to Cloudinary
 *   3. backend verifies the asset with Cloudinary and records it in the media library
 */
export async function uploadFile(file, folder, { onProgress, alt = '' } = {}) {
  const resourceType = resourceTypeFor(file);
  const limit = LIMITS[resourceType];
  const isVtt = /\.vtt$/i.test(file.name) || file.type === 'text/vtt';
  if (resourceType === 'raw' && file.type !== 'application/pdf' && !isVtt) throw new Error('Only images, videos, PDF and .vtt caption files can be uploaded.');
  if (file.size > limit.max) throw new Error(`File is too large (max ${Math.round(limit.max / 1024 / 1024)} MB).`);

  const sig = await adminApi.post('/media/sign', { folder, resourceType });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  const uploaded = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) resolve(body);
      else reject(new Error(body?.error?.message || `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Upload failed: network error.'));
    xhr.send(form);
  });

  const { item } = await adminApi.post('/media', { publicId: uploaded.public_id, resourceType, folder, alt, title: file.name.replace(/\.[^.]+$/, '') });
  return item;
}

/** Convert a media-library item into the mediaRef shape stored on content. */
export const toRef = (m, extra = {}) => ({
  url: m.url,
  publicId: m.publicId || '',
  alt: m.alt || '',
  caption: m.caption || '',
  ...(m.width ? { width: m.width } : {}),
  ...(m.height ? { height: m.height } : {}),
  resourceType: m.resourceType || 'image',
  ...extra,
});
