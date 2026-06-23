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
 * Generates a LinkedIn post using Gemini API with auto-retry on quota errors
 */
function generatePost(topic, type, withImage) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: 'API key not configured. Set GEMINI_API_KEY in Script Properties.' };
  }

  if (!topic || topic.trim() === '') {
    return { error: 'Please enter a topic.' };
  }

  const prompt = buildPrompt(topic.trim(), type);

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

  const maxRetries = 6;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        headers: { 'x-goog-api-key': apiKey },
        muteHttpExceptions: true
      });

      const result = JSON.parse(response.getContentText());
      const httpCode = response.getResponseCode();

      if (httpCode !== 200) {
        const errMsg = result.error ? result.error.message : 'Unknown API error';

        if (errMsg.indexOf('quota') > -1 || httpCode === 429 || httpCode === 503) {
          lastError = 'Quota exceeded. Retrying...';
          const waitMatch = errMsg.match(/retry in (\d+(\.\d+)?)s/);
          const waitSec = waitMatch ? Math.min(parseFloat(waitMatch[1]), 60) : Math.min(5 * Math.pow(2, attempt), 60);
          Utilities.sleep(waitSec * 1000);
          continue;
        }

        return { error: 'Gemini API error: ' + errMsg };
      }

      const postText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!postText) {
        return { error: 'Gemini returned an empty response. Try a different topic.' };
      }

      let imageUrl = null;
      if (withImage) {
        imageUrl = generateImage(topic.trim(), apiKey);
        if (!imageUrl) {
          console.warn('Image generation returned no result for topic: ' + topic);
        }
      }

      return { postText: postText, imageUrl: imageUrl };

    } catch (e) {
      lastError = e.toString();
      if (attempt < maxRetries) {
        const waitSec = Math.min(5 * Math.pow(2, attempt), 60);
        Utilities.sleep(waitSec * 1000);
      }
    }
  }

  return { error: 'Request failed after retries: ' + lastError };
}

/**
 * Generates an image using Imagen 3 via Gemini API
 */
function generateImage(topic, apiKey) {
  const prompt = `Professional LinkedIn post image about: ${topic}. Clean composition, modern design, suitable for a social media post. No text in the image.`;

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

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
      headers: { 'x-goog-api-key': apiKey },
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    const httpCode = response.getResponseCode();

    if (httpCode !== 200) {
      console.error('Imagen API error (HTTP ' + httpCode + '): ' + JSON.stringify(result));
      return null;
    }

    const imageData = result.predictions?.[0]?.bytesBase64Encoded;
    if (imageData) {
      return 'data:image/png;base64,' + imageData;
    }

    return null;
  } catch (e) {
    console.error('Imagen request failed: ' + e.toString());
    return null;
  }
}
