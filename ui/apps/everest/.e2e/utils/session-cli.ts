import path from 'path';
import { fileURLToPath } from 'url';

export function getCliPath() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '../../../../..');
  return path.join(repoRoot, 'bin/everestctl');
}
