export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { jobs } = req.body
  if (!jobs?.length) return res.status(200).json({ summaries: {} })

  // only summarise first 10 to avoid token limits and timeouts
  const batch = jobs.slice(0, 5)

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
        system: `You summarise job descriptions. Return ONLY valid JSON, no markdown, no explanation.`,
        messages: [{
          role: "user",
          content: `Summarise each JD into max 3 bullets each. Return JSON keyed by job id:
{
  "job_id": {
    "yoe": string,  // e.g. "3+ years" or "minimum 4 years" — always include the word "years"
    "industry": string,  // be specific — infer from the actual job content, not just category. e.g. "HR Tech / AI Recruiting", "Maritime Logistics", "B2B Fintech", "GovTech / Smart Nation". Max 4 words.
    "hardNos": string[],
    "goodToHave": string[]
  }
}

Jobs (keep JD text under 500 chars each to stay within limits):
${JSON.stringify(batch.map(j => ({
  id: j.id,
  jd: (j.jd || "").slice(0, 300)
})))}`
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