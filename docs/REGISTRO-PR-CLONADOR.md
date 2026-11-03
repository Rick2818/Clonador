# Registro de PR y dependencias entre proyectos — Clonador

**Última verificación:** 2026-11-03 (hora de El Salvador)
**Repositorio principal del proyecto:** [Rick2818/Clonador](https://github.com/Rick2818/Clonador)
**Empresa comercial:** Boltech Group.

## Regla de separación

- **Clonador:** proyecto de investigación y reimplementación legal mediante **REA (Reverse Engineer Anything)** de funcionalidades, flujos de creación de agentes y prácticas comerciales observables de plataformas como Langflow y Relevance AI. Su desarrollo propio corresponde a **Rick2818/Clonador**. No debe confundirse con la Fábrica de Agentes IA ni con la aplicación comercial existente de Boltech.
- **Boltech Group:** proveedor comercial, operación real y comunicaciones A2A externas; su infraestructura vigente está en [Rick2818/Boltech-Group](https://github.com/Rick2818/Boltech-Group).
- **Fábrica de Agentes IA:** proyecto distinto, con sus propios PR en [Rick2818/Fabrica-de-Agentes-IA](https://github.com/Rick2818/Fabrica-de-Agentes-IA).

**No trasladar código, PR, ejecutores, secretos, pagos ni despliegues entre estos repositorios por similitud de objetivo.** Un PR pertenece al repositorio donde fue creado; enlazarlo aquí no lo mueve ni duplica.

## Pull requests propios de Clonador

**Estado comprobado:** 2 PR abiertos, 0 fusionados (verificado el 2026-11-03 en [Clonador/pulls](https://github.com/Rick2818/Clonador/pulls?q=is%3Apr)).

| PR | Rama de origen | Estado | Alcance verificado |
|---|---|---|---|
| [#1 — REA: configuración local del agente de Mercadeo y puente A2A bidireccional](https://github.com/Rick2818/Clonador/pull/1) | `feature/rea-marketing-agent-20261101` | **Abierto**, marcado listo para revisión (ya no está en draft); sin fusionar; creado el 2026-11-01, actualizado el 2026-11-02 | 25 commits; 30 archivos, +2231/−9; cabeza `5386e2f`; `mergeable_state: clean`; CI `test` en success; 0 revisiones |
| [#4 — Recorridos comerciales: playbooks, oferta, kit de contenido y métrica real](https://github.com/Rick2818/Clonador/pull/4) | `feature/recorridos-comerciales-20261103` | **Abierto en draft**, sin fusionar; creado el 2026-11-03 | 1 commit; 16 archivos, +1365/−9 frente a su base; cabeza `9cf211b`; base apilada `feature/rea-marketing-agent-20261101` |

- `main` contiene únicamente documentación (`README.md` y este registro). El código del PR #1 —`src/marketing.mjs`, `src/bridge.mjs`, `src/cli.mjs`, `src/rea.mjs`, `config/*.json`, `tests/workflow.test.mjs` y el workflow de CI local— existe solo en la rama de origen.
- El PR incluye trigger A2A local, borradores ES/EN, compuerta de revisión humana y pruebas automatizadas, además de `AGENTS.md`/`opencode.json` con reglas de evidencia.
- **Qué NO certifica el PR #1:** no hay sesión REA ejecutada contra Langflow o Relevance AI, no hay envío A2A externo real, no hay validación en Windows registrada y no hay despliegue. Está marcado como listo para revisión, pero **no debe fusionarse** hasta cumplir las compuertas de evidencia.
- El **PR #4** está apilado sobre la rama del PR #1. Contra `main` mostraría 40 archivos porque #1 sigue sin fusionar; debe revisarse contra su rama base y no fusionarse antes que #1.
- El PR #4 aporta dos recorridos comerciales (`adoption-services`, `solution-led`), oferta sin precios publicados, 22 activos de revisión, captura con atribución y métrica por tenant. No publica páginas, no envía mensajes y no activa conectores.
- **Qué NO certifica el PR #4:** no hay conector web aprobado, ni recibo verificado de extremo a extremo, ni precios aprobados, ni clientes o ingresos verificados. Las observaciones de páginas públicas se registran como `PUBLIC_WEB_NOT_REA`, no como captura REA. Validación ejecutada el 2026-11-03: `npm run check` correcto y `npm test` 38/38.

No asignar los números #329 o #330 a este repositorio.

## PR relacionados, pero que pertenecen a Boltech Group

| Repositorio | PR | Propósito comprobado | Estado verificado | Referencia para Clonador |
|---|---|---|---|---|
| `Rick2818/Boltech-Group` | [#329](https://github.com/Rick2818/Boltech-Group/pull/329) | Receptor de mensajes A2A autenticados y recibos persistentes | Fusionado; commit `5666f85b66ee5c9a0d247017e34dbbdddcd7dcc5` | Dependencia de comunicación **entrante** del proveedor comercial |
| `Rick2818/Boltech-Group` | [#330](https://github.com/Rick2818/Boltech-Group/pull/330) | Cliente A2A **saliente**, versiones 1.0 y 0.3, verificación de Agent Cards, protección contra duplicados | Fusionado; commit `7c9c351f9d617a10b6cee0defb027d09434cc2d2` | Dependencia de comunicación **saliente** del proveedor comercial; desactivada para envíos sin autorización y destinos verificados |

**Importante:** estos dos PR **no contienen la clonación vía REA** de Langflow/Relevance AI ni certifican envío de propuestas comerciales a esas empresas. Son infraestructura técnica de Boltech. Se conservan aquí exclusivamente como enlaces de dependencia.

## Trabajo específico de Clonador todavía pendiente de evidencia REA

El PR #1 aporta andamiaje local (código y tests) para los puntos 4 y 5, pero **no sustituye** la evidencia REA ni la validación en Windows. Sigue pendiente:

1. Sesiones REA con evidencia reproducible para observar de forma autorizada creación de agentes, UX, integraciones y comportamiento de Langflow y Relevance AI.
2. Matriz comparativa REA de canales de captación, conversión, distribución y venta, con fuentes verificables; **A2A será uno de varios canales**.
3. Diseño e implementación originales de las capacidades verificables de mayor valor, sin copiar código propietario, datos internos, marcas ni accesos restringidos.
4. Evaluación y reimplementación de lo mejor observable de sus funciones de mercadeo para un agente de Mercadeo propio de Boltech.
5. Pruebas en entorno local Windows de Clonador y validación antes de subir componentes desarrollados o desplegar producción. La presencia de este registro en GitHub no certifica que Clonador esté terminado.

El **PR #4** implementa dos recorridos comerciales propios y su medición, pero tampoco sustituye la evidencia REA: las observaciones de páginas públicas quedan marcadas como `PUBLIC_WEB_NOT_REA` y las hipótesis de segmento, precio y conversión siguen sin validación con compradores reales.

## Convención para nuevos PR

- PR de **Clonador**: usar exclusivamente `Rick2818/Clonador`, con título `REA: <capacidad investigada>`, evidencia de observación, límites, pruebas y autorización.
- PR de **A2A operativo comercial** o ventas existentes: usar exclusivamente `Rick2818/Boltech-Group`, con referencias cruzadas documentales cuando sean necesarias.
- PR de **Fábrica de Agentes IA**: usar exclusivamente su propio repositorio.
- No anunciar un PR como fusionado, certificado o en producción sin verificar el estado en el repositorio correspondiente y sus pruebas.

## Referencia rápida

- [PR propios de Clonador](https://github.com/Rick2818/Clonador/pulls?q=is%3Apr)
- [PR #1 · REA agente de Mercadeo y puente A2A](https://github.com/Rick2818/Clonador/pull/1)
- [PR #4 · Recorridos comerciales](https://github.com/Rick2818/Clonador/pull/4)
- [PR #329 · A2A receptor Boltech](https://github.com/Rick2818/Boltech-Group/pull/329)
- [PR #330 · A2A cliente de salida Boltech](https://github.com/Rick2818/Boltech-Group/pull/330)

_Registro de trazabilidad. No representa migración de código ni ejecución de REA._
