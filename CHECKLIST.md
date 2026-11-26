# Rojas Bakery: lo que falta para el proyecto completo

Estado al 25/11/2026. Hecho: paquete de diseño (requerimientos, casos de prueba, identidad, tokens, 24 maquetas) y maqueta navegable en `app/` (12 pantallas + PDF, mobile/tablet/desktop, datos fijos, cálculo de tortas verificado contra el caso 2).

## 0. Datos y decisiones que tiene que definir el negocio

- [ ] % de seña definitivo (la maqueta usa 50%) y días de validez del presupuesto (usa 7)
- [ ] Texto de políticas de cancelación y cambios
- [ ] Texto de cuidados y conservación
- [ ] WhatsApp, zona, alias y CBU para el PDF
- [ ] Zonas de envío y sus precios (hoy solo existe CABA $5.000 y "Retira el cliente")
- [ ] Precios de los extras (confirmar topper $4.500, velas $1.500, muñeco $7.000, caja $2.500)
- [ ] Montos reales de luz, gas, agua e internet, y sus factores de intensidad
- [ ] Horas laborales reales del mes (la maqueta usa 160; el resumen muestra 58 trabajadas)
- [ ] Valor hora real de mano de obra
- [ ] Carga inicial: todos los insumos con presentación y precio, todas las recetas base y todos los productos
- [ ] Rendimiento real de la masa de alfajores (figura como [RENDIMIENTO REAL])
- [ ] Precios de Chocotorta, Budín de limón, Cookies y Cake pops (figuran como [PRECIO])
- [ ] Confirmar los 4 colores que no están en tokens.css (#FBEDEC, #F3DDBF, #E58E95, #F6C3C6)
- [ ] Definir si V1/V2 queda como está propuesto

## 1. Motor de cálculo (dominio puro)

- [ ] Proyecto backend Node + TypeScript con arquitectura hexagonal
- [ ] Costo de ingredientes: precio ÷ presentación × cantidad, con merma
- [ ] Validación de unidades coherentes (kg→g, L→ml, unidad→u; no mezclar)
- [ ] Escalado de tortas: volumen (×0,81 / ×1 / ×1,21) y superficie (×0,88 / ×1 / ×1,12)
- [ ] Ajuste manual de tiempos por variante
- [ ] Servicios compartidos (÷ 720 h × factor; gas con horas de horno)
- [ ] Gastos exclusivos + amortización de equipos ÷ horas laborales
- [ ] Mano de obra, margen 30% y redondeo hacia arriba configurable
- [ ] Mesa dulce: ingredientes proporcionales, tandas completas de masa y horno, decoración por unidad, redondeo solo del total, cantidad 4 a 36
- [ ] Budines (sin variantes, porciones de referencia)
- [ ] Extras y envío a precio final; seña sobre el total; precio por porción
- [ ] Montos en centavos enteros en todo el dominio
- [ ] Tests: caso 1 alfajores ($20.300 / $20.630)
- [ ] Tests: caso 2 Red Velvet (las 4 variantes, total $69.800, seña $34.900, porción $2.010)
- [ ] Tests: caso 3 cookies (1,25 recetas, 2 tandas)
- [ ] Tests de borde: merma 0% y 15%, redondeo 1.495→1.500, 1.501→1.600, 1.500→1.500, unidades mezcladas, snapshot

## 2. Base de datos y API

- [ ] PostgreSQL + Prisma: esquema y migraciones
- [ ] Entidades: usuaria, insumo, receta base (con categoría e ingredientes), producto (tortas, budines, mesa dulce) y variantes, gasto fijo, equipo, tarifario de extras, tarifario de envíos, configuración, datos del negocio, presupuesto, pedido, lista de compras
- [ ] CRUD de cada módulo con validación Zod compartida con el front
- [ ] Borrado seguro: archivar insumos y recetas que se usan en productos
- [ ] Fecha de última actualización de precio en cada insumo
- [ ] Snapshot de precios y configuración al generar un presupuesto (no se recalcula después)
- [ ] Numeración correlativa de presupuestos (#0014…)
- [ ] Conversión de presupuesto a pedido (entra en "Señado")
- [ ] Cambios de estado del pedido: Señado → Realizado → Pago → Enviado, más Cancelado
- [ ] Catálogo siempre con precios actualizados (recalcular al cambiar insumos, valor hora o gastos)
- [ ] Endpoints del resumen mensual (ventas, ganancia, pedidos, horas, ticket promedio, costo total, ventas por semana, composición del costo, más vendidos)
- [ ] Seed con los datos de las maquetas para desarrollo

## 3. Autenticación y seguridad

- [ ] Login de una usuaria con usuario y contraseña (bcrypt)
- [ ] JWT en cookie httpOnly; cierre de sesión
- [ ] "Olvidé mi contraseña" (definir cómo se recupera)
- [ ] Rutas protegidas en front y back
- [ ] Rate limit en login, CORS, headers de seguridad

## 4. Imágenes y PDF

- [ ] Almacenamiento de objetos (Cloudinary o Supabase Storage)
- [ ] Subir y reemplazar foto de insumo, foto de producto y foto de referencia del cliente (desde el celular y la PC)
- [ ] Logo del negocio cargable desde Datos del negocio
- [ ] PDF "Presupuesto de pedido" generado en el back (@react-pdf/renderer), igual a la maqueta A4
- [ ] El PDF nunca muestra costos internos
- [ ] Compartir o descargar el PDF desde el celular (por ejemplo, para mandarlo por WhatsApp)

## 5. Frontend: pasar la maqueta a la app real

- [ ] Conectar todas las pantallas a la API (TanStack Query) en lugar de los datos fijos
- [ ] Formularios con React Hook Form + Zod
- [ ] Listado de Presupuestos (enviados, sin respuesta, convertidos); hoy el menú lleva directo a "Nuevo"
- [ ] Presupuesto personalizado: combinar productos, recetas base, insumos, forrado, extras y envío
- [ ] Presupuesto de mesa dulce (selector de cantidad 4 a 36)
- [ ] Botón "Convertir en pedido"
- [ ] Detalle de pedido (ver y editar)
- [ ] Pantallas de alta y edición: producto, receta base (con ingredientes), insumo, gasto, equipo, extra, envío
- [ ] Pantalla de Datos del negocio y de Configuración completa (incluye redondeo de mesa dulce)
- [ ] Lista de compras: crear listas estándar y propias, generar desde pedidos por rango de fechas sumando insumos, compartir
- [ ] Navegación real de semanas en la agenda y de meses en el resumen
- [ ] Drag and drop del kanban persistente; "mantener presionado" en mobile
- [ ] Búsquedas y filtros conectados a datos reales
- [ ] Estados vacíos, de carga y de error con el tono de voz de la guía
- [ ] Confirmaciones antes de archivar o cancelar
- [ ] Revisión de accesibilidad (contraste, foco, lectores de pantalla, áreas de 44 px)

## 6. PWA y notificaciones

- [ ] vite-plugin-pwa: manifest, íconos, instalable en Android y PC
- [ ] Funcionamiento sin conexión (fuentes autoalojadas ya están)
- [ ] Web Push con VAPID: suscripción desde la app
- [ ] Tarea diaria programada que avisa pedidos con N días de anticipación (5 por defecto)
- [ ] Probar en el Motorola Razr 60

## 7. Calidad, deploy y operación

- [ ] Repositorio git y estructura final (front, back, paquete de diseño)
- [ ] Lint, formato y CI que corra los tests
- [ ] Tests de API y algunos tests de punta a punta de los flujos principales
- [ ] Entornos (desarrollo y producción) y variables de entorno
- [ ] Hosting del front, del back y de la base de datos
- [ ] Dominio y HTTPS (necesario para PWA y push)
- [ ] Backups automáticos de la base de datos
- [ ] Monitoreo de errores
- [ ] Migración de los datos de la planilla actual
- [ ] Prueba con la planilla de alfajores en producción ($20.630)

## 8. V2 (después del lanzamiento)

- [ ] Lista de compras completa (si no entra en V1)
- [ ] Resumen mensual con datos reales (si no entra en V1)
- [ ] Historial de precios de insumos
- [ ] Integración opcional con ARCA para facturar
