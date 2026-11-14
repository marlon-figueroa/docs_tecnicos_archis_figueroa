import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setCatalogos, cargarCatalogos as cargarMemoria, serviciosPorProveedor, servicioPorId } from './catalogos-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'catalogos');

function loadJson(name) {
  const raw = readFileSync(join(root, name), 'utf8');
  return JSON.parse(raw);
}

let diskLoaded = false;

function ensureDiskCatalogos() {
  if (diskLoaded) return;
  try {
    cargarMemoria();
    diskLoaded = true;
    return;
  } catch {
    /* cache vacío */
  }
  setCatalogos({
    servicios: loadJson('servicios-nube.json'),
    patrones: loadJson('patrones.json'),
    antipatrones: loadJson('antipatrones.json'),
    buenasPracticas: loadJson('buenas-practicas.json'),
    controlesWaf: loadJson('controles-waf.json'),
    reglas: loadJson('reglas-sugerencia.json'),
  });
  diskLoaded = true;
}

export function cargarCatalogos() {
  ensureDiskCatalogos();
  return cargarMemoria();
}

export { setCatalogos, serviciosPorProveedor, servicioPorId };