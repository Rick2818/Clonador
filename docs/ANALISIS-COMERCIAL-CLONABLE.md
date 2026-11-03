# Análisis comercial clonable — Langflow y Relevance AI

**Fecha:** 2026-11-02
**Pregunta:** ¿qué parte de estas empresas está demostrado que funciona y vende, y por tanto se puede clonar sin inventar?
**Regla:** se clona el **mecanismo comercial** (embudo, oferta, superficies de captación), no el producto, el código, la marca ni el contenido.

---

## 0. Veredicto

Son dos máquinas comerciales distintas y ambas dejan rastro verificable:

- **Langflow** vende **adopción**: producto abierto y gratuito como entrada, monetización por nube empresarial, servicios profesionales y soporte premier. Su prueba pública es escala de comunidad, no ingresos.
- **Relevance AI** vende **enterprise asistido**: sin precio autoservicio visible, un solo nivel "Enterprise", demo como puerta y una superficie SEO enorme (≈2 787 fichas de integración + páginas de comparación + casos con cliente nombrado).

**Lo clonable no es su producto. Es su embudo y su arquitectura de oferta.** Y de las dos, la que mejor se puede replicar con presupuesto cero es la de Relevance AI, porque su captación es contenido estructurado, no comunidad.

---

## 1. Niveles de evidencia usados

| Nivel | Fuente | Qué permite afirmar |
|---|---|---|
| **A** | Artefacto REA propio (10 registros con SHA-256) | Estructura, rutas, número de enlaces, existencia de páginas |
| **B** | Página pública consultada el 2026-11-02 | Textos, precios mostrados, CTAs, logos |
| **C** | Inferencia razonada | Hipótesis comercial, nunca presentada como hecho |

**Límites reales:** REA filtró el texto del DOM (`not_approved`), así que la estructura viene de **A** y el contenido de **B**. No hay acceso a ingresos, conversiones, contratos ni precios negociados. Ninguna cifra de este documento es una cifra de ventas.

---

## 2. Langflow — modelo de adopción con monetización aguas abajo

### Evidencia observada
- Página principal (B): **153k** estrellas GitHub, **25k** Discord, **10k** X, **16k** YouTube.
- CTA principal: **"Get Started for Free"** → `/desktop/`; CTA secundario: **"Star on GitHub"**.
- Navegación: `/use-cases/`, `/blog/`, `/events/`, `/podcast/`, `/contact-us/`, `/desktop/`.
- El formulario de newsletter apunta a `ibm.com/subscribe` con `utm_source=langflow.org` (B): indica distribución vía IBM.
- Rutas de ingreso profesional: **Professional Services** y **Premier Support**, ambas por `/contact-us/` (B).
- `/pricing` → **404** (A, `ev_534c06f00`).
- `/use-cases` → 46 enlaces que derivan a `/templates/<caso>` (A, `ev_b6cf4206a`).
- Testimonios con nombre y cargo de BetterUp, WinWeb y Athena Intelligence (B).

### Cómo gana dinero (lectura)
No cobra por el producto base. Cobra por **nube empresarial, soporte premier y servicios profesionales**, todo por contacto. El producto gratuito es el canal de adquisición.

### Qué está demostrado
- Que un producto gratuito + comunidad + biblioteca de plantillas genera **adopción masiva medible**.
- Que existe una **línea de servicios y soporte** vendible sin publicar precios.

### Qué no está demostrado
- Que las estrellas se conviertan en ingresos.
- Que exista autoservicio de pago (no hay página de precios).

### Clonable
| Mecanismo | Por qué funciona | Nuestro equivalente |
|---|---|---|
| Entrada gratuita con valor inmediato | Reduce fricción a cero | Material y diagnóstico gratuito, no software |
| Biblioteca de plantillas por caso de uso | Captación por utilidad y SEO | Catálogo de materiales reutilizables por rol |
| Servicios profesionales como línea de ingreso | Monetiza sin producto terminado | Oferta de implementación de agentes |
| Soporte premier | Ingreso recurrente | Contrato de soporte/acompañamiento |

---

## 3. Relevance AI — venta enterprise asistida por contenido estructurado

### Evidencia observada
- `/pricing` (B): **un solo nivel, "Enterprise"**, con CTA **"Talk to sales"** → `/book-a-demo`. Sin precio.
- Ese nivel lista: acciones personalizadas, créditos de proveedor, agentes/usuarios/proyectos/workforces ilimitados, **2 000+ integraciones**, agentes de llamadas y reuniones, triggers enterprise, evaluaciones, A/B testing y analítica, SSO, RBAC, audit logs, account manager dedicado.
- **12 logos** de clientes visibles y **7 casos** enlazados: Canva, Autodesk, Lightspeed Commerce, Rakuten Advertising, Qualified, Send Payments, Zembl.
- `/integrations` (A, `ev_8ecd68160`): **~2 787 enlaces** a fichas `/integrations/<nombre>`.
- Páginas por función: ventas, éxito del cliente, marketing, soporte, operaciones, RR. HH., research (B/A).
- Páginas de comparación: `/vs/clay`, `/vs/claude-managed-agents`, `/vs/openai-codex`, `/vs/gemini-enterprise`, `/vs/microsoft-copilot-studio`, `/vs/gumloop`, `/vs/dust` (B).
- Programa de partners + **directorio de partners expertos**, Academy, comunidad, blog, eventos, whitepapers, topics (B).
- Casos por rol: `/use-cases/outbound-prospector`, `/use-cases/proposal-builder` (A).

### Cómo gana dinero (lectura)
**Enterprise con ACV alto y ciclo asistido.** El contenido no cierra la venta: llena el embudo y la demo hace el cierre. La superficie SEO (integraciones + comparativas + casos) es la que produce volumen de leads.

### Qué está demostrado
- Que **contenido estructurado a escala** (fichas de integración + comparativas + casos) es un canal de captación viable y medible.
- Que un embudo **demo-first** funciona cuando el ticket es alto.
- Que la **prueba social con nombre** es parte del argumento de venta.

### Qué no está demostrado
- Volumen de leads, conversión, ni ingresos.
- Que los logos impliquen contrato vigente.
- Precios reales (la página no los muestra).

### Clonable
| Mecanismo | Por qué funciona | Nuestro equivalente |
|---|---|---|
| Fichas de integración indexables | SEO long-tail + socio | Catálogo propio de integraciones/casos |
| Páginas `/vs/<competidor>` | Captura intención de comparación | Comparativas honestas con fuente |
| Casos por función compradora | Mensaje por rol | Material por rol desde una fuente |
| Demo como paso de conversión | Cualifica antes de gastar tiempo | Canal `demo_request` ya implementado |
| Directorio de partners | Canal de referidos estructurado | `partner_program` + `referral` |
| Academy y webinars | Educación → confianza | Contenido y eventos medibles |

---

## 4. Qué está demostrado que vende (y qué no)

| Señal | Qué prueba | Qué NO prueba |
|---|---|---|
| 153k estrellas (Langflow) | Adopción de desarrolladores | Ingresos o clientes de pago |
| 12 logos, 7 casos (Relevance) | Relación comercial publicada | Contrato vigente ni importe |
| ≈2 787 integraciones | Inversión deliberada en SEO/ecosistema | Que conviertan |
| Nivel único Enterprise | Venta asistida de ticket alto | Precio ni margen |
| Servicios + soporte premier | Línea de ingreso declarada | Volumen |
| Demo como único CTA | El producto no se vende solo | Tasa de cierre |

**Conclusión:** lo demostrado es **el mecanismo**, no el resultado económico. Clonar el mecanismo es legítimo; inventar el resultado sería fraude analítico.

---

## 5. Playbook clonable para Boltech / Clonador

Ordenado por relación impacto/costo, con presupuesto **US$0**.

| # | Mecanismo | Evidencia | Estado en Clonador | Brecha |
|---|---|---|---|---|
| 1 | Demo-first en lugar de formulario genérico | A+B (ambas) | Canal `demo_request` implementado | Falta flujo de agenda y respuesta |
| 2 | Catálogo de integraciones/directorios | A (2 787 fichas) | Canal `directory` + registro | Falta generador de fichas |
| 3 | Páginas `/vs/<competidor>` | B (7 rutas) | — | Falta plantilla y datos verificados |
| 4 | Casos por función compradora | A (7 funciones) | Material ES/EN por evento | Falta plantilla por rol |
| 5 | Biblioteca de plantillas/materiales | A (`/templates`) | Materiales persistidos | Falta catálogo público |
| 6 | Prueba social con nombre | B | — | Requiere consentimiento verificable |
| 7 | Partner directory | B | `partner_program`, `referral` | Falta registro de partners |
| 8 | Academy / webinars | B | `inbound_email`, `web_form` | Falta contenido |
| 9 | Nivel enterprise sin precio público | B | — | Falta config de oferta |
| 10 | Servicios profesionales / soporte | B | — | Falta definición de servicio |

### Lo que ya tenemos y sostiene el playbook
- Registro central multicanal con procedencia y deduplicación.
- Aprobación humana obligatoria antes de cualquier entrega.
- Métricas de embudo que devuelven `null` cuando no hay datos.
- Envío externo cerrado por defecto.

Es decir: la infraestructura para **medir** el playbook ya existe; falta el **contenido y la oferta**.

---

## 6. Plan 30 / 60 / 90 días

### 30 días — captación mínima verificable
1. Página de oferta con tres servicios concretos (implementación, agente a medida, soporte).
2. Ruta de demo con `demo_request` y respuesta en menos de 24 h.
3. Tres páginas por función (ventas, marketing, operaciones) creadas desde el mismo material base.
4. Diez fichas de integración propias, con fuente y fecha.
5. Métricas activas: capturas por canal, demos, propuestas.

**Criterio de éxito:** 10 oportunidades registradas con procedencia `real` y al menos 3 demos agendadas.

### 60 días — superficie de comparación y prueba
1. Cinco páginas `/vs/` con afirmaciones citadas.
2. Dos casos de cliente **con consentimiento escrito**.
3. Tres piezas de academy.
4. Catálogo de plantillas publicable.

**Criterio:** 30 oportunidades, 10 demos, 3 propuestas preparadas.

### 90 días — canales de socio y escala
1. Directorio de partners con criterios de admisión.
2. Programa de referidos medido por origen.
3. Prospección A2A **solo con socios verificados y autorización**.

**Criterio:** 1 propuesta autorizada enviada por adaptador verificado y 1 conversación comercial documentada.

---

## 7. Lo que NO se clona

- Código, arquitectura interna o assets de Langflow o Relevance AI.
- Marca, logotipos, tipografías o diseño.
- Textos comerciales literales.
- Casos de cliente, cifras o testimonios sin consentimiento.
- Cualquier afirmación de ingresos, clientes o resultados no verificados.

La estructura comercial (embudo, tipos de página, arquitectura de oferta) es práctica de industria; el contenido y la marca son de cada empresa.

---

## 8. Riesgos y reglas de honestidad

1. **No comparar con nombres ajenos sin fuente.** Cada `/vs/` debe citar la página y fecha.
2. **No reutilizar logos ni testimonios.**
3. **No prometer resultados** que no estén medidos en nuestro propio embudo.
4. **No publicar cifras de terceros** sin enlace verificable.
5. **Distinguir siempre** dato propio, dato público y estimación.

---

## 9. Conclusión operativa

La parte comercial que está demostrado que funciona es esta: **entrada de bajo roce → contenido estructurado que capta intención → demo que cualifica → prueba social que cierra → oferta enterprise asistida**.

Clonador ya tiene el motor interno (registro, aprobación, métricas, canales). Lo que falta no es código: es **oferta definida, contenido verificable y una ruta de demo que responda**. Ese es el trabajo de los próximos 30 días, y se puede hacer con presupuesto cero y sin inventar una sola cifra.
