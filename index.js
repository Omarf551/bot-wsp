require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { imagenASticker, videoASticker } = require('./stickers');
const fs = require('fs');
const path = require('path');

const NOMBRE_BOT    = 'rata';
const MAX_HISTORIAL = 10;
const DELAY_MIN_MS  = 300;
const DELAY_MAX_MS  = 800;
const OLLAMA_MODEL  = 'modelo';
const OLLAMA_URL    = 'http://localhost:11434/api/chat';
const TIMEOUT_MS    = 60000;

const ES_CLOUD = OLLAMA_MODEL.includes('cloud');

const historial = {};

function agregarAlHistorial(chatId, role, content) {
  if (!historial[chatId]) historial[chatId] = [];
  historial[chatId].push({ role, content });
  if (historial[chatId].length > MAX_HISTORIAL) {
    historial[chatId] = historial[chatId].slice(-MAX_HISTORIAL);
  }
}

const SYSTEM_PROMPT = `promtp`;

const delay = () => new Promise(r =>
  setTimeout(r, DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS))
);

function limpiarRespuesta(contenido) {
  let limpio = contenido.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!limpio) {
    const idx = contenido.lastIndexOf('</think>');
    if (idx !== -1) limpio = contenido.slice(idx + 8).trim();
    if (!limpio) limpio = 'nmms se me trabó el coco, pregunta otra vez wey';
  }
  return limpio;
}

async function preguntarAOllama(chatId, mensajeUsuario) {
  agregarAlHistorial(chatId, 'user', mensajeUsuario);

  const mensajes = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...historial[chatId].map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];

  const body = {
    model: OLLAMA_MODEL,
    messages: mensajes,
    stream: false,
    ...(ES_CLOUD ? {} : {
      options: {
        temperature: 0.8,
        num_predict: 600,
      },
    }),
  };

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(' Raw:', data.message.content.slice(0, 150));

  const respuesta = limpiarRespuesta(data.message.content);
  agregarAlHistorial(chatId, 'assistant', respuesta);
  return respuesta;
}

function quiereSticker(body) {
  const palabras = ['sticker', 'stickerlo', 'hazlo sticker', 'sticker eso', 'de sticker'];
  return palabras.some(p => body.toLowerCase().includes(p));
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'el-rata' }),
  puppeteer: {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', qr => {
  console.log('\n Escanea este QR con tu WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log(' El bot está en línea\n');
});

client.on('auth_failure', () => {
  console.error(' Error de autenticación. Borra .wwebjs_auth y vuelve a correr.');
});

client.on('message', async (msg) => {
  console.log('─────────────────────────────────');
  console.log('Mensaje recibido:', msg.body);

  try {
    const chat = await msg.getChat();
    console.log('De:', msg.from);

    const body        = msg.body || '';
    const loMencionan = body.toLowerCase().includes(NOMBRE_BOT);

    console.log('Menciona "rata":', loMencionan);
    if (!loMencionan) return;

    const chatId = chat.id._serialized;

    if (quiereSticker(body)) {
      console.log('Modo: sticker');

      let mediaMsg = null;
      if (msg.hasMedia) {
        mediaMsg = msg;
      } else if (msg.hasQuotedMsg) {
        const quoted = await msg.getQuotedMessage();
        if (quoted.hasMedia) mediaMsg = quoted;
      }

      if (!mediaMsg) {
        await msg.reply('mándame una foto o video we, no tengo bola de cristal');
        return;
      }

      await chat.sendStateTyping();
      const media = await mediaMsg.downloadMedia();
      let stickerMedia;

      if (media.mimetype.startsWith('video') || media.mimetype.includes('gif')) {
        await msg.reply('dale un seg que lo proceso...');
        stickerMedia = await videoASticker(media);
      } else if (media.mimetype.startsWith('image')) {
        stickerMedia = await imagenASticker(media);
      } else {
        await msg.reply('ese formato no lo manejo wey, manda foto o video');
        return;
      }

      await client.sendMessage(chat.id._serialized, stickerMedia, {
        sendMediaAsSticker: true,
        stickerAuthor: 'El Rata ',
        stickerName: 'bot-rata',
      });
      return;
    }

    console.log('Modo: IA');
    await chat.sendStateTyping();

    const contacto = await msg.getContact();
    const nombre   = contacto.pushname || contacto.name || 'alguien';
    const contexto = `[${nombre} dice]: ${body}`;

    console.log('Enviando a Ollama:', contexto);
    const respuesta = await preguntarAOllama(chatId, contexto);
    console.log('Respuesta:', respuesta);

    await delay();
    await msg.reply(respuesta);
    console.log('Enviado');

  } catch (err) {
    console.error(' Error completo:', err);
    try { await msg.reply('se me trabó algo, ya saben cómo soy'); } catch {}
  }
});

process.on('unhandledRejection', (err) => {
  console.error(' Error no capturado:', err);
});

async function verificarOllama() {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    const data = await res.json();
    const modelos = data.models || [];
    const modeloActivo = modelos.find(m => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' Ollama detectado');
    console.log(`Modo: ${ES_CLOUD ? 'CLOUD' : 'LOCAL'}`);
    console.log(` Modelos instalados: ${modelos.length}`);
    modelos.forEach(m => {
      const activo = (m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL)) ? ' ← ACTIVO' : '';
      const size   = m.size ? (m.size / 1e9).toFixed(1) + ' GB' : 'cloud';
      console.log(`   • ${m.name} (${size})${activo}`);
    });

    if (modeloActivo) {
      console.log(` Modelo listo: ${modeloActivo.name}`);
    } else {
      console.warn(`  Modelo "${OLLAMA_MODEL}" NO encontrado.`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (e) {
    console.error(' No se pudo conectar a Ollama');
    console.error(' Inicia Ollama y vuelve a correr el bot.\n');
    process.exit(1);
  }
}

console.log(' Iniciando bot...');
verificarOllama().then(() => client.initialize());