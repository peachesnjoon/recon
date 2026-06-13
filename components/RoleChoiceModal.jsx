import { useState } from "react"

export default function RoleChoiceModal({
  sentence, roles, focused, initialSelected, initialManual,
  onConfirm, onSkip, isEditing, onClose
}) {
  // signalled roles from the resume
  const signalled = roles || []
  // manually added roles (persisted from a prior edit, if any)
  const [manual, setManual] = useState(() => initialManual || [])
  // selection: default to all signalled + all manual, unless an explicit initial selection is given
  const [selected, setSelected] = useState(() => {
    if (initialSelected && initialSelected.length) return new Set(initialSelected)
    return new Set([...signalled, ...(initialManual || [])])
  })
  const [customRole, setCustomRole] = useState("")

  const toggle = (role) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(role) ? next.delete(role) : next.add(role)
      return next
    })
  }

  const addCustom = () => {
    const r = customRole.trim()
    if (!r) return
    if (!manual.includes(r) && !signalled.includes(r)) {
      setManual(m => [...m, r])
    }
    setSelected(prev => new Set(prev).add(r))
    setCustomRole("")
  }

  const removeManual = (role) => {
    setManual(m => m.filter(x => x !== role))
    setSelected(prev => {
      const next = new Set(prev)
      next.delete(role)
      return next
    })
  }

  const confirm = () => {
    const finalRoles = Array.from(selected)
    if (finalRoles.length === 0) return
    // report which of the chosen are manual
    const chosenManual = finalRoles.filter(r => manual.includes(r))
    onConfirm(finalRoles, chosenManual)
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.title}>✦ What roles are you targeting?</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        {sentence && <p style={s.signal}>{sentence}</p>}

        {!focused && (
          <div style={s.warnNote}>
            Your resume points in a few directions. Pick the roles you actually want to search for.
          </div>
        )}

        <div style={s.sectionLabel}>Your resume suggests</div>
        <div style={s.roleList}>
          {signalled.map(role => (
            <button
              key={role}
              style={{ ...s.rolePill, ...(selected.has(role) ? s.rolePillOn : {}) }}
              onClick={() => toggle(role)}
            >
              {selected.has(role) ? "✓ " : ""}{role}
            </button>
          ))}
        </div>

        {manual.length > 0 && (
          <>
            <div style={s.sectionLabel}>Manually added</div>
            <div style={s.roleList}>
              {manual.map(role => (
                <span key={role} style={s.manualPillWrap}>
                  <button
                    style={{ ...s.rolePill, ...(selected.has(role) ? s.rolePillOn : {}) }}
                    onClick={() => toggle(role)}
                  >
                    {selected.has(role) ? "✓ " : ""}{role}
                  </button>
                  <button style={s.removeManual} onClick={() => removeManual(role)} title="Remove">✕</button>
                </span>
              ))}
            </div>
          </>
        )}

        <div style={s.customRow}>
          <input
            style={s.customInput}
            value={customRole}
            onChange={e => setCustomRole(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustom()}
            placeholder="Add another role you want..."
          />
          <button style={s.addBtn} onClick={addCustom}>Add</button>
        </div>

        <div style={s.btnRow}>
          {onSkip && (
            <button style={s.skipBtn} onClick={onSkip}>
              {isEditing ? "Skip to preferences" : "Skip"}
            </button>
          )}
          <button
            style={{ ...s.confirmBtn, ...(selected.size === 0 ? s.confirmBtnDisabled : {}) }}
            onClick={confirm}
            disabled={selected.size === 0}
          >
            Search {selected.size > 0 ? `${selected.size} role${selected.size > 1 ? "s" : ""}` : ""} →
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "24px", maxWidth: 460, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 16, fontWeight: 700, color: "#1C1E21" },
  close: { background: "none", border: "none", fontSize: 16, color: "#9CA3AF", cursor: "pointer", padding: 4 },
  signal: { fontSize: 13, color: "#374151", lineHeight: 1.5, margin: "0 0 14px", background: "#F0F7FF", borderRadius: 8, padding: "10px 12px", borderLeft: "3px solid #1A73E8" },
  warnNote: { fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", marginBottom: 14, lineHeight: 1.4 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  roleList: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  rolePill: { background: "#fff", border: "1.5px solid #E4E6EB", borderRadius: 20, color: "#65676B", padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  rolePillOn: { background: "#EBF3FD", border: "1.5px solid #1A73E8", color: "#1A73E8", fontWeight: 600 },
  manualPillWrap: { display: "inline-flex", alignItems: "center", gap: 2 },
  removeManual: { background: "none", border: "none", color: "#BCC0C4", fontSize: 11, cursor: "pointer", padding: "0 4px" },
  customRow: { display: "flex", gap: 8, marginBottom: 18 },
  customInput: { flex: 1, padding: "8px 12px", borderRadius: 8, border: "2px solid #E4E6EB", fontSize: 13, outline: "none", color: "#1C1E21" },
  addBtn: { background: "#F5F6F7", border: "1px solid #E4E6EB", borderRadius: 8, color: "#65676B", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  btnRow: { display: "flex", gap: 10 },
  skipBtn: { flex: "0 0 auto", background: "#F5F6F7", color: "#65676B", border: "1px solid #E4E6EB", borderRadius: 8, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  confirmBtn: { flex: 1, background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  confirmBtnDisabled: { background: "#BCC0C4", cursor: "not-allowed" },
}