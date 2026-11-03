# Recorridos comerciales de Boltech Group

Fecha: 2026-11-02. Estado: configurados y probados localmente. Identidad externa: Boltech Group.

## Configuración aplicada

| Recorrido | Mecanismo adaptado | Entrada propia | Conversión |
|---|---|---|---|
| `adoption-services` | Langflow: entrada útil, biblioteca y servicios | Guía de evaluación, fichas de ventas/mercadeo/operaciones y ofertas | Evaluación escrita → cualificación → propuesta de implementación, agente a medida o soporte |
| `solution-led` | Relevance AI: casos específicos, integraciones y comparación | Tres fichas por función, diez fichas de integración y dos comparativas | Solicitud escrita → validación técnica → propuesta |

La evaluación es por escrito. No implica agenda de reuniones ni promesa de plazos. Precio, alcance, aceptación y costos de terceros se acuerdan expresamente. Las diez integraciones son propuestas que requieren validación; las fichas no afirman que estén conectadas.

Las observaciones de las páginas públicas se registran en `config/commercial-playbooks.json` como `PUBLIC_WEB_NOT_REA`. No son nuevas capturas REA ni acreditan ventas o conversiones ajenas. El número de integraciones no se utiliza como prueba de rendimiento.

## Uso local

Desde la raíz de Clonador, con Node y npm disponibles:

```powershell
npm run commercial:plan
npm run commercial:build
npm run commercial:metrics
```

El generador crea una carpeta nueva en `.clonador/commercial-kit/review-*` con 22 documentos Markdown, 22 fichas JSON y un manifiesto. No sobrescribe kits previos ni registra oportunidades. Los documentos son borradores propios sujetos a revisión y las referencias aparecen en notas internas, separadas del mensaje para el comprador.

## Registrar una solicitud auténtica

1. Seleccionar la ficha JSON del material que originó la consulta.
2. Reemplazar todos los campos de ejemplo por la solicitud recibida; usar una referencia única y el tenant correcto.
3. Registrar `consent: true` únicamente cuando el interesado haya autorizado el contacto. No marcar consentimiento para superar la validación.
4. Usar `provenance: real` solo para una solicitud auténtica. Los ejemplos y ensayos deben conservar `synthetic`.
5. Ejecutar:

```powershell
node src/cli.mjs commercial-capture --file solicitud.json
node src/cli.mjs commercial-metrics --tenant boltech
```

La respuesta devuelve la oportunidad y los campos de cualificación que debe revisar el operador. No envía mensajes. El registro guarda recorrido, material, oferta y campaña. Repetir una referencia idéntica devuelve la misma oportunidad; cambiar su atribución o procedencia produce conflicto para revisión.

## Oferta y contenido

- Implementación de un flujo: mapa del proceso, configuración, pruebas y guía.
- Agente a medida: requisitos, implementación, validación y entrega.
- Soporte: alcance de atención y seguimiento por acordar.
- Casos por función: ventas, mercadeo y operaciones en cada recorrido.
- Integraciones propuestas: Airtable, Google Sheets, Gmail, Google Drive, Telegram, Supabase, n8n, HubSpot, Slack y Notion.
- Comparativas: construir con Langflow o contratar implementación; plataforma Relevance AI o servicio de implementación. Se comparan responsabilidades y alcance, sin atribuir superioridad o copiar contenido.

## Medición y activación pendiente

`commercial-metrics` exige tenant, excluye registros sintéticos y computa cualificación y propuestas desde el historial, incluso si una oportunidad terminó perdida. Los ingresos requieren etapa WON y evidencia verificada. Visitas y conversión visita/solicitud devuelven `null` hasta integrar medición pública. También se corrigió la métrica general para excluir ingresos sintéticos.

Esta configuración no instala formularios públicos ni activa SEO, correos, anuncios o A2A externo. Para recibir tráfico real se necesita revisar el kit, elegir las páginas, conectar un formulario aprobado y verificar un recibo real de extremo a extremo. No modificar Boltech-Group ni desplegar desde este repositorio sin autorización.

## Validación

`npm run check`: correcto. `npm test`: 38/38 (verificado 2026-11-03), incluidas las pruebas de este cambio. Las pruebas incluyen generación sin leads, consentimiento, atribución, idempotencia, aislamiento por tenant, historial y exclusión de ingresos sintéticos. Los fixtures etiquetados como real existen únicamente en directorios temporales de prueba; no son compradores.

## Fuentes públicas del mecanismo

- https://www.langflow.org/ — entrada gratuita, biblioteca, servicios y soporte.
- https://relevanceai.com/integrations — catálogo y CTA de contacto.
- https://relevanceai.com/pricing — oferta Enterprise y recursos por función/comparación.

Consultadas el 2026-11-02. No se copiaron marcas gráficas, testimonios ni afirmaciones de resultados. Ver `.agents/product-marketing.md` para el contexto y `config/commercial-playbooks.json` para adaptar oferta, tareas y metas.
