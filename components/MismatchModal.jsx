export default function MismatchModal({ resumeRoles, searchRoles, onResumeHelp, onSearchAnyway }) {
  const resumeStr = resumeRoles.slice(0, 3).join(", ")
  const searchStr = searchRoles.join(", ")
  return (
    <div style={s.overlay} onClick={onSearchAnyway}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.iconWrap}>⚠</div>
        <div style={s.title}>Your resume doesn't match your search</div>
        <p style={s.body}>
          Your resume reads as <b>{resumeStr || "a different direction"}</b>, but you're searching for <b>{searchStr}</b>.
        </p>
        <p style={s.impact}>
          This is a mismatch that will affect Fit Ratings.
        </p>
        <div style={s.actions}>
          <button style={s.helpBtn} disabled title="Coming soon">Get Resume Help <span style={s.soon}>soon</span></button>
          <button style={s.dismissBtn} onClick={onSearchAnyway}>Search anyway</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "24px", maxWidth: 420, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)", textAlign: "center" },
  iconWrap: { fontSize: 28, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: 700, color: "#1C1E21", marginBottom: 10 },
  body: { fontSize: 13, color: "#374151", lineHeight: 1.6, margin: "0 0 12px" },
  impact: { fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 8, padding: "10px 12px", lineHeight: 1.5, margin: "0 0 18px", textAlign: "left" },
  actions: { display: "flex", gap: 10, justifyContent: "center" },
  helpBtn: { background: "#F5F6F7", color: "#BCC0C4", border: "1px solid #E4E6EB", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6 },
  soon: { fontSize: 9, background: "#E4E6EB", color: "#65676B", borderRadius: 10, padding: "2px 6px", fontWeight: 700, textTransform: "uppercase" },
  dismissBtn: { background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
}