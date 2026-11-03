# Clonador — alcance rector de REA comercial

Fecha: 2026-11-02
Repositorio: Rick2818/Clonador
Identidad externa para clientes, socios y propuestas: Boltech Group.

## Objetivo

Investigar mediante REA, exclusivamente sobre recursos públicos o accesos autorizados, **cómo comercializan** Langflow y Relevance AI sus soluciones de agentes IA. Reimplementar de forma independiente, con código propio, las capacidades comerciales útiles que puedan comprobarse.

**A2A es un canal de venta entre varios, no la única estrategia.** El Agente de Mercadeo deberá apoyar al agente comercial A2A mediante mensajes internos bidireccionales y también generar materiales reutilizables para otros canales comerciales autorizados.

## Alcance de la investigación actual — solo comercial

1. **Adquisición:** canales públicos de captación, programas de partners, directorios, llamadas a la acción, demostraciones y formularios.
2. **Conversión:** recorrido desde visita hasta demo, solicitud de presupuesto, cualificación, propuesta y contratación, solo cuando sea observable.
3. **Oferta:** categorías de servicios, empaquetado y precios publicados; no suponer ingresos o ventas reales.
4. **Mercadeo:** tipos de contenido, segmentación visible, casos de uso, propuestas de valor, diferenciadores y conexión entre contenido y CTA.
5. **A2A y alianzas:** Agent Cards, documentación pública, estándares de interoperabilidad, flujo documentado de socios y mecanismos verificables de contacto.
6. **Medición:** distinguir eventos comprobados del proceso local, métricas públicas observables e hipótesis comerciales que todavía no tienen evidencia.

## Fuera de alcance en esta fase

- Investigación de la fabricación técnica de agentes, arquitectura interna o implementación del constructor.
- Clonación, descompilación o copia de código privado, marcas, diseños protegidos, credenciales o datos no públicos.
- Declarar que REA ha corrido, que existen ventas o contratos, o que un clon está certificado sin evidencia primaria.
- Envío externo A2A, cold email, publicaciones, propuestas, gasto de Connects, proveedores pagos, cambios de cron, secrets o producción.

## Matriz mínima de evidencias (una fila por observación)

| Campo | Requisito |
|---|---|
| Plataforma | Langflow o Relevance AI |
| Canal / etapa | Captación, conversión, mercadeo, A2A u otro canal verificado |
| URL y fecha | URL concreta y fecha de observación |
| Tipo de fuente | Observación REA en Windows, documentación oficial o página pública; no mezclar tipos |
| Acción observada | Qué hizo el usuario, qué respuesta ocurrió y con qué límites |
| Evidencia | ID de observación, hash SHA-256 y archivo local protegido cuando aplique |
| Confiabilidad | Verificado, parcialmente observado, hipótesis o no verificable |
| Reimplementación | Especificación propia sin usar código o activos ajenos |
| Validación | Test reproducible, recibo, aprobación humana y criterio de aceptación |

## Secuencia de ejecución

1. Ejecutar REA auténtico en Windows sobre las superficies comerciales autorizadas de ambas plataformas, conforme a `docs/REA-WINDOWS.md`.
2. Construir una matriz comparativa basada en evidencia, separando hallazgos públicos de inferencias.
3. Priorizar mejores prácticas de adquisición, conversión y Mercadeo para el mercado objetivo de Boltech Group.
4. Crear código original y pruebas de los comportamientos comerciales seleccionados, preservando el intercambio A2A ↔ Mercadeo mediante eventos internos.
5. Probar consentimiento, aprobación, deduplicación, aislamiento entre clientes, reintentos, recibos y persistencia con clientes sintéticos.
6. Mantener el PR en borrador; cualquier conexión externa y despliegue deberán ser explícitos, auditables y autorizados.

## Puerta de certificación

No marcar ninguna capacidad como `REA_VERIFIED` sin prueba primaria reproducible. La CI local, los borradores plantillados y las referencias oficiales no sustituyen REA real ni acreditan desempeño comercial de terceros.
