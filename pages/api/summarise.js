export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { jobs } = req.body
  if (!jobs?.length) return res.status(200).json({ summaries: {} })

  const batch = jobs.slice(0, 20)

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
        max_tokens: 8000,
        system: `You summarise job descriptions. Return ONLY valid JSON, no markdown, no explanation.`,
        messages: [{
          role: "user",
          content: `Summarise each JD. Return JSON keyed by job id:
{
  "job_id": {
    "yoe": string,  // years of experience required — read the full JD carefully, e.g. "3+ years", "minimum 5 years". If not mentioned, return null.
    "industry": string,  // be specific — infer from the actual job content, not just category. e.g. "HR Tech / AI Recruiting", "Maritime Logistics", "B2B Fintech", "GovTech / Smart Nation". Max 4 words.
    "hardNos": string[],  // up to 5 hard requirements from the JD
    "goodToHave": string[]  // up to 3 nice-to-have items
  }
}

Jobs:
${JSON.stringify(batch.map(j => {
  const jd = j.jd || ""
  const text = jd.length > 2000
    ? jd.slice(0, 800) + "\n...\n" + jd.slice(-1200)
    : jd
  return { id: j.id, jd: text }
}))}`
        }],
      }),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const clean = data.content[0].text.replace(/```json|```/g, "").trim()
    const summaries = JSON.parse(clean)
    return res.status(200).json({ summaries })
  } catch (err) {
    console.error("Summarise error:", err.message)
    return res.status(200).json({ summaries: {} })
  }
}