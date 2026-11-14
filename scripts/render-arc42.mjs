#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cargarCatalogos } from '../nucleo/cargar-catalogos.js';
import { renderArc42Markdown } from '../nucleo/render-arc42.js';

cargarCatalogos();

const jsonPath = process.argv[2];
const outPath = process.argv[3];

if (!jsonPath) {
  console.error('Uso: node scripts/render-arc42.mjs <arquitectura.json> [salida.md]');
  process.exit(2);
}

const doc = JSON.parse(readFileSync(jsonPath, 'utf8'));
const md = renderArc42Markdown(doc);
const dest = outPath || join(dirname(jsonPath), 'arc42', 'README.md');

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, md, 'utf8');
console.log('Escrito:', dest);