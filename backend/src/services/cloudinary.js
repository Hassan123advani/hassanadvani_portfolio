import { v2 as cloudinary } from 'cloudinary';
import { env, isConfigured } from '../config/env.js';
import { badRequest, unavailable } from '../utils/errors.js';

export const MEDIA_FOLDERS = Object.freeze(['posts', 'projects', 'certificates', 'profile', 'media', 'resume', 'video']);
const RESOURCE_TYPES = ['image', 'video', 'raw'];

let configured = false;
function client() {
  if (!isConfigured.cloudinary()) {
    throw unavailable(
      'Cloudinary is not configured on the server. Add CLOUDINARY_* values to backend/.env.',
      'CLOUDINARY_NOT_CONFIGURED',
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export const cloudinaryEnabled = () => isConfigured.cloudinary();

function folderPath(folder) {
  if (!MEDIA_FOLDERS.includes(folder)) throw badRequest(`Unknown media folder "${folder}"`);
  return `${env.cloudinary.folder}/${folder}`;
}

/**
 * Produces a short-lived signature so the browser can upload directly to
 * Cloudinary. The API secret never leaves the server.
 */
export function signUpload({ folder, resourceType = 'image' }) {
  if (!RESOURCE_TYPES.includes(resourceType)) throw badRequest('Invalid resource type');
  const c = client();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: folderPath(folder), timestamp };
  const signature = c.utils.api_sign_request(params, env.cloudinary.apiSecret);
  return {
    cloudName: env.cloudinary.cloudName,
    apiKey: env.cloudinary.apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${resourceType}/upload`,
    ...params,
    signature,
  };
}

/** Confirms an uploaded asset really exists in our Cloudinary account and lives in our folder. */
export async function fetchResource(publicId, resourceType = 'image') {
  if (!RESOURCE_TYPES.includes(resourceType)) throw badRequest('Invalid resource type');
  if (!publicId.startsWith(`${env.cloudinary.folder}/`)) throw badRequest('Asset is outside the portfolio folder');
  try {
    return await client().api.resource(publicId, { resource_type: resourceType });
  } catch (err) {
    if (err?.status === 503) throw err;
    throw badRequest('That asset could not be found in Cloudinary.');
  }
}

export async function destroyResource(publicId, resourceType = 'image') {
  const res = await client().uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  return res?.result; // 'ok' | 'not found'
}
