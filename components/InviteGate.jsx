import { useState } from "react"

export default function InviteGate({ onUnlock }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [checking, setChecking] = useState(false)

  const handle = async () => {
    setChecking(true)
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    if (data.valid) {
      onUnlock()
    } else {
      setError("Invalid code.")
      setTimeout(() => setError(""), 2000)
    }
    setChecking(false)
  }

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={s.logo}>recon</div>
        <p style={s.sub}>Job intelligence powered by Haiku 4.5, created by Aalia Arshad.</p>
        <div style={s.field}>
          <input
            style={s.input}
            type="text"
            placeholder="Enter invite code"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handle()}
          />
          <button style={s.btn} onClick={handle} disabled={checking}>
            {checking ? "..." : "Continue"}
          </button>
        </div>
        {error && <p style={s.error}>{error}</p>}
        <p style={s.hint}>Don't have a code? <a href="https://www.linkedin.com/in/aalia-a-875914201/" target="_blank" rel="noopener noreferrer" style={s.hintLink}>Reach out.</a></p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: "100vh", background: "#F5F6F7",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
  },
  box: {
    background: "#fff", borderRadius: 16, padding: "48px 40px",
    width: 400, boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
  },
  logo: {
    fontSize: 28, fontWeight: 800, color: "#1C1E21", letterSpacing: "-1px",
  },
  sub: { color: "#65676B", fontSize: 14, margin: 0, textAlign: "center" },
  field: { display: "flex", gap: 8, width: "100%", marginTop: 8 },
  input: {
    flex: 1, padding: "10px 14px", borderRadius: 8,
    border: "1.5px solid #E4E6EB", fontSize: 14, outline: "none",
    color: "#1C1E21", background: "#fff",
  },
  hintLink: { color: "#1A73E8", textDecoration: "none", fontWeight: 600 },
  btn: {
    background: "#1A73E8", color: "#fff", border: "none",
    borderRadius: 8, padding: "10px 20px", fontSize: 14,
    fontWeight: 600, cursor: "pointer",
  },
  error: { color: "#E53935", fontSize: 13, margin: 0 },
  hint: { color: "#BCC0C4", fontSize: 12, margin: 0 },
}