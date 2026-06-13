import { RESUME_SIGNAL_PROMPT } from "../../lib/prompts"

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { resumeData } = req.body
  if (!resumeData) return res.status(200).json({ signal: null, roles: [], focused: true })

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        system: RESUME_SIGNAL_PROMPT(),
        messages: [{
          role: "user",
          content: `Analyse this resume:\n${JSON.stringify(resumeData, null, 2)}`
        }],
      }),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const raw = data.content[0].text.replace(/```json|```/g, "").trim()
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // fallback: treat whole text as the sentence, no structured roles
      return res.status(200).json({ signal: raw, roles: [], focused: true })
    }

    return res.status(200).json({
      signal: parsed.sentence || null,
      roles: Array.isArray(parsed.roles) ? parsed.roles.slice(0, 4) : [],
      focused: parsed.focused !== false,
    })
  } catch (err) {
    console.error("Signal error:", err.message)
    return res.status(200).json({ signal: null, roles: [], focused: true })
  }
}