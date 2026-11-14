let cache = null;

/** @param {object} data */
export function setCatalogos(data) {
  cache = data;
}

export function cargarCatalogos() {
  if (cache) return cache;
  throw new Error(
    'Catálogos no cargados: en Node use cargar-catalogos.js; en el navegador llame setCatalogos() primero.'
  );
}

export function serviciosPorProveedor(proveedor) {
  const { servicios } = cargarCatalogos();
  if (proveedor === 'hibrido') return servicios;
  return servicios.filter((s) => s.proveedor === proveedor);
}

export function servicioPorId(id) {
  return cargarCatalogos().servicios.find((s) => s.id === id);
}