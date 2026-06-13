export const config = { maxDuration: 120 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { keywords, limit = 20 } = req.body
  const token = process.env.APIFY_TOKEN

  try {
    // ── Source 1: MCF — instant, no cold start ──────────────────────────────
    const mcfJobs = await fetchMCF(keywords, limit)

    // Return MCF results immediately while JobStreet loads in background
    // We'll merge via a second call from the frontend
    // For now return MCF first, mark source
    let jobs = mcfJobs

    // ── Source 2: JobStreet via Apify — slower, better quality ─────────────
    let jsJobs = []
    try {
      jsJobs = await fetchJobStreet(keywords, limit, token)
    } catch (e) {
      console.error("JobStreet failed, using MCF only:", e.message)
    }

    // Merge — deduplicate by title + company similarity
    const seen = new Set(jobs.map(j => normalise(j.title + j.company)))
    for (const job of jsJobs) {
      const key = normalise(job.title + job.company)
      if (!seen.has(key)) {
        seen.add(key)
        jobs.push(job)
      }
    }

    // Sort latest first
    jobs.sort((a, b) => {
      if (!a.postedAt) return 1
      if (!b.postedAt) return -1
      return new Date(b.postedAt) - new Date(a.postedAt)
    })

    // Summarise JDs
    const summaries = await summariseJDs(jobs.slice(0, 20))
    jobs.forEach(job => {
      if (summaries[job.id]) job.jdSummary = summaries[job.id]
    })

    return res.status(200).json({ jobs })
  } catch (err) {
    console.error("Scrape error:", err.message)
    return res.status(500).json({ error: err.message })
  }
}

// ── MCF direct API — free, instant, always has salary ──────────────────────
async function fetchMCF(keywords, limit) {
  try {
    const params = new URLSearchParams({
      search: keywords,
      limit: limit,
      sortBy: "new_posting_date",
    })
    const url = `https://api.mycareersfuture.gov.sg/v2/jobs?${params}`
    console.log("MCF URL:", url)
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://www.mycareersfuture.gov.sg",
        "Referer": "https://www.mycareersfuture.gov.sg/",
      }
    })
    console.log("MCF status:", res.status)
    const data = await res.json()
    console.log("MCF total:", data.total, "results:", data.results?.length)
    const results = data.results || data.data || []
    return results.map((item, i) => ({
      id: `mcf_${item.uuid || i}`,
      title: item.title || "",
      company: item.postedCompany?.name || item.hiringEmployer?.name || "",
      stage: "MNC",
      industry: item.categories?.[0]?.rank || "Other",
      location: "Singapore",
      salary: item.salary?.maximum
        ? `$${Math.round(item.salary.minimum / 1000)}k–$${Math.round(item.salary.maximum / 1000)}k`
        : null,
      jd: item.description || "",
      url: item.metadata?.jobDetailsUrl
        ? `https://www.mycareersfuture.gov.sg${item.metadata.jobDetailsUrl}`
        : item.uuid
        ? `https://www.mycareersfuture.gov.sg/job/${item.uuid}`
        : "",
      postedAt: item.metadata?.newPostingDate || null,
      jobType: item.employmentTypes?.[0]?.employmentType || null,
      source: "MCF",
    }))
  } catch (e) {
    console.error("MCF fetch error:", e.message)
    return []
  }
}

// ── JobStreet via Apify ─────────────────────────────────────────────────────
async function fetchJobStreet(keywords, limit, token) {
  if (!token) return []

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

  if (!startRes.ok) throw new Error(`Apify start failed: ${startRes.status}`)

  const startData = await startRes.json()
  const runId = startData.data?.id
  const datasetId = startData.data?.defaultDatasetId
  if (!runId) throw new Error("No run ID from Apify")

  // Poll up to 90s
  const maxWait = 90000
  const interval = 3000
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await sleep(interval)
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`)
    const statusData = await statusRes.json()
    const status = statusData.data?.status
    if (status === "SUCCEEDED") break
    if (["FAILED", "TIMED-OUT", "ABORTED"].includes(status)) throw new Error(`Run ${status}`)
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=${limit}`
  )
  const items = await itemsRes.json()
  if (!Array.isArray(items)) return []

  return items.map((item, i) => ({
    id: `js_${item.jobId || i}`,
    title: item.title || item.jobTitle || "",
    company: item.company || item.companyName || "",
    stage: inferStage(item),
    industry: inferIndustry(item),
    location: item.location || "Singapore",
    salary: item.salary || item.salaryRange || null,
    jd: item.description || item.jobDescription || "",
    url: item.url || item.jobUrl || "",
    postedAt: item.postedAt || item.postedDate || null,
    jobType: item.jobType || item.workType || null,
    source: "JobStreet",
  }))
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
    console.error("JD summarise error:", e.message)
    return {}
  }
}