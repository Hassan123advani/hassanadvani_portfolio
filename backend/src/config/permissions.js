export const ROLES = Object.freeze({ SUPER_ADMIN: 'super_admin', ADMIN: 'admin' });

/** Every permission a regular admin can be granted. Super admins implicitly hold all of them. */
export const PERMISSIONS = Object.freeze([
  'blog',
  'projects',
  'certificates',
  'taxonomy',
  'media',
  'messages',
  'testimonials',
  'profile',
  'seo',
  'settings',
  'activity',
]);

export const PERMISSION_LABELS = Object.freeze({
  blog: 'Blog posts',
  projects: 'Projects',
  certificates: 'Certificates',
  taxonomy: 'Categories & tags',
  media: 'Media library',
  messages: 'Contact messages',
  testimonials: 'Testimonials',
  profile: 'Profile & resume',
  seo: 'SEO settings',
  settings: 'Website settings',
  activity: 'Activity logs',
});

export function hasPermission(admin, permission) {
  if (!admin || admin.active === false) return false;
  if (admin.role === ROLES.SUPER_ADMIN) return true;
  return Array.isArray(admin.permissions) && admin.permissions.includes(permission);
}

export const sanitizePermissions = (list = []) =>
  [...new Set(list)].filter((p) => PERMISSIONS.includes(p));
