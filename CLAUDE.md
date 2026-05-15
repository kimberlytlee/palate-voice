# Palate

Voice-first restaurant recommendation PWA. The user taps Start, speaks naturally, and gets restaurant cards driven by Claude. Built for mobile.

## Running

```bash
# Requires .env in project root (see .env.example)
npm run start        # Express proxy on :3001 + Vite HTTPS on :3000
npm run server       # Express proxy only
npm run dev          # Vite only (API calls will fail without the proxy)
```

The app runs on **HTTPS** (`https://localhost:3000`) — required for mic access. First visit will show a self-signed cert warning; click through it.

## Environment

`.env` lives at the project root. Keys are server-side only — never in the client bundle.

```
OPENAI_KEY=...
ANTHROPIC_KEY=...
ELEVENLABS_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # optional, defaults to Rachel
GOOGLE_PLACES_KEY=...                      # optional, enables verified restaurant links
```

## Architecture

```
Browser (Vite :3000)          Express proxy (server/index.ts :3001)
  useVAD       → mic audio    
  useWhisper   → POST /api/transcribe  → OpenAI Whisper
  useClaude    → POST /api/chat        → Anthropic Claude
  usePlaces    → GET  /api/places      → Google Places (optional)
  useElevenLabs→ POST /api/speak       → ElevenLabs TTS
  useGeolocation → Nominatim (no key, stays in browser)
```

All API keys live in the Express proxy. The browser only ever talks to `/api/*` on the same origin.

## Phase state machine

`App.tsx` drives the UI through these phases:

```
idle → initializing → listening → transcribing → thinking → speaking → listening
                                                                      ↓
                                                              recommendations
```

`phaseRef` mirrors `phase` state so async callbacks always read the latest value without stale closures.

## VAD (Voice Activity Detection)

- Uses `useMicVAD` from `@ricky0123/vad-react` (wraps `@ricky0123/vad-web`)
- Silero VAD ONNX model runs entirely on-device
- Model file: `public/silero_vad_legacy.onnx`
- AudioWorklet script: `public/vad.worklet.bundle.min.js`
- ONNX WASM runtime: `public/ort-wasm-simd-threaded.{wasm,mjs}`
- Both `@ricky0123/vad-web` and `@ricky0123/vad-react` are in `optimizeDeps.include` (they ship CJS; Vite must pre-bundle them to ESM)
- The `.mjs` file is served via a custom inline Vite plugin (`serveOrtWasmAsStatic`) that bypasses Vite's module transform pipeline
- **SharedArrayBuffer** is required by ONNX threaded WASM → Vite dev server sends `COOP: same-origin` + `COEP: require-corp` on all responses

## VAD option names (vad-web v0.0.30)

The options use milliseconds, not frames:
- `minSpeechMs` (not `minSpeechFrames`)
- `redemptionMs` (not `redemptionFrames`)
- `preSpeechPadMs` (not `preSpeechPadFrames`)

## Claude response format

`useClaude` sends conversation history to `/api/chat`. Claude returns a spoken reply with an optional structured block:

```
<restaurants>
[{"name":"","cuisine":"","rating":"","priceRange":"","address":"","why":"","tags":[]}]
</restaurants>
```

`parseResponse()` in `useClaude.ts` strips the block from the spoken text and parses the JSON.

## Key files

| File | Purpose |
|------|---------|
| `src/App.tsx` | State machine, all hook wiring, session flow |
| `src/hooks/useVAD.ts` | Thin wrapper around `useMicVAD` |
| `src/hooks/useClaude.ts` | Conversation history + restaurant parsing |
| `src/hooks/useWhisper.ts` | Audio → transcript via proxy |
| `src/hooks/useElevenLabs.ts` | Text → speech via proxy |
| `src/hooks/usePlaces.ts` | Enriches Claude's restaurant recs with verified Google Places data |
| `src/hooks/useGeolocation.ts` | GPS → city name via Nominatim |
| `server/index.ts` | Express proxy; validates env vars at startup |
| `vite.config.ts` | HTTPS, COOP/COEP headers, proxy, WASM middleware |
