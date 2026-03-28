export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { bodyPart, history } = req.body;

  // Extract severity from the structured prompt the frontend sends
  const firstMsg = history?.[0]?.content || "";
  const sevMatch = firstMsg.match(/Pain severity:\s*(\d+)\/10/);
  const severity = sevMatch ? parseInt(sevMatch[1]) : 5;
  const isEmergency = severity >= 9;
  const isSevere   = severity >= 7;
  const isMild     = severity <= 3;

  const system = `You are MediSense, a highly knowledgeable and compassionate AI health assistant.

LANGUAGE RULE: Always detect and match the user's language (English, Hindi, Hinglish, Bengali, etc.).

STRICT TOPIC RULE: Only discuss health, symptoms, pain, wellness, and medical guidance. Politely refuse anything off-topic.

SEVERITY CONTEXT: The patient's pain severity is ${severity}/10 — classified as ${isEmergency ? 'CRITICAL/EMERGENCY' : isSevere ? 'SEVERE' : isMild ? 'MILD' : 'MODERATE'}.

RESPONSE PHILOSOPHY:
${isEmergency || isSevere
  ? `- This is a SERIOUS case. Lead with urgency. Be compassionate but firm about seeking immediate medical care.
- Do NOT suggest home remedies as a primary solution — they are NOT appropriate for this severity.
- Clearly explain WHY this is serious and what risks untreated symptoms carry.
- Tell the patient exactly what to say to emergency services or the ER.
- Give alternative conditions that must be ruled out urgently.`
  : isMild
  ? `- This appears mild. Be reassuring but thorough.
- Lead with the most likely diagnosis and a clear explanation.
- Provide detailed, specific home remedies and self-care tips as the primary recommendation.
- Mention alternatives and when to upgrade to seeing a doctor.`
  : `- This is a moderate case. Balance home care advice with a recommendation to see a doctor soon.
- Give clear diagnosis explanation, specific home remedies, and a strong nudge to get checked.
- List alternative diagnoses so the patient can discuss them with their doctor.`}

FORMATTING: Use simple HTML — <b> for bold, <br/> for line breaks. Be thorough, warm, and clear.
NEVER prescribe specific medications or dosages. Natural remedies and general lifestyle advice only.
Always end by inviting follow-up questions.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 900,
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          ...history
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
