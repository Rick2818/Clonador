# REA en Windows — alcance, comandos y comprobación

**REA no se ha ejecutado ni conectado en este repositorio mediante este PR.** Los siguientes pasos preparan su instalación e importación, pero no sustituyen la inspección auténtica.

Origen oficial: https://github.com/morluto/rea y https://rea.tools/

REA necesita una versión de Node.js compatible con su release (la documentación de la versión consultada indica Node 22.23.4+, 24.22.1+ o 26.12.1+). El runtime de la fábrica local de Mercadeo, que no incorpora REA como dependencia, tiene requisitos independientes.

## Configuración local — solo Windows

1. En Windows PowerShell, comprobar `node --version` y `npm --version`; actualizar Node si el requisito de REA no se cumple.
2. Revisar el plan de instalación con `npx rea-agents@latest setup --client codex --dry-run --json` si se utiliza Codex (cambiar por `gemini_cli`, `cursor` u otro cliente realmente instalado). **No instalar Hopper automáticamente:** no es necesario para inspección web y podría tener licencias adicionales.
3. Tras revisar permisos y cambios, ejecutar `npx rea-agents@latest setup --client codex` solo en el cliente elegido y verificar con `npx rea-agents@latest doctor --json` o el comando de diagnóstico documentado por la versión instalada.
4. En Chrome, usar un perfil temporal y un puerto CDP únicamente en loopback. Ejemplo orientativo en PowerShell, ajustar la ruta real del navegador:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\clonador-rea-browser" https://www.langflow.org
```

5. Enumerar las pestañas y observar exclusivamente las páginas públicas o aquellas a las que se tenga acceso autorizado:

```powershell
npx rea-agents@latest list-browser-targets http://127.0.0.1:9222 --json
npx rea-agents@latest inspect-web-page http://127.0.0.1:9222 TARGET_ID --observation-ms 1000 --json > .clonador\langflow-observation.json
npx rea-agents@latest analyze-web-bundle http://127.0.0.1:9222 TARGET_ID --json > .clonador\langflow-bundle.json
```

Repetir únicamente para páginas autorizadas de Relevance AI, eligiendo el identificador `TARGET_ID` de la pestaña correcta. La lista puede contener pestañas personales; no capturarlas accidentalmente.

6. Comprobar el identificador `evidence_id` real y la cobertura del JSON, y luego registrar su huella SHA-256 **sin declarar certificación**:

```powershell
node src/cli.mjs rea-stage --target langflow --evidence-id EVIDENCE_ID_REAL --file .clonador\langflow-observation.json --source-url "https://www.langflow.org/<ruta-observada>" --coverage "<qué se observó>" --limitations "<qué no se pudo observar>" --captured-at 2026-11-02T12:00:00Z
```

`stageReaEvidence` exige URL `https` del dominio de la plataforma declarada, cobertura y limitaciones; sin esos campos rechaza el registro con `INCOMPLETE_EVIDENCE`. El manifiesto guarda fecha, URL, cobertura, limitaciones y SHA-256 del artefacto.

El programa registra `IMPORTED_PENDING_HUMAN_REVIEW`. Una lectura externa, documentación, un reporte generado por otro agente o un JSON fabricado no se marca como inspección REA. Las trazas privadas no se suben a GitHub, y el archivo `.clonador` está excluido por `.gitignore`.

## Preguntas obligatorias del análisis

Registrar con fuentes, rutas, capturas y limitaciones: (a) cómo se crea un flujo/agente; (b) cómo conecta herramientas y otros agentes; (c) cómo construye materiales de Mercadeo; (d) qué automatizaciones y disparadores están disponibles; (e) qué capacidades A2A son observables; (f) qué páginas, casos de uso, demos, formularios, propuestas y canales realmente forman la tracción comercial pública.

No intentar evadir controles de acceso, descubrir secretos, reconstruir código privado ni atribuir ventas observadas a estas empresas sin evidencia. REA ayuda a analizar el comportamiento permitido, no proporciona por sí sola acceso a procesos internos ni cifras de facturación.