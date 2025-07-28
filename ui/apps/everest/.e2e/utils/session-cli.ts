import path from 'path';
import { fileURLToPath } from 'url';

export function getCliPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '../../../../..');
  return path.join(repoRoot, 'cmd/cli/main.go');
}