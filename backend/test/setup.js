// Loaded before every test file: tests must NEVER use real credentials from .env.local.
// dotenv does not override variables that already exist, so blank them all first.
for (const key of [
  'RESEND_API_KEY', 'RESEND_FROM', 'CONTACT_NOTIFY_TO', 'ANTHROPIC_API_KEY', 'AI_MODEL', 'AI_EFFORT',
  'FIREBASE_SERVICE_ACCOUNT_PATH', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_SECRET', 'GITHUB_TOKEN', 'K_SERVICE', 'FUNCTION_TARGET',
]) {
  process.env[key] = '';
}
process.env.INQUIRY_INLINE = 'false'; // tests drive the pipeline explicitly
process.env.NODE_ENV = 'test';
