export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { keywords, limit = 30 } = req.body

  try {
    const params = new URLSearchParams({
      search: keywords,
      limit,
      sortBy: "new_posting_date",
    })
    const url = `https://api.mycareersfuture.gov.sg/v2/jobs?${params}`
    const mcfRes = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://www.mycareersfuture.gov.sg",
        "Referer": "https://www.mycareersfuture.gov.sg/",
      }
    })
    const data = await mcfRes.json()
    const results = data.results || data.data || []

    const jobs = results.map((item, i) => ({
      id: `mcf_${item.uuid || i}`,
      title: item.title || "",
      company: item.postedCompany?.name || item.hiringEmployer?.name || "",
      stage: "MNC",
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

    return res.status(200).json({ jobs })
  } catch (err) {
    console.error("MCF error:", err.message)
    return res.status(500).json({ error: err.message })
  }
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
  const jd = (item.description || "").toLowerCase()
  if (text.includes("part") || jd.includes("part-time") || jd.includes("part time")) return "Part Time"
  if (text.includes("contract") || jd.includes("contract")) return "Contract"
  if (text.includes("intern") || jd.includes("internship") || jd.includes("intern ")) return "Internship"
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