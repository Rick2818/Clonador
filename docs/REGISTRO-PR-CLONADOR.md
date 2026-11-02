# Registro de PR y dependencias entre proyectos — Clonador

**Última verificación:** 2026-11-01 (hora de El Salvador)
**Repositorio principal del proyecto:** [Rick2818/Clonador](https://github.com/Rick2818/Clonador)
**Empresa comercial:** Boltech Group.

## Regla de separación

- **Clonador:** proyecto de investigación y reimplementación legal mediante **REA (Reverse Engineer Anything)** de funcionalidades, flujos de creación de agentes y prácticas comerciales observables de plataformas como Langflow y Relevance AI. Su desarrollo propio corresponde a **Rick2818/Clonador**. No debe confundirse con la Fábrica de Agentes IA ni con la aplicación comercial existente de Boltech.
- **Boltech Group:** proveedor comercial, operación real y comunicaciones A2A externas; su infraestructura vigente está en [Rick2818/Boltech-Group](https://github.com/Rick2818/Boltech-Group).
- **Fábrica de Agentes IA:** proyecto distinto, con sus propios PR en [Rick2818/Fabrica-de-Agentes-IA](https://github.com/Rick2818/Fabrica-de-Agentes-IA).

**No trasladar código, PR, ejecutores, secretos, pagos ni despliegues entre estos repositorios por similitud de objetivo.** Un PR pertenece al repositorio donde fue creado; enlazarlo aquí no lo mueve ni duplica.

## Pull requests propios de Clonador

**Estado comprobado inicial:** 0 PR antes de comenzar esta implementación.

- **[PR #1 — REA: configuración local del agente de Mercadeo y puente A2A bidireccional](https://github.com/Rick2818/Clonador/pull/1)** — abierto en **draft**, pendiente de ejecución REA auténtica en Windows y certificación de la integración externa. Incluye trigger A2A local, borradores ES/EN, revisión humana y tests. **No es una clonación REA terminada ni una integración comercial real.**

No asignar los números #329 o #330 a este repositorio.

## PR relacionados, pero que pertenecen a Boltech Group

| Repositorio | PR | Propósito comprobado | Estado verificado | Referencia para Clonador |
|---|---|---|---|---|
| `Rick2818/Boltech-Group` | [#329](https://github.com/Rick2818/Boltech-Group/pull/329) | Receptor de mensajes A2A autenticados y recibos persistentes | Fusionado; commit `5666f85b66ee5c9a0d247017e34dbbdddcd7dcc5` | Dependencia de comunicación **entrante** del proveedor comercial |
| `Rick2818/Boltech-Group` | [#330](https://github.com/Rick2818/Boltech-Group/pull/330) | Cliente A2A **saliente**, versiones 1.0 y 0.3, verificación de Agent Cards, protección contra duplicados | Fusionado; commit `7c9c351f9d617a10b6cee0defb027d09434cc2d2` | Dependencia de comunicación **saliente** del proveedor comercial; desactivada para envíos sin autorización y destinos verificados |

**Importante:** estos dos PR **no contienen la clonación vía REA** de Langflow/Relevance AI ni certifican envío de propuestas comerciales a esas empresas. Son infraestructura técnica de Boltech. Se conservan aquí exclusivamente como enlaces de dependencia.

## Trabajo específico de Clonador todavía sin PR verificado

1. Sesiones REA con evidencia reproducible para observar de forma autorizada creación de agentes, UX, integraciones y comportamiento de Langflow y Relevance AI.
2. Matriz comparativa REA de canales de captación, conversión, distribución y venta, con fuentes verificables; **A2A será uno de varios canales**.
3. Diseño e implementación originales de las capacidades verificables de mayor valor, sin copiar código propietario, datos internos, marcas ni accesos restringidos.
4. Evaluación y reimplementación de lo mejor observable de sus funciones de mercadeo para un agente de Mercadeo propio de Boltech.
5. Pruebas en entorno local Windows de Clonador y validación antes de subir componentes desarrollados o desplegar producción. La presencia de este registro en GitHub no certifica que Clonador esté terminado.

## Convención para nuevos PR

- PR de **Clonador**: usar exclusivamente `Rick2818/Clonador`, con título `REA: <capacidad investigada>`, evidencia de observación, límites, pruebas y autorización.
- PR de **A2A operativo comercial** o ventas existentes: usar exclusivamente `Rick2818/Boltech-Group`, con referencias cruzadas documentales cuando sean necesarias.
- PR de **Fábrica de Agentes IA**: usar exclusivamente su propio repositorio.
- No anunciar un PR como fusionado, certificado o en producción sin verificar el estado en el repositorio correspondiente y sus pruebas.

## Referencia rápida

- [PR propios de Clonador](https://github.com/Rick2818/Clonador/pulls?q=is%3Apr)
- [PR #329 · A2A receptor Boltech](https://github.com/Rick2818/Boltech-Group/pull/329)
- [PR #330 · A2A cliente de salida Boltech](https://github.com/Rick2818/Boltech-Group/pull/330)

_Registro de trazabilidad. No representa migración de código ni ejecución de REA._
