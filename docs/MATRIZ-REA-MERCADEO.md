# Matriz REA — Mercadeo y captación comercial

**Estado:** sin capturas reales de REA verificadas. Esta matriz es un inventario de preguntas para investigación y documentación pública, NO evidencia de funcionamiento interno ni ventas.

| Plataforma | Capacidad documentada públicamente | Evidencia pública | Investigación REA necesaria | Implementación Clonador |
|---|---|---|---|---|
| Langflow | Configurar flujos de agentes y publicarlos como A2A | https://docs.langflow.org/1.11.0/a2a-server | Observar un flujo autorizado de entrada, salida, herramientas y aprobación; registrar Evidence ID, límites y pantalla | A2A interno local funcional; flujo real externo pendiente |
| Langflow | Componente A2A para invocar agentes remotos | https://docs.langflow.org/1.12.0/a2a-agent-component | Inspeccionar descubrimiento, roles, credenciales y protocolo usando permisos propios | Requisitos documentados; no clon certificado |
| Relevance AI | Operaciones de agentes y materiales de marketing (documentación pública por verificar módulo a módulo) | https://relevanceai.com | Observar agentes, entradas, entrega de materiales, trazas y fuentes; no inferir arquitectura interna | Plantillas originales ES/EN y revisión humana |
| Ambos | Embudo comercial, distribuidores, contenido y conversión | Sitios públicos oficiales | Trazar páginas, formularios, demos, CTA, autorizaciones y recibos observables | Canales enumerados, NO activos |

## Gate de cada funcionalidad replicada

1. URI de origen y consentimiento para observar.
2. `evidence_id` REA auténtico y archivo local retenido, más cobertura/limitaciones.
3. Explicación de comportamiento observado sin afirmar acceso a código privado.
4. Diseño independiente en Clonador y test que reproduzca el comportamiento permitido.
5. Comprobación de seguridad y autorización de canales; prohibido atribuir métricas/ventas a proveedores sin prueba.

El importador `rea-stage` solo registra una huella del archivo y marca `IMPORTED_PENDING_HUMAN_REVIEW`. **No certifica que REA se ejecutó**.
