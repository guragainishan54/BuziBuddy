import { GoogleGenAI } from '@google/genai';

export const handler = async (event: any, context: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { message, history, n8nWebhookUrl, isN8NEnabled } = body;

    if (!message) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Message payload is required' }),
      };
    }

    // Helper to call Gemini
    const runGeminiFallback = async (reason: string) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            output: 'Gemini API is not configured on Netlify. Please set GEMINI_API_KEY in your Netlify Environment Variables.',
            mode: 'error',
            reason: 'Gemini Client uninitialized (missing key)'
          })
        };
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const formattedHistory = (history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      formattedHistory.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedHistory,
        config: {
          systemInstruction: 'You are an advanced AI assistant powered by Gemini. You are BuzziBuddy. Maintain a helpful, extremely polite, and context-aware persona. Express that the user has the ability to connect an n8n webhook anytime via the top-bar settings panel for customized automations.',
        }
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output: response.text || "I didn't receive an answer. Please try again.",
          mode: 'gemini',
          reason
        })
      };
    };

    if (isN8NEnabled && n8nWebhookUrl) {
      try {
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            message,
            history: history || [],
            timestamp: Date.now(),
          }),
        });

        if (!n8nResponse.ok) {
          throw new Error(`n8n responded with status ${n8nResponse.status}`);
        }

        const contentType = n8nResponse.headers.get('content-type') || '';
        let replyText = '';

        if (contentType.includes('application/json')) {
          const responseData = await n8nResponse.json();
          if (typeof responseData === 'string') {
            replyText = responseData;
          } else if (Array.isArray(responseData)) {
            const first = responseData[0];
            replyText = first?.output || first?.reply || first?.response || first?.text || first?.message || JSON.stringify(responseData);
          } else if (responseData) {
            replyText = responseData.output || responseData.reply || responseData.response || responseData.text || responseData.message || responseData.data || JSON.stringify(responseData);
          }
        } else {
          replyText = await n8nResponse.text();
        }

        if (!replyText || replyText.trim() === '') {
          throw new Error('Received empty response from n8n');
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            output: replyText,
            mode: 'n8n',
          })
        };

      } catch (err: any) {
        return await runGeminiFallback(`n8n webhook error: ${err.message || 'Error'}`);
      }
    } else {
      return await runGeminiFallback('n8n is disabled or Webhook URL is not set');
    }

  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
