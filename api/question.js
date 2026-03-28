export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 200,
        temperature: 0.3,  // Low temperature = consistent, structured JSON output
        messages: [
          {
            role: "system",
            content: `You are a medical diagnostic AI. You ONLY respond with valid JSON — no markdown, no explanation, no extra text. 
If asked to generate a question, respond with exactly: {"question": "...", "options": ["...", "...", "..."]}
If signalling diagnosis is ready, respond with exactly: {"done": true}
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

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    const raw = data.choices[0].message.content.trim();

    // Safely parse — strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // If JSON parse fails, check if it contains "done"
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
