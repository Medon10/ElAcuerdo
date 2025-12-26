# Integración de Pagos (Mercado Pago)

## 1. Variables de Entorno (Render Backend)
Configura en Render (Environment > Environment Variables):
- MP_ACCESS_TOKEN: Token privado (Production o Test) de tu cuenta Mercado Pago.
- BACKEND_BASE_URL: URL pública del backend (ej: https://vacationmatch-backend.onrender.com)
- FRONTEND_ORIGINS: Lista de orígenes permitidos separados por coma (ej: https://vacationmatch-frontend.onrender.com)
- FRONTEND_BASE_URL: URL pública del frontend (ej: https://vacationmatch-frontend.onrender.com)

(No expongas MP_ACCESS_TOKEN en el frontend.)

## 2. Variables de Entorno (Frontend Vite)
En `frontend/.env` (no commitear credenciales privadas):
```
VITE_API_URL=https://vacationmatch-backend.onrender.com/api
VITE_MP_PUBLIC_KEY=TU_PUBLIC_KEY_MP
```
Usar `import.meta.env.VITE_MP_PUBLIC_KEY` si necesitas inicializar algún widget (para checkout clásico o Brick futuro). Actualmente usamos redirección `init_point`.

## 3. Flujo de Pago Implementado
1. Usuario abre modal y confirma reserva.
2. Backend crea la reserva (`/api/reservations`).
3. Frontend solicita creación de preferencia (`/api/payments/create-preference`).
4. Se recibe `init_point` y se redirige al checkout de Mercado Pago.
5. Mercado Pago envía webhook a `/api/payments/webhook` con el estado del pago.
6. Backend puede actualizar el estado de la reserva (actualmente ya queda en `confirmado`; opcional refactor a `pendiente` → `confirmado`).
7. Usuario vuelve vía `back_urls` a `/pago/resultado` (pendiente implementar página).

## 4. Endpoint: Crear Preferencia
POST `/api/payments/create-preference`
Body:
```json
{ "reservationId": 123 }
```
Respuesta:
```json
{
  "message": "Preferencia creada",
  "data": {
    "preferenceId": "XXX",
    "init_point": "https://www.mercadopago.com/...",
    "sandbox_init_point": "https://sandbox.mercadopago.com/...",
    "reservationId": 123
  }
}
```

## 5. Webhook
POST `/api/payments/webhook`
- Mercado Pago enviará diferentes eventos. Se procesa solo `topic=payment`.
- Actualiza la reserva a `confirmado` si el pago está `approved`.

Asegúrate de configurar la URL en la preferencia. Si usas dominio Render: `https://<backend-domain>/api/payments/webhook`.

## 6. Estados de Reserva (Mejoras Futuras)
Para reflejar el flujo completo de pago:
- Agregar estado `pendiente` al tipo y a la columna en DB.
- Crear reserva inicialmente en `pendiente`.
- Confirmar en webhook cuando `status=approved`.

## 7. Pruebas con cURL (Local)
```bash
# Crear reserva
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"flight_id":1, "cantidad_personas":2}'

# Crear preferencia
curl -X POST http://localhost:3000/api/payments/create-preference \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reservationId": 10}'

# Simular webhook (reemplazar <PAYMENT_ID>)
curl -X POST "http://localhost:3000/api/payments/webhook?topic=payment&id=<PAYMENT_ID>" \
  -H "Content-Type: application/json" -d '{}'
```

## 8. Checklist para Producción
- [ ] Agregar MP_ACCESS_TOKEN (privado)
- [ ] Agregar FRONTEND_BASE_URL y BACKEND_BASE_URL
- [ ] Verificar FRONTEND_ORIGINS incluye el dominio del frontend
- [ ] Crear página `/pago/resultado`
- [ ] (Opcional) Añadir estado `pendiente` al modelo Reservation

## 9. Seguridad
- Nunca exponer MP_ACCESS_TOKEN en el frontend.
- Validar que el `external_reference` siempre coincide con una reserva existente.
- Loggear eventos desconocidos para auditoría.

## 10. Siguientes Pasos
- Implementar página de resultado.
- Añadir estado `pendiente` y migración.
- Tests automatizados para flujo de pago.
