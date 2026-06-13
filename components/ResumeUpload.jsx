import { useRef, useState } from "react"

export default function ResumeUpload({
  onParsed, parsing, resumeData, resumeSignal, fitPreferences,
  ratings, onFilterClick, activeCategory, onRemove, onEditPreferences, onRerate, isRating, onTrialClick,
  matchState = "aligned", resumeRoles = [], activeRoles = [], manualRoles = []
}) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [signalExpanded, setSignalExpanded] = useState(false)
  const [hoverMismatch, setHoverMismatch] = useState(false)
  const fileRef = useRef()

  const counts = {
    total: Object.keys(ratings || {}).length,
    strong: Object.values(ratings || {}).filter(r => r.category === "Strong Fit").length,
    worth: Object.values(ratings || {}).filter(r => r.category === "Worth Exploring").length,
    low: Object.values(ratings || {}).filter(r => r.category === "Low Priority").length,
  }

  const handleFile = async (file) => {
    if (!file || file.type !== "application/pdf") { setError("PDF files only."); return }
    setError("")
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1]
      await onParsed(base64)
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const StatRow = ({ cat, color, label, count }) => {
    const active = activeCategory === cat
    return (
      <div
        onClick={() => onFilterClick?.(active ? "All" : cat)}
        style={{
          ...s.statRow, cursor: "pointer",
          background: active ? `${color}12` : "transparent",
          borderRadius: 6, padding: "3px 6px", margin: "0 -6px",
        }}
      >
        <span style={{ ...s.statDot, background: color }} />
        <span style={{ ...s.statLabel, fontWeight: active ? 700 : 400 }}>{label}</span>
        <span style={{ ...s.statVal, color }}>{count}</span>
        {active && <span style={{ fontSize: 9, color, marginLeft: 2 }}>✕</span>}
      </div>
    )
  }

  const prefLabel = fitPreferences ? {
    skills: "Skills-focused",
    industry: "Industry-focused",
    both: "Balanced",
  }[fitPreferences.weightBasis] : null

  const cardBg = matchState === "mismatch" ? "#FCF0F0" : matchState === "partial" ? "#FCF6EC" : "#F0F7FF"
  const accentColor = matchState === "mismatch" ? "#DC2626" : matchState === "partial" ? "#D97706" : null
  const mismatchTip = matchState === "mismatch"
    ? `Your resume reads as ${(resumeRoles[0] || "another direction")}, not ${(activeRoles[0] || "your search")}. This is why most jobs rate Low Priority.`
    : matchState === "partial"
    ? `Partial overlap between your resume and your search — this affects your fit ratings.`
    : null

  return (
    <div style={{ ...s.card, background: cardBg }}>

      {/* Mismatch / partial banner */}
      {(matchState === "mismatch" || matchState === "partial") && (
        <div
          style={{ ...s.matchBanner, borderColor: accentColor, color: accentColor }}
          onMouseEnter={() => setHoverMismatch(true)}
          onMouseLeave={() => setHoverMismatch(false)}
        >
          <span>{matchState === "mismatch" ? "⚠ Resume / search mismatch" : "⚠ Partial mismatch"}</span>
          <span style={s.matchInfo}>ⓘ</span>
          {hoverMismatch && <div style={s.matchTooltip}>{mismatchTip}</div>}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <span style={s.icon}>🤖</span>
        <span style={s.title}>AI Career Agent</span>
        {parsing && <span style={s.spinner}>⟳</span>}
      </div>

      {/* Resume identity */}
      {resumeData && (
        <div style={s.resumeRow}>
          <div style={s.resumeCheck}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={s.resumeName}>{resumeData.name}</div>
            <div style={s.resumeRole}>{resumeData.currentRole}</div>
          </div>
        </div>
      )}

      {/* Fit preferences */}
      {fitPreferences ? (
        <div style={s.prefSection}>
          <div style={s.prefPills}>
            <span style={s.prefPill}>⚙ {prefLabel}</span>
            <span style={s.prefPill}>⚙ {fitPreferences.flexibleYoe ? "Flexible YOE" : "Strict YOE"}</span>
            <span style={s.prefPill}>⚙ {fitPreferences.companySelectivity ? "Selective Company" : "Not Company Selective"}</span>
            <span style={s.prefPill}>⚙ {fitPreferences.openToPivot ? "Open to Career Pivots" : "No Career Pivots"}</span>
          </div>
          <div style={s.prefActions}>
            <button style={s.editBtn} onClick={onEditPreferences}>Edit roles & fit</button>
            <button
              style={{ ...s.editBtn, color: isRating ? "#BCC0C4" : "#1A73E8", borderColor: isRating ? "#E4E6EB" : "#BFDBFE", background: isRating ? "none" : "#F0F7FF" }}
              onClick={onRerate}
              disabled={isRating}
            >
              {isRating ? "⟳ Rating..." : "↻ Re-rate"}
            </button>
          </div>
        </div>
      ) : (
        <div style={s.prefSection}>
          <button
            style={{ width: "100%", background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            onClick={onEditPreferences}
          >
            ⚙ Set roles & fit preferences
          </button>
        </div>
      )}

      {!resumeData && (
        <div style={s.pitch}>Upload your resume to unlock fit ratings and tailored resume generation.</div>
      )}

      {/* Stats */}
      <div style={s.stats}>
        <div style={s.statRow}>
          <span style={s.statLabel}>Jobs analysed</span>
          <span style={s.statVal}>{counts.total}</span>
        </div>
        <div style={s.statDivider} />
        <StatRow cat="Strong Fit" color="#16A34A" label="Strong Fit" count={counts.strong} />
        <StatRow cat="Worth Exploring" color="#D97706" label="Worth Exploring" count={counts.worth} />
        <StatRow cat="Low Priority" color="#DC2626" label="Low Priority" count={counts.low} />
      </div>

      {/* AI signal — collapsible, above upload */}
      {(resumeSignal || resumeRoles.length > 0) && (
        <div style={s.signalBox}>
          <div style={s.signalHeader} onClick={() => setSignalExpanded(e => !e)}>
            <span style={s.signalLabel}>AI READ</span>
            <span style={s.signalChevron}>{signalExpanded ? "↑" : "↓"}</span>
          </div>

          {resumeRoles.length > 0 ? (
            <>
              <div style={s.signalSub}>Your resume suggests:</div>
              <ul style={s.roleUl}>
                {resumeRoles.map((r, i) => <li key={i} style={s.roleLi}>{r}</li>)}
              </ul>
              {manualRoles.length > 0 && (
                <>
                  <div style={s.signalSub}>Manually added:</div>
                  <ul style={s.roleUl}>
                    {manualRoles.map((r, i) => <li key={i} style={s.roleLi}>{r}</li>)}
                  </ul>
                </>
              )}
              {signalExpanded && resumeSignal && (
                <div style={{ ...s.signalText, marginTop: 8 }}>{resumeSignal}</div>
              )}
            </>
          ) : (
            <div style={{
              ...s.signalText,
              WebkitLineClamp: signalExpanded ? "unset" : 2,
              overflow: signalExpanded ? "visible" : "hidden",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
            }}>
              {resumeSignal}
            </div>
          )}
        </div>
      )}

      {/* Upload zone */}
      <div
        style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}) }}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        {parsing ? (
          <span style={s.dropText}>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 4 }}>⟳</span>
            Parsing resume...
          </span>
        ) : resumeData ? (
          <span style={s.dropText}>↑ Upload new resume</span>
        ) : (
          <>
            <span style={s.dropIcon}>↑</span>
            <span style={s.dropText}>Drop PDF or tap to upload</span>
          </>
        )}
      </div>

      {resumeData && (
        <button style={s.removeBtn} onClick={onRemove}>Remove resume</button>
      )}

      {/* Trial with dummy resume — opens modal, below remove */}
      {!parsing && (
        <button style={s.dummyToggle} onClick={onTrialClick}>
          ✦ Trial with dummy resume
        </button>
      )}

      {error && <div style={s.error}>{error}</div>}
    </div>
  )
}

const s = {
  card: { borderRadius: 12, padding: "14px", display: "flex", flexDirection: "column", gap: 10 },
  matchBanner: { position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 11, fontWeight: 700, background: "#fff", border: "1px solid", borderRadius: 8, padding: "7px 10px", cursor: "help" },
  matchInfo: { fontSize: 11, opacity: 0.7 },
  matchTooltip: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#1C1E21", color: "#fff", fontSize: 11, fontWeight: 400, lineHeight: 1.5, padding: "8px 10px", borderRadius: 6, zIndex: 60, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
  header: { display: "flex", alignItems: "center", gap: 6 },
  icon: { fontSize: 16 },
  title: { fontSize: 13, fontWeight: 700, color: "#1C1E21", flex: 1 },
  spinner: { fontSize: 13, display: "inline-block", animation: "spin 1s linear infinite", color: "#1A73E8" },
  pitch: { fontSize: 12, color: "#65676B", lineHeight: 1.5 },
  resumeRow: { display: "flex", alignItems: "center", gap: 8 },
  resumeCheck: { width: 22, height: 22, borderRadius: "50%", background: "#16A34A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  resumeName: { fontSize: 13, fontWeight: 700, color: "#1C1E21" },
  resumeRole: { fontSize: 11, color: "#65676B" },
  prefSection: { display: "flex", flexDirection: "column", gap: 6 },
  prefPills: { display: "flex", flexWrap: "wrap", gap: 4 },
  prefPill: { fontSize: 10, color: "#65676B", background: "#fff", border: "1px solid #E4E6EB", borderRadius: 20, padding: "3px 8px", fontWeight: 500 },
  prefActions: { display: "flex", gap: 6 },
  editBtn: { background: "none", border: "1px solid #E4E6EB", borderRadius: 6, color: "#65676B", fontSize: 11, padding: "4px 10px", cursor: "pointer" },
  stats: { background: "#fff", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 },
  statDivider: { height: 1, background: "#F0F2F5", margin: "4px 0" },
  statRow: { display: "flex", alignItems: "center", gap: 6 },
  statDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  statLabel: { fontSize: 11, color: "#65676B", flex: 1 },
  statVal: { fontSize: 12, fontWeight: 700, color: "#1C1E21" },
  signalBox: { background: "#fff", borderRadius: 8, padding: "10px 12px", borderLeft: "3px solid #1A73E8" },
  signalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: 4 },
  signalLabel: { fontSize: 9, fontWeight: 700, color: "#1A73E8", textTransform: "uppercase", letterSpacing: 1 },
  signalChevron: { fontSize: 10, color: "#9CA3AF" },
  signalText: { fontSize: 11, color: "#374151", lineHeight: 1.5 },
  signalSub: { fontSize: 11, fontWeight: 600, color: "#1C1E21", marginTop: 4 },
  roleUl: { margin: "2px 0 4px", paddingLeft: 16 },
  roleLi: { fontSize: 12, color: "#374151", lineHeight: 1.5 },
  dropzone: { border: "1.5px dashed #93C5FD", borderRadius: 8, padding: "12px", textAlign: "center", cursor: "pointer", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.15s" },
  dropzoneActive: { background: "#EBF3FD", borderColor: "#1A73E8" },
  dropIcon: { fontSize: 16, color: "#93C5FD" },
  dropText: { fontSize: 12, color: "#65676B" },
  removeBtn: { background: "none", border: "1px solid #FECACA", borderRadius: 6, color: "#E53935", fontSize: 11, cursor: "pointer", padding: "5px 0", width: "100%", textAlign: "center" },
  dummyWrap: { display: "flex", flexDirection: "column", gap: 6 },
  dummyToggle: { background: "none", border: "none", color: "#1A73E8", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0, alignSelf: "center" },
  dummyOptions: { display: "flex", flexDirection: "column", gap: 6 },
  dummyRow: { display: "flex", alignItems: "center", gap: 8 },
  dummyPick: { flex: 1, background: "#fff", border: "1px solid #BFDBFE", borderRadius: 8, color: "#1C1E21", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 10px", textAlign: "left" },
  dummyView: { fontSize: 11, color: "#65676B", textDecoration: "underline", flexShrink: 0, cursor: "pointer" },
  error: { fontSize: 11, color: "#DC2626" },
}