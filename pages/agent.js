import { useState, useEffect, useRef } from "react"
import { categoryColor, categoryBg } from "../lib/filters"

export default function AgentPage() {
  const [mounted, setMounted] = useState(false)
  const [resumeData, setResumeData] = useState(null)

  useEffect(() => {
    const saved = sessionStorage.getItem("recon_resume")
    if (saved) setResumeData(JSON.parse(saved))
    setMounted(true)
  }, [])

  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  if (!mounted) return null

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      const base64 = dataUrl.split(",")[1]
      setImage({ base64, mediaType: file.type, preview: dataUrl })
      setResult(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleImageFile(e.dataTransfer.files[0])
  }

  const handleAnalyse = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/analyse-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: image.base64,
          imageMediaType: image.mediaType,
          resumeData,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verdict = result?.analysis?.verdict
  const fitScore = result?.analysis?.fitScore

  return (
    <div style={s.page}>
      {/* Nav */}
      <div style={s.nav}>
        <a href="/" style={s.logo}>recon</a>
        <div style={s.navLinks}>
          <a href="/" style={s.navLink}>Job Search</a>
          <span style={{ ...s.navLink, color: "#1A73E8", fontWeight: 700, borderBottom: "2px solid #1A73E8" }}>AI Agent</span>
        </div>
      </div>

      <div style={s.body}>
        {/* Left: upload */}
        <div style={s.leftPane}>
          <div style={s.section}>
            <div style={s.sectionTitle}>Analyse a Job Posting</div>
            <div style={s.sectionSub}>Upload a screenshot of any job listing — LinkedIn, company site, anywhere.</div>

            <div
              style={{ ...s.dropzone, borderColor: dragOver ? "#1A73E8" : image ? "#16A34A" : "#E4E6EB", background: dragOver ? "#EBF3FD" : "#FAFAFA" }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <img src={image.preview} alt="preview" style={s.preview} />
              ) : (
                <div style={s.dropPrompt}>
                  <div style={s.dropIcon}>📸</div>
                  <div style={s.dropText}>Drop screenshot here or click to upload</div>
                  <div style={s.dropSub}>PNG, JPG, WEBP</div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => handleImageFile(e.target.files[0])}
            />

            {image && (
              <button style={s.clearBtn} onClick={() => { setImage(null); setResult(null) }}>
                Remove image
              </button>
            )}
          </div>

          {/* Resume status */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Your Resume</div>
            {resumeData ? (
              <div style={s.resumeCard}>
                <span style={s.resumeCheck}>✓</span>
                <div>
                  <div style={s.resumeName}>{resumeData.name}</div>
                  <div style={s.resumeSub}>{resumeData.currentRole} · {resumeData.yearsExperience}y exp</div>
                </div>
              </div>
            ) : (
              <div style={s.noResume}>
                No resume loaded. <a href="/" style={s.inlineLink}>Upload one on the job search page</a> first.
              </div>
            )}
          </div>

          <button
            style={{ ...s.analyseBtn, opacity: (!image || loading) ? 0.5 : 1 }}
            disabled={!image || loading}
            onClick={handleAnalyse}
          >
            {loading ? "Analysing..." : "Analyse Fit"}
          </button>

          {error && <div style={s.errorMsg}>{error}</div>}
        </div>

        {/* Right: results */}
        <div style={s.rightPane}>
          {!result && !loading && (
            <div style={s.placeholder}>
              <div style={s.placeholderIcon}>🔍</div>
              <div style={s.placeholderText}>Upload a job posting screenshot to see your fit analysis.</div>
            </div>
          )}

          {loading && (
            <div style={s.placeholder}>
              <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⟳</div>
              <div style={s.placeholderText}>Extracting job details and analysing fit...</div>
            </div>
          )}

          {result && (
            <div style={s.results}>
              {/* Score header */}
              {result.analysis && (
                <div style={s.scoreCard}>
                  <div style={s.scoreLeft}>
                    <div style={{ ...s.verdictPill, color: categoryColor(verdict), background: categoryBg(verdict) }}>
                      {verdict}
                    </div>
                    <div style={s.scoreLabel}>Fit Score</div>
                    <div style={s.scoreNum}>{fitScore}<span style={s.scoreMax}>/100</span></div>
                  </div>
                  <div style={s.scoreBar}>
                    <div style={{ ...s.scoreBarFill, width: `${fitScore}%`, background: fitScore >= 70 ? "#16A34A" : fitScore >= 45 ? "#D97706" : "#DC2626" }} />
                  </div>
                </div>
              )}

              {/* Extracted JD */}
              <div style={s.resultSection}>
                <div style={s.resultSectionTitle}>Extracted Job Details</div>
                <div style={s.jdText}>{result.jdText}</div>
              </div>

              {result.analysis && (
                <>
                  {/* Strengths */}
                  {result.analysis.strengths?.length > 0 && (
                    <div style={s.resultSection}>
                      <div style={{ ...s.resultSectionTitle, color: "#16A34A" }}>Strengths</div>
                      {result.analysis.strengths.map((s_, i) => (
                        <div key={i} style={s.bullet}>✓ {s_}</div>
                      ))}
                    </div>
                  )}

                  {/* Gaps */}
                  {result.analysis.gaps?.length > 0 && (
                    <div style={s.resultSection}>
                      <div style={{ ...s.resultSectionTitle, color: "#DC2626" }}>Gaps</div>
                      {result.analysis.gaps.map((g, i) => (
                        <div key={i} style={{ ...s.bullet, color: "#DC2626" }}>✗ {g}</div>
                      ))}
                    </div>
                  )}

                  {/* Advice */}
                  {result.analysis.advice && (
                    <div style={s.resultSection}>
                      <div style={s.resultSectionTitle}>Advice</div>
                      <div style={s.advice}>{result.analysis.advice}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const s = {
  page: { minHeight: "100vh", fontFamily: "'Inter', sans-serif", background: "#F5F6F7", display: "flex", flexDirection: "column" },
  nav: { background: "#fff", borderBottom: "1px solid #E4E6EB", padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 24, flexShrink: 0 },
  logo: { fontSize: 17, fontWeight: 800, color: "#1C1E21", letterSpacing: "-0.5px", textDecoration: "none" },
  navLinks: { display: "flex", gap: 4 },
  navLink: { fontSize: 13, fontWeight: 500, color: "#65676B", textDecoration: "none", padding: "4px 10px", borderRadius: 6 },
  body: { display: "flex", flex: 1, gap: 0, maxWidth: 1100, width: "100%", margin: "0 auto", padding: 24, gap: 24 },
  leftPane: { width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 },
  rightPane: { flex: 1, background: "#fff", borderRadius: 12, border: "1px solid #E4E6EB", overflow: "auto" },
  section: { background: "#fff", borderRadius: 10, border: "1px solid #E4E6EB", padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#1C1E21" },
  sectionSub: { fontSize: 12, color: "#65676B", lineHeight: 1.5 },
  dropzone: {
    border: "2px dashed", borderRadius: 10, padding: 16, cursor: "pointer",
    minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s",
  },
  dropPrompt: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  dropIcon: { fontSize: 28 },
  dropText: { fontSize: 13, fontWeight: 500, color: "#65676B" },
  dropSub: { fontSize: 11, color: "#9CA3AF" },
  preview: { maxWidth: "100%", maxHeight: 300, borderRadius: 6, objectFit: "contain" },
  clearBtn: { fontSize: 11, color: "#DC2626", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start", padding: 0 },
  resumeCard: { display: "flex", alignItems: "center", gap: 10, background: "#F0FFF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" },
  resumeCheck: { fontSize: 16, color: "#16A34A" },
  resumeName: { fontSize: 13, fontWeight: 600, color: "#1C1E21" },
  resumeSub: { fontSize: 11, color: "#65676B" },
  noResume: { fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 },
  inlineLink: { color: "#1A73E8" },
  analyseBtn: {
    background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8,
    padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
  },
  errorMsg: { fontSize: 12, color: "#DC2626", background: "#FFF5F5", padding: "8px 12px", borderRadius: 6 },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: 40, textAlign: "center" },
  placeholderIcon: { fontSize: 36 },
  placeholderText: { fontSize: 13, color: "#9CA3AF", maxWidth: 280, lineHeight: 1.6 },
  results: { padding: 24, display: "flex", flexDirection: "column", gap: 20 },
  scoreCard: { background: "#F9FAFB", borderRadius: 10, padding: 16, border: "1px solid #E4E6EB", display: "flex", flexDirection: "column", gap: 12 },
  scoreLeft: { display: "flex", alignItems: "center", gap: 12 },
  verdictPill: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 },
  scoreLabel: { fontSize: 11, color: "#9CA3AF", marginLeft: "auto" },
  scoreNum: { fontSize: 26, fontWeight: 800, color: "#1C1E21" },
  scoreMax: { fontSize: 14, color: "#9CA3AF", fontWeight: 400 },
  scoreBar: { height: 6, background: "#E4E6EB", borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  resultSection: { display: "flex", flexDirection: "column", gap: 6 },
  resultSectionTitle: { fontSize: 11, fontWeight: 700, color: "#65676B", textTransform: "uppercase", letterSpacing: 0.5 },
  jdText: { fontSize: 12, color: "#65676B", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "#F9FAFB", padding: 12, borderRadius: 6, maxHeight: 200, overflowY: "auto" },
  bullet: { fontSize: 13, color: "#1C1E21", lineHeight: 1.6 },
  advice: { fontSize: 13, color: "#1C1E21", lineHeight: 1.7, background: "#FFFBEB", padding: 12, borderRadius: 6, borderLeft: "3px solid #F59E0B" },
}
