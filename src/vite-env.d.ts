/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_KEY: string
  readonly VITE_ANTHROPIC_KEY: string
  readonly VITE_ELEVENLABS_KEY: string
  readonly VITE_ELEVENLABS_VOICE_ID: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
