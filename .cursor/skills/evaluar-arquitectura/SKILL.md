---
name: evaluar-arquitectura
description: >-
  Analiza, evalúa y valida un arquitectura.json frente a escenarios de calidad,
  pilares Well-Architected de AWS o Azure, y el checklist del repositorio.
  Completa controles, enlaza brechas con riesgos y no declara válida una arquitectura
  con errores del validador. Usar cuando el usuario pida evaluar, validar o revisar
  una arquitectura de nube existente.
---

# Evaluación de arquitectura

## Entrada

- Archivo `arquitectura.json` del proyecto o contenido equivalente en el chat.

## Pasos

1. Leer `contextoNegocio`, escenarios en `arc42.escenariosCalidad` y bloques C4: ¿hay medidas cuantificables?
2. Comparar `nube.serviciosSeleccionados` con `meta.proveedorNube` (coherencia de servicios).
3. Revisar patrones adoptados frente a antipatrones en estado `abierto` o `advertencia`.
4. Recorrer `evaluacionWellArchitected.pilares`: marcar estados con evidencia breve; `brecha` debe tener texto y riesgo asociado.
5. Ejecutar validador:
   ```bash
   node scripts/validar.mjs <arquitectura.json>
   ```
6. Entregar informe: resumen de `resumenEvaluacion` (desde `nucleo/evaluar-waf.js`), lista de errores/advertencias del validador, recomendaciones priorizadas.

## Criterio de aceptación

- El validador debe salir con código 0 para considerar la especificación **válida** según esta línea base.
- No sustituir el AWS Well-Architected Tool oficial; este conjunto es un subconjunto de controles de referencia en `catalogos/controles-waf.json`.

## Buenas prácticas

Consultar `catalogos/buenas-practicas.json` por pilar para argumentar recomendaciones.