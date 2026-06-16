export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { imageBase64, imageMediaType = "image/png", resumeData } = req.body
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" })

  try {
    // Step 1: extract JD text from screenshot
    const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: "Extract the full job posting text from this screenshot. Include job title, company, requirements, responsibilities, and any other relevant details. Return plain text only, no formatting.",
            },
          ],
        }],
      }),
    })

    const extractData = await extractRes.json()
    if (extractData.error) throw new Error(extractData.error.message)
    const jdText = extractData.content[0].text

    // Step 2: analyse fit against resume (if provided)
    if (!resumeData) {
      return res.status(200).json({ jdText, analysis: null })
    }

    const analyseRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1500,
        system: "You are a career coach. Analyse resume fit against a job posting. Return ONLY valid JSON, no markdown.",
        messages: [{
          role: "user",
          content: `Job posting:\n${jdText}\n\nResume:\n${JSON.stringify(resumeData)}\n\nReturn JSON:\n{\n  "fitScore": number (0-100),\n  "verdict": "Strong Fit" | "Worth Exploring" | "Long Shot",\n  "strengths": string[],\n  "gaps": string[],\n  "advice": string\n}`,
        }],
      }),
    })

    const analyseData = await analyseRes.json()
    if (analyseData.error) throw new Error(analyseData.error.message)
    const clean = analyseData.content[0].text.replace(/```json|```/g, "").trim()
    const analysis = JSON.parse(clean)

    return res.status(200).json({ jdText, analysis })
  } catch (err) {
    console.error("analyse-screenshot error:", err.message)
    return res.status(500).json({ error: err.message })
  }
}
