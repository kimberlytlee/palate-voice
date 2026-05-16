import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPENAI_KEY =
  process.env.OPENAI_KEY ??
  (() => {
    throw new Error('Missing OPENAI_KEY in .env');
  })();
const ANTHROPIC_KEY =
  process.env.ANTHROPIC_KEY ??
  (() => {
    throw new Error('Missing ANTHROPIC_KEY in .env');
  })();
const ELEVENLABS_KEY =
  process.env.ELEVENLABS_KEY ??
  (() => {
    throw new Error('Missing ELEVENLABS_KEY in .env');
  })();
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Whisper — multipart/form-data audio file → transcription JSON
app.post('/api/transcribe', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file!;
    const form = new FormData();
    form.append(
      'file',
      new File([new Uint8Array(file.buffer)], file.originalname, {
        type: file.mimetype,
      }),
    );
    form.append('model', (req.body.model as string | undefined) ?? 'whisper-1');
    form.append('language', (req.body.language as string | undefined) ?? 'en');

    const upstream = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: form,
      },
    );
    res.status(upstream.status).json(await upstream.json());
  } catch (err) {
    next(err);
  }
});

// Claude — JSON conversation → JSON response
app.post('/api/chat', async (req, res, next) => {
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    res.status(upstream.status).json(await upstream.json());
  } catch (err) {
    next(err);
  }
});

// ElevenLabs — JSON text/settings → audio/mpeg buffer
app.post('/api/speak', async (req, res, next) => {
  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_KEY,
          'content-type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(req.body),
      },
    );
    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(200).set('Content-Type', 'audio/mpeg').send(buf);
  } catch (err) {
    next(err);
  }
});

// Google Places — two-step lookup: find place → details (editorial_summary, reviews)
app.get('/api/places', async (req, res, next) => {
  try {
    if (!GOOGLE_PLACES_KEY) {
      res.json({ candidates: [], status: 'KEY_NOT_CONFIGURED' });
      return;
    }
    const query = req.query.query as string | undefined;
    if (!query) {
      res.status(400).json({ error: 'query param required' });
      return;
    }

    const findUrl = new URL(
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
    );
    findUrl.searchParams.set('input', query);
    findUrl.searchParams.set('inputtype', 'textquery');
    findUrl.searchParams.set('fields', 'place_id,name,formatted_address');
    findUrl.searchParams.set('key', GOOGLE_PLACES_KEY);

    const findRes = await fetch(findUrl.toString());
    const findData = await findRes.json() as {
      status: string;
      candidates?: Array<{ place_id?: string; name?: string; formatted_address?: string }>;
    };

    if (findData.status !== 'OK' || !findData.candidates?.length) {
      res.json(findData);
      return;
    }

    const placeId = findData.candidates[0].place_id;
    if (!placeId) {
      res.json(findData);
      return;
    }

    const detailsUrl = new URL(
      'https://maps.googleapis.com/maps/api/place/details/json',
    );
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('fields', 'editorial_summary');
    detailsUrl.searchParams.set('key', GOOGLE_PLACES_KEY);

    const detailsRes = await fetch(detailsUrl.toString());
    const detailsData = await detailsRes.json() as {
      status?: string;
      result?: {
        editorial_summary?: { overview?: string };
      };
    };

    const enrichedCandidate = {
      ...findData.candidates[0],
      editorial_summary: detailsData.result?.editorial_summary?.overview,
    };

    res.json({ ...findData, candidates: [enrichedCandidate, ...findData.candidates.slice(1)] });
  } catch (err) {
    next(err);
  }
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  },
);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Palate server running on port ${PORT}`));
