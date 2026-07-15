import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ALLOWED_ENVS = ['staging', 'production'];
const targetEnv = (process.argv[2] || 'staging').toLowerCase();
if (!ALLOWED_ENVS.includes(targetEnv)) {
  console.error(`Invalid environment "${targetEnv}". Must be one of: ${ALLOWED_ENVS.join(', ')}`);
  process.exit(1);
}
const explicitUrl = process.argv[3];

const defaults = {
  staging: 'https://afro-genie-backend-staging-production.up.railway.app/api',
  production: 'https://afro-genie-backend-staging-production.up.railway.app/api',
};

const apiUrl = (explicitUrl || defaults[targetEnv] || '').trim();
if (!apiUrl) {
  console.error('Missing API URL.');
  console.error('Usage: npm run env:set:api -- <staging|production> [https://your-backend/api]');
  process.exit(1);
}
try {
  const parsed = new URL(apiUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Invalid protocol');
  }
} catch {
  console.error(`Invalid API URL: "${apiUrl}". Must be a valid http/https URL.`);
  process.exit(1);
}

const files = ['.env', '.env.production', '.env.example'];

const upsertEnvValue = (content, key, value) => {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, line);
  }

  const trimmed = content.trimEnd();
  if (!trimmed) {
    return `${line}\n`;
  }

  return `${trimmed}\n${line}\n`;
};

const resolvedRoot = path.resolve(root);

for (const relativeFile of files) {
  const filePath = path.resolve(root, relativeFile);
  if (!filePath.startsWith(resolvedRoot + path.sep)) {
    console.error(`Skipping ${relativeFile}: resolved path escapes project root.`);
    continue;
  }
  const exists = fs.existsSync(filePath);
  if (exists) {
    try {
      const realPath = fs.realpathSync(filePath);
      if (!realPath.startsWith(resolvedRoot + path.sep)) {
        console.error(`Skipping ${relativeFile}: symlink target escapes project root.`);
        continue;
      }
    } catch {
      console.error(`Skipping ${relativeFile}: could not resolve real path.`);
      continue;
    }
  }
  const content = exists ? fs.readFileSync(filePath, 'utf8') : '';
  const updated = upsertEnvValue(content, 'VITE_API_URL', apiUrl);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`${relativeFile}: set VITE_API_URL=${apiUrl}`);
}
