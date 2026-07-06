import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetEnv = (process.argv[2] || 'staging').toLowerCase();
const explicitUrl = process.argv[3];

const defaults = {
  staging: 'https://afro-genie-backend-staging-production.up.railway.app/api',
  production: 'https://afro-genie-backend-production.up.railway.app/api',
};

const apiUrl = (explicitUrl || defaults[targetEnv] || '').trim();
if (!apiUrl) {
  console.error('Missing API URL.');
  console.error('Usage: npm run env:set:api -- <staging|production> [https://your-backend/api]');
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

for (const relativeFile of files) {
  const filePath = path.join(root, relativeFile);
  const exists = fs.existsSync(filePath);
  const content = exists ? fs.readFileSync(filePath, 'utf8') : '';
  const updated = upsertEnvValue(content, 'VITE_API_URL', apiUrl);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`${relativeFile}: set VITE_API_URL=${apiUrl}`);
}
