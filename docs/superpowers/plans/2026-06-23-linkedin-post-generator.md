# LinkedIn Post Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Google Apps Script web app that generates LinkedIn posts via Gemini API with optional Imagen images.

**Architecture:** Single-page web app with `Code.gs` server (doGet, Gemini API calls, prompt building) and `Index.html` client (input form, preview, copy). API key stored in Script Properties.

**Tech Stack:** Google Apps Script, Gemini 2.0 Flash (text), Imagen 3 (images), Plus Jakarta Sans (font)

---

### Task 1: Write Code.gs — Server Logic

**Files:**
- Create: `Code.gs`

- [ ] **Step 1: Write the full Code.gs**

```javascript
/**
 * Serves the web app HTML
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('LinkedIn Post Generator')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Returns whether API key is configured
 */
function hasApiKey() {
  const key = getApiKey();
  return key !== null && key !== '';
}

/**
 * Saves the Gemini API key to Script Properties
 */
function saveApiKey(key) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('GEMINI_API_KEY', key);
  return true;
}

/**
 * Retrieves the Gemini API key
 */
function getApiKey() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('GEMINI_API_KEY');
}

/**
 * Post type prompt configurations
 */
function getPostTypeConfig(type) {
  const configs = {
    'professional': {
      tone: 'Professional and data-driven',
      structure: 'Start with a strong hook. Present insight with evidence. End with a clear CTA.',
      emoji: 'Minimal to none',
      length: '150-300 words'
    },
    'casual': {
      tone: 'Casual and conversational',
      structure: 'Quick take. Keep it short. No fluff.',
      emoji: 'Occasional, natural',
      length: '80-150 words'
    },
    'thought-leadership': {
      tone: 'Opinionated and bold',
      structure: 'State your take. Back it with reasoning. End with a discussion prompt.',
      emoji: 'Minimal',
      length: '200-350 words'
    },
    'storytelling': {
      tone: 'Narrative and personal',
      structure: 'Setup the situation. Describe the conflict. Share the resolution. End with the lesson.',
      emoji: 'Moderate, used for emphasis',
      length: '200-400 words'
    },
    'educational': {
      tone: 'Informative and helpful',
      structure: 'State the problem. Walk through the solution. Summarize key takeaways.',
      emoji: 'Used for bullet points and emphasis',
      length: '200-350 words'
    },
    'announcement': {
      tone: 'Exciting and direct',
      structure: 'Lead with the big news. Give context. Tell them what to do next.',
      emoji: 'Celebratory where appropriate',
      length: '100-200 words'
    },
    'hot-take': {
      tone: 'Controversial and engaging',
      structure: 'Open with the bold claim. Provide evidence. Invite debate.',
      emoji: 'Minimal',
      length: '150-250 words'
    },
    'engagement': {
      tone: 'Interactive and inviting',
      structure: 'Hook with a relatable opener. Ask the question. Encourage comments.',
      emoji: 'Friendly and warm',
      length: '80-150 words'
    }
  };
  return configs[type] || configs['professional'];
}

/**
 * Builds the prompt for Gemini based on post type and topic
 */
function buildPrompt(topic, type) {
  const config = getPostTypeConfig(type);
  return `You are a LinkedIn content expert. Write a LinkedIn post about the following topic.

Topic: "${topic}"

Style requirements:
- Tone: ${config.tone}
- Structure: ${config.structure}
- Emoji usage: ${config.emoji}
- Length: ${config.length}

Formatting rules:
- Use short paragraphs (1-3 sentences each)
- Separate paragraphs with a single blank line
- Include 3-5 relevant hashtags at the end
- Do NOT use markdown formatting
- Do NOT wrap the post in quotes
- Do NOT include subject lines or titles

Write the post now:`;
}

/**
 * Generates a LinkedIn post using Gemini API
 */
function generatePost(topic, type, withImage) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: 'API key not configured. Please add your Gemini API key in settings.' };
  }

  if (!topic || topic.trim() === '') {
    return { error: 'Please enter a topic.' };
  }

  const prompt = buildPrompt(topic.trim(), type);

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 800,
      topP: 0.9,
      topK: 40
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    const httpCode = response.getResponseCode();

    if (httpCode !== 200) {
      const errMsg = result.error ? result.error.message : 'Unknown API error';
      return { error: 'Gemini API error: ' + errMsg };
    }

    const postText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!postText) {
      return { error: 'Gemini returned an empty response. Try a different topic.' };
    }

    let imageUrl = null;
    if (withImage) {
      imageUrl = generateImage(topic.trim(), apiKey);
    }

    return { postText: postText, imageUrl: imageUrl };

  } catch (e) {
    return { error: 'Request failed: ' + e.toString() };
  }
}

/**
 * Generates an image using Imagen 3 via Gemini API
 */
function generateImage(topic, apiKey) {
  const prompt = `Professional LinkedIn post image about: ${topic}. Clean composition, modern design, suitable for a social media post. No text in the image.`;

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=' + apiKey;

  const payload = {
    instances: [{ prompt: prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '16:9'
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    const httpCode = response.getResponseCode();

    if (httpCode !== 200) {
      return null;
    }

    const imageData = result.predictions?.[0]?.bytesBase64Encoded;
    if (imageData) {
      return 'data:image/png;base64,' + imageData;
    }

    return null;
  } catch (e) {
    return null;
  }
}
```

---

### Task 2: Write Index.html — HTML Structure & CSS

**Files:**
- Create: `Index.html`

- [ ] **Step 1: Write Index.html (HTML + CSS + JS)**

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --primary: #E11D48;
      --primary-light: #FB7185;
      --primary-dark: #881337;
      --accent: #2563EB;
      --accent-light: #60A5FA;
      --bg: #FFF1F2;
      --bg-card: #FFFFFF;
      --text: #1F2937;
      --text-muted: #6B7280;
      --border: #FECDD3;
      --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      --shadow-lg: 0 10px 25px rgba(0,0,0,0.08);
      --radius: 16px;
      --radius-sm: 10px;
      --transition: 200ms ease;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .gradient-bar {
      height: 4px;
      background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary-light));
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }

    .container {
      max-width: 680px;
      margin: 0 auto;
      padding: 48px 20px 80px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: white;
      font-size: 24px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);
    }

    .header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--primary-dark);
    }

    .header p {
      color: var(--text-muted);
      font-size: 15px;
      margin-top: 6px;
    }

    .card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      padding: 32px;
      border: 1px solid var(--border);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--border);
      border-radius: var(--radius-sm);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 15px;
      color: var(--text);
      background: var(--bg-card);
      transition: border-color var(--transition), box-shadow var(--transition);
      outline: none;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.1);
    }

    .form-group input::placeholder {
      color: #9CA3AF;
    }

    .form-group select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 40px;
    }

    .toggle-group {
      display: flex;
      gap: 12px;
    }

    .toggle-btn {
      flex: 1;
      padding: 10px 20px;
      border: 2px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-card);
      cursor: pointer;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      transition: all var(--transition);
      text-align: center;
    }

    .toggle-btn:hover {
      border-color: var(--primary-light);
    }

    .toggle-btn.active {
      border-color: var(--primary);
      background: rgba(225, 29, 72, 0.06);
      color: var(--primary-dark);
    }

    .btn-generate {
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity var(--transition), transform var(--transition);
      letter-spacing: 0.3px;
      position: relative;
    }

    .btn-generate:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    .btn-generate:active {
      transform: translateY(0);
    }

    .btn-generate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .spinner {
      display: none;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      position: absolute;
      top: 50%;
      left: 50%;
      margin: -10px 0 0 -10px;
    }

    .btn-generate.loading .btn-text {
      visibility: hidden;
    }

    .btn-generate.loading .spinner {
      display: block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .result {
      display: none;
      margin-top: 24px;
      animation: fadeIn 0.3s ease;
    }

    .result.show {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .post-preview {
      background: #FAFBFC;
      border: 1px solid #E5E7EB;
      border-radius: var(--radius-sm);
      padding: 20px;
      white-space: pre-wrap;
      font-size: 14px;
      line-height: 1.7;
      color: var(--text);
      min-height: 100px;
      word-break: break-word;
    }

    .result-actions {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }

    .result-actions button {
      padding: 10px 20px;
      border-radius: var(--radius-sm);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
      border: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-copy {
      background: var(--accent);
      color: white;
    }

    .btn-copy:hover {
      background: #1D4ED8;
    }

    .btn-copy.copied {
      background: #059669;
    }

    .btn-new {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid #D1D5DB !important;
    }

    .btn-new:hover {
      background: #F3F4F6;
    }

    .image-preview {
      margin-top: 16px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid #E5E7EB;
    }

    .image-preview img {
      width: 100%;
      height: auto;
      display: block;
    }

    .error-msg {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: var(--radius-sm);
      padding: 14px 18px;
      color: #B91C1C;
      font-size: 14px;
      margin-top: 16px;
      display: none;
    }

    .error-msg.show {
      display: block;
      animation: fadeIn 0.2s ease;
    }

    .settings-panel {
      display: none;
      margin-top: 24px;
      animation: fadeIn 0.3s ease;
    }

    .settings-panel.show {
      display: block;
    }

    .settings-toggle {
      text-align: center;
      margin-top: 24px;
    }

    .settings-toggle button {
      background: none;
      border: none;
      color: var(--text-muted);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .settings-toggle button:hover {
      color: var(--text);
    }

    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 12px;
      color: var(--text-muted);
    }

    @media (max-width: 480px) {
      .container { padding: 32px 16px 60px; }
      .card { padding: 24px 20px; }
      .header h1 { font-size: 24px; }
      .result-actions { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="gradient-bar"></div>

  <div class="container">
    <div class="header">
      <div class="header-icon">Li</div>
      <h1>LinkedIn Post Generator</h1>
      <p>AI-powered posts that get noticed</p>
    </div>

    <div class="card">
      <div class="form-group">
        <label for="topic">Topic</label>
        <input type="text" id="topic" placeholder="e.g. The future of remote work..." autocomplete="off">
      </div>

      <div class="form-group">
        <label for="type">Post Type</label>
        <select id="type">
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="thought-leadership">Thought Leadership</option>
          <option value="storytelling">Storytelling</option>
          <option value="educational">Educational</option>
          <option value="announcement">Announcement</option>
          <option value="hot-take">Hot Take</option>
          <option value="engagement">Engagement</option>
        </select>
      </div>

      <div class="form-group">
        <label>Generate Image</label>
        <div class="toggle-group">
          <button class="toggle-btn" id="img-no" data-value="false">No</button>
          <button class="toggle-btn active" id="img-yes" data-value="true">Yes</button>
        </div>
      </div>

      <button class="btn-generate" id="generateBtn" onclick="handleGenerate()">
        <span class="btn-text">Generate Post</span>
        <span class="spinner"></span>
      </button>

      <div class="error-msg" id="errorMsg"></div>

      <div class="result" id="result">
        <div class="post-preview" id="postContent"></div>
        <div class="image-preview" id="imageContainer"></div>
        <div class="result-actions">
          <button class="btn-copy" id="copyBtn" onclick="handleCopy()">
            Copy Post
          </button>
          <button class="btn-new" onclick="handleNew()">
            New Post
          </button>
        </div>
      </div>
    </div>

    <div class="settings-toggle">
      <button onclick="toggleSettings()" id="settingsLink">Configure API Key</button>
    </div>

    <div class="card settings-panel" id="settingsPanel">
      <div class="form-group">
        <label for="apiKey">Gemini API Key</label>
        <input type="password" id="apiKey" placeholder="Enter your Gemini API key">
      </div>
      <button class="btn-generate" onclick="saveApiKey()" style="background: linear-gradient(135deg, var(--accent), #1D4ED8);">
        <span class="btn-text">Save Key</span>
      </button>
      <div style="margin-top:12px;font-size:13px;color:var(--text-muted);">
        Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent);">Google AI Studio</a>
      </div>
    </div>

    <div class="footer">
      Built with Gemini API
    </div>
  </div>

  <script>
    let withImage = true;

    document.querySelectorAll('.toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.toggle-btn').forEach(function(b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
        withImage = this.dataset.value === 'true';
      });
    });

    document.getElementById('topic').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleGenerate();
    });

    function handleGenerate() {
      var topic = document.getElementById('topic').value.trim();
      if (!topic) {
        showError('Please enter a topic.');
        return;
      }

      var type = document.getElementById('type').value;
      var btn = document.getElementById('generateBtn');
      btn.classList.add('loading');
      btn.disabled = true;
      hideError();
      hideResult();

      google.script.run
        .withSuccessHandler(function(result) {
          btn.classList.remove('loading');
          btn.disabled = false;

          if (result.error) {
            showError(result.error);
            return;
          }

          showResult(result.postText, result.imageUrl);
        })
        .withFailureHandler(function(err) {
          btn.classList.remove('loading');
          btn.disabled = false;
          showError('Something went wrong: ' + err.message);
        })
        .generatePost(topic, type, withImage);
    }

    function showResult(postText, imageUrl) {
      document.getElementById('postContent').textContent = postText;
      var imgContainer = document.getElementById('imageContainer');
      imgContainer.innerHTML = '';
      if (imageUrl) {
        var img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Generated post image';
        imgContainer.appendChild(img);
      }
      document.getElementById('result').classList.add('show');
      document.getElementById('copyBtn').textContent = 'Copy Post';
      document.getElementById('copyBtn').className = 'btn-copy';
    }

    function hideResult() {
      document.getElementById('result').classList.remove('show');
    }

    function handleCopy() {
      var text = document.getElementById('postContent').textContent;
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.textContent = 'Copy Post';
          btn.classList.remove('copied');
        }, 2000);
      });
    }

    function handleNew() {
      document.getElementById('topic').value = '';
      hideResult();
      hideError();
      document.getElementById('topic').focus();
    }

    function showError(msg) {
      var el = document.getElementById('errorMsg');
      el.textContent = msg;
      el.classList.add('show');
    }

    function hideError() {
      document.getElementById('errorMsg').classList.remove('show');
    }

    function toggleSettings() {
      var panel = document.getElementById('settingsPanel');
      var link = document.getElementById('settingsLink');
      panel.classList.toggle('show');
      link.textContent = panel.classList.contains('show') ? 'Hide Settings' : 'Configure API Key';
      if (panel.classList.contains('show')) {
        google.script.run.withSuccessHandler(function(key) {
          if (key) document.getElementById('apiKey').value = key;
        }).hasApiKey();
      }
    }

    function saveApiKey() {
      var key = document.getElementById('apiKey').value.trim();
      if (!key) {
        alert('Please enter an API key.');
        return;
      }
      google.script.run
        .withSuccessHandler(function() {
          alert('API key saved successfully!');
          document.getElementById('settingsPanel').classList.remove('show');
          document.getElementById('settingsLink').textContent = 'Configure API Key';
        })
        .withFailureHandler(function(err) {
          alert('Failed to save key: ' + err.message);
        })
        .saveApiKey(key);
    }
  </script>
</body>
</html>
```

---

### Task 3: Write README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# LinkedIn Post Generator

A Google Apps Script web app that generates LinkedIn-formatted posts using the Gemini API, with optional Imagen-powered image generation.

## Setup

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Click "Get API Key" and create one (free tier available)

2. **Deploy to Google Apps Script**
   - Go to [script.google.com](https://script.google.com)
   - Create a new project
   - Copy `Code.gs` and `Index.html` into the project
   - Click **Deploy > New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Access: **Anyone**
   - Click **Deploy** and authorize

3. **Configure API Key**
   - Open your deployed web app URL
   - Click "Configure API Key" at the bottom
   - Paste your Gemini API key and save

## Usage

1. Enter your topic
2. Select a post type (Professional, Casual, Thought Leadership, etc.)
3. Toggle image generation on/off
4. Click "Generate Post"
5. Copy the result to LinkedIn

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
```

---

## Self-Review Checklist

- [x] **Spec coverage:** The spec calls for 8 post types, Gemini Flash, Imagen, API key management, and a beautiful single-page UI. All covered.
- [x] **Placeholder scan:** No TBD, TODOs, or vague steps. All code is complete.
- [x] **Type consistency:** Methods match between Code.gs and Index.html (generatePost, saveApiKey, hasApiKey).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-linkedin-post-generator.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session, batch execution with checkpoints

Which approach?
