# LinkedIn Post Generator

A Google Apps Script web app that generates LinkedIn-formatted posts using the Gemini API, with optional Imagen-powered image generation.

## Setup

### 1. Get a Gemini API Key
- Visit [Google AI Studio](https://aistudio.google.com/apikey)
- Click **Get API Key** and create one (free tier available)

### 2. Deploy to Google Apps Script
1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Delete the default `Code.gs` and paste the contents of this repo's `Code.gs`
4. Create a new HTML file called `Index` and paste the contents of `Index.html`
5. Click **Deploy > New deployment**
6. **Type:** Web app
7. **Execute as:** Me
8. **Access:** Anyone
9. Click **Deploy** and authorize the required permissions

### 3. Configure Your API Key
1. Open your deployed web app URL
2. Click **Configure API Key** at the bottom of the page
3. Paste your Gemini API key and click **Save**

## Usage

1. Enter a topic for your post
2. Select a post type
3. Toggle image generation on/off
4. Click **Generate Post**
5. Preview the result and copy it to LinkedIn

## Post Types

| Type | Best For |
|------|----------|
| Professional | Career insights, industry analysis |
| Casual | Daily thoughts, quick updates |
| Thought Leadership | Bold opinions, industry takes |
| Storytelling | Personal experiences, lessons learned |
| Educational | How-tos, tutorials, tips |
| Announcement | Product launches, news, milestones |
| Hot Take | Controversial opinions, debate starters |
| Engagement | Questions, polls, community building |

## Tech Stack

- Google Apps Script
- Gemini 2.0 Flash (text generation)
- Imagen 3 (image generation)
- Plus Jakarta Sans (typography)

## License

MIT
