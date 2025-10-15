import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// FIX: Explicitly import 'cwd' to resolve TypeScript type conflict with the global 'process' object.
import { cwd } from 'process'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // This will load .env, .env.local, .env.[mode], .env.[mode].local
  const env = loadEnv(mode, cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Expose environment variables to the client.
      // IMPORTANT: You must set these in your deployment environment (e.g., on Render.com).
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    }
  }
})