import { useState } from "react"

export default function FitPreferencesModal({ onConfirm, onSkip, initialPrefs }) {
  const [weightBasis, setWeightBasis] = useState(initialPrefs?.weightBasis || "both")
  const [flexibleYoe, setFlexibleYoe] = useState(initialPrefs?.flexibleYoe ?? true)
  const [companySelectivity, setCompanySelectivity] = useState(initialPrefs?.companySelectivity ?? false)
  const [openToPivot, setOpenToPivot] = useState(initialPrefs?.openToPivot ?? false)

  const isEditing = !!initialPrefs

  const Toggle = ({ value, onChange, label, sub }) => (
    <div style={{ ...t.toggleRow, cursor: "pointer" }} onClick={() => onChange(!value)}>
      <div style={{ flex: 1 }}>
        <div style={t.toggleLabel}>{label}</div>
        {sub && <div style={t.toggleSub}>{sub}</div>}
      </div>
      <div style={{ ...t.track, background: value ? "#1A73E8" : "#E4E6EB" }}>
        <div style={{ ...t.thumb, transform: value ? "translateX(16px)" : "translateX(0)" }} />
      </div>
    </div>
  )

  const Radio = ({ value, current, onChange, label, sub }) => (
    <div style={{ ...t.radioRow, cursor: "pointer" }} onClick={() => onChange(value)}>
      <div style={{ ...t.radioOuter, borderColor: current === value ? "#1A73E8" : "#D1D5DB" }}>
        {current === value && <div style={t.radioInner} />}
      </div>
      <div>
        <div style={t.radioLabel}>{label}</div>
        {sub && <div style={t.radioSub}>{sub}</div>}
      </div>
    </div>
  )

  return (
    <div style={t.backdrop}>
      <div style={t.modal}>
        <div style={t.header}>
          <div style={t.title}>
            {isEditing ? "Update fit preferences" : "How should we rank your fit?"}
          </div>
          <div style={t.sub}>
            {isEditing
              ? "Your changes will re-rate all current jobs."
              : "This shapes how Claude evaluates jobs against your background."}
          </div>
        </div>

        <div style={t.section}>
          <div style={t.sectionLabel}>What matters most to you?</div>
          <div style={t.radioGroup}>
            <Radio value="skills" current={weightBasis} onChange={setWeightBasis}
              label="What I can do"
              sub="Skills, delivery, execution — regardless of industry" />
            <Radio value="industry" current={weightBasis} onChange={setWeightBasis}
              label="Where I've worked"
              sub="Domain, sector, and industry experience" />
            <Radio value="both" current={weightBasis} onChange={setWeightBasis}
              label="Both"
              sub="Weigh skills and industry background equally" />
          </div>
        </div>

        <div style={t.section}>
          <Toggle
            value={flexibleYoe}
            onChange={setFlexibleYoe}
            label="Treat experience requirements as flexible"
            sub={flexibleYoe
              ? "On: View matches based on all sorts of YOE requirements"
              : "Off: View matches based on the YOE in my resume"}
          />  
          <Toggle
            value={companySelectivity}
            onChange={setCompanySelectivity}
            label="Company selectivity matters"
            sub={companySelectivity
              ? "On: View matches based on company popularity"
              : "Off: View matches based on role than popularity"}
          />  
          <Toggle
            value={openToPivot}
            onChange={setOpenToPivot}
            label="Open to career pivots"
            sub="Be more generous with Strong Fit outside your current path"
          />
        </div>

        <div style={t.footer}>
          <button style={t.skipBtn} onClick={onSkip}>
            {isEditing ? "Cancel" : "Skip for now"}
          </button>
          <button
            style={t.confirmBtn}
            onClick={() => onConfirm({ weightBasis, flexibleYoe, companySelectivity, openToPivot })}
          >
            {isEditing ? "Re-rate jobs →" : "Rank my fit →"}
          </button>
        </div>
      </div>
    </div>
  )
}

const t = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, backdropFilter: "blur(3px)",
  },
  modal: {
    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480,
    margin: "0 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  header: { padding: "24px 24px 0" },
  title: { fontSize: 18, fontWeight: 700, color: "#1C1E21", marginBottom: 6 },
  sub: { fontSize: 13, color: "#65676B", lineHeight: 1.5 },
  section: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid #F0F2F5", marginTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 },
  radioGroup: { display: "flex", flexDirection: "column", gap: 12 },
  radioRow: { display: "flex", alignItems: "flex-start", gap: 12 },
  radioOuter: { width: 18, height: 18, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  radioInner: { width: 8, height: 8, borderRadius: "50%", background: "#1A73E8" },
  radioLabel: { fontSize: 14, fontWeight: 600, color: "#1C1E21" },
  radioSub: { fontSize: 12, color: "#65676B", marginTop: 1 },
  toggleRow: { display: "flex", alignItems: "center", gap: 16 },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: "#1C1E21" },
  toggleSub: { fontSize: 12, color: "#65676B", marginTop: 1 },
  track: { width: 36, height: 20, borderRadius: 10, flexShrink: 0, position: "relative", transition: "background 0.2s" },
  thumb: { position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  footer: { padding: "20px 24px", display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #F0F2F5" },
  skipBtn: { background: "none", border: "1px solid #E4E6EB", borderRadius: 8, color: "#65676B", padding: "10px 18px", fontSize: 13, cursor: "pointer" },
  confirmBtn: { background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
}