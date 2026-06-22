import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Standard ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Routes
app.post('/api/chat', async (req, res) => {
  const { message, history, n8nWebhookUrl, isN8NEnabled } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message payload is required' });
  }

  // Define a helper to fallback to Gemini if needed
  const runGeminiFallback = async (fallbackReason: string) => {
    if (!ai) {
      return res.status(500).json({
        output: 'Gemini API is not configured on this server and n8n webhook failed. Please check your setup.',
        mode: 'error',
        reason: 'Gemini Client uninitialized (missing key)'
      });
    }

    try {
      // Map frontend messages into Gemini API Format
      // Gemini expects role: 'user' or 'model' (not assistant) and parts: [{ text: '...' }]
      const formattedHistory = (history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Append latest message
      formattedHistory.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedHistory,
        config: {
          systemInstruction: 'You are an advanced AI assistant powered by Gemini. You are integrated into a sleek chatbot frontend with support for n8n automation webhooks. Maintain a helpful, extremely polite, and context-aware persona. Express that the user has the ability to connect an n8n webhook anytime via the top-bar settings panel for customized automations.',
        }
      });

      const responseText = response.text || "I didn't receive an answer. Please try again.";
      return res.json({
        output: responseText,
        mode: 'gemini',
        reason: fallbackReason
      });
    } catch (gemError: any) {
      console.error('Gemini fallback failed:', gemError);
      return res.status(500).json({
        output: `Error communicating with both n8n and Gemini: ${gemError.message || 'Unknown server error'}`,
        mode: 'error'
      });
    }
  };

  // 1. n8n Routing
  if (isN8NEnabled && n8nWebhookUrl) {
    try {
      console.log(`Routing request to n8n webhook: ${n8nWebhookUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!n8nResponse.ok) {
        throw new Error(`n8n webhook responded with bad status: ${n8nResponse.status}`);
      }

      // Try reading JSON response from n8n
      const contentType = n8nResponse.headers.get('content-type') || '';
      let replyText = '';

      if (contentType.includes('application/json')) {
        const responseData = await n8nResponse.json();
        console.log('n8n Response payload:', responseData);

        // Intelligently parse n8n common response shapes
        if (typeof responseData === 'string') {
          replyText = responseData;
        } else if (Array.isArray(responseData)) {
          // n8n might return an array of output objects
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

      return res.json({
        output: replyText,
        mode: 'n8n',
      });

    } catch (n8nError: any) {
      console.warn(`n8n Connection fell back due to: ${n8nError.message}`);
      return runGeminiFallback(`n8n webhook error: ${n8nError.message || 'Timeout'}`);
    }
  } else {
    // 2. Direct Fallback to Gemini
    return runGeminiFallback('n8n is disabled or Webhook URL is not set');
  }
});

// Configure Vite middleware or production asset serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware integrated (development flavor)');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static server hosting production client build from "dist"');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server fully started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
