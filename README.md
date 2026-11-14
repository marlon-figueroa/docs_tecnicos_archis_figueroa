# Línea base de arquitectura AWS / Azure

Plantilla adaptable para **levantar, diseñar, analizar, evaluar y validar** arquitecturas de proyectos informáticos, alineada con **arc42**, vistas **C4** y pilares **Well-Architected** (AWS y Azure).

## Contenido

| Ruta | Descripción |
|------|-------------|
| [`nucleo/`](nucleo/) | Esquema, validación, sugerencias, evaluación WAF y render Markdown |
| [`catalogos/`](catalogos/) | Servicios, patrones, antipatrones, reglas y controles de línea base |
| [`scripts/`](scripts/) | CLI: `sugerir`, `validar`, `render-arc42` |
| [`ejemplos/gestion-expedientes/`](ejemplos/gestion-expedientes/) | Proyecto de referencia completo |
| [`app/`](app/) | Asistente web (Vite + React + Tailwind + [daisyUI](https://daisyui.com/)) |
| [`.cursor/skills/`](.cursor/skills/) | Skills de Cursor para levantamiento, evaluación y patrones |

El **modelo canónico** es un archivo `arquitectura.json` por proyecto. El Markdown arc42 se **genera**; no es la fuente editable.

> Los controles Well-Architected incluidos son un **subconjunto práctico** de referencia, no el cuestionario oficial completo de AWS o Microsoft.

## Tres modos de uso

### 1. Edición directa + CLI

```bash
node scripts/sugerir.mjs ejemplos/gestion-expedientes/arquitectura.json --write
node scripts/validar.mjs ejemplos/gestion-expedientes/arquitectura.json
node scripts/render-arc42.mjs ejemplos/gestion-expedientes/arquitectura.json
```

### 2. Asistente web

```bash
cd app && npm install && npm run dev
```

Cargar el ejemplo, cambiar proveedor AWS/Azure, aplicar sugerencias, validar y exportar JSON o Markdown. **Imprimir / PDF** usa la impresión del navegador.

### 3. Chat en Cursor

Usar las skills del proyecto:

- `levantamiento-arquitectura` — generar o completar la especificación
- `evaluar-arquitectura` — validar y revisar pilares
- `patrones-arquitectura` — patrones, antipatrones y equivalencias de servicios

## Estructura del JSON (resumen)

- `meta` — proyecto y proveedor (`aws` | `azure` | `hibrido`)
- `arc42` — secciones arc42 (visión, contexto, bloques, ADRs, riesgos, etc.)
- `contextoNegocio` — banderas para el motor de reglas
- `nube.serviciosSeleccionados` — IDs del catálogo
- `patrones` / `antipatrones` — con estado (`adoptado`, `sugerido`, `mitigado`, …)
- `evaluacionWellArchitected` — controles por pilar (`cumple`, `parcial`, `brecha`, `no-aplica`)

## Validación

Falla si falta visión, actores, escenarios de calidad medibles, bloques sin responsabilidad, servicios incoherentes con el proveedor, híbrido sin ADR, o brecha sin riesgo asociado.

## Diagramas

El Markdown generado incluye diagramas **Mermaid** de contexto y despliegue. Para diagramas HTML interactivos puede usarse la skill **archify** (opcional).