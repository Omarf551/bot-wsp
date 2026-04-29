// resumir-memoria.js
// Corre este script UNA VEZ para generar el resumen del grupo
// Uso: node resumir-memoria.js

const fs = require('fs');
const path = require('path');

const OLLAMA_URL   = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'huihui_ai/qwen3-abliterated:8b';
const MEMORIA_PATH = path.join(__dirname, 'memoria.txt');
const OUTPUT_PATH  = path.join(__dirname, 'resumen-grupo.txt');

const CHUNK_SIZE = 40000; 

async function preguntarOllama(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      options: { temperature: 0.3, num_predict: 1000 },
    }),
  });
  const data = await res.json();
  return data.message.content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function dividirEnChunks(texto, size) {
  const chunks = [];
  for (let i = 0; i < texto.length; i += size) {
    chunks.push(texto.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  if (!fs.existsSync(MEMORIA_PATH)) {
    console.error(' No se encontró memoria.txt en:', MEMORIA_PATH);
    process.exit(1);
  }

  const texto = fs.readFileSync(MEMORIA_PATH, 'utf8');
  const chunks = dividirEnChunks(texto, CHUNK_SIZE);

  console.log(`memoria.txt cargado: ${(texto.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Dividido en ${chunks.length} partes\n`);

  const resumenesParciales = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`⏳ Procesando parte ${i + 1}/${chunks.length}...`);

    const prompt = `Analiza esta parte de una conversación de WhatsApp de un grupo de amigos mexicanos.
Extrae y lista en español:
1. Nombres o apodos de las personas que aparecen
2. Chistes internos, referencias o memes recurrentes del grupo
3. Tipo de humor que usan entre ellos
4. Temas frecuentes de conversación
5. Frases o expresiones características de cada persona si las hay

Sé conciso. Solo lo más relevante.

CONVERSACIÓN:
${chunks[i]}`;

    try {
      const resumen = await preguntarOllama(prompt);
      resumenesParciales.push(`[PARTE ${i + 1}]\n${resumen}`);
      console.log(` Parte ${i + 1} lista\n`);
    } catch (err) {
      console.error(`x Error en parte ${i + 1}:`, err.message);
    }

   
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Generando resumen final consolidado...\n');

  const resumenFinal = await preguntarOllama(`Tienes estos resúmenes parciales de una conversación de WhatsApp de un grupo de amigos mexicanos.
Consolida todo en un resumen final bien organizado con:

1. INTEGRANTES DEL GRUPO: nombres, apodos y personalidad de cada quien
2. HUMOR DEL GRUPO: tipo de chistes, tono, nivel de groserías, estilo general
3. CHISTES INTERNOS Y REFERENCIAS: los más repetidos o importantes
4. TEMAS FRECUENTES: de qué hablan más
5. FRASES CARACTERÍSTICAS: expresiones únicas del grupo

Este resumen se usará para entrenar a un bot de WhatsApp llamado "El Rata" para que conozca al grupo.

RESÚMENES PARCIALES:
${resumenesParciales.join('\n\n')}`);

  fs.writeFileSync(OUTPUT_PATH, resumenFinal, 'utf8');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Resumen generado en: resumen-grupo.txt');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(resumenFinal);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Copia ese resumen al SYSTEM_PROMPT de tu index.js');
}

main().catch(console.error);