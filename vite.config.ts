import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // @ts-ignore
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: './',
    define: {
      // This block makes environment variables available in your client-side code.
      // It prioritizes VITE_ prefixed variables, which is the standard for Vite,
      // but also includes fallbacks for the non-prefixed versions for compatibility.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
      'process.env.HIGGSFIELD_API_KEY': JSON.stringify(env.VITE_HIGGSFIELD_API_KEY || env.HIGGSFIELD_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
    }
  }
})