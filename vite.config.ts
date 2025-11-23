
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
      // This handles both VITE_INFIP_API_KEY and the older INFLIP_API_KEY name.
      'process.env.INFLIP_API_KEY': JSON.stringify(env.VITE_INFIP_API_KEY || env.INFLIP_API_KEY || env.INFIP_API_KEY),
      // Defining this as well for consistency, although the service uses the one above.
      'process.env.INFIP_API_KEY': JSON.stringify(env.VITE_INFIP_API_KEY || env.INFLIP_API_KEY || env.INFIP_API_KEY),
    }
  }
})