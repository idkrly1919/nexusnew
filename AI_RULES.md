# AI Rules & Tech Stack

## Tech Stack
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect)
- **Icons**: Lucide React (preferred) or Raw SVG
- **AI/LLM Integration**: OpenAI SDK (OpenRouter), Custom Streaming Service
- **Build Tool**: Vite

## Development Rules

1. **Styling**:
   - Use Tailwind CSS for all styling.
   - Avoid inline styles where possible, except for dynamic values.
   - Maintain the "dark mode" aesthetic (zinc/slate/black color palette).

2. **Components**:
   - Use Functional Components with TypeScript interfaces for props.
   - Keep components small and focused.
   - Place reusable components in `src/components`.

3. **State Management**:
   - Use local state (`useState`) for component-level logic.
   - Lift state up only when necessary.

4. **File Structure**:
   - `src/components`: UI components
   - `src/services`: API and service logic (e.g., Gemini/OpenRouter service)
   - `src/types.ts`: Shared TypeScript interfaces

5. **Icons**:
   - Use `lucide-react` for new icons to maintain consistency.

6. **Code Quality**:
   - Ensure all new code is fully typed (avoid `any` where possible).
   - Follow existing patterns for streaming responses.