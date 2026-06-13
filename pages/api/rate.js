import { BATCH_RATE_SYSTEM, BATCH_RATE_PROMPT } from "../../lib/prompts"

export const config = { maxDuration: 120 }

async function rateChunk(resumeData, jobs, preferences) {
  const strippedJobs = jobs.map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    jobType: j.jobType,
    salary: j.salary,
    stage: j.stage,
    jdSummary: j.jdSummary,
    jd: (j.jd || "").slice(0, 300),
  }))

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: BATCH_RATE_SYSTEM,
      messages: [{ role: "user", content: BATCH_RATE_PROMPT(resumeData, strippedJobs, preferences) }],
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  const raw = data.content[0].text.replace(/```json|```/g, "").trim()
  return JSON.parse(raw)
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { resumeData, jobs, preferences } = req.body
  if (!resumeData || !jobs?.length) return res.status(200).json({ ratings: {} })

  try {
    const mid = Math.ceil(jobs.length / 2)
    const [r1, r2] = await Promise.all([
      rateChunk(resumeData, jobs.slice(0, mid), preferences),
      rateChunk(resumeData, jobs.slice(mid), preferences),
    ])

    const allRatings = {}
    ;[...r1, ...r2].forEach(r => { allRatings[r.jobId] = r })
    return res.status(200).json({ ratings: allRatings })
  } catch (err) {
    console.error("Rate error:", err.message)
    return res.status(500).json({ error: err.message })
  }
}