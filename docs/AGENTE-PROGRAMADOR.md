# Agente de programación: selección y puesta en marcha

**Selección:** OpenCode como agente principal por soporte oficial en REA, compatibilidad con modelos diversos, configuración local por proyecto y capacidad de edición/ejecución/pruebas. **Alternativa avanzada:** OpenHands, a comparar por pruebas propias; en Windows requiere WSL (y Docker para ciertos modos).

## Estado real

- Configuración `opencode.json` y reglas `AGENTS.md`: guardadas en rama de desarrollo.
- OpenCode instalado en Windows: **no verificado**.
- REA instalado/activo en Windows: **no verificado**.
- Modelo gratuito conectado, compatible y apto para programar: **no verificado**.
- Captura REA real de Langflow/Relevance AI: **pendiente**.
- Conexiones a socios y producción: **inactivas**.

## Preparación en PowerShell local

```powershell
node --version
npm --version
git --version
opencode --version
npx -y rea-agents@latest --help
```

Si OpenCode no está instalado, instalar después de comprobar origen y permisos:

```powershell
npm install -g opencode-ai
```

Dentro de la carpeta local de `Clonador`, revisar primero el setup REA:

```powershell
npx rea-agents@latest setup --client opencode --dry-run --json
```

Tras revisar los cambios, ejecutar `npx rea-agents@latest setup --client opencode` y su diagnóstico documentado. La elección de modelo se hará tras comprobar disponibilidad, condiciones comerciales, límites y pruebas de código. No pegar claves en el repositorio.

## Pruebas de aceptación

1. OpenCode inicia en el directorio correcto y reconoce `AGENTS.md`.
2. El modelo elegido edita un archivo de prueba y ejecuta tests localmente sin gastos inesperados.
3. La integración MCP REA responde al diagnóstico y enumera herramientas reales.
4. REA realiza una observación autorizada, y Clonador conserva ID, hash y límites.
5. OpenCode implementa una modificación original en una rama aislada y supera CI.
6. El operador comprueba que no se produjeron envíos, pagos, cambios de cron ni despliegues.

**Regla:** documentación y configuración en GitHub no equivalen a una instalación en el ordenador del usuario.

Referencias:
- https://docs.opencode.ai/docs/agents/
- https://docs.opencode.ai/docs/mcp-servers/
- https://github.com/morluto/rea/blob/main/docs/installation.md
- https://docs.openhands.dev/
