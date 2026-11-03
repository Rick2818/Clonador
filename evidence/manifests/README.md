# Manifiestos de evidencia REA importada

**Importados:** 2026-11-02. **Estado:** `IMPORTED_PENDING_HUMAN_REVIEW`.
**Objetivos:** Langflow (`https://www.langflow.org`) y Relevance AI (`https://relevanceai.com`).

Estos diez archivos son los manifiestos que produjo `stageReaEvidence` al importar salidas JSON de REA. Se publican aquí porque antes vivían en `.clonador/rea-evidence/`, ruta ignorada por Git, y no eran revisables desde el repositorio.

## Qué certifican y qué no

- El campo `artifactSha256` corresponde al archivo JSON que se importó en el momento indicado en `capturedAt`.
- **Los artefactos originales no se almacenan en este repositorio** y hoy no se encuentran en el entorno local. Por tanto el hash **no puede recalcularse** y solo queda como referencia.
- Un manifiesto **no certifica** que REA se haya ejecutado, ni la cobertura declarada, ni el comportamiento de un tercero. Es un registro de importación, no una prueba de observación.
- `src/rea.mjs` guarda únicamente el manifiesto: el artefacto de origen queda fuera del repositorio por diseño.

## Para revalidar un manifiesto

1. Recuperar el artefacto original (mismo nombre en `originalFileName`).
2. Calcular SHA-256 y comparar con `artifactSha256`.
3. Si coincide, el manifiesto queda verificado como importación íntegra; la cobertura y las limitaciones siguen requiriendo revisión humana.

Si el artefacto no aparece, el manifiesto debe tratarse como **no verificable**, no como evidencia primaria.
