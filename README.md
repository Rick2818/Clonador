# Clonador — Agente de Mercadeo + A2A local

Proyecto interno de investigación y reimplementación legal de funcionalidades verificables con REA. **La empresa comercial es Boltech Group**, pero Clonador y sus PR son independientes de `Rick2818/Boltech-Group` y de la Fábrica de Agentes IA.

Esta rama incluye un **MVP local** de Mercadeo: borradores originales en español/inglés, triggers A2A por evento, comunicación interna de ida y vuelta, aprobación obligatoria, registro multicanal de oportunidades, métricas y evidencias persistentes. No envía mensajes externos, no publica contenidos y no incurre en gastos. **REA se ejecutó sobre dos landings públicas** (Langflow y Relevance AI) con evidencia registrada; el texto de página quedó filtrado por la política de REA y no se declara certificación.

Requisitos del MVP: Node.js 22+ y npm. Instalar dependencias adicionales: **ninguna**.

```powershell
npm run check
npm test
node src/cli.mjs rea-plan
node src/cli.mjs trigger --file examples/a2a-event.SYNTHETIC.json
node src/cli.mjs metrics
node src/cli.mjs status
```

Documentación: [implementación y endpoints](docs/IMPLEMENTACION.md), [REA en Windows](docs/REA-WINDOWS.md), [estado de los 12 puntos](docs/ESTADO-12-PUNTOS.md), [matriz REA de mercadeo](docs/MATRIZ-REA-MERCADEO.md), [informe consolidado](docs/INFORME-CONSOLIDADO.md), [registro de PR](docs/REGISTRO-PR-CLONADOR.md).

Este repositorio no debe desplegarse hasta validar la integración real y los requisitos REA. Sin crons ni publicaciones automáticas.