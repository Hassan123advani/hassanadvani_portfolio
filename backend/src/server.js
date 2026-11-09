import { createApp } from './app.js';
import { env, isConfigured } from './config/env.js';

const app = createApp();

app.listen(env.port, () => {
  const flag = (ok) => (ok ? 'configured' : 'NOT configured');
  console.log(`Portfolio API listening on http://localhost:${env.port}`);
  console.log(`  Firebase Admin : ${flag(isConfigured.firebase())}`);
  console.log(`  Cloudinary     : ${flag(isConfigured.cloudinary())}`);
  console.log(`  Resend email   : ${flag(isConfigured.mail())} → ${env.mail.notifyTo}`);
  console.log(`  CORS origins   : ${env.corsOrigins.join(', ')}`);
});
