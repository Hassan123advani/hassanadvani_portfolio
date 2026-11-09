// Vercel serverless entry: the same Express app as `npm start` / Cloud Functions.
// vercel.json rewrites /api/* and /sitemap.xml here; Express sees the original URL.
import { createApp } from '../backend/src/app.js';

export default createApp();
