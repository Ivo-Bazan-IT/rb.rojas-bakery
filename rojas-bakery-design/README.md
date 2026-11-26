# Rojas Bakery: paquete de diseño para Claude Code

Este paquete tiene todo lo que Claude Code necesita para construir la app: requerimientos, casos de prueba, identidad visual, tokens y las maquetas de cada pantalla.

## Cómo usarlo

1. Copiá el contenido de esta carpeta a la raíz del repo de la app. Si el repo ya tiene un `CLAUDE.md`, sumale el contenido de este.
2. Abrí Claude Code en el repo y pedile, por ejemplo: "Leé CLAUDE.md y arrancá por el motor de cálculo con los tests de docs/casos-de-prueba.md".
3. Para revisar el diseño vos, abrí `design/screens/index.html` en el navegador.

## Contenido

```
CLAUDE.md                     Instrucciones para Claude Code: stack, orden de trabajo y reglas de UI
docs/
  requerimientos.md           Qué hace la app, fórmula, flujo, reglas y alcance V1/V2
  casos-de-prueba.md          Valores esperados del motor de cálculo
  identidad-visual.md         Principios, paleta, tipografía, componentes, navegación y tono
design/
  tokens.css                  Variables CSS --rb-* (colores, fuentes, espaciado, radios)
  tokens.json                 Los mismos valores en JSON
  assets/                     Logo rojo y blanco (PNG transparente) y fuentes Fredoka y Nunito
  screens/                    24 maquetas HTML (12 pantallas en mobile y desktop, PDF e identidad)
  screens/png/                Captura de cada maqueta
  screens/index.html          Galería con todas las pantallas
```

La versión editable del diseño sigue en el canvas de Claude. Si cambia, hay que volver a generar este paquete.
