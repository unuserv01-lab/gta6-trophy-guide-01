// Leonida Trophy Guide — the entrypoint that hands the guide in (Node 22, standard
// library only). It copies this repository's app/ and screenshots/ into the output
// directory (or MAKEFUN_OUTPUT_DIR outside the grader) and writes dossier.json
// with the vendored make.fun library, which is the summary the judge reads.
// vendor/makefun-frontend.ts is the kit's copy and must stay untouched: the scorer
// rebuilds the dossier with its own copy and compares the two byte for byte.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps (reference/gate.json): text_max_bytes shapes the dossier text;
// the others refuse an entry the scorer would refuse — more than 4 screenshots or
// one over 256 KiB, more than 993 files and directories in app/, or 48 MiB of app files.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
