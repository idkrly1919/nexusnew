# Quillix Mobile App (Android)

This is a native React Native mobile app for Quillix, built with Expo. It provides core functionality in a native UI while using WebViews for video generation and voice features.

## Features

- **Native Core**: Login, chat, chat history, memory settings, and navigation
- **WebView Embeds**: Video generation and voice mode (using existing web components)
- **Supabase Integration**: Authentication and data storage
- **Expo Build**: Easy Android compilation

## Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for native builds)
- Expo account (for EAS builds)

## Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_API_KEY=your_openrouter_api_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

## Development

Run the app in development mode:
```bash
npm start
```

Scan the QR code with the Expo Go app on your Android device.

## Building for Android

### Option 1: Expo EAS Build (Recommended)

1. Login to Expo:
   ```bash
   expo login
   ```

2. Build the app:
   ```bash
   eas build --platform android
   ```

3. Follow the prompts to configure your build.

### Option 2: Native Android Build

1. Install Android Studio
2. Generate native code:
   ```bash
   expo prebuild
   ```

3. Open `android` folder in Android Studio and build the APK.

## Project Structure

- `App.tsx` - Main entry point
- `src/` - Source code
  - `screens/` - Screen components (Auth, Chat, etc.)
  - `components/` - Reusable UI components
  - `contexts/` - Auth and Supabase context providers
  - `services/` - API integration
  - `types/` - TypeScript types
  - `utils/` - Helper functions

## Key Components

### AuthScreen
- Native login/signup flows using Supabase
- Email/password authentication
- Google OAuth integration

### ChatScreen
- Native chat interface with message history
- Real-time updates using Supabase
- Message bubbles with user/assistant differentiation

### WebView Screens
- Video generation: Embedded WebView pointing to existing web component
- Voice mode: Embedded WebView with microphone permissions

## Environment Variables

Make sure to set these in your `.env` file:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` 
- `EXPO_PUBLIC_API_KEY` (OpenRouter)
- `EXPO_PUBLIC_GEMINI_API_KEY` (Google Gemini)

## Testing

Test on both emulators and physical devices. Use Expo Go for development testing.

## Notes

- Core functionality (login, chat, history) is fully native
- Video and voice features use WebViews to reuse existing web components
- All API calls go through the existing backend infrastructure
- Uses React Native Paper for Material Design components