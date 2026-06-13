export const config = { maxDuration: 120 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { keywords, limit = 20, existingIds = [] } = req.body
  const token = process.env.APIFY_TOKEN
  if (!token) return res.status(200).json({ jobs: [] })

  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/blackfalcondata~jobstreet-scraper/runs?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: [keywords],
          market: "sg",
          location: "Singapore",
          maxItems: limit,
          sort: "date",
        }),
      }
    )
    if (!startRes.ok) return res.status(200).json({ jobs: [] })

    const startData = await startRes.json()
    const runId = startData.data?.id
    const datasetId = startData.data?.defaultDatasetId
    if (!runId) return res.status(200).json({ jobs: [] })

    const maxWait = 90000
    const interval = 3000
    const start = Date.now()
    while (Date.now() - start < maxWait) {
      await sleep(interval)
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`)
      const statusData = await statusRes.json()
      const status = statusData.data?.status
      if (status === "SUCCEEDED") break
      if (["FAILED", "TIMED-OUT", "ABORTED"].includes(status)) return res.status(200).json({ jobs: [] })
    }

    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=${limit}`
    )
    const items = await itemsRes.json()
    if (!Array.isArray(items)) return res.status(200).json({ jobs: [] })

    // deduplicate against MCF results
    const seen = new Set(existingIds)
    const jobs = items
      .map((item, i) => ({
        id: `js_${item.jobId || item.id || `${Date.now()}_${i}`}`,
        title: item.title || item.jobTitle || "",
        company: item.company || item.companyName || "",
        stage: inferStage(item),
        industry: inferIndustry(item),
        location: item.location || "Singapore",
        salary: item.salary || item.salaryRange || null,
        jd: item.description || item.jobDescription || "",
        url: item.url || item.jobUrl || "",
        postedAt: item.postedAt || item.postedDate || null,
        jobType: inferJobType(item),
        source: "JobStreet",
      }))
      .filter(job => {
        const key = normalise(job.title + job.company)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

    const summaries = await summariseJDs(jobs)
    jobs.forEach(job => {
      if (summaries[job.id]) job.jdSummary = summaries[job.id]
    })

    return res.status(200).json({ jobs })
  } catch (err) {
    console.error("JobStreet error:", err.message)
    return res.status(200).json({ jobs: [] })
  }
}

function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function inferStage(item) {
  const size = (item.companySize || "").toLowerCase()
  if (["1-10", "11-50", "51-200", "startup", "series"].some(k => size.includes(k))) return "Startup"
  return "MNC"
}

function inferIndustry(item) {
  const cat = (item.category || item.subCategory || item.industry || "").toLowerCase()
  if (cat.includes("tech") || cat.includes("software") || cat.includes("it")) return "Tech"
  if (cat.includes("consult")) return "Consultancy"
  if (cat.includes("finance") || cat.includes("bank")) return "Finance"
  if (cat.includes("logistic") || cat.includes("supply")) return "Logistics"
  return "Other"
}

async function summariseJDs(jobs) {
  if (!jobs.length) return {}
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4000,
        system: `You summarise job descriptions concisely. Return ONLY valid JSON, no markdown.`,
        messages: [{
          role: "user",
          content: `Summarise each JD. Return JSON keyed by job id:
{
  "job_id": {
    "yoe": string,
    "industry": string,
    "hardNos": string[],
    "goodToHave": string[]
  }
}
Jobs:
${JSON.stringify(jobs.map(j => ({ id: j.id, jd: j.jd })), null, 2)}`
        }],
      }),
    })
    const data = await res.json()
    const clean = data.content[0].text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean)
  } catch (e) {
    return {}
  }
}

function inferJobType(item) {
  const text = (item.jobType || item.workType || "").toLowerCase()
  const jd = (item.description || item.jobDescription || "").toLowerCase()
  if (text.includes("part") || jd.includes("part-time")) return "Part Time"
  if (text.includes("contract") || jd.includes("contract basis")) return "Contract"
  if (text.includes("intern") || jd.includes("internship")) return "Internship"
  if (text.includes("freelance")) return "Freelance"
  return "Full Time"
}