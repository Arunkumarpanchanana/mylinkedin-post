# LinkedIn Post Generator — Design Spec

## Overview
A Google Apps Script web app that generates LinkedIn-formatted posts using the Gemini API, with optional Imagen-powered image generation. Single-page dashboard with a clean, vibrant interface.

## Files
- `Code.gs` — Server logic: `doGet()`, Gemini API calls, image generation, prompt building
- `Index.html` — Single HTML page with inline CSS/JS (Apps Script convention), UI with form inputs and preview area
- `README.md` — Setup and deployment instructions

## Architecture
1. User opens web app URL → `doGet()` serves `Index.html`
2. User fills topic + selects post type + toggles image → clicks "Generate"
3. Client calls `google.script.run.generatePost(topic, type, withImage)`
4. Server builds structured prompt → calls Gemini Flash API → returns post text
5. If image requested → calls Imagen 3 API → returns image URL
6. Server returns `{postText, imageUrl?}` → client renders preview + copy button

## UI Design
- **Palette:** Rose primary (#E11D48), soft pink bg (#FFF1F2), deep rose text (#881337), blue accent (#2563EB) for CTAs
- **Typography:** Plus Jakarta Sans (Google Fonts)
- **Layout:** Centered max-width card, large heading, form fields stacked, preview area below
- **Effects:** Subtle fade-in, smooth transitions, loading spinner, gradient accent bar
- **UX:** Labels on all inputs, loading state feedback, copy-to-clipboard, error handling, no layout shift

## Post Types (8)
Professional | Casual | Thought Leadership | Storytelling | Educational | Announcement | Hot Take | Engagement

Each maps to a structured system prompt controlling tone, structure, emoji usage, and hashtag behavior.

## Gemini Integration
- **Model:** `gemini-2.0-flash` for text — fast and cheap
- **Image:** `imagen-3.0-generate-002` — called only when user opts in
- **API Key:** Stored in Script Properties, configurable via settings panel
- **Safety:** Responses validated before delivery, fallback error messages

## Configuration
- API key setup on first launch (simple form)
- Post type defaults: Professional
- Image generation: default No

## Deployment
- Deploy from Apps Script editor → Deploy > New deployment > Web app
- Execute as: Me (owner)
- Access: Anyone
