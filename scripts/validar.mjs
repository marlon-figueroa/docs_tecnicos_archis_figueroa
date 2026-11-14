#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { cargarCatalogos } from '../nucleo/cargar-catalogos.js';
import { validarDocumento } from '../nucleo/validar.js';

cargarCatalogos();

const path = process.argv[2];
if (!path) {
  console.error('Uso: node scripts/validar.mjs <arquitectura.json>');
  process.exit(2);
}

const doc = JSON.parse(readFileSync(path, 'utf8'));
const result = validarDocumento(doc);

if (result.advertencias.length) {
  console.warn('Advertencias:');
  result.advertencias.forEach((a) => console.warn('  -', a));
}

if (result.valido) {
  console.log('OK: documento válido.');
  process.exit(0);
}

console.error('Errores:');
result.errores.forEach((e) => console.error('  -', e));
process.exit(1);