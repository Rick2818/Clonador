# Matriz REA de mercadeo — Langflow vs Relevance AI

**Fecha:** 2026-11-02
**Método:** observación REA sobre páginas públicas con Chrome 156 headless vía CDP, más documentación pública.
**Regla:** cada fila indica su tipo de fuente. Una observación estructural no es una captura de textos, precios ni procesos internos.

## Evidencia primaria registrada

| Plataforma | Evidence ID | URL observada | Capturada | Cobertura | Limitaciones |
|---|---|---|---|---|---|
| Langflow | `ev_1dafbd447f4ef82d6a0267a8a4203fb0e870508c27c36ed0400b48c280dd6289` | https://www.langflow.org/ | 2026-11-02T15:40Z | Landing pública: DOM, enlaces, recursos, número de nodos | Texto de página filtrado por política (`not_approved`, 840 campos excluidos); sin red ni cabeceras; sin sesión |
| Relevance AI | `ev_4a779b63c16a721e43060e527b5dd4e83408ba98652f4e3b5873f851c3a1041e` | https://relevanceai.com/ | 2026-11-02T15:42Z | Landing pública: DOM, enlaces, recursos, número de nodos | Texto filtrado (1 384 campos); sin red; sin sesión |

Manifiestos locales en `.clonador/rea-evidence/` con SHA-256 del artefacto. Estado: `IMPORTED_PENDING_HUMAN_REVIEW`.

## Estructura observada

| Señal | Langflow | Relevance AI | Tipo de fuente |
|---|---|---|---|
| Nodos DOM | 2 458 | 2 461 | Observado |
| Encabezados h1/h2/h3 | 2 / 1 / 1 | 1 / 7 / 13 | Observado |
| Enlaces (`a`) | 38 | 101 | Observado |
| Botones | 7 | 35 | Observado |
| Imágenes | 23 | 152 | Observado |
| Formularios en landing | 0 | 0 | Observado |
| Inputs | 4 | 0 | Observado |
| Recursos de terceros | 0 | 0 | Observado |
| Texto de marketing | No retenido por política | No retenido por política | Observado (ausencia) |

## Rutas comerciales observadas

| Capacidad | Langflow | Relevance AI | Lectura |
|---|---|---|---|
| Casos de uso | `/use-cases` | `/use-cases/<rol>` (8 rutas) | Ambos segmentan por caso de uso; Relevance lo hace por rol operativo |
| Prueba social | `/blog`, `/podcast`, `/events` | `/customers/{canva, autodesk, lightspeed-commerce, rakuten-advertising, qualified, send-payments, zembl}` | Relevance publica casos con cliente nombrado; Langflow prioriza contenido propio |
| Conversión directa | `/contact-us` | `/book-a-demo` | CTA de demo explícito en Relevance; contacto en Langflow |
| Empresa | `/desktop` | `/enterprise` | Oferta enterprise separada en Relevance |
| Ecosistema | — | `/integrations` | Catálogo de integraciones como superficie de captación |
| Educación | `/blog`, `/podcast` | `/resources/levels-of-ai-autonomy`, webinar `/events/confluent-webinar` | Contenido educativo y webinars como canal |
| Producto nuevo | — | `/invent`, `/blog/launching-invent` | Lanzamientos usados como evento de marketing |

Rutas tomadas literalmente del artefacto; no se infiere contenido que la observación no retuvo.

## Comparativa comercial

| Dimensión | Langflow | Relevance AI | Confiabilidad |
|---|---|---|---|
| Posicionamiento declarado (título de página) | "Low-code AI builder for agentic and RAG applications" | "Specialist AI Agents for Every Task" | Verificado (título observado) |
| Modelo de captación | Contenido + comunidad (blog, podcast, eventos) | Demo + casos de cliente + integraciones | Parcialmente observado |
| Segmentación | Por caso de uso genérico | Por rol y tarea (prospector, proposal builder, pre-meeting) | Observado en rutas |
| Prueba social | Contenido propio | Logos y páginas de clientes reales | Observado en rutas |
| Formularios en landing | Ninguno | Ninguno | Observado |
| Precios | No observado | No observado | No verificable |
| Ingresos o conversiones | No observado | No observado | No verificable |

## Implicaciones para Clonador (diseño propio)

1. **Demo antes que formulario:** la landing no captura en el primer clic; deriva a `/book-a-demo`. Clonador ya expone `web_form` como canal, pero debe priorizar una ruta de demo.
2. **Páginas por rol:** Relevance segmenta por tarea concreta. El Agente de Mercadeo puede generar una pieza por rol (prospector, proposal builder, pre-meeting) desde una sola fuente de verdad.
3. **Casos con nombre:** la prueba social con cliente nombrado requiere consentimiento verificable; hasta entonces, Clonador no debe publicar casos.
4. **Catálogo de integraciones como canal:** convertir integraciones en superficie de captación es una capacidad que el registro multicanal ya puede modelar como `directory`/`marketplace`.
5. **Webinars y contenido:** canal educativo medible; queda como `inbound_email`/`web_form` hasta que exista adaptador autorizado.

## Brechas de esta fase

- Texto de página no retenido: no se puede citar copy ni propuestas de valor literales.
- Sin sesión autenticada: no se observaron precios, checkout, onboarding ni flujos internos.
- Sin red ni cabeceras: no se identificaron proveedores de analítica ni pagos.
- Sin datos de conversión: cualquier cifra comercial sería inventada.

## Próxima evidencia a obtener (requiere autorización)

1. Sesión pública de demo de Relevance AI y de Langflow, con captura de política de texto aprobada.
2. Páginas de precios si son públicas.
3. Catálogo `/integrations` de Relevance y `/use-cases` de Langflow, una fila por observación.
