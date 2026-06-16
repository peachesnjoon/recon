export function matchesDisqualifiers(job, disqualifiers) {
  if (!disqualifiers || !disqualifiers.length) return false
  const jdLower = (job.jd || "").toLowerCase()
  return disqualifiers.some(dq => jdLower.includes(dq.toLowerCase()))
}

export function applyFilters(jobs, ratings, filters) {
  return jobs.filter(job => {
    const jdLower = (job.jd || "").toLowerCase()
    const titleLower = (job.title || "").toLowerCase()
    const combined = jdLower + " " + titleLower

    // Industry filter
    if (filters.industries?.length && !filters.industries.includes(job.industry)) return false

    // Company type
    if (filters.companyType && filters.companyType !== "Both") {
      if (job.stage !== filters.companyType) return false
    }

    // Fit category
    if (filters.category && filters.category !== "All") {
      const rating = ratings[job.id]
      if (!rating || rating.category !== filters.category) return false
    }

    // Language filter
    if (filters.languages?.selected?.length > 0) {
      const { selected, mode } = filters.languages
      const mentions = selected.map(lang => LANGUAGE_KEYWORDS[lang] || [lang.toLowerCase()])
      const matches = mentions.map(kws => kws.some(kw => combined.includes(kw)))
      if (mode === "exclude_any") {
        if (matches.some(Boolean)) return false
      } else if (mode === "include_all") {
        if (!matches.every(Boolean)) return false
      } else {
        // include_any
        if (!matches.some(Boolean)) return false
      }
    }

    // Education filter
    if (filters.education?.selected?.length > 0) {
      const { selected, mode } = filters.education
      const mentions = selected.map(edu => EDU_KEYWORDS[edu] || [edu.toLowerCase()])
      const matches = mentions.map(kws => kws.some(kw => combined.includes(kw)))
      if (mode === "exclude") {
        if (matches.some(Boolean)) return false
      } else {
        // include_any — show jobs that mention any selected edu level
        if (!matches.some(Boolean)) return false
      }
    }

    // YOE range
if (filters.yoe && (filters.yoe[0] > 0 || filters.yoe[1] < 20)) {
  const max = filters.yoe[1]
  
  // first try structured yoe from summary
  const yoeText = (job.jdSummary?.yoe || "").toLowerCase()
  const summaryNums = yoeText.match(/\d+/g)?.map(Number) || []
  
  if (summaryNums.length > 0) {
    const jobMinYoe = Math.min(...summaryNums)
    if (jobMinYoe > max) return false
  } else {
    // fallback: scan raw JD for yoe patterns like "8 years", "10+ years"
    const jdYoeMatches = jdLower.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience)?/g) || []
    const jdNums = jdYoeMatches
      .map(m => parseInt(m))
      .filter(n => !isNaN(n) && n > 0 && n < 30)
    if (jdNums.length > 0) {
      const jobMinYoe = Math.min(...jdNums)
      if (jobMinYoe > max) return false
    }
  }
}

    // Job type filter — use stored jobType field; full time is implied if not stated
    if (filters.jobTypes?.selected?.length > 0) {
      const { selected, mode } = filters.jobTypes
      const jobType = job.jobType || "Full Time"
      if (mode === "exclude") {
        if (selected.includes(jobType)) return false
      } else {
        if (!selected.includes(jobType)) return false
      }
    }

    // Certification filter
    if (filters.certification && filters.certification !== "any") {
      const hasCert = CERT_KEYWORDS.some(kw => combined.includes(kw))
      if (filters.certification === "required" && !hasCert) return false
      if (filters.certification === "not_required" && hasCert) return false
    }

    return true
  })
}

// keyword maps
const LANGUAGE_KEYWORDS = {
  "English": ["english"],
  "Mandarin": ["mandarin", "chinese", "putonghua", "中文"],
  "Malay": ["malay", "bahasa"],
  "Tamil": ["tamil"],
  "Japanese": ["japanese", "日本語"],
  "Korean": ["korean", "한국어"],
}

const EDU_KEYWORDS = {
  "Diploma": ["diploma", "polytechnic", "poly"],
  "Degree": ["degree", "bachelor", "undergraduate", "b.sc", "b.eng", "b.a."],
  "Masters": ["master", "masters", "mba", "m.sc", "postgraduate"],
  "PhD": ["phd", "doctorate", "doctoral"],
}


const CERT_KEYWORDS = [
  "certification required", "certified", "cfa", "pmp", "aws certified",
  "google certified", "cissp", "cpa", "acca", "certificate required"
]

export function categoryColor(cat) {
  if (cat === "Strong Fit") return "#16A34A"
  if (cat === "Worth Exploring") return "#D97706"
  return "#DC2626"
}

export function categoryBg(cat) {
  if (cat === "Strong Fit") return "#F0FFF4"
  if (cat === "Worth Exploring") return "#FFFBEB"
  return "#FFF5F5"
}

export function categoryEmoji(cat) {
  if (cat === "Strong Fit") return "🟢"
  if (cat === "Worth Exploring") return "🟡"
  return "🔴"
}

export function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date)) return null
  const now = new Date()
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  return `${Math.floor(diff / 365)}y ago`
}