
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    base: './',
    define: {
      // Define process.env to allow direct access to these variables in the client
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.INFLIP_API_KEY': JSON.stringify(env.INFLIP_API_KEY || env.INFIP_API_KEY),
      'process.env.INFIP_API_KEY': JSON.stringify(env.INFIP_API_KEY || env.INFLIP_API_KEY),
    }
  }
})
    