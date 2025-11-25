/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Declare CSS module types
declare module '*.css' {
  const content: string;
  export default content;
}
