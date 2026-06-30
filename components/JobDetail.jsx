import { useState } from "react"
import { categoryColor, categoryBg, formatDate } from "../lib/filters"
import { FaviconLogo } from "./JobListItem"

function isValid(val) {
  if (!val) return false
  const low = val.toString().toLowerCase().trim()
  return !["n/a", "na", "not specified", "unspecified", "unknown", "-", "none", ""].includes(low)
}

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1C1E21", color: "#fff", fontSize: 11, lineHeight: 1.5,
          padding: "6px 10px", borderRadius: 6,
          width: 240, whiteSpace: "normal", textAlign: "center",
          zIndex: 100, pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          {text}
          <div style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)",
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #1C1E21",
          }} />
        </div>
      )}
    </div>
  )
}

function MiniOverlay() {
  return (
    <div style={s.miniOverlay}>
      <span style={s.miniSpinner}>⟳</span>
      <span style={s.miniText}>Updating...</span>
    </div>
  )
}

export default function JobDetail({ job, rating, hasResume, onAssist, generating, generated, isRating, onTrialClick, onUploadClick }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadTxt = () => {
    const blob = new Blob([generated], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Resume_${job.title?.replace(/[^a-z0-9]/gi, "_") || "tailored"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printPDF = () => {
    const win = window.open("", "_blank")
    win.document.write(`
      <html>
      <head>
        <title>${job.title} - Resume</title>
        <style>
          body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; font-size: 13px; line-height: 1.6; color: #111; }
          pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body><pre>${generated}</pre></body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  if (!job) return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>⌕</div>
      <div style={s.emptyTitle}>Select a job to view details</div>
    </div>
  )

  const cat = rating?.category
  const date = formatDate(job.postedAt)
  const summary = job.jdSummary

  const tooltipText = cat === "Strong Fit"
    ? "Your background closely matches this role's requirements and the company is within reach."
    : cat === "Worth Exploring"
    ? "There's a genuine chance here but some gaps exist. Worth applying with a strong cover."
    : "Significant gap between your profile and what this role expects."

  return (
    <div style={s.wrap}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerRow}>
          <FaviconLogo company={job.company} size={44} />
          <div style={s.headerText}>
            <div style={s.jobTitle}>{job.title}</div>
            <div style={s.jobMeta}>
              <span style={{ fontWeight: 500, color: "#1C1E21" }}>{job.company}</span>
              {job.jobType && <><span style={s.dot}>·</span><span>{job.jobType}</span></>}
              {date && <><span style={s.dot}>·</span><span style={{ color: "#9CA3AF" }}>{date}</span></>}
            </div>
            <div style={s.headerTags}>
              {isValid(job.salary) && <span style={s.salaryTag}>{job.salary}</span>}
              {cat && (
                <Tooltip text={tooltipText}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
                    color: categoryColor(cat), background: categoryBg(cat), cursor: "help",
                  }}>{cat}</span>
                </Tooltip>
              )}
            </div>
          </div>
          {job.url && (
            <a href={job.url} target="_blank" rel="noreferrer" style={s.applyBtn}>Apply ↗</a>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>

        {/* Fit analysis — single overlay covers both columns */}
        <div style={{ position: "relative" }}>
          {hasResume && rating && (
            <div style={s.fitSection}>
              <div style={s.fitCol}>
                <div style={s.fitColLabel}>
                  <span style={s.fitCheck}>✓</span> Why you fit
                </div>
                <div style={s.fitColText}>{rating.whyYouFit}</div>
              </div>
              <div style={s.fitDivider} />
              <div style={s.fitCol}>
                <div style={{ ...s.fitColLabel, color: "#DC2626" }}>
                  <span style={s.fitWarn}>⚠</span> Watch out
                </div>
                <div style={s.fitColText}>{rating.watchOut}</div>
              </div>
            </div>
          )}
          {isRating && hasResume && <MiniOverlay />}
        </div>

        {/* Role Snapshot — flex grid, only shows cells with data */}
        {(summary || rating) && (isValid(summary?.yoe) || isValid(job.stage) || isValid(summary?.industry) || isValid(rating?.entryBar)) && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Role Snapshot</div>
            <div style={s.snapshotGrid}>
              {isValid(summary?.yoe) && (
                <div style={s.snapshotCell}>
                  <div style={s.snapshotKey}>Experience</div>
                  <div style={s.snapshotVal}>{summary.yoe}</div>
                </div>
              )}
              {isValid(job.stage) && (
                <div style={s.snapshotCell}>
                  <div style={s.snapshotKey}>Company Type</div>
                  <div style={s.snapshotVal}>{job.stage}</div>
                </div>
              )}
              {isValid(summary?.industry) && (
                <div style={s.snapshotCell}>
                  <div style={s.snapshotKey}>Industry</div>
                  <div style={s.snapshotVal}>{summary.industry}</div>
                </div>
              )}
              {isValid(rating?.entryBar) && (
                <Tooltip text="How selective the company is for this role based on seniority expectations and typical hiring bar.">
                  <div style={{ ...s.snapshotCell, cursor: "help" }}>
                    <div style={s.snapshotKey}>Job Difficulty ⓘ</div>
                    <div style={{
                      ...s.snapshotVal,
                      color: rating.entryBar === "High" ? "#DC2626" : rating.entryBar === "Medium" ? "#D97706" : "#16A34A"
                    }}>
                      ● {rating.entryBar}
                    </div>
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Top Requirements */}
        {summary?.hardNos?.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Top Requirements</div>
            <div style={s.reqList}>
              {summary.hardNos.slice(0, 5).map((req, i) => (
                <div key={i} style={s.reqItem}>
                  <span style={s.reqIcon}>🔧</span>
                  <span style={s.reqText}>{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={s.divider} />

        {/* CTA */}
        {hasResume && (
          <button
            style={{ ...s.assistBtn, ...(generating ? s.assistBtnDisabled : {}) }}
            onClick={() => onAssist(job)}
            disabled={generating}
          >
            {generating ? "Generating..." : generated ? "Regenerate Resume" : "Generate Tailored Resume"}
          </button>
        )}

        {/* Generated resume */}
        {generated && (
          <div style={s.resumeBlock}>
            <div style={s.resumeBlockHeader}>
              <span style={s.sectionLabel}>Tailored Resume</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={s.actionBtn} onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
                <button style={s.actionBtn} onClick={downloadTxt}>Download .txt</button>
                <button style={s.actionBtn} onClick={printPDF}>Print / PDF</button>
              </div>
            </div>
            <pre style={s.resumeText}>{generated}</pre>
          </div>
        )}

        <div style={s.divider} />

        {/* Job summary */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Job summary</div>
          {summary ? (
            <div style={s.summaryBody}>
              {summary.goodToHave?.length > 0 && (
                <div style={s.summaryBlock}>
                  <div style={s.summaryBlockLabel}>Good to have</div>
                  {summary.goodToHave.map((g, i) => (
                    <div key={i} style={s.summaryItem}>
                      <span style={{ color: "#16A34A", marginRight: 8 }}>—</span>{g}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={s.placeholder}>Summarising...</div>
          )}
          {job.jd && <div style={{ ...s.jdFull, marginTop: summary ? 8 : 0 }}>{job.jd}</div>}
        </div>

        {/* Company */}
        {rating?.companySummary && (
          <>
            <div style={s.divider} />
            <div style={s.section}>
              <div style={s.sectionLabel}>About {job.company}</div>
              <p style={s.companyText}>{rating.companySummary}</p>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

const s = {
  wrap: { height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" },
  empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIcon: { fontSize: 28, color: "#E4E6EB" },
  emptyTitle: { fontSize: 13, color: "#BCC0C4" },
  header: { padding: "16px 24px 14px", borderBottom: "1px solid #F0F2F5", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 },
  headerRow: { display: "flex", gap: 12, alignItems: "flex-start" },
  headerText: { flex: 1, display: "flex", flexDirection: "column", gap: 3 },
  jobTitle: { fontSize: 18, fontWeight: 700, color: "#1C1E21", lineHeight: 1.2 },
  jobMeta: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, fontSize: 13, color: "#65676B" },
  dot: { color: "#D1D5DB", margin: "0 3px" },
  headerTags: { display: "flex", alignItems: "center", gap: 8, width: "100%", marginTop: 2 },
  salaryTag: { fontSize: 13, fontWeight: 700, color: "#16A34A" },
  applyBtn: { background: "#16825C", color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", alignSelf: "flex-start", flexShrink: 0 },
  body: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 },
  fitSection: { background: "#F9FAFB", borderRadius: 12, padding: "16px 18px", display: "flex" },
  fitCol: { flex: 1, display: "flex", flexDirection: "column", gap: 8 },
  fitColLabel: { fontSize: 12, fontWeight: 700, color: "#16A34A", display: "flex", alignItems: "center", gap: 6 },
  fitColText: { fontSize: 13, color: "#374151", lineHeight: 1.55 },
  fitCheck: { width: 18, height: 18, borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 },
  fitWarn: { width: 18, height: 18, borderRadius: "50%", background: "#FEE2E2", color: "#DC2626", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 },
  fitDivider: { width: 1, background: "#E4E6EB", margin: "0 16px", flexShrink: 0 },
  uploadNudge: { background: "#ECFDF5", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#16825C", display: "flex", flexDirection: "row", alignItems: "center", gap: 12 },
  nudgeBtn: { background: "#16825C", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  assistBtn: { background: "#16825C", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  assistBtnDisabled: { background: "#D1D5DB", cursor: "not-allowed" },
  lockedBtn: { background: "#16825C", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  resumeBlock: { background: "#F9FAFB", borderRadius: 10, padding: "16px 18px" },
  resumeBlockHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  actionBtn: { background: "#F5F6F7", border: "1px solid #E4E6EB", borderRadius: 6, color: "#65676B", padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 500 },
  resumeText: { fontSize: 12, color: "#1C1E21", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 },
  divider: { height: 1, background: "#F0F2F5", flexShrink: 0 },
  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 },
  snapshotGrid: { display: "flex", flexWrap: "wrap", gap: 1, background: "#F0F2F5", border: "1px solid #F0F2F5", borderRadius: 10, overflow: "hidden" },
  snapshotCell: { background: "#fff", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, minWidth: "calc(50% - 1px)", flex: 1 },
  snapshotKey: { fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  snapshotVal: { fontSize: 14, fontWeight: 700, color: "#1C1E21" },
  reqList: { display: "flex", flexDirection: "column", gap: 8 },
  reqItem: { display: "flex", alignItems: "flex-start", gap: 8 },
  reqIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },
  reqText: { fontSize: 13, color: "#374151", lineHeight: 1.5 },
  unlockBox: { background: "#F9FAFB", border: "1px solid #E4E6EB", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" },
  unlockTitle: { fontSize: 15, fontWeight: 700, color: "#1C1E21" },
  unlockSub: { fontSize: 13, color: "#65676B", lineHeight: 1.5, maxWidth: 320 },
  unlockFeatures: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", maxWidth: 280 },
  unlockFeature: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E4E6EB", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#374151", fontWeight: 500 },
  unlockFeatureIcon: { fontSize: 16 },
  uploadBtn: { width: "100%", maxWidth: 280, background: "#16825C", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  trialLink: { background: "none", border: "none", color: "#16825C", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" },
  factsRow: { display: "flex", gap: 28, flexWrap: "wrap" },
  fact: { display: "flex", flexDirection: "column", gap: 2 },
  factVal: { fontSize: 14, fontWeight: 700, color: "#1C1E21" },
  factKey: { fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryBody: { display: "flex", flexDirection: "column", gap: 14 },
  summaryBlock: { display: "flex", flexDirection: "column", gap: 5 },
  summaryBlockLabel: { fontSize: 11, fontWeight: 600, color: "#65676B" },
  summaryItem: { display: "flex", alignItems: "baseline", fontSize: 13, color: "#374151", lineHeight: 1.5 },
  jdToggle: { background: "none", border: "none", color: "#16825C", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 500 },
  jdFull: { fontSize: 12, color: "#65676B", lineHeight: 1.7, background: "#F9FAFB", borderRadius: 10, padding: "16px", whiteSpace: "pre-wrap", marginTop: 10 },
  companyText: { fontSize: 13, color: "#65676B", lineHeight: 1.65, margin: 0 },
  placeholder: { fontSize: 13, color: "#BCC0C4", fontStyle: "italic" },
  miniOverlay: { position: "absolute", inset: -4, background: "rgba(255,255,255,0.88)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, backdropFilter: "blur(2px)", zIndex: 2 },
  miniSpinner: { fontSize: 16, display: "inline-block", animation: "spin 1s linear infinite", color: "#16825C", marginRight: 6 },
  miniText: { fontSize: 12, color: "#65676B", fontWeight: 500 },
}