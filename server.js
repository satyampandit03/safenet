require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.log('Database connection error:', err));

// --- Initialize Gemini ---
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY, 
});

// --- SafeBot Chat Route ---
app.post('/api/chat', async (req, res) => {
  console.log("PING! Chat route reached.");
  
  try {
    // Map frontend messages to Gemini format
    const geminiMessages = req.body.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are SafeBot, a highly empathetic and frank peer-counselor. Listen first, validate feelings, and be conversational. Keep it under 80 words.',
      contents: geminiMessages,
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error("AI Error:", error); 
    res.status(500).json({ error: "Something went wrong." });
  }
});

// --- SafeBot Analyzer Route ---
app.post('/api/analyze', async (req, res) => {
  console.log("PING! Analyzer route reached.");
  
  try {
    const prompt = `You are SafeNet AI, a cyberbullying detection assistant for Indian students. Analyze the message and respond ONLY in JSON with this exact format:
{
  "severity": "safe" | "warning" | "danger",
  "label": "short status label (e.g. Safe message / Possible bullying / Severe harassment)",
  "explanation": "2-3 sentences explaining what you found and why, in simple language for a student",
  "actions": ["action 1", "action 2"]
}
No markdown, no preamble, only JSON.

Message to analyze: "${req.body.message}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    // Clean potential markdown formatting from the response
    const cleanText = response.text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleanText));
  } catch (error) {
    console.error("Analyzer Error:", error);
    res.status(500).json({ error: "Analysis failed." });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));