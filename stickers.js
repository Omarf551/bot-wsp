const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const TMP = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);

// funcion de stciker imagen
async function imagenASticker(media) {
  const buffer = Buffer.from(media.data, 'base64');

  const webp = await sharp(buffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 80 })
    .toBuffer();

  return new MessageMedia('image/webp', webp.toString('base64'));
}

// Video / GIF Sticker animado

async function videoASticker(media) {
  const ext = media.mimetype.includes('gif') ? 'gif' : 'mp4';
  const inputPath  = path.join(TMP, `in_${Date.now()}.${ext}`);
  const outputPath = path.join(TMP, `stk_${Date.now()}.webp`);

  fs.writeFileSync(inputPath, Buffer.from(media.data, 'base64'));

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(0)
      .duration(4)                         
      .outputOptions([
        '-vf', 'scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=black@0,fps=10,format=rgba',
        '-loop', '0',
        '-an',
        '-c:v', 'libwebp',
        '-lossless', '0',
        '-compression_level', '6',
        '-q:v', '30',                       
        '-preset', 'default',
        '-auto-alt-ref', '0',
      ])
      .toFormat('webp')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });

  const stats = fs.statSync(outputPath);
  console.log(` Tamaño sticker: ${(stats.size / 1024).toFixed(0)}KB`);

  if (stats.size > 500 * 1024) {
    console.warn(' Sticker sigue siendo grande, WhatsApp puede rechazarlo');
  }

  const data = fs.readFileSync(outputPath).toString('base64');
  [inputPath, outputPath].forEach(f => { try { fs.unlinkSync(f); } catch {} });

  return new MessageMedia('image/webp', data);
}

module.exports = { imagenASticker, videoASticker };