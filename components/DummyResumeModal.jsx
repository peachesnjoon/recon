export default function DummyResumeModal({ onPick, onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.title}>✦ Trial with a dummy resume</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <p style={s.sub}>Pick a sample resume to see how fit analysis and tailored resumes work.</p>

        <div style={s.options}>
          <div style={s.option}>
            <div style={s.optionMain}>
              <div style={s.optionIcon}>🎓</div>
              <div>
                <div style={s.optionTitle}>Fresh Graduate</div>
                <div style={s.optionDesc}>NUS Computer Science, PM internships at Grab & Shopee</div>
              </div>
            </div>
            <div style={s.optionActions}>
              <a style={s.viewLink} href="/dummy/fresh-grad.pdf" target="_blank" rel="noreferrer">View PDF</a>
              <button style={s.useBtn} onClick={() => onPick("/dummy/fresh-grad.pdf")}>Use this</button>
            </div>
          </div>

          <div style={s.option}>
            <div style={s.optionMain}>
              <div style={s.optionIcon}>💼</div>
              <div>
                <div style={s.optionTitle}>6-Year Professional</div>
                <div style={s.optionDesc}>SaaS Sales, SDR to Senior Account Executive</div>
              </div>
            </div>
            <div style={s.optionActions}>
              <a style={s.viewLink} href="/dummy/professional.pdf" target="_blank" rel="noreferrer">View PDF</a>
              <button style={s.useBtn} onClick={() => onPick("/dummy/professional.pdf")}>Use this</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "24px", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: 700, color: "#1C1E21" },
  close: { background: "none", border: "none", fontSize: 16, color: "#9CA3AF", cursor: "pointer", padding: 4 },
  sub: { fontSize: 13, color: "#65676B", lineHeight: 1.5, margin: "0 0 18px" },
  options: { display: "flex", flexDirection: "column", gap: 12 },
  option: { border: "1.5px solid #E4E6EB", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 },
  optionMain: { display: "flex", gap: 12, alignItems: "flex-start" },
  optionIcon: { fontSize: 24, flexShrink: 0 },
  optionTitle: { fontSize: 14, fontWeight: 700, color: "#1C1E21" },
  optionDesc: { fontSize: 12, color: "#65676B", lineHeight: 1.4, marginTop: 2 },
  optionActions: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  viewLink: { fontSize: 12, color: "#65676B", textDecoration: "underline", cursor: "pointer" },
  useBtn: { background: "#16825C", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
}