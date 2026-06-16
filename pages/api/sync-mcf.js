export const config = { maxDuration: 120 }

import supabase from "../../lib/supabase"

const DEFAULT_KEYWORDS = [
  "software engineer", "product manager", "data analyst", "data scientist",
  "marketing", "sales", "business development", "finance", "accounting",
  "operations", "project manager", "UX designer", "HR", "supply chain",
  "consultant", "analyst", "engineer", "manager",
]

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { keywords, pages = 5 } = req.body

  // accept a single keyword, array, or default to broad list
  const keywordList = Array.isArray(keywords)
    ? keywords
    : keywords
    ? [keywords]
    : DEFAULT_KEYWORDS

  const PAGE_SIZE = 100
  let totalSynced = 0
  let totalFetched = 0

  try {
    for (const kw of keywordList) {
      for (let page = 0; page < pages; page++) {
        const params = new URLSearchParams({
          search: kw,
          limit: PAGE_SIZE,
          page,
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
        if (!mcfRes.ok) break

        const data = await mcfRes.json()
        const results = data.results || data.data || []
        if (!results.length) break

        totalFetched += results.length

        const jobs = results.map((item, i) => ({
          id: `mcf_${item.uuid || `${kw}_${page}_${i}`}`,
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
          posted_at: item.metadata?.newPostingDate || null,
          job_type: inferJobType(item),
          source: "MCF",
          synced_at: new Date().toISOString(),
        }))

        const { error } = await supabase
          .from("jobs")
          .upsert(jobs, { onConflict: "id" })

        if (error) {
          console.error("Supabase upsert error:", error.message)
          return res.status(500).json({ error: error.message, totalFetched, totalSynced })
        }

        totalSynced += jobs.length
        if (results.length < PAGE_SIZE) break
      }
    }

    // record a snapshot of company counts for trend tracking
    const { data: allJobs } = await supabase
      .from("jobs")
      .select("company")
      .eq("source", "MCF")

    const companyCounts = {}
    for (const row of allJobs || []) {
      if (!row.company) continue
      companyCounts[row.company] = (companyCounts[row.company] || 0) + 1
    }
    const today = new Date().toISOString().slice(0, 10)
    const snapshotRows = Object.entries(companyCounts).map(([company, count]) => ({
      company,
      role_keyword: "",
      count,
      snapped_at: today,
    }))
    if (snapshotRows.length > 0) {
      await supabase
        .from("job_snapshots")
        .upsert(snapshotRows, { onConflict: "company,role_keyword,snapped_at" })
    }

    // delete jobs not seen in the last 4 months
    const cutoff = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
    const { error: deleteError, count } = await supabase
      .from("jobs")
      .delete({ count: "exact" })
      .eq("source", "MCF")
      .lt("synced_at", cutoff)

    if (deleteError) console.error("Cleanup error:", deleteError.message)

    return res.status(200).json({
      totalFetched,
      totalSynced,
      deleted: count ?? 0,
      keywords: keywordList,
    })
  } catch (err) {
    console.error("sync-mcf error:", err.message)
    return res.status(500).json({ error: err.message, totalFetched, totalSynced })
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
  const cat = (
    item.categories?.[0]?.rank ||
    item.categories?.[0]?.category ||
    ""
  ).toLowerCase()
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
