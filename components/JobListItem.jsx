import { useState } from "react"
import { categoryColor, categoryBg, formatDate } from "../lib/filters"

const DOMAIN_MAP = {
  "shopee": "shopee.com", "grab": "grab.com", "sea limited": "sea.com",
  "foodpanda": "foodpanda.com", "lazada": "lazada.com", "razer": "razer.com",
  "shopback": "shopback.com", "gojek": "gojek.com", "bytedance": "bytedance.com",
  "tiktok": "tiktok.com", "singtel": "singtel.com", "dbs": "dbs.com",
  "ocbc": "ocbc.com", "uob": "uob.com", "kpmg": "kpmg.com",
  "deloitte": "deloitte.com", "pwc": "pwc.com", "accenture": "accenture.com",
  "mckinsey": "mckinsey.com", "bcg": "bcg.com", "stripe": "stripe.com",
  "google": "google.com", "meta": "meta.com", "microsoft": "microsoft.com",
  "amazon": "amazon.com", "aspire": "aspireapp.com", "patsnap": "patsnap.com",
  "ninjavan": "ninjavan.co", "ninja van": "ninjavan.co", "glints": "glints.com",
  "govtech": "tech.gov.sg", "government technology": "tech.gov.sg",
  "coda": "codapayments.com",
}

const AVATAR_COLORS = [
  ["#DBEAFE", "#1E40AF"], ["#FCE7F3", "#9D174D"], ["#D1FAE5", "#065F46"],
  ["#FEF3C7", "#78350F"], ["#EDE9FE", "#4C1D95"], ["#FFE4E6", "#881337"],
  ["#ECFDF5", "#064E3B"], ["#FFF7ED", "#7C2D12"],
]

function shorten(text, maxLen = 40) {
  if (!text) return ""
  const cleaned = text
    .replace(/experience (with|in|bridging|working with) /gi, "")
    .replace(/exposure to /gi, "")
    .replace(/knowledge of /gi, "")
    .replace(/familiarity with /gi, "")
    .replace(/ability to /gi, "")
    .replace(/strong /gi, "")
    .replace(/excellent /gi, "")
    .replace(/proven /gi, "")
    .trim()
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trim() + "..." : cleaned
}

function isValid(val) {
  if (!val) return false
  const low = val.toString().toLowerCase().trim()
  return !["n/a", "na", "not specified", "unspecified", "unknown", "-", "none", ""].includes(low)
}

export function Avatar({ name, size = 44 }) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length
  const [bg, text] = AVATAR_COLORS[idx]
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: bg, color: text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
      border: "1px solid rgba(0,0,0,0.06)",
    }}>
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  )
}

export function FaviconLogo({ company, size = 44 }) {
  const [err, setErr] = useState(false)
  const key = (company || "").toLowerCase()
  const match = Object.keys(DOMAIN_MAP).find(k => key.includes(k))
  const domain = match ? DOMAIN_MAP[match] : null
  if (!domain || err) return <Avatar name={company} size={size} />
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      border: "1px solid #E4E6EB", background: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        width={size * 0.55} height={size * 0.55}
        style={{ objectFit: "contain" }}
        onError={() => setErr(true)}
        alt=""
      />
    </div>
  )
}

export default function JobListItem({ job, rating, selected, onClick }) {
  const cat = rating?.category
  const date = formatDate(job.postedAt)
  return (
    <div
      onClick={onClick}
      style={{
        ...s.item,
        background: selected ? "#ECFDF5" : "#fff",
        borderLeft: `3px solid ${selected ? "#16825C" : "transparent"}`,
      }}
    >
      <div style={s.inner}>
        <FaviconLogo company={job.company} size={38} />
        <div style={s.content}>

          {/* Title + actions */}
          <div style={s.titleRow}>
            <span style={s.title}>{job.title}</span>
            <div style={s.titleActions}>
              {date && <span style={s.date}>{date}</span>}
              <span style={s.arrow}>›</span>
            </div>
          </div>

          {/* Company */}
          <div style={s.company}>{job.company}</div>

          {/* Salary — prominent */}
          {isValid(job.salary) && (
            <div style={s.salary}>{job.salary}</div>
          )}

          {/* Pills: job type + industry + fit */}
          <div style={s.metaRow}>
            <span style={s.metaTag}>{job.jobType || "Full Time"}</span>
            {isValid(job.jdSummary?.industry) && (
              <span style={{ ...s.metaTag, color: "#16825C", background: "#ECFDF5", borderColor: "#A7F3D0" }}>
                {job.jdSummary.industry}
              </span>
            )}
            {cat && (
              <span style={{
                ...s.metaTag, border: "none",
                color: categoryColor(cat), background: categoryBg(cat),
              }}>{cat}</span>
            )}
          </div>

          {/* YOE + location row */}
          {(isValid(job.jdSummary?.yoe) || isValid(job.location)) && (
            <div style={s.infoRow}>
              {isValid(job.jdSummary?.yoe) && <span>⏱ {job.jdSummary.yoe}</span>}
              {isValid(job.jdSummary?.yoe) && isValid(job.location) && <span style={s.dot}>·</span>}
              {isValid(job.location) && <span>📍 {job.location}</span>}
            </div>
          )}


        </div>
      </div>
    </div>
  )
}

const s = {
  item: {
    padding: "12px 14px 12px 16px", borderBottom: "1px solid #F0F2F5",
    cursor: "pointer", transition: "background 0.1s",
  },
  inner: { display: "flex", gap: 10, alignItems: "flex-start" },
  content: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
  title: { fontSize: 13, fontWeight: 650, color: "#1C1E21", lineHeight: 1.3, flex: 1 },
  titleActions: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  date: { fontSize: 10, color: "#9CA3AF" },
  arrow: { fontSize: 16, color: "#C4C9D4", fontWeight: 300 },
  company: { fontSize: 12, color: "#65676B" },
  salary: { fontSize: 13, fontWeight: 700, color: "#16825C" },
  metaRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 1 },
  metaTag: {
    fontSize: 10, color: "#65676B", background: "#F5F6F7",
    border: "1px solid #E4E6EB", padding: "2px 7px", borderRadius: 4,
  },
  infoRow: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#65676B", flexWrap: "wrap" },
  dot: { color: "#D1D5DB" },
  signalRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, fontSize: 11, color: "#65676B" },
  signalLabel: { fontWeight: 600, color: "#9CA3AF", marginRight: 2 },
}