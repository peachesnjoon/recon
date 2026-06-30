import supabase from "../../lib/supabase"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("scrape-mcf: missing Supabase env vars")
    return res.status(200).json({ jobs: [], error: "Supabase env vars not configured" })
  }

  const { keywords, limit = 100 } = req.body

  try {
    // search by title only — avoids full-text scan on large jd column
    let query = supabase
      .from("jobs")
      .select("*")
      .eq("source", "MCF")
      .order("posted_at", { ascending: false })
      .limit(limit)

    if (keywords && keywords.trim()) {
      query = query.ilike("title", `%${keywords}%`)
    }

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    // if DB has results, return them directly
    if (rows && rows.length > 0) {
      const jobs = rows.map(row => ({
        id: row.id,
        title: row.title,
        company: row.company,
        stage: row.stage,
        industry: row.industry,
        location: row.location,
        salary: row.salary,
        jd: row.jd,
        url: row.url,
        postedAt: row.posted_at,
        jobType: row.job_type,
        source: row.source,
        jdSummary: row.jd_summary || null,
      }))
      return res.status(200).json({ jobs, fromCache: true })
    }

    // fallback: DB not yet populated — hit MCF live
    const params = new URLSearchParams({
      search: keywords,
      limit,
      sortBy: "new_posting_date",
    })
    const mcfRes = await fetch(
      `https://api.mycareersfuture.gov.sg/v2/jobs?${params}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
          Origin: "https://www.mycareersfuture.gov.sg",
          Referer: "https://www.mycareersfuture.gov.sg/",
        },
      }
    )
    const data = await mcfRes.json()
    const results = data.results || data.data || []

    const jobs = results.map((item, i) => ({
      id: `mcf_${item.uuid || i}`,
      title: item.title || "",
      company: item.postedCompany?.name || item.hiringEmployer?.name || "",
      stage: inferStage(item),
      industry: inferIndustry(item),
      location: "Singapore",
      salary: item.salary?.maximum
        ? `$${Math.round(item.salary.minimum / 1000)}k–$${Math.round(item.salary.maximum / 1000)}k`
        : null,
      jd: stripHtml(item.description || ""),
      url: item.metadata?.jobDetailsUrl
        ? item.metadata.jobDetailsUrl.startsWith("http")
          ? item.metadata.jobDetailsUrl
          : `https://www.mycareersfuture.gov.sg${item.metadata.jobDetailsUrl}`
        : item.uuid
        ? `https://www.mycareersfuture.gov.sg/job/${item.uuid}`
        : "",
      postedAt: item.metadata?.newPostingDate || null,
      jobType: inferJobType(item),
      source: "MCF",
    }))

    // store these live results so they're cached for next time
    if (jobs.length) {
      supabase
        .from("jobs")
        .upsert(
          jobs.map(j => ({
            id: j.id,
            title: j.title,
            company: j.company,
            stage: j.stage,
            industry: j.industry,
            location: j.location,
            salary: j.salary,
            jd: j.jd,
            url: j.url,
            posted_at: j.postedAt,
            job_type: j.jobType,
            source: j.source,
            synced_at: new Date().toISOString(),
          })),
          { onConflict: "id" }
        )
        .then(({ error }) => { if (error) console.error("MCF upsert:", error.message) })
    }

    return res.status(200).json({ jobs, fromCache: false })
  } catch (err) {
    console.error("MCF error:", err.message)
    return res.status(200).json({ jobs: [], error: err.message })
  }
}

function inferStage(item) {
  const text = (
    stripHtml(item.description || "") + " " +
    (item.postedCompany?.name || "") + " " +
    (item.categories?.[0]?.category || "")
  ).toLowerCase()
  const startupSignals = [
    "startup", "start-up", "series a", "series b", "series c", "series d",
    "seed funded", "seed stage", "seed round", "early stage", "pre-ipo",
    "venture-backed", "vc-backed", "venture capital",
    "well-funded", "well funded", "fast-growing", "fast growing",
    "high-growth", "high growth", "hypergrowth", "scale-up", "scaleup",
    "growth stage", "fast-paced", "rapidly growing", "rapidly expanding",
    "we are a small", "small team", "growing team",
    "founded in 202", "founded in 2019", "founded in 2018", "founded in 2017",
  ]
  if (startupSignals.some(s => text.includes(s))) return "Startup"
  return "MNC"
}

function inferIndustry(item) {
  const cat = (item.categories?.[0]?.rank || item.categories?.[0]?.category || "").toLowerCase()
  if (cat.includes("tech") || cat.includes("software") || cat.includes("it") || cat.includes("information") || cat.includes("media") || cat.includes("digital")) return "Tech"
  if (cat.includes("consult")) return "Consultancy"
  if (cat.includes("finance") || cat.includes("bank") || cat.includes("insurance") || cat.includes("accounting")) return "Finance"
  if (cat.includes("logistic") || cat.includes("supply") || cat.includes("transport")) return "Logistics"
  if (cat.includes("commerce") || cat.includes("retail")) return "E-commerce"
  if (cat.includes("health") || cat.includes("medical") || cat.includes("pharma")) return "Healthcare"
  return "Tech"
}

function inferJobType(item) {
  const text = (item.employmentTypes?.[0]?.employmentType || "").toLowerCase()
  const jd = stripHtml(item.description || "").toLowerCase()
  if (text.includes("part") || jd.includes("part-time")) return "Part Time"
  if (text.includes("contract") || jd.includes("contract")) return "Contract"
  if (text.includes("intern") || jd.includes("internship")) return "Internship"
  if (text.includes("freelance") || jd.includes("freelance")) return "Freelance"
  return "Full Time"
}

function stripHtml(html) {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
