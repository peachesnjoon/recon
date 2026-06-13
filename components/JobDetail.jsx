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
  const [jdOpen, setJdOpen] = useState(false)
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
          {hasResume && rating ? (
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
          ) : !hasResume ? (
            <div style={s.uploadNudge}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                <span>✦</span>
                <span>Upload your resume to see fit analysis and generate a tailored resume.</span>
              </div>
              <button style={s.nudgeBtn} onClick={onTrialClick}>Trial</button>
            </div>
          ) : null}
          {isRating && hasResume && <MiniOverlay />}
        </div>

        {/* Key facts — no overlay, always readable */}
        {(summary || rating) && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Key facts</div>
            <div style={s.factsRow}>
              {isValid(summary?.yoe) && (
                <div style={s.fact}>
                  <div style={s.factVal}>{summary.yoe}</div>
                  <div style={s.factKey}>Experience</div>
                </div>
              )}
              {isValid(summary?.industry) && (
                <div style={s.fact}>
                  <div style={s.factVal}>{summary.industry}</div>
                  <div style={s.factKey}>Industry</div>
                </div>
              )}
              {isValid(job.stage) && (
                <div style={s.fact}>
                  <div style={s.factVal}>{job.stage}</div>
                  <div style={s.factKey}>Company type</div>
                </div>
              )}
              {isValid(rating?.roleMatch) && (
                <Tooltip text="How well your skills and experience match what this role actually requires.">
                  <div style={{ ...s.fact, cursor: "help" }}>
                    <div style={{
                      ...s.factVal,
                      color: rating.roleMatch === "High" ? "#16A34A"
                        : rating.roleMatch === "Medium" ? "#D97706" : "#DC2626"
                    }}>{rating.roleMatch}</div>
                    <div style={s.factKey}>Role match ⓘ</div>
                  </div>
                </Tooltip>
              )}
              {isValid(rating?.entryBar) && (
                <Tooltip text="How selective the company is for this role based on seniority expectations and typical hiring bar.">
                  <div style={{ ...s.fact, cursor: "help" }}>
                    <div style={{
                      ...s.factVal,
                      color: rating.entryBar === "High" ? "#DC2626"
                        : rating.entryBar === "Medium" ? "#D97706" : "#16A34A"
                    }}>{rating.entryBar}</div>
                    <div style={s.factKey}>Entry bar ⓘ</div>
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        <div style={s.divider} />

        {/* CTA */}
        <div>
          {hasResume ? (
            <button
              style={{ ...s.assistBtn, ...(generating ? s.assistBtnDisabled : {}) }}
              onClick={() => onAssist(job)}
              disabled={generating}
            >
              {generating ? "Generating..." : generated ? "Regenerate Resume" : "Generate Tailored Resume"}
            </button>
          ) : (
            <button style={s.lockedBtn} onClick={onUploadClick}>Upload resume to unlock</button>
          )}
        </div>

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
              {summary.hardNos?.length > 0 && (
                <div style={s.summaryBlock}>
                  <div style={s.summaryBlockLabel}>Hard requirements</div>
                  {summary.hardNos.map((h, i) => (
                    <div key={i} style={s.summaryItem}>
                      <span style={{ color: "#DC2626", marginRight: 8 }}>—</span>{h}
                    </div>
                  ))}
                </div>
              )}
              {summary.goodToHave?.length > 0 && (
                <div style={s.summaryBlock}>
                  <div style={s.summaryBlockLabel}>Likely preferences</div>
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
          {job.jd && (
            <div style={{ marginTop: 12 }}>
              <button style={s.jdToggle} onClick={() => setJdOpen(o => !o)}>
                {jdOpen ? "Hide full JD ↑" : "View full JD ↓"}
              </button>
              {jdOpen && <div style={s.jdFull}>{job.jd}</div>}
            </div>
          )}
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
  applyBtn: { background: "#9CA3AF", color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", alignSelf: "flex-start", flexShrink: 0 },
  body: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 },
  fitSection: { background: "#F9FAFB", borderRadius: 12, padding: "16px 18px", display: "flex" },
  fitCol: { flex: 1, display: "flex", flexDirection: "column", gap: 8 },
  fitColLabel: { fontSize: 12, fontWeight: 700, color: "#16A34A", display: "flex", alignItems: "center", gap: 6 },
  fitColText: { fontSize: 13, color: "#374151", lineHeight: 1.55 },
  fitCheck: { width: 18, height: 18, borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 },
  fitWarn: { width: 18, height: 18, borderRadius: "50%", background: "#FEE2E2", color: "#DC2626", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 },
  fitDivider: { width: 1, background: "#E4E6EB", margin: "0 16px", flexShrink: 0 },
  uploadNudge: { background: "#F0F7FF", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#1A73E8", display: "flex", flexDirection: "row", alignItems: "center", gap: 12 },
  nudgeBtn: { background: "#1A73E8", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  assistBtn: { background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  assistBtnDisabled: { background: "#93C5FD", cursor: "not-allowed" },
  lockedBtn: { background: "#9CA3AF", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  resumeBlock: { background: "#F9FAFB", borderRadius: 10, padding: "16px 18px" },
  resumeBlockHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  actionBtn: { background: "#F5F6F7", border: "1px solid #E4E6EB", borderRadius: 6, color: "#65676B", padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 500 },
  resumeText: { fontSize: 12, color: "#1C1E21", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 },
  divider: { height: 1, background: "#F0F2F5", flexShrink: 0 },
  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 },
  factsRow: { display: "flex", gap: 28, flexWrap: "wrap" },
  fact: { display: "flex", flexDirection: "column", gap: 2 },
  factVal: { fontSize: 14, fontWeight: 700, color: "#1C1E21" },
  factKey: { fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryBody: { display: "flex", flexDirection: "column", gap: 14 },
  summaryBlock: { display: "flex", flexDirection: "column", gap: 5 },
  summaryBlockLabel: { fontSize: 11, fontWeight: 600, color: "#65676B" },
  summaryItem: { display: "flex", alignItems: "baseline", fontSize: 13, color: "#374151", lineHeight: 1.5 },
  jdToggle: { background: "none", border: "none", color: "#1A73E8", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 500 },
  jdFull: { fontSize: 12, color: "#65676B", lineHeight: 1.7, background: "#F9FAFB", borderRadius: 10, padding: "16px", whiteSpace: "pre-wrap", marginTop: 10 },
  companyText: { fontSize: 13, color: "#65676B", lineHeight: 1.65, margin: 0 },
  placeholder: { fontSize: 13, color: "#BCC0C4", fontStyle: "italic" },
  miniOverlay: { position: "absolute", inset: -4, background: "rgba(255,255,255,0.88)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, backdropFilter: "blur(2px)", zIndex: 2 },
  miniSpinner: { fontSize: 16, display: "inline-block", animation: "spin 1s linear infinite", color: "#1A73E8", marginRight: 6 },
  miniText: { fontSize: 12, color: "#65676B", fontWeight: 500 },
}