# Fractal2

Dashboard de señales para criptomonedas basado en RSI + MACD con confirmación en 15 minutos y 1 hora, y alertas por Telegram.

## Qué hace

- Lee velas públicas de Binance Spot.
- Calcula RSI 14 y MACD 12/26/9 para 15m y 1h.
- **COMPRA** cuando RSI y MACD son de compra en 15m y 1h.
- **VENTA** cuando RSI y MACD son de venta en 15m y 1h.
- El servidor comprueba el mercado cada minuto y evita repetir la misma alerta.
- React muestra el estado en verde, rojo o neutro.

Binance ofrece las velas públicas sin necesidad de API key; las velas 15m y 1h están soportadas oficialmente.

## Telegram

1. Crea un bot con `@BotFather` en Telegram.
2. Copia el token al archivo local `server/.env`.
3. Obtén tu `chat_id` y añádelo como `TELEGRAM_CHAT_ID`.
4. Nunca subas `server/.env` a GitHub: está excluido por `.gitignore`.

El Bot API de Telegram permite enviar mensajes mediante `sendMessage`.

## Instalación

Desde la raíz:

```bash
npm install
npm --prefix server install
npm --prefix web install
```

Crea `server/.env` a partir de `server/.env.example`.

Después:

```bash
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

## Importante

Esto es una herramienta de análisis/alertas, no una recomendación financiera. Las señales RSI/MACD pueden producir falsos positivos y no garantizan resultados.
