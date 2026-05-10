/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API keys are server-side only — see server/index.ts
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
