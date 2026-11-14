import { setCatalogos } from '@nucleo/catalogos-store.js'
import servicios from '../../catalogos/servicios-nube.json'
import patrones from '../../catalogos/patrones.json'
import antipatrones from '../../catalogos/antipatrones.json'
import buenasPracticas from '../../catalogos/buenas-practicas.json'
import controlesWaf from '../../catalogos/controles-waf.json'
import reglas from '../../catalogos/reglas-sugerencia.json'
import costos from '../../catalogos/costos-nube.json'

let loaded = false

export function initCatalogos() {
  if (loaded) return
  setCatalogos({
    servicios,
    patrones,
    antipatrones,
    buenasPracticas,
    controlesWaf,
    reglas,
    costos,
  })
  loaded = true
}