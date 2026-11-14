---
name: patrones-arquitectura
description: >-
  Recomienda patrones de diseño, antipatrones y buenas prácticas de mercado para
  arquitecturas AWS y Azure según catalogos y reglas del repositorio. Explica
  motivo, servicios equivalentes y diferencia sugerencia de decisión adoptada.
  Usar cuando el usuario pregunte por patrones, antipatrones o prácticas cloud.
---

# Patrones y antipatrones

## Fuentes en el repo

| Recurso | Ruta |
|---------|------|
| Patrones | `catalogos/patrones.json` |
| Antipatrones | `catalogos/antipatrones.json` |
| Reglas deterministas | `catalogos/reglas-sugerencia.json` |
| Servicios y equivalencias | `catalogos/servicios-nube.json` |

## Motor de sugerencias

1. Ajustar banderas en `contextoNegocio` del JSON según el caso.
2. Ejecutar:
   ```bash
   node scripts/sugerir.mjs <arquitectura.json>
   ```
   (añadir `--write` para persistir en el documento).

## Al responder al usuario

- Citar **patrón** + **cuándo** + **beneficio** del catálogo.
- Mencionar **antipatrón** + **señal** + **remediación** si aplica.
- Indicar servicio AWS y equivalente Azure cuando la regla lo liste.
- Si el JSON ya tiene `estado: adoptado` o `mitigado`, tratarlo como decisión tomada, no como sugerencia nueva.

## Distinguir

- **Sugerencia**: regla coincidió, aún no adoptada en `patrones[]`.
- **Decisión**: entrada con `estado: adoptado` o ADR relacionado en `arc42.decisiones`.