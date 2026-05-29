# Seguimiento - Sistema de Rastreo de Proyectos Küche

Los archivos de código están en: **`/src/app/seguimiento/`**

## Archivos Principales

- `page.tsx` - Página de entrada (login por código)
- `ConfirmedDashboard.tsx` - Dashboard clientes confirmados
- `ProspectDashboard.tsx` - Dashboard prospects
- `SeguimientoArchivosSection.tsx` - Componente archivos
- `lib.ts` - Tipos y utilidades
- `storage-blobs.ts` - Gestión de media

## Autenticación

- API: `POST /api/seguimiento/login`
- Entrada: `{ codigo: string }`
- Salida: `{ token, proyecto }`
- Bloqueo: 5 intentos = 5 minutos sin acceso
