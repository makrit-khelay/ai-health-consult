export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, language = "english" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const langInstructions = {
    english: "Always respond in English only. Use English script.",
    hindi:   "Always respond in Hindi using Devanagari script (हिंदी में जवाब दें). If the question or options contain English, translate them to Hindi. If the user writes in Roman/Hinglish, understand it but always reply in proper Devanagari Hindi script.",
    odia:    "Always respond in Odia using Odia script (ଓଡ଼ିଆ ଲିପିରେ ଉତ୍ତର ଦିଅ). If the question or options contain English, translate them to Odia. If the user writes in Roman script, understand it but always reply in proper Odia script.",
  };

  const langRule = langInstructions[language] || langInstructions.english;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 250,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are a medical diagnostic AI generating MCQ questions for a symptom checker app.

LANGUAGE RULE (CRITICAL): ${langRule}
Both the "question" field and all "options" in your JSON response must be written in the correct script for the chosen language.

You ONLY respond with valid JSON — no markdown, no explanation, no extra text.
If asked to generate a question: {"question": "...", "options": ["...", "...", "..."]}
If signalling diagnosis is ready: {"done": true}
Never deviate from this format.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "Groq API error" });

    const raw = data.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      if (cleaned.includes('"done"') || cleaned.includes("done")) {
        return res.status(200).json({ done: true });
      }
      return res.status(500).json({ error: "Invalid JSON from model", raw: cleaned });
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
