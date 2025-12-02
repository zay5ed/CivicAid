import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import { Incident } from './types';
const corsHandler = cors({ origin: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyDcCKTw8IvUIqf8Vcyuti3-fECXA1ewhUg");

export const analyzeIncident = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { image, lat, lng } = req.body;

      if (!image) {
        res.status(400).send({ error: "No image provided" });
        return;
      }

      // 1. Call Gemini 1.5 Flash
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analyze this emergency image. 
        Return strictly valid JSON (no markdown) with this schema:
        {
          "severity": "RED" | "YELLOW" | "GREEN",
          "type": "ACCIDENT" | "FIRE" | "MEDICAL" | "FLOOD" | "OTHER",
          "summary": "Short 1 sentence description",
          "hazards": ["List of 3 potential hazards"],
          "responder_tips": ["3 bullet points for first aid"]
        }
        If the image is unclear, default to severity: "YELLOW".
      `;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: image, mimeType: "image/jpeg" } }
      ]);
      
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '');
      const aiData = JSON.parse(responseText);

      // 2. Save to Firestore
      const incidentData: Incident = {
        description: aiData.summary,
        location: { lat, lng },
        severity: aiData.severity,
        status: 'OPEN',
        reporter_id: 'app_user', // Placeholder
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        ai_analysis: {
          summary: aiData.summary,
          hazards: aiData.hazards,
          responder_tips: aiData.responder_tips
        }
      };

      const docRef = await admin.firestore().collection('incidents').add(incidentData);

      // 3. Return Success
      res.status(200).send({ success: true, incidentId: docRef.id, analysis: aiData });

    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).send({ error: "Analysis failed", details: error });
    }
  });
});