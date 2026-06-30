import { useState, useRef } from "react"

const INDUSTRIES = ["Tech", "Consultancy", "Finance", "Logistics", "E-commerce", "Healthcare"]

export default function Onboarding({ onComplete, parseResume, loading }) {
  const [step, setStep] = useState(1)
  const [resumeText, setResumeText] = useState("")
  const [resumeData, setResumeData] = useState(null)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState({
    industries: ["Tech", "Consultancy"],
    companyType: "Both",
    disqualifiers: ["mandarin required", "certification required", "masters required"],
  })
  const [dqInput, setDqInput] = useState("")
  const fileRef = useRef()

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setResumeText(ev.target.result)
    reader.readAsText(file)
  }

  const handleParse = async () => {
    if (!resumeText.trim()) { setError("Paste or upload your resume first."); return }
    setError("")
    const data = await parseResume(resumeText)
    if (data) { setResumeData(data); setStep(2) }
    else setError("Could not parse resume. Try again.")
  }

  const toggleIndustry = ind => setProfile(p => ({
    ...p,
    industries: p.industries.includes(ind)
      ? p.industries.filter(i => i !== ind)
      : [...p.industries, ind]
  }))

  const addDq = () => {
    const val = dqInput.trim().toLowerCase()
    if (val && !profile.disqualifiers.includes(val)) {
      setProfile(p => ({ ...p, disqualifiers: [...p.disqualifiers, val] }))
    }
    setDqInput("")
  }

  const removeDq = dq => setProfile(p => ({
    ...p, disqualifiers: p.disqualifiers.filter(d => d !== dq)
  }))

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={s.logo}>recon</div>
        <div style={s.steps}>
          {[1, 2].map(n => (
            <div key={n} style={{ ...s.step, background: step >= n ? "#16825C" : "#E4E6EB" }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={s.title}>Upload your resume</div>
            <div style={s.sub}>Paste plain text or upload a .txt file. Parsed once, stored in session.</div>
            <textarea
              style={s.textarea}
              placeholder="Paste resume text here..."
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
            />
            <div style={s.row}>
              <button style={s.ghost} onClick={() => fileRef.current.click()}>Upload .txt</button>
              <input ref={fileRef} type="file" accept=".txt" style={{ display: "none" }} onChange={handleFile} />
              <button style={s.primary} onClick={handleParse} disabled={loading.parsing}>
                {loading.parsing ? "Parsing..." : "Parse Resume"}
              </button>
            </div>
            {error && <p style={s.error}>{error}</p>}
          </>
        )}

        {step === 2 && resumeData && (
          <>
            <div style={s.title}>Set your filters</div>
            <div style={s.sub}>
              Parsed as <strong>{resumeData.name}</strong>, {resumeData.currentRole}.
              Adjust how jobs get filtered and rated.
            </div>

            <div style={s.section}>
              <div style={s.label}>Target industries</div>
              <div style={s.tags}>
                {INDUSTRIES.map(ind => (
                  <button key={ind}
                    style={{ ...s.tag, ...(profile.industries.includes(ind) ? s.tagOn : {}) }}
                    onClick={() => toggleIndustry(ind)}
                  >{ind}</button>
                ))}
              </div>
            </div>

            <div style={s.section}>
              <div style={s.label}>Company type</div>
              <div style={s.tags}>
                {["Startup", "MNC", "Both"].map(t => (
                  <button key={t}
                    style={{ ...s.tag, ...(profile.companyType === t ? s.tagOn : {}) }}
                    onClick={() => setProfile(p => ({ ...p, companyType: t }))}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div style={s.section}>
              <div style={s.label}>Hard disqualifiers</div>
              <div style={s.tags}>
                {profile.disqualifiers.map(dq => (
                  <span key={dq} style={s.dqTag}>
                    {dq}
                    <span style={s.dqX} onClick={() => removeDq(dq)}>×</span>
                  </span>
                ))}
              </div>
              <div style={{ ...s.row, marginTop: 8 }}>
                <input style={s.dqInput} placeholder='e.g. "on-site only"'
                  value={dqInput} onChange={e => setDqInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addDq()} />
                <button style={s.ghost} onClick={addDq}>Add</button>
              </div>
            </div>

            <button style={{ ...s.primary, width: "100%" }}
              onClick={() => onComplete(resumeData, resumeText, profile)}>
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: "100vh", background: "#F5F6F7",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', sans-serif", padding: 24,
  },
  box: {
    background: "#fff", borderRadius: 16, padding: "40px 36px",
    width: "100%", maxWidth: 520, boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    display: "flex", flexDirection: "column", gap: 16,
  },
  logo: { fontSize: 22, fontWeight: 800, color: "#1C1E21", letterSpacing: "-0.5px" },
  steps: { display: "flex", gap: 6 },
  step: { height: 3, width: 32, borderRadius: 2, transition: "background 0.3s" },
  title: { fontSize: 20, fontWeight: 700, color: "#1C1E21" },
  sub: { fontSize: 13, color: "#65676B", lineHeight: 1.6 },
  textarea: {
    width: "100%", minHeight: 160, padding: 14, borderRadius: 8,
    border: "1.5px solid #E4E6EB", fontSize: 13, color: "#1C1E21",
    fontFamily: "monospace", resize: "vertical", outline: "none",
    boxSizing: "border-box", lineHeight: 1.6,
  },
  row: { display: "flex", gap: 8 },
  primary: {
    background: "#16825C", color: "#fff", border: "none",
    borderRadius: 8, padding: "10px 20px", fontSize: 13,
    fontWeight: 600, cursor: "pointer",
  },
  ghost: {
    background: "#fff", color: "#65676B", border: "1.5px solid #E4E6EB",
    borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer",
  },
  error: { color: "#E53935", fontSize: 13, margin: 0 },
  section: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 11, fontWeight: 600, color: "#65676B", letterSpacing: 0.5, textTransform: "uppercase" },
  tags: { display: "flex", flexWrap: "wrap", gap: 6 },
  tag: {
    background: "#F5F6F7", border: "1.5px solid #E4E6EB", borderRadius: 20,
    color: "#65676B", padding: "5px 14px", fontSize: 12, cursor: "pointer",
  },
  tagOn: {
    background: "#ECFDF5", border: "1.5px solid #16825C", color: "#16825C",
  },
  dqTag: {
    background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 20,
    color: "#E53935", padding: "4px 12px", fontSize: 12,
    display: "flex", alignItems: "center", gap: 6,
  },
  dqX: { cursor: "pointer", fontSize: 14, opacity: 0.7 },
  dqInput: {
    flex: 1, padding: "8px 12px", borderRadius: 8,
    border: "1.5px solid #E4E6EB", fontSize: 13, outline: "none", color: "#1C1E21",
  },
}