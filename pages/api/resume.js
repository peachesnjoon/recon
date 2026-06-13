import { RESUME_GEN_SYSTEM, RESUME_GEN_PROMPT } from "../../lib/prompts"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { resumeData, job } = req.body

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
        max_tokens: 2000,
        system: RESUME_GEN_SYSTEM,
        messages: [{ role: "user", content: RESUME_GEN_PROMPT(resumeData, job) }],
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    return res.status(200).json({ resume: data.content[0].text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}