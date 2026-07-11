import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("لم يتم العثور على مفتاح GEMINI_API_KEY في إعدادات التطبيق.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Server-side translation and terms assistant API
app.post("/api/gemini/explain", async (req, res) => {
  const { novelTitle, chapterTitle, chapterContent, prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "الرجاء إدخال سؤال صالح" });
    return;
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `أنت المترجم المحترف وخبير الفانتازيا والزراعة الصينية والشرقية لـ موقع الروايات "MistVil".
مهمتك هي الإجابة عن أسئلة القارئ بشكل مبهر وجذاب ومثقف وبلغة عربية فصحى راقية.
الرواية الحالية: ${novelTitle}
الفصل الحالي: ${chapterTitle}
مقتطف من الفصل لمساعدتك في السياق:
---
${chapterContent.slice(0, 1500)}
---
يرجى تفسير المصطلحات، أو تلخيص الأحداث، أو توضيح الخلفية الثقافية لطقوس السحر أو السيوف أو الآلات البخارية بدقة، مع الحفاظ على نبرة غامضة ومحفزة تليق بـ MistVil. لا تذكر تفاصيل فنية عن الخوادم أو الأكواد.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const text = response.text || "عذراً، لم أستطع صياغة رد مناسب حالياً.";
    res.json({ explanation: text });
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({
      error: "فشل استدعاء الذكاء الاصطناعي",
      explanation: "عذراً يا صديقي، يبدو أن مفتاح الـ API لم يُفعّل بعد أو أن هناك خطأً مؤقتاً في الاتصال. يمكنك متابعة القراءة باستخدام الشروحات المحلية المسبقة المتوفرة بالفصل!"
    });
  }
});

// Vite Middleware & Production static serve setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MistVil Full-Stack server is actively running on http://localhost:${PORT}`);
  });
}

startServer();
