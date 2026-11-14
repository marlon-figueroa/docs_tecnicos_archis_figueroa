---
name: levantamiento-arquitectura
description: >-
  Levanta requerimientos de arquitectura para proyectos en AWS y Azure usando el
  modelo arc42, vistas C4 y Well-Architected del repositorio. Entrevista metas,
  restricciones, calidad, datos e integración; redacta o actualiza arquitectura.json;
  ejecuta sugerir, validar y render arc42. Usar cuando el usuario pida diseñar
  arquitectura, levantar requerimientos, especificación arc42 o línea base nube.
---

# Levantamiento de arquitectura

## Modelo canónico

- Fuente de verdad: `arquitectura.json` (ver `nucleo/esquema.js` y `ejemplos/`).
- Catálogos en `catalogos/` (servicios, patrones, reglas, controles WAF).
- No editar el Markdown arc42 a mano si se regenera con el render.

## Flujo

1. **Entrevista mínima**: visión, stakeholders, restricciones (normativa, RPO/RTO, presupuesto), escenarios de calidad medibles, proveedor (`aws` | `azure` | `hibrido`), estilo (monolito/microservicios/contenedores), datos (transaccional, objetos, eventos), identidad, legado.
2. **Completar JSON**: secciones `meta`, `arc42`, `contextoNegocio`, `nube`, `patrones`, `antipatrones`, `evaluacionWellArchitected`.
3. **Sugerencias**:
   ```bash
   node scripts/sugerir.mjs <ruta/arquitectura.json> --write
   ```
4. **Inicializar controles WAF** si faltan: usar `inicializarEvaluacion` desde `nucleo/evaluar-waf.js` o completar en el asistente web.
5. **Validar**:
   ```bash
   node scripts/validar.mjs <ruta/arquitectura.json>
   ```
6. **Render arc42**:
   ```bash
   node scripts/render-arc42.mjs <ruta/arquitectura.json>
   ```
7. Brechas en controles WAF requieren un riesgo en `arc42.riesgos` con `relacionControl`.

## Híbrido AWS/Azure

Exigir ADR que documente qué carga vive en cada nube y por qué.

## Diagramas

- El render incluye Mermaid básico. Si el usuario pide diagrama HTML pulido, usar la skill global `archify` como paso opcional.

## Asistente web

Desde la raíz del repo: `npm run dev` (carpeta `app/`).