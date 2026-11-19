// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Only the plumbing, not a winner: a plain checklist of the 55 trophies with a one-line hint each. Write a real guide
// for every trophy in your own words, a roadmap to the platinum, filters and a spoiler setting in app/, put 3 or 4 PNG
// or JPEG screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views this
// starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Authored validation pass (Leonida Legend build): refuse to hand in a broken
// guide. The trophy data must parse, hold exactly the official 55 trophies,
// and every trophy must carry a non-blank name, description, grade and guide,
// plus at least one cited source. A failure here throws before anything is
// copied, so a bad data edit can never reach the scorer unnoticed.
function validateTrophies(file: string): void {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const list = Array.isArray(data) ? data : data.trophies;
  if (!Array.isArray(list) || list.length !== 55) {
    throw new Error(`trophies.json must list exactly 55 trophies, found ${Array.isArray(list) ? list.length : 'none'}`);
  }
  const grades = new Set(['platinum', 'gold', 'silver', 'bronze']);
  const seen = new Set<string>();
  for (const t of list) {
    for (const field of ['name', 'description', 'guide'] as const) {
      if (typeof t[field] !== 'string' || t[field].trim() === '') {
        throw new Error(`trophy ${JSON.stringify(t.name ?? t.id)} has a blank ${field}`);
      }
    }
    if (!grades.has(t.grade)) throw new Error(`trophy ${t.name} has an unknown grade: ${t.grade}`);
    if (!Array.isArray(t.sources) || t.sources.length === 0) throw new Error(`trophy ${t.name} cites no sources`);
    if (seen.has(t.name)) throw new Error(`duplicate trophy name: ${t.name}`);
    seen.add(t.name);
  }
  const tally = list.reduce<Record<string, number>>((acc, t) => ((acc[t.grade] = (acc[t.grade] ?? 0) + 1), acc), {});
  console.log(
    `trophies.json OK: 55 trophies (${tally.platinum ?? 0} platinum, ${tally.gold ?? 0} gold, ` +
      `${tally.silver ?? 0} silver, ${tally.bronze ?? 0} bronze), every guide non-blank and sourced`,
  );
}

validateTrophies(join(here, 'app', 'data', 'trophies.json'));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
