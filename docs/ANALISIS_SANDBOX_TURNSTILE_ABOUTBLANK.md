# Análisis: "Blocked script execution in 'about:blank' ... sandboxed"

## Qué se revisó

- `src/components/ui/Captcha.tsx`: no aplica ningún atributo `sandbox` ni crea iframes propios. Solo llama a `window.turnstile.render(containerRef.current, ...)`; el iframe interno lo crea el script oficial de Cloudflare (`https://challenges.cloudflare.com/turnstile/v0/api.js`).
- `src/components/home/Location.tsx`: tenía `sandbox="allow-scripts allow-same-origin allow-popups"` en el iframe de Google Maps. Se removió en el paso anterior, pero el error persiste porque **no es este iframe el que aparece en el log** (el stack trace referencia `normal?lang=auto`, que es la URL interna del widget de Turnstile, no la de Google Maps).
- `next.config.ts`, `vercel.json`, `src/app/layout.tsx`, rutas de API: no configuran ningún header `Content-Security-Policy`, `X-Frame-Options` ni meta tag `http-equiv`. No hay ninguna directiva `sandbox` (ni como atributo HTML ni como directiva CSP) originada en este proyecto.
- Búsqueda global de `sandbox`, `allow-scripts`, `allow-same-origin`, `iframe`: no quedan coincidencias en `src/` fuera de lo ya revisado.
- `docs/GUIA_DIAGNOSTICO_CITAS_Y_TURNSTILE.md` ya documentaba que un intento previo de agregar CSP propia fue retirado por conflictos con Next.js, confirmando que hoy no existe ninguna política activa.

## Conclusión

El código del frontend **no aplica ningún sandbox** al widget de Turnstile ni a ningún iframe que lo contenga. El mensaje se origina **dentro del propio iframe que Cloudflare inyecta** (`challenges.cloudflare.com/.../normal?lang=auto`), junto con otras líneas del mismo stack (`requestAdapter`/WebGPU "No available adapters", error de parseo de fuente WOFF2). Estas tres señales juntas son consistentes con **el propio Turnstile intentando usar WebGPU/Canvas fingerprinting para detección de bots y fallando al crear su iframe interno `about:blank`**, algo reportado por otros sitios que usan Turnstile y que ocurre incluso sin ninguna política sandbox propia — normalmente por:

- Extensiones del navegador (ad-blockers, VPN, "hardening" de privacidad) que interceptan/despojan el iframe de Cloudflare de permisos.
- Configuración del navegador (perfil con políticas de sandboxing de terceros, modo de "Enhanced Safe Browsing", GPU deshabilitada) — coincide con "No available adapters" y el warning de `powerPreference` ignorado en Windows.
- Bloqueadores de red/DNS o proxies corporativos que modifican la respuesta del script de Cloudflare.

## Qué no es

- No es un problema de nuestro `sandbox="..."` en `Location.tsx` (ya removido) ni de otro iframe del proyecto.
- No es una CSP del backend/proxy (`src/app/api/proxy/[...path]/route.ts` solo reenvía headers, no agrega `Content-Security-Policy` ni `sandbox`).

## Próximos pasos sugeridos

1. Reproducir en una ventana de incógnito sin extensiones para confirmar si el error desaparece (mismo patrón que el error de Trusted Types ya documentado).
2. Probar en otro navegador/perfil con GPU habilitada para descartar el bloqueo de WebGPU.
3. Si persiste en incógnito y en otro equipo, reportarlo a soporte de Cloudflare Turnstile con el `site key` y la URL, ya que el origen del iframe (`challenges.cloudflare.com`) no es código de este repositorio.
4. Mientras tanto, verificar que `onError` en `Captcha.tsx` no esté bloqueando el submit del formulario cuando este warning aparece (el warning en sí no debería impedir que `callback` reciba el token; confirmar con el usuario si el token de Turnstile efectivamente se genera o si el widget se queda cargando).
