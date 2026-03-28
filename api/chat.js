import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { bodyPart, history, systemOverride } = req.body;

  const system = systemOverride || (
    bodyPart
      ? `You are a careful AI health assistant. The user has pain in their ${bodyPart}. Ask up to 2 short follow-up questions to understand the symptoms better. Keep replies under 70 words. Never prescribe medication. Recommend seeing a doctor for serious symptoms.`
      : `You are a careful AI health assistant helping someone describe general symptoms. Ask 1-2 short follow-up questions. Keep replies under 70 words. Never prescribe medication.`
  );

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system,
      messages: history,
    });
    res.status(200).json({ reply: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
