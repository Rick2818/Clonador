# Estado de los 12 puntos — Clonador

**Fecha:** 2026-11-02
**Rama de trabajo:** `feature/rea-marketing-agent-20261101`
**PR abierto:** [#1](https://github.com/Rick2818/Clonador/pull/1) (sin fusionar)
**Entorno verificado:** Windows, Node 26.4.0, Chrome 156.0.8078.79, REA CLI 6.8.0

Estados: `PENDING` · `IN_PROGRESS` · `BLOCKED` · `IMPLEMENTED` · `TESTED` · `CERTIFIED`

| # | Punto | Estado | Evidencia | Pruebas | Próxima acción |
|---|---|---|---|---|---|
| 1 | REA real en Langflow y Relevance AI | `IMPLEMENTED` (10 observaciones) | 10 artefactos primarios con SHA-256: landings, casos de uso, precios, integraciones y cliente | Verificación de artefacto y manifiesto | Ampliar a demo autenticada; requiere autorización |
| 2 | Adquisición y conversión | `IMPLEMENTED` | `docs/MATRIZ-REA-MERCADEO.md` + `docs/ANALISIS-COMERCIAL-CLONABLE.md` | — | Ejecutar plan 30/60/90 |
| 3 | Reimplementar mejores prácticas | `TESTED` | `src/opportunities.mjs`, `src/channels.mjs` | 24 tests | Generador de páginas por rol y `/vs/` |
| 4 | Capacidades de Mercadeo | `IMPLEMENTED` | Plantillas ES/EN + políticas de claims | Tests de redacción y claims | Revisión humana de copy |
| 5 | Agente de Mercadeo | `TESTED` | `src/agent.mjs` (objetivo, plan, verificación, reanudación) | Test de idempotencia y compuerta humana | Motor LLM: `BLOCKED` (sin proveedor autorizado) |
| 6 | A2A ↔ Mercadeo | `TESTED` | `src/bridge.mjs`, contratos por rol | Test E2E en proceso separado | — |
| 7 | Triggers comerciales | `TESTED` | Tres eventos soportados | E2E: recibir → aprobar → handoff → material | — |
| 8 | Canal A2A externo | `IMPLEMENTED` | `src/a2a-client.mjs` (Agent Card, allowlist, dry-run, recibos) | Tests de autorización y manipulación | Envío real: `BLOCKED` por política y falta de socio autorizado |
| 9 | Otros canales comerciales | `TESTED` | 9 adaptadores + registro central | Test por canal | Conectar canal real cuando exista autorización |
| 10 | Medición comercial | `TESTED` | `src/metrics.mjs` | Tasas, embudo y datos no disponibles | Panel web: no implementado |
| 11 | Pruebas integrales | `TESTED` | 24 tests, 2 tenants sintéticos | `npm test` | Ejecutar CI en cada PR |
| 12 | Certificación y producción | `BLOCKED` | — | — | Fusionar solo con aprobación; no desplegar |

## Bloqueos residuales

1. **REA `doctor` no pasa** por Node 26.4.0 (requiere 22.23.4+, 24.22.1+ o 26.12.1+). La inspección web funciona igual; los motores binarios (Hopper, Ghidra, IDA, JADX, Kuna) no están instalados y no son necesarios para observación web.
2. **Texto de página no retenido** por la política de REA (`not_approved`), por lo que no se citan propuestas de valor literales.
3. **Sin LLM autorizado**: el agente es determinista y no invoca modelos. No se declara capacidad de modelo sin prueba real.
4. **Envío externo desactivado**: el adaptador A2A funciona en seco; cualquier envío exige allowlist, autorización humana y aprobación explícita.
5. **Sin clientes reales ni ingresos verificados**: el registro solo contiene oportunidad sintética de pruebas. No se declaran ventas.

## Cambios técnicos de esta entrega

| Archivo | Cambio |
|---|---|
| `src/marketing.mjs` | Lock con `pid`/host/edad, recuperación de huérfanos, `reconcile`, `status` por estado, redacción sin saltos de línea |
| `src/rea.mjs` | Manifiesto v2: fecha, URL, cobertura, limitaciones y validación de dominio del proveedor |
| `src/bridge.mjs` | `CLONADOR_OPERATOR_TENANTS`, respeto de `CLONADOR_STATE_DIR` |
| `src/opportunities.mjs` | Registro central, deduplicación, transiciones y `WON` con ingreso verificado |
| `src/channels.mjs` | 8 adaptadores de canal |
| `src/metrics.mjs` | Embudo, conversiones y métricas no disponibles |
| `src/agent.mjs` | Motor de objetivos persistente con compuerta humana |
| `src/a2a-client.mjs` | Agent Cards, allowlist, dry-run, detección de manipulación |
| `scripts/summarize-rea.mjs` | Resumen verificable de artefactos REA |
| `tests/platform.test.mjs` | 8 pruebas nuevas, incluido E2E por proceso |

## Criterio de certificación

Ningún punto pasa a `CERTIFIED` sin: evidencia primaria revisada, pruebas verdes en CI, aprobación humana del PR y autorización explícita para producción. Hoy **no se cumple** ese conjunto.
