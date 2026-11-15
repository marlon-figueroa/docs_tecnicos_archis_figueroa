#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { cargarCatalogos } from '../nucleo/cargar-catalogos.js';
import { aplicarSugerencias } from '../nucleo/sugerir.js';

cargarCatalogos();

const path = process.argv[2];
const write = process.argv.includes('--write');

if (!path) {
  console.error('Uso: node scripts/sugerir.mjs <arquitectura.json> [--write]');
  process.exit(2);
}

const doc = JSON.parse(readFileSync(path, 'utf8'));
const { documento, sugerencias, aplicado } = aplicarSugerencias(doc);

console.log(JSON.stringify(sugerencias, null, 2));

if (write) {
  writeFileSync(path, JSON.stringify(documento, null, 2), 'utf8');
  console.error('Documento actualizado:', path);
  console.error('Fusión aplicada:', JSON.stringify(aplicado));
}