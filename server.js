import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Please upload a PNG, JPG, JPEG, or WEBP image.'));
  }
});

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://ollama.com/api';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2-vision';
const OLLAMA_MODELS = [
  OLLAMA_MODEL,
  ...(process.env.OLLAMA_FALLBACK_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)
].filter((model, index, models) => models.indexOf(model) === index);

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/analyze-pet', upload.single('photo'), async (req, res) => {
  try {
    if (!process.env.OLLAMA_API_KEY) {
      return res.status(500).json({
        error: 'Missing OLLAMA_API_KEY. Add it to .env or export it before starting the server.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Upload a dog or cat photo first.' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const result = await analyzePetPhoto(imageBase64);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.message || 'Unable to analyze the pet photo.'
    });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message });
});

async function analyzePetPhoto(imageBase64) {
  const errors = [];

  for (const model of OLLAMA_MODELS) {
    try {
      return await analyzePetPhotoWithModel(imageBase64, model);
    } catch (error) {
      errors.push(`${model}: ${error.message}`);

      if (!isMissingModelError(error)) {
        throw error;
      }
    }
  }

  throw new Error(`No configured Ollama vision model was available. Tried ${errors.join('; ')}`);
}

async function analyzePetPhotoWithModel(imageBase64, model) {
  const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      messages: [
        {
          role: 'user',
          content: [
            'You are a pet breed and coat visual identification assistant for user-uploaded dog and cat images.',
            'Identify visible details only. For breed, provide the most likely visual breed or breed mix when there are recognizable breed traits.',
            'Use "unknown" for breed only when the animal is too obscured, too mixed-looking, or the image does not support a reasonable visual estimate.',
            'Return only compact JSON with these exact keys:',
            'species, breed, coat_colours, visible_traits.',
            'For breed values, prefer concise names like "Labrador Retriever", "Domestic Shorthair", or "Labrador Retriever mix".'
          ].join(' '),
          images: [imageBase64]
        }
      ]
    })
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || `Ollama request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Ollama returned a response that was not valid JSON.');
  }

  const content = payload?.message?.content;
  if (!content) {
    throw new Error('Ollama response did not include analysis content.');
  }

  try {
    return {
      model: payload.model || model,
      analysis: parseModelJson(content)
    };
  } catch {
    return {
      model: payload.model || model,
      analysis: {
        raw: content
      }
    };
  }
}

function isMissingModelError(error) {
  return /model .* not found/i.test(error.message);
}

function parseModelJson(content) {
  const fencedJson = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fencedJson ? fencedJson[1].trim() : content);
}

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Pet vision analyzer running at http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing server or set PORT to another value.`);
    console.error(`Try: lsof -nP -iTCP:${port} -sTCP:LISTEN`);
    process.exit(1);
  }

  throw error;
});
