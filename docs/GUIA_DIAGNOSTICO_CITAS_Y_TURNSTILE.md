# Guia de diagnostico: citas y Cloudflare Turnstile

## Objetivo

Esta guia desglosa todo lo que debe revisarse para que el flujo publico de agendar citas funcione correctamente en local y despues en produccion.

El flujo esperado es:

```text
Usuario sin iniciar sesion
  -> /agendar
  -> selecciona fecha y horario
  -> completa sus datos
  -> resuelve Cloudflare Turnstile
  -> POST /api/citas/agregarCita
  -> backend valida captcha y datos
  -> backend guarda la cita
```

La pagina `/agendar` debe ser publica. El captcha protege el envio de la cita, pero no debe impedir entrar a la pagina.

## 1. Errores observados

### 1.1 Error Trusted Types

Mensaje observado:

```text
Creating a TrustedTypePolicy named 'trustedReplaceNodeTextPolicy'
violates the following Content Security policy directive:
"trusted-types Kssz2 default"
```

Tambien aparecieron referencias como:

```text
VM9
content-script.js
injectScriptTag
```

Estas referencias indican normalmente que una extension del navegador esta inyectando un script. No corresponden al codigo de la aplicacion.

El proyecto no tiene una politica `Content-Security-Policy` propia en `next.config.ts` ni en `src`. La politica CSP que se agrego durante las pruebas fue retirada porque bloqueo una politica interna de Next.js:

```text
nextjs#bundler
```

Decision actual:

- no agregar `trusted-types 'allow-duplicates'` al frontend
- no agregar una CSP global solo para silenciar una extension
- probar en una ventana de incognito sin extensiones
- revisar la extension que inyecta `content-script.js` si el mensaje continua

Este error es independiente de la validacion del captcha en el backend.

### 1.2 Error de sesion 401

Mensaje observado:

```text
GET http://localhost:3000/api/auth/session 401 (Unauthorized)
```

Un visitante anonimo no tiene cookie de sesion, por lo que la ausencia de sesion es normal en `/agendar`. La ruta de sesion fue ajustada para responder un estado normal con `success: false`, evitando un error rojo innecesario en la consola.

Esto no debe convertir `/agendar` en una ruta protegida.

### 1.3 Error de creacion de cita 400

Mensaje observado:

```text
POST http://localhost:3000/api/proxy/api/citas/agregarCita 400 (Bad Request)
```

La URL es correcta. El prefijo `/api/proxy` pertenece al proxy de Next.js y se elimina antes de reenviar al backend:

```text
Navegador: http://localhost:3000/api/proxy/api/citas/agregarCita
Backend:  http://localhost:3001/api/citas/agregarCita
```

El `400` significa que el backend recibe la solicitud pero rechaza su contenido o alguna validacion. Las causas principales son:

- captcha ausente
- captcha invalido o expirado
- site key y secret key de entornos diferentes
- nombre incorrecto del header
- campos del body incompatibles con el esquema del backend
- fecha fuera de horario o con anticipacion insuficiente
- horario ocupado
- formato de fecha no aceptado

## 2. Configuracion actual del frontend

Archivo:

```text
.env
```

Configuracion local:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_API_URL=http://localhost:3001
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAEXDasq90F9UN4O8
NEXT_PUBLIC_TURNSTILE_MODE=development
```

En modo desarrollo, el componente `Captcha` utiliza la site key de prueba oficial de Cloudflare Turnstile. La clave real se conserva para produccion.

El componente esta en:

```text
src/components/ui/Captcha.tsx
```

El componente:

- carga el script oficial de Cloudflare
- renderiza Turnstile explicitamente
- entrega el token mediante `onVerify`
- limpia el token al expirar o fallar
- evita recrear el widget en cada render
- muestra el codigo de error de Cloudflare si existe

El token se conserva en `BookingSection` y se envia al crear la cita.

## 3. Contrato de la solicitud de cita

### 3.1 Ruta

```http
POST /api/citas/agregarCita
```

Debe ser publica y no debe exigir:

```http
Authorization: Bearer ...
```

### 3.2 Headers

El frontend envia:

```http
Content-Type: application/json
captcha-token: <token-generado-por-cloudflare>
```

El backend debe leer exactamente el header `captcha-token`. No debe buscar el token dentro del body JSON.

### 3.3 Body

El frontend envia una estructura equivalente a:

```json
{
  "nombreCliente": "Marcela",
  "correoCliente": "marcela@example.com",
  "telefonoCliente": "6180000000",
  "ubicacion": "Durango Capital",
  "fechaAgendada": "2026-08-28T14:30:00.000Z",
  "informacionAdicional": "Solicitud de cita desde landing - Durango Capital",
  "estado": "programada"
}
```

Campos que deben confirmarse en el backend:

- `nombreCliente`
- `correoCliente`
- `telefonoCliente`
- `fechaAgendada`
- `ubicacion`
- `informacionAdicional`
- `estado`

El backend debe confirmar si `estado` puede ser enviado por el cliente o si debe asignarlo internamente como `programada`.

## 4. Validacion de Cloudflare Turnstile

### 4.1 Desarrollo local

Si el frontend usa la site key oficial de prueba, el backend local debe usar la secret key oficial de prueba correspondiente. No se debe mezclar:

```text
site key de prueba + secret key real
site key real + secret key de prueba
```

La pareja de claves debe corresponder al mismo entorno.

### 4.2 Produccion

En produccion se debe configurar:

- site key real en las variables publicas del frontend
- secret key real solamente en el backend
- dominio de produccion autorizado en el widget de Cloudflare

La secret key nunca debe utilizarse como `NEXT_PUBLIC_*` ni enviarse al navegador.

### 4.3 Verificacion en backend

El backend debe tomar el token del header:

```text
captcha-token
```

y verificarlo contra:

```http
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
```

La verificacion debe enviar:

```text
secret=<TURNSTILE_SECRET_KEY>
response=<valor-de-captcha-token>
```

Si la verificacion falla, el backend debe devolver una respuesta clara, por ejemplo:

```json
{
  "success": false,
  "message": "La validacion de Cloudflare Turnstile no fue valida.",
  "error-codes": ["invalid-input-response"]
}
```

El token es de un solo uso y expira. No debe reutilizarse despues de un rechazo.

## 5. Dominios autorizados en Cloudflare

El widget de Cloudflare debe tener autorizados los dominios donde se ejecuta el frontend.

Para local:

```text
localhost
127.0.0.1
```

Para produccion:

```text
tu-dominio.com
www.tu-dominio.com
```

El dominio debe coincidir con el origen real del navegador. `localhost:3000` y `localhost:3001` usan el mismo host, pero un dominio publicado requiere su propio registro en Cloudflare.

## 6. Pruebas recomendadas

### 6.1 Probar disponibilidad

```http
GET http://localhost:3001/api/citas/disponibilidad?fecha=2026-08-26
```

Respuesta correcta sin citas:

```json
{
  "success": true,
  "fecha": "2026-08-26",
  "horariosOcupados": []
}
```

Esta ruta ya responde correctamente en el entorno local probado.

### 6.2 Probar creacion sin captcha

Esta prueba debe fallar si el captcha es obligatorio, pero debe devolver un mensaje explicito:

```text
HTTP 400
{
  "success": false,
  "message": "Captcha requerido"
}
```

No debe devolver un error interno generico ni un stack trace en produccion.

### 6.3 Probar creacion desde el navegador

1. Reiniciar Next.js despues de modificar `.env`.
2. Abrir `/agendar`.
3. Confirmar que el widget se renderiza.
4. Completar el captcha.
5. Confirmar en DevTools que la solicitud contiene `captcha-token`.
6. Confirmar que el body contiene todos los campos requeridos.
7. Revisar la respuesta JSON del backend.

La solicitud del navegador debe verse asi:

```text
POST http://localhost:3000/api/proxy/api/citas/agregarCita
```

Esto es correcto. No se debe cambiar a una llamada directa desde el navegador a `localhost:3001` si el proyecto utiliza el proxy.

## 7. Interpretacion de respuestas HTTP

### `200 OK`

La operacion fue aceptada. En disponibilidad puede representar una lista vacia.

### `400 Bad Request`

El backend recibio la solicitud, pero rechazo datos, captcha, fecha, horario o esquema. Debe incluir un mensaje especifico.

### `401 Unauthorized`

La ruta exige autenticacion o se envio un token invalido. No corresponde al flujo publico de crear citas.

### `403 Forbidden`

El usuario esta autenticado, pero no tiene permisos. Corresponde a rutas administrativas, no a la creacion publica.

### `409 Conflict`

El horario fue ocupado entre la consulta de disponibilidad y el envio de la cita. Es la respuesta recomendada para evitar duplicados.

### `500 Internal Server Error`

Fallo interno del backend. No debe utilizarse para reportar captcha faltante o datos invalidos.

## 8. Lista de revision del backend

- [ ] `POST /api/citas/agregarCita` existe.
- [ ] La ruta es publica.
- [ ] No exige JWT.
- [ ] Lee el header `captcha-token`.
- [ ] Verifica el token con Cloudflare `siteverify`.
- [ ] Usa la secret key correspondiente al entorno.
- [ ] El widget autoriza `localhost` en desarrollo.
- [ ] El dominio de produccion esta autorizado.
- [ ] Devuelve un mensaje claro cuando falta el captcha.
- [ ] Devuelve un mensaje claro cuando el captcha es invalido.
- [ ] Valida nombre, correo y telefono.
- [ ] Valida `fechaAgendada`.
- [ ] Valida zona horaria.
- [ ] Valida lunes a viernes.
- [ ] Valida horario laboral.
- [ ] Valida anticipacion minima.
- [ ] Valida separacion entre citas.
- [ ] Evita duplicados en solicitudes simultaneas.
- [ ] Devuelve `409` para conflictos de horario.
- [ ] No devuelve stack traces en produccion.
- [ ] No expone datos personales en disponibilidad publica.
- [ ] Mantiene protegido el listado completo de citas.

## 9. Lista de revision del frontend

- [ ] `/agendar` abre sin iniciar sesion.
- [ ] Se carga el script de Turnstile.
- [ ] Se usa la site key correspondiente al entorno.
- [ ] El token se guarda despues de `onVerify`.
- [ ] El token se limpia al expirar o fallar.
- [ ] Se envia `captcha-token` al backend.
- [ ] Se usa `POST /api/citas/agregarCita`.
- [ ] Se usa `GET /api/citas/disponibilidad?fecha=...`.
- [ ] No se consultan rutas legacy de listado desde `/agendar`.
- [ ] Los errores del backend se muestran en pantalla.
- [ ] No se agrega una CSP global innecesaria.
- [ ] Se prueba el flujo sin extensiones del navegador.

## 10. Conclusion

El frontend ya tiene preparado el flujo publico y las rutas correctas. El `400` actual demuestra que el backend esta recibiendo la solicitud, pero la rechaza. El punto que debe confirmarse primero es la pareja de claves de Turnstile y el header `captcha-token`; despues deben revisarse el body y las reglas de fecha y horario.

El mensaje Trusted Types no debe solucionarse agregando una CSP mas permisiva al proyecto. Al estar asociado a `content-script.js` y `VM9`, debe aislarse probando sin extensiones del navegador.

Para cerrar la integracion se necesita una respuesta JSON explicita del backend cuando rechaza la solicitud. Sin ese cuerpo no es posible distinguir de forma definitiva entre captcha invalido, campo incorrecto, horario ocupado o fecha rechazada.
