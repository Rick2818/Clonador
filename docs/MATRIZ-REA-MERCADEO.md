# Matriz REA de mercadeo — Langflow vs Relevance AI

**Fecha:** 2026-11-02
**Método:** observación REA sobre páginas públicas con Chrome 156 headless vía CDP, más documentación pública.
**Regla:** cada fila indica su tipo de fuente. Una observación estructural no es una captura de textos, precios ni procesos internos.

## Evidencia primaria registrada (10 artefactos)

| Plataforma | Página | Evidence ID (prefijo) | SHA-256 (prefijo) | Cobertura | Limitación |
|---|---|---|---|---|---|
| Langflow | `/` | `ev_1dafbd447` | `6792b382` | Landing: DOM, enlaces, recursos | Texto filtrado (840 campos) |
| Langflow | `/use-cases` | `ev_b6cf4206a` | `e562a652` | Listado de casos de uso | Texto filtrado |
| Langflow | `/pricing` | `ev_534c06f00` | `562c39d4` | Intento de página de precios | **404 observado** |
| Langflow | `/contact-us` | `ev_537443a3b` | `b2dc22de` | Página de contacto | Sin envío de formulario |
| Relevance AI | `/` | `ev_4a779b63c` | `15b96a87` | Landing: DOM, enlaces, recursos | Texto filtrado (1 384 campos) |
| Relevance AI | `/pricing` | `ev_8ede21b4b` | `de8a57e4` | Página de precios existente | Texto de planes filtrado |
| Relevance AI | `/integrations` | `ev_8ecd68160` | `292c5474` | Catálogo de integraciones | Texto filtrado |
| Relevance AI | `/use-cases/outbound-prospector` | `ev_5fc4141ae` | `f3604640` | Caso de uso por rol | Texto filtrado |
| Relevance AI | `/use-cases/proposal-builder` | `ev_b73f66649` | `472cd8d1` | Caso de uso por rol | Texto filtrado |
| Relevance AI | `/customers/canva` | `ev_50d1ff319` | `a6612291` | Caso de cliente | Sin métricas verificables |

Los manifiestos completos están en `.clonador/rea-evidence/` con `schemaVersion: 2`, fecha, URL, cobertura, limitaciones y SHA-256. Estado: `IMPORTED_PENDING_HUMAN_REVIEW`.

## Estructura observada (landings)

| Señal | Langflow | Relevance AI |
|---|---|---|
| Nodos DOM | 2 458 | 2 461 |
| Encabezados h1/h2/h3 | 2 / 1 / 1 | 1 / 7 / 13 |
| Enlaces (`a`) | 38 | 101 |
| Botones | 7 | 35 |
| Imágenes | 23 | 152 |
| Formularios en landing | 0 | 0 |
| Inputs | 4 | 0 |
| Recursos de terceros | 0 | 0 |
| Texto de marketing | No retenido | No retenido |

## Rutas comerciales observadas

| Capacidad | Langflow | Relevance AI | Tipo |
|---|---|---|---|
| Casos de uso | `/use-cases` (46 enlaces, 15 botones) | `/use-cases/{sales, customer-success, marketing, customer-support, operations}` | Observado |
| Biblioteca de plantillas | `/templates/<caso>` enlazada desde `/use-cases` | — | Observado |
| Conversión | `/contact-us` (0 formularios en el DOM observado) | `/book-a-demo` | Observado |
| Precios públicos | **`/pricing` → 404** | `/pricing` existe | Observado |
| Prueba social | Blog, podcast, eventos | `/customers/<cliente>` (7 clientes enlazados desde `/`) | Observado |
| Ecosistema | — | `/integrations` con **~2 787 enlaces** a fichas `/integrations/<nombre>` | Observado |
| Empresa | `/desktop` | `/enterprise` | Observado |
| Educación | `/blog`, `/podcast`, `/events` | `/resources/...`, webinars | Observado |
| Producto nuevo | — | `/invent` | Observado |

## Comparativa comercial

| Dimensión | Langflow | Relevance AI | Confiabilidad |
|---|---|---|---|
| Título/posicionamiento | "Low-code AI builder for agentic and RAG applications" | "Specialist AI Agents for Every Task" | Verificado |
| Motor de captación | Contenido + biblioteca de plantillas | Demo + catálogo de integraciones + casos de cliente | Observado |
| Superficie SEO | Blog, podcast, plantillas | ~2 787 páginas de integración + roles + clientes | Observado |
| Segmentación | Casos de uso genéricos | Por función (ventas, marketing, soporte, operaciones, éxito) | Observado |
| Prueba social | Contenido propio | Clientes nombrados | Observado |
| Precios | Sin página pública en la ruta probada | Página pública existe; planes no capturados | Observado / parcial |
| Formularios en landing | 0 | 0 | Observado |
| Ingresos o conversiones | No observado | No observado | No verificable |

## Lectura comercial

1. **Catálogo de integraciones como canal de adquisición.** Relevance AI convierte su ecosistema en ~2 787 páginas indexables con CTA a `/book-a-demo`. Es captación por SEO y por socio, no por formulario.
2. **Biblioteca de plantillas como equivalente en Langflow.** `/use-cases` deriva a `/templates/...`: captación por utilidad inmediata.
3. **Demo como paso de conversión.** Relevance no captura en la landing; lleva a `/book-a-demo`.
4. **Segmentación por función.** Las rutas `/use-cases/sales|marketing|customer-success|customer-support|operations` permiten un mensaje por comprador.
5. **Precios como decisión de posicionamiento.** Langflow no publica en `/pricing`; Relevance sí. No se puede concluir estrategia interna, solo la diferencia observable.

## Implicaciones para Clonador (diseño propio)

1. Ruta de demo prioritaria frente a formulario genérico.
2. Una pieza de material por función compradora, generada desde una sola fuente de verdad.
3. Catálogo de integraciones modelable como `directory`/`marketplace` en el registro multicanal.
4. Casos con cliente nombrado solo con consentimiento verificable; hoy no se publica ninguno.
5. Webinars y contenido educativo como canal medible futuro.

## Brechas

- Texto de página no retenido: no se citan propuestas de valor ni nombres de planes.
- Sin sesión: no se observaron checkout, onboarding ni flujos internos.
- Sin red ni cabeceras: no se identificaron analítica ni pagos.
- Sin datos de conversión: cualquier cifra sería inventada.

## Próxima evidencia (requiere autorización adicional)

1. Fichas concretas de integración (`/integrations/<nombre>`) para medir plantilla y CTA.
2. Página de precios de Relevance con política de texto aprobada.
3. Demo pública de ambas plataformas.
