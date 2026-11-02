# Informe consolidado — Clonador

**Fecha:** 2026-11-02
**Alcance ejecutado:** investigación REA sobre páginas públicas, plataforma comercial multicanal, agente de mercadeo determinista, integración A2A local, medición y QA.
**Estado global:** plataforma local funcional y probada. **No certificada para producción.**

## 1. Estado de los 12 puntos

Ver detalle en [`ESTADO-12-PUNTOS.md`](ESTADO-12-PUNTOS.md): 7 `TESTED`, 4 `IMPLEMENTED`, 1 `BLOCKED` (certificación) y 3 subcapacidades explícitamente bloqueadas (LLM, envío externo, motores binarios de REA).

## 2. Funcionalidades implementadas

- Workflow de materiales con deduplicación, aprobación humana y handoff interno.
- Registro central de oportunidades con 8 canales, transiciones auditables y deduplicación.
- Métricas de embudo, conversión y ingresos verificados, con lista explícita de métricas no disponibles.
- Motor de objetivos persistente: planificar, ejecutar, verificar y reanudar; nunca aprueba ni envía.
- Adaptador A2A saliente en seco: validación de Agent Card, allowlist, autorización humana y detección de manipulación.
- Recuperación operativa: locks huérfanos, trabajos interrumpidos y temporales.

## 3. Evidencias REA obtenidas

| Plataforma | Evidence ID | SHA-256 del artefacto | Cobertura |
|---|---|---|---|
| Langflow | `ev_1dafbd447…dd6289` | `6792b382…aff189` | Landing pública |
| Langflow | `ev_b6cf4206a…` | `e562a652…` | `/use-cases` |
| Langflow | `ev_534c06f00…` | `562c39d4…` | `/pricing` → 404 |
| Langflow | `ev_537443a3b…` | `b2dc22de…` | `/contact-us` |
| Relevance AI | `ev_4a779b63c…` | `15b96a87…` | Landing pública |
| Relevance AI | `ev_8ede21b4b…` | `de8a57e4…` | `/pricing` |
| Relevance AI | `ev_8ecd68160…` | `292c5474…` | `/integrations` (~2 787 fichas) |
| Relevance AI | `ev_5fc4141ae…` | `f3604640…` | `/use-cases/outbound-prospector` |
| Relevance AI | `ev_b73f66649…` | `472cd8d1…` | `/use-cases/proposal-builder` |
| Relevance AI | `ev_50d1ff319…` | `a6612291…` | `/customers/canva` |

Capturadas con Chrome 156 headless vía CDP y REA CLI 6.8.0. Estado `IMPORTED_PENDING_HUMAN_REVIEW`; no se declaran certificadas.

## 4. Comparativa comercial

En [`MATRIZ-REA-MERCADEO.md`](MATRIZ-REA-MERCADEO.md). Resumen: Relevance AI usa demo (`/book-a-demo`), casos con cliente nombrado, precios públicos y un catálogo de **~2 787 páginas de integración** como superficie de captación; Langflow prioriza contenido, biblioteca de plantillas (`/templates/...`) y contacto directo, sin página de precios en `/pricing` (404 observado). Precios concretos, ingresos y conversiones **no observados**.

## 5. Agente de Mercadeo

Determinista, sin LLM. Flujo: objetivo → oportunidad → borrador → calificación → material listo → verificación → compuerta humana. Idempotente y reanudable. La aprobación y el envío quedan fuera del agente.

## 6. Comunicación A2A

Bidireccional y local: eventos entrantes crean materiales; el agente A2A consulta materiales aprobados; las respuestas vuelven como eventos nuevos. Roles separados por token, deduplicación duradera, recibos persistentes y aislamiento por tenant.

## 7. Triggers probados

`a2a.partner.received`, `a2a.partner.reply.received`, `marketing.a2a.material.requested`. Cubiertos por prueba E2E con el bridge en un proceso separado y por pruebas de contrato.

## 8. Canales comerciales

A2A, formulario web, correo entrante, referencia, programa de socios, marketplace, directorio y captura manual. Todos normalizan al mismo registro; ninguno envía mensajes.

## 9. Panel y métricas

`node src/cli.mjs metrics` devuelve embudo, conversiones por etapa y canal, ingresos verificados por moneda y métricas no disponibles. No hay panel gráfico.

## 10. Pruebas

`npm run check` OK. `npm test`: **24 pruebas, 24 aprobadas, 0 fallidas** (16 de workflow + 8 de plataforma). Incluye dos tenants sintéticos y un E2E por proceso.

## 11. PR y commits

Rama `feature/rea-marketing-agent-20261101`, PR [#1](https://github.com/Rick2818/Clonador/pull/1). PR [#2](https://github.com/Rick2818/Clonador/pull/2) actualiza el registro de PR en `main`. Ninguno fusionado.

## 12. Bloqueos

- Node 26.4.0 impide `rea doctor` (se requiere 26.12.1+).
- Texto de página filtrado por política de REA.
- Sin proveedor LLM autorizado.
- Envío externo A2A desactivado.
- Sin clientes reales ni ingresos verificados.
- Motores binarios de REA no instalados.

## 13. Evaluación de certificación

No certificable. Faltan evidencias revisadas por humano, integración externa autorizada y aprobación de PR. Las pruebas locales no sustituyen esa certificación.

## 14. Preparación para producción

El código está listo para revisión: contratos claros, pruebas verdes, sin secretos en el repositorio y con envío externo cerrado por defecto. Producción requiere autorización explícita, despliegue separado y un socio A2A verificado.

---

**Advertencia:** Clonador no ha captado clientes, no ha vendido y no ha generado ingresos verificables. Ninguna cifra de este informe representa resultados comerciales.
