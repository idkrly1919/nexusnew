<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your Quillix app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gOdCjbyWanGH8lF1sIWwiPUMCuG9OvHq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `API_KEY` environment variable for Pollinations AI text/chat:
   - Get your free API key from [enter.pollinations.ai](https://enter.pollinations.ai)
   - Add `API_KEY=your_key_here` to your environment variables or `.env.local` file
3. Set the `new_api` environment variable for Pollinations AI image generation:
   - Get your free API key from [enter.pollinations.ai](https://enter.pollinations.ai)
   - Add `new_api=your_key_here` to your Supabase environment variables
   - Note: You can use the same key for both `API_KEY` and `new_api`
4. (Optional) Set the `GEMINI_API_KEY` in [.env.local](.env.local) as a fallback:
   - This is used if the Pollinations API is unavailable
5. Run the app:
   `npm run dev`