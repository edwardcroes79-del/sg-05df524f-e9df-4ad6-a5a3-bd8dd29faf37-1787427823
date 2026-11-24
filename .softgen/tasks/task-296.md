---
title: Corporate branding API authorization fix
status: in_progress
priority: urgent
type: bug
tags: [api, auth, corporate-branding, supabase]
created_by: agent
created_at: 2026-11-24T11:57:02Z
position: 296
---
## Notes
Investigar y corregir el error 403 en `/api/business/corporate-branding` sin debilitar el aislamiento multi-tenant ni cambiar funcionalidades no relacionadas. Confirmar primero la causa exacta revisando el endpoint, validación de `business_id`, permisos de Business Admin y Super Admin, encabezados/autenticación del frontend y cualquier dependencia de Supabase/RLS. Luego aplicar el cambio mínimo necesario para que Business Admin pueda gestionar solo su propio negocio y Super Admin pueda acceder mediante su flujo autorizado.

## Checklist
- [x] Inspeccionar el endpoint `/api/business/corporate-branding` y su lógica de autorización
- [x] Revisar el flujo frontend que llama al endpoint y los encabezados/sesión que envía
- [x] Confirmar el modelo de roles y las consultas/tablas de Supabase involucradas
- [x] Identificar la causa exacta del 403 con evidencia de código y/o esquema
- [x] Aplicar la corrección mínima necesaria en backend y, si hace falta, en el caller frontend
- [ ] Validar los escenarios de acceso propio, acceso cruzado, Super Admin y no autenticado
- [ ] Ejecutar verificación final sin tocar branding, auth o settings no relacionados

## Acceptance
Business Admin puede leer y actualizar corporate branding solo para su propio negocio.

Super Admin puede acceder al corporate branding de cualquier negocio desde un flujo autorizado.

Usuarios no autorizados o sin sesión siguen recibiendo rechazo sin exponer datos ni debilitar RLS.