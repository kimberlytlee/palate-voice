import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'

const OPENAI_KEY = process.env.OPENAI_KEY
  ?? (() => { throw new Error('Missing OPENAI_KEY in .env') })()
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY
  ?? (() => { throw new Error('Missing ANTHROPIC_KEY in .env') })()
const ELEVENLABS_KEY = process.env.ELEVENLABS_KEY
  ?? (() => { throw new Error('Missing ELEVENLABS_KEY in .env') })()
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

// Whisper — multipart/form-data audio file → transcription JSON
app.post('/api/transcribe', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file!
    const form = new FormData()
    form.append('file', new File([file.buffer], file.originalname, { type: file.mimetype }))
    form.append('model', (req.body.model as string | undefined) ?? 'whisper-1')
    form.append('language', (req.body.language as string | undefined) ?? 'en')

    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form,
    })
    res.status(upstream.status).json(await upstream.json())
  } catch (err) {
    next(err)
  }
})

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
    })
    res.status(upstream.status).json(await upstream.json())
  } catch (err) {
    next(err)
  }
})

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
      }
    )
    if (!upstream.ok) {
      res.status(upstream.status).end()
      return
    }
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.status(200).set('Content-Type', 'audio/mpeg').send(buf)
  } catch (err) {
    next(err)
  }
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

app.listen(3001, () => console.log('Palate proxy server running on http://localhost:3001'))
