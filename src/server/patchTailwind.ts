import { Scanner } from '@tailwindcss/oxide';
import fs from 'fs';
import path from 'path';

export function installTailwindScannerPatch(baseDir: string = process.cwd()) {
  const originalScan = (Scanner.prototype as any).scan;
  (Scanner.prototype as any).scan = function () {
    const native = originalScan ? originalScan.call(this) : [];
    if (native && native.length > 0) return native;

    const candidates = new Set<string>();
    function walk(dir: string): string[] {
      let files: string[] = [];
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!['node_modules', 'dist', '.git', '.gmp_cache'].includes(entry.name)) {
              files = files.concat(walk(full));
            }
          } else if (/\.(html|js|ts|jsx|tsx)$/.test(entry.name)) {
            files.push(full);
          }
        }
      } catch {}
      return files;
    }

    const files = walk(baseDir);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const ext = path.extname(file).slice(1);
        const res = (this as any).getCandidatesWithPositions({ content, extension: ext });
        for (const item of res) {
          candidates.add(item.candidate);
        }
      } catch {}
    }
    return [...candidates];
  };
}

