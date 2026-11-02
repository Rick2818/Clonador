# Clonador — Mercadeo y A2A: arquitectura de implementación

Estado: **MVP funcional local, sin certificación REA ni conexiones comerciales externas.**

## Flujo de operación

A2A local autenticado → POST `/v1/a2a/events` → validación y deduplicación duradera → borrador institucional → operador aprueba → traspaso a bandeja interna A2A → A2A local consulta POST `/v1/a2a/materials` → (el envío externo, si alguna vez se autoriza, requiere un adaptador independiente con acuse verificable). Una respuesta de socio entra como nuevo evento de tipo `a2a.partner.reply.received` y dispara otro borrador. Mercadeo **no** publica ni envía correos, mensajes o propuestas a terceros.

Los eventos `a2a.partner.received`, `a2a.partner.reply.received` y `marketing.a2a.material.requested` se procesan al recibirse, no mediante cron. El servidor local escucha solo `127.0.0.1`. Requiere tokens distintos de al menos 32 caracteres `CLONADOR_A2A_TOKEN` y `CLONADOR_OPERATOR_TOKEN`, establecidos como variables locales de entorno (jamás en Git).

## Prueba local

```powershell
npm test
node src/cli.mjs trigger --file examples/a2a-event.SYNTHETIC.json
node src/cli.mjs receipt --tenant synthetic-company --event synthetic-demo-001
node src/cli.mjs approve --tenant synthetic-company --event synthetic-demo-001 --operator director
node src/cli.mjs handoff --tenant synthetic-company --event synthetic-demo-001
node src/cli.mjs status
```

Servidor evento a evento (no se debe exponer por internet):

```powershell
$env:CLONADOR_A2A_TOKEN = "<introduzca token aleatorio de 32 caracteres o más>"
$env:CLONADOR_OPERATOR_TOKEN = "<otro token distinto de 32 caracteres o más>"
node src/bridge.mjs
```

Los tokens del bloque son **instrucciones** de configuración, no credenciales de ejemplo para producción. El código impide arrancar sin claves suficientemente largas y distintas. Los clientes HTTP deben enviar Bearer autorizado por rol.

## Qué se implementa y qué no

- **Operativo local:** tres triggers por evento, dos roles separados, creación de materiales ES/EN con oferta de Boltech, estados persistentes por tenant y evento, deduplicación, redacción de datos sensibles, aprobación, entrega interna a A2A y retorno como nuevo evento, tests de contrato.
- **No operativo todavía:** integración al A2A de producción de Boltech, relación con socios reales, envío a Langflow/Relevance AI, scheduler autónomo, LLM/modelos, análisis verdadero de REA en Windows, campañas multicanal y medición de ingresos.
- **No significa clonación funcional certificada:** los textos actuales son plantillas originales de base; se perfeccionarán únicamente con evidencias obtenidas de las aplicaciones observadas y pruebas autorizadas. El resultado no hace claims de funcionamiento interno de terceros.

## Criterios para pasar a producción en otro PR

1. Evidencias REA auténticas, almacenadas localmente, cobertura y limitaciones revisadas.
2. Autorización de destinatario A2A, tarjeta y endpoints verificables y credencial aprobada; no tratar un acuse local como entrega externa.
3. Contrato de integración seguro con el A2A comercial de Boltech sin copiar secretos ni cruzar repositorios directamente.
4. Logs y recibos persistentes, prueba de fallo a medio proceso y prueba real con consentimiento.
5. Política de costes y gastos autorizados. Cero publicaciones/envíos automáticos hasta aprobación.

## Documentos públicos de referencia (no son resultados de REA)

- Langflow A2A server: https://docs.langflow.org/1.11.0/a2a-server
- Langflow A2A agent: https://docs.langflow.org/1.12.0/a2a-agent-component
- REA browser observation: https://github.com/morluto/rea/blob/main/docs/browser-observation.md
- REA setup: https://github.com/morluto/rea/blob/main/docs/installation.md

Estas referencias solo demuestran características documentadas públicamente. No certifican el agente de Mercadeo de un tercero ni sus métodos de venta.