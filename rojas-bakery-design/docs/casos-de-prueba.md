# Casos de prueba del motor de cálculo

Los tests del dominio tienen que reproducir estos números exactos. Todos los montos están en pesos. En el código se manejan en centavos y se redondea solo donde se indica.

## Fórmula

```
costoTotal = ingredientes + servicios + gastosNegocio + manoDeObra
precioProducto = redondearArriba(costoTotal × (1 + margen), múltiplo)   // margen 30%, múltiplo $100
totalCliente = precioProducto + extras + envío                          // extras y envío: precio final, sin margen ni redondeo
seña = totalCliente × %seña                                             // 50%
porPorción = precioProducto ÷ mínimo de porciones                       // solo referencia
```

- `ingredientes = Σ (precio de la presentación ÷ cantidad de la presentación × cantidad usada)`. Con merma: cantidad útil = presentación × (1 − merma%).
- `servicios = horasTrabajo × Σ(factura ÷ 720 × factor) de luz, agua e internet + horasHorno × (factura de gas ÷ 720 × factor de gas)`.
- `gastosNegocio = (Σ gastos exclusivos del mes, incluida la amortización) ÷ horas laborales del mes × horasTrabajo`.
- `manoDeObra = valorHora × horasTrabajo`.
- Escalado de tortas: bizcochos y rellenos ×0,81 / ×1 / ×1,21 (18 / 20 / 22 cm); forrado ×0,88 / ×1 / ×1,12. Los tiempos no escalan.

## Caso 1: alfajores de maicena (planilla original)

Ingredientes:

| Insumo | Presentación | Precio | Cantidad usada | Costo |
| --- | --- | --- | --- | --- |
| Manteca | 200 g | 3.600 | 200 g | 3.600,00 |
| Azúcar impalpable | 1000 g | 4.000 | 160 g | 640,00 |
| Vainillín | 1000 g | 3.600 | 4 g | 14,40 |
| Limón (ralladura) | 1 u | 400 | 1 u | 400,00 |
| Miel | 500 g | 6.900 | 4 g | 55,20 |
| Yemas | 30 u | 7.000 | 3 u | 700,00 |
| Almidón de maíz | 1000 g | 3.360 | 400 g | 1.344,00 |
| Premezcla | 1000 g | 5.150 | 100 g | 515,00 |
| Polvo de hornear | 250 g | 2.500 | 5 g | 50,00 |
| Bicarbonato | 250 g | 3.600 | 2 g | 28,80 |
| Dulce de leche | 1000 g | 7.900 | 600 g | 4.740,00 |

Parámetros: mano de obra 1 h × $3.500. Gastos fijos y servicios en $0, como en la planilla. Packaging $330 como extra.

| Resultado | Valor esperado |
| --- | --- |
| Ingredientes | 12.087,40 |
| Mano de obra | 3.500,00 |
| Costo total | 15.587,40 |
| × 1,30 | 20.263,62 |
| Precio producto (redondeo $100) | **20.300** |
| Total con packaging | **20.630** |

La planilla original daba $20.593,62 porque no redondeaba.

## Caso 2: Torta Red Velvet

Configuración del mes:

| Parámetro | Valor |
| --- | --- |
| Luz | $60.000, factor 1,5, compartido |
| Gas | $45.000, factor 3, compartido, usa horas de horno |
| Agua | $15.000, factor 1, compartido |
| Internet | $18.000, factor 1, compartido |
| Gastos del negocio | Monotributo 42.000 + Contador 25.000 + Publicidad 20.000 + Folletería 8.000 + Amortización 32.500 = 127.500 |
| Horas laborales del mes | 160 |
| Valor hora | $3.500 |
| Margen | 30% · redondeo $100 |

Tarifas por hora resultantes: servicios por hora de trabajo **170,8333…**, gas por hora de horno **187,50**, gastos del negocio por hora **796,875**.

Amortización: horno 800.000 + batidora 800.000 + heladera 1.500.000 + freezer 800.000 = 3.900.000 ÷ (10 años × 12) = **32.500 por mes**.

Recetas a 20 cm: bizcochuelo red velvet $14.200 (40 min de trabajo, 45 min de horno), frosting de queso crema $9.600 (20 min), buttercream $6.800 (30 min) o pasta de azúcar $8.900 (45 min). Armado y decoración: 2 h.

| Variante | Ingredientes | Servicios | Gastos negocio | Mano de obra | Costo total | Precio |
| --- | --- | --- | --- | --- | --- | --- |
| 18 cm buttercream | 25.262,00 | 738,54 | 2.789,06 | 12.250,00 | 41.039,60 | **53.400** |
| 20 cm buttercream | 30.600,00 | 738,54 | 2.789,06 | 12.250,00 | 46.377,60 | **60.300** |
| 22 cm buttercream | 36.414,00 | 738,54 | 2.789,06 | 12.250,00 | 52.191,60 | **67.900** |
| 20 cm pasta | 32.700,00 | 781,25 | 2.988,28 | 13.125,00 | 49.594,53 | **64.500** |

Con buttercream: 3 h 30 de trabajo y 45 min de horno. Con pasta: 3 h 45 de trabajo y 45 min de horno.

Presupuesto 20 cm buttercream con topper ($4.500) y envío CABA ($5.000):

| Resultado | Valor esperado |
| --- | --- |
| Total al cliente | **69.800** |
| Seña 50% | **34.900** |
| Por porción (÷ 30) | **2.010** |

## Caso 3: mesa dulce (cookies)

Regla, sin números del negocio todavía: 30 cookies de una receta que rinde 24 usan **1,25 recetas de ingredientes**, pero **2 tandas** completas de masa y horno. La decoración suma su tiempo por unidad × 30. El redondeo se aplica **solo al total** del pedido, no al precio unitario.

## Reglas para tests de borde

- Un presupuesto enviado no cambia si después se modifica un insumo, el valor hora o un gasto (snapshot).
- No se puede usar en gramos un insumo cargado por unidad, ni al revés.
- La merma de 0% no cambia el costo. Con 15% de merma, 1 kg rinde 850 g útiles.
- El redondeo es siempre hacia arriba: 1.150 × 1,30 = 1.495 queda en 1.500, y un resultado de 1.501 queda en 1.600. Un resultado exacto de 1.500 queda en 1.500.
