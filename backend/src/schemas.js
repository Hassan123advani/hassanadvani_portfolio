import { z } from 'zod';
import { PERMISSIONS, ROLES } from './config/permissions.js';

const str = (max, min = 0) => z.string().trim().min(min).max(max);
const optStr = (max) => z.string().trim().max(max).optional().default('');
const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) URL');
const optUrl = z.union([z.literal(''), httpUrl]).optional().default('');
const isoDate = z.string().datetime({ offset: true });

export const mediaRef = z.object({
  url: httpUrl.or(z.string().regex(/^\/[\w\-./ ]+$/, 'Invalid path')), // allow bundled /assets/... paths
  publicId: optStr(300),
  alt: optStr(300),
  caption: optStr(300),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  resourceType: z.enum(['image', 'video', 'raw']).optional().default('image'),
});

const status = z.enum(['draft', 'published']).default('draft');
const tagList = z.array(str(50, 1)).max(20).default([]);

export const postSchema = z.object({
  title: str(200, 1),
  slug: optStr(100),
  subtitle: optStr(300),
  excerpt: optStr(400),
  content: z.string().max(400_000).default(''),
  coverImage: mediaRef.nullable().default(null),
  ogImage: mediaRef.nullable().default(null),
  gallery: z.array(mediaRef).max(40).default([]),
  category: optStr(100),
  tags: tagList,
  seoTitle: optStr(120),
  seoDescription: optStr(300),
  seoKeywords: z.array(str(60, 1)).max(15).default([]),
  // 0 = calculate from the content; otherwise the author's own estimate in minutes.
  readingTimeOverride: z.number().int().min(0).max(240).default(0),
  featured: z.boolean().default(false),
  status,
  publishedAt: isoDate.nullable().optional().default(null),
  author: optStr(100),
});

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email('Please enter a valid email address.'),
  source: optStr(60),
  website: optStr(200), // honeypot: real visitors never fill this in
});

export const projectSchema = z.object({
  title: str(150, 1),
  slug: optStr(100),
  summary: optStr(400),
  description: z.string().max(200_000).default(''),
  coverImage: mediaRef.nullable().default(null),
  images: z.array(mediaRef).max(30).default([]),
  techStack: z.array(str(40, 1)).max(30).default([]),
  githubUrl: optUrl,
  liveUrl: optUrl.or(z.string().regex(/^\/demos\/[\w-]+\/?(index\.html)?$/)),
  category: optStr(100),
  level: optStr(60),
  featured: z.boolean().default(false),
  status,
  order: z.number().int().min(0).max(10000).default(0),
  publishedAt: isoDate.nullable().optional().default(null),
  seoTitle: optStr(120),
  seoDescription: optStr(300),
});

export const certificateSchema = z.object({
  title: str(200, 1),
  issuer: optStr(120),
  platform: optStr(120),
  kind: z.enum(['professional', 'course', 'other']).default('course'),
  issuedOn: optStr(40),
  description: optStr(2000),
  image: mediaRef.nullable().default(null),
  credentialUrl: optUrl,
  courses: z.array(str(200, 1)).max(30).default([]),
  order: z.number().int().min(0).max(10000).default(0),
  status,
});

export const testimonialSchema = z.object({
  name: str(100, 1),
  role: optStr(100),
  company: optStr(100),
  quote: str(1200, 1),
  avatar: mediaRef.nullable().default(null),
  link: optUrl,
  order: z.number().int().min(0).max(10000).default(0),
  status,
});

export const categorySchema = z.object({
  name: str(80, 1),
  slug: optStr(100),
  description: optStr(300),
  scope: z.enum(['post', 'project', 'both']).default('both'),
});

export const tagSchema = z.object({ name: str(50, 1), slug: optStr(60) });

export const messageUpdateSchema = z
  .object({
    status: z.enum(['new', 'read', 'replied', 'resolved', 'archived', 'spam']).optional(),
    starred: z.boolean().optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

// Only these fields are accepted from the browser; anything else (e.g. "prompt", "model") is dropped.
export const contactSchema = z.object({
  name: str(100, 2),
  email: z.string().trim().toLowerCase().email().max(200),
  subject: str(150, 2),
  message: str(5000, 10),
  projectType: optStr(60),
  website: z.string().max(200).optional().default(''), // honeypot: must stay empty
  startedAt: z.number().int().optional(),
});

export const mediaRegisterSchema = z.object({
  publicId: str(300, 1),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
  folder: z.enum(['posts', 'projects', 'certificates', 'profile', 'media', 'resume', 'video']),
  alt: optStr(300),
  title: optStr(200),
});

export const mediaUpdateSchema = z.object({ alt: optStr(300), title: optStr(200), caption: optStr(300) });

export const signSchema = z.object({
  folder: z.enum(['posts', 'projects', 'certificates', 'profile', 'media', 'resume', 'video']),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
});

const role = z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
const permissionList = z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length);

export const adminCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  displayName: str(100, 1),
  role: role.default(ROLES.ADMIN),
  permissions: permissionList.default([]),
});

export const adminUpdateSchema = z
  .object({
    displayName: str(100, 1).optional(),
    role: role.optional(),
    permissions: permissionList.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

/* ---------- Settings documents ---------- */

/** Video / caption source: an http(s) URL (Cloudinary) or a file shipped with the site under /video/. */
const videoSrc = z.union([z.literal(''), httpUrl, z.string().regex(/^\/video\/[\w.-]+\.(mp4|webm|vtt)$/)]).optional().default('');

const linkItem = z.object({ label: str(60, 1), url: httpUrl.or(z.string().regex(/^mailto:[^\s]+$/)) });

export const profileSchema = z.object({
  name: str(120, 1),
  shortName: optStr(60),
  headline: optStr(200),
  tagline: optStr(200),
  intro: optStr(600),
  bio: z.array(str(1500, 1)).max(10).default([]),
  location: optStr(120),
  email: z.union([z.literal(''), z.string().trim().email()]).default(''),
  availability: optStr(160),
  avatar: mediaRef.nullable().default(null),
  resume: mediaRef.nullable().default(null),
  socials: z.array(linkItem).max(12).default([]),
  stats: z.array(z.object({ value: str(20, 1), label: str(60, 1) })).max(6).default([]),
  skills: z
    .array(
      z.object({
        group: str(60, 1),
        items: z.array(z.object({ name: str(60, 1), level: z.number().int().min(0).max(100).optional() })).max(20),
      }),
    )
    .max(12)
    .default([]),
  education: z
    .array(
      z.object({
        institution: str(150, 1),
        credential: optStr(150),
        period: optStr(60),
        status: optStr(60),
        description: optStr(1000),
      }),
    )
    .max(12)
    .default([]),
  experience: z
    .array(
      z.object({
        role: str(120, 1),
        organization: optStr(150),
        period: optStr(60),
        location: optStr(100),
        description: optStr(1500),
      }),
    )
    .max(20)
    .default([]),
  services: z
    .array(z.object({ title: str(100, 1), description: optStr(600), deliverables: z.array(str(100, 1)).max(10).default([]) }))
    .max(12)
    .default([]),
  learning: z.array(z.object({ title: str(100, 1), status: optStr(40) })).max(12).default([]),
  subjects: z.array(z.object({ title: str(100, 1), description: optStr(200) })).max(24).default([]),
  video: z
    .object({
      // 'file' = a video hosted with the site (e.g. /video/intro-en.mp4); 'cloudinary' = uploaded via the media library
      provider: z.enum(['none', 'youtube', 'cloudinary', 'file']).default('none'),
      youtubeId: z.union([z.literal(''), z.string().regex(/^[\w-]{6,20}$/)]).default(''),
      url: videoSrc,
      captionsUrl: videoSrc,
      poster: mediaRef.nullable().default(null),
      title: optStr(150),
      description: optStr(600),
      chapters: z.array(z.object({ time: optStr(10), label: str(80, 1) })).max(20).default([]),
      versions: z
        .array(z.object({ label: str(30, 1), lang: optStr(10), url: videoSrc, captionsUrl: videoSrc }))
        .max(4)
        .default([]),
    })
    .default({}),
});

export const siteSchema = z.object({
  siteTitle: str(120, 1),
  footerNote: optStr(200),
  announcement: optStr(200),
  contactEnabled: z.boolean().default(true),
  blogEnabled: z.boolean().default(true),
  showGithub: z.boolean().default(true),
  showTestimonials: z.boolean().default(true),
  postsPerPage: z.number().int().min(3).max(30).default(9),
});

export const seoSchema = z.object({
  defaultTitle: str(120, 1),
  titleTemplate: optStr(120),
  description: optStr(300),
  keywords: z.array(str(50, 1)).max(30).default([]),
  ogImage: mediaRef.nullable().default(null),
  twitterHandle: optStr(40),
  siteUrl: optUrl,
});

export const SETTINGS = {
  profile: { schema: profileSchema, permission: 'profile' },
  site: { schema: siteSchema, permission: 'settings' },
  seo: { schema: seoSchema, permission: 'seo' },
};
