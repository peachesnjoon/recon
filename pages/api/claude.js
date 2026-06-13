export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { system, prompt, pdf, maxTokens = 4000 } = req.body

  // build message content — PDF if provided, text otherwise
  const content = pdf
    ? [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdf },
        },
        { type: "text", text: prompt },
      ]
    : prompt

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content }],
      }),
    })

    const data = await response.json()
    console.log("Claude response:", JSON.stringify(data).slice(0, 300))
    if (data.error) throw new Error(data.error.message)

    return res.status(200).json({ text: data.content[0].text })
  } catch (err) {
    console.error("Claude API error:", err.message)
    return res.status(500).json({ error: err.message })
  }
}