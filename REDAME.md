# 💀 Bot  — WhatsApp Bot con IA Local

Bot de WhatsApp para el grupo "Hitler NOS AMA" con personalidad sarcástica, stickers y memoria del grupo.

---

##  Requisitos

- **Node.js** v18 o superior → https://nodejs.org
- **Google Chrome** instalado en `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Ollama** → https://ollama.com
- **FFmpeg** agregado al PATH → https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
- 

---

##  Estructura del proyecto

```
E:\bot-steam\
  ├── index.js            ← Bot principal
  ├── stickers.js         ← Lógica de stickers
  ├── resumen-grupo.txt   ← Contexto del grupo (generado)
  ├── memoria.txt         ← Historial del grupo (opcional)
  ├── resumir-memoria.js  ← Script para generar resumen
  ├── .env                ← Variables de entorno
  ├── package.json
  └── tmp/                ← Archivos temporales de stickers
```

---

## ⚙️ Instalación (primera vez)

### 1. Instalar dependencias de Node
```bash
cd ruta
npm install
```

### 2. Instalar el modelo de IA en Ollama
```bash
ollama pull mistral
```

### 3. Configurar el .env
Crea un archivo `.env` en `E:\bot-steam\` con:
```
# No se necesita API key para Ollama local
```

### 4. Verificar FFmpeg
```
bash
ffmpeg -version
```
Si no aparece, agregar `C:\ffmpeg-master-latest-win64-gpl-shared\bin` al PATH de Windows.

---

##  Cómo correr el bot

Ollama corre automáticamente en segundo plano. Solo necesitas:

```bash
cd E:\bot-steam
node index.js
```

Al arrancar verás el QR. Escanéalo con WhatsApp:
**Ajustes → Dispositivos vinculados → Vincular dispositivo**

Después ya no necesitas escanear el QR de nuevo.

---

##  Cómo usar el bot

El bot responde cuando alguien escribe **"rata"** en el mensaje:

| Comando | Resultado |
|---|---|
| `rata hola` | Responde con saludo sarcástico |
| `rata [pregunta]` | Responde la pregunta con su personalidad |
| `rata sticker` + foto/video | Convierte a sticker |
| Citar foto/video + `rata sticker` | Convierte lo citado a sticker |

---

##  Actualizar la memoria del grupo

Si quieres que el bot conozca mejor al grupo con un historial nuevo:

1. Coloca el `memoria.txt` en `ruta`
2. Corre el script de resumen:
```bash
node resumir-memoria.js
```
3. Espera a que termine y revisa el `resumen-grupo.txt` generado
4. Reinicia el bot

---

## 🔧 Cambiar de modelo

En `index.js` cambia esta línea:
```js
const OLLAMA_MODEL = 'mistral'; // cambia aquí
```

Modelos disponibles instalados:
```bash
ollama list
```

Para bajar un modelo nuevo:
```bash
ollama pull nombre-del-modelo
```

---

##  Errores comunes

| Error | Solución |
|---|---|
| `Cannot find module 'ffmpeg-static'` | Borra esa línea del stickers.js |
| `spawn ffmpeg ENOENT` | Agregar FFmpeg al PATH |
| `Error de autenticación` | Borrar `.wwebjs_auth` y reiniciar |
| `Ollama error 400` | El modelo no soporta ese formato, cambiar modelo |
| Bot no responde | Verificar que Ollama corra: abrir `http://localhost:11434` |
| Respuesta vacía | El modelo usa thinking, ya está manejado automáticamente |

---

##  Dependencias principales

```json
"whatsapp-web.js"   ← Conexión con WhatsApp
"sharp"             ← Conversión de imágenes a sticker
"fluent-ffmpeg"     ← Conversión de videos a sticker
"qrcode-terminal"   ← Mostrar QR en consola
"dotenv"            ← Variables de entorno
```