import { useState } from "react"

export default function RoleChoiceModal({ sentence, roles, focused, onConfirm, onClose }) {
  // pre-select all detected roles
  const [selected, setSelected] = useState(() => new Set(roles))
  const [customRole, setCustomRole] = useState("")

  const toggle = (role) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const addCustom = () => {
    const r = customRole.trim()
    if (!r) return
    setSelected(prev => new Set(prev).add(r))
    setCustomRole("")
  }

  const confirm = () => {
    const finalRoles = Array.from(selected)
    if (finalRoles.length === 0) return
    onConfirm(finalRoles)
  }

  const allRoles = Array.from(new Set([...roles, ...Array.from(selected)]))

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

        <div style={s.roleList}>
          {allRoles.map(role => (
            <button
              key={role}
              style={{ ...s.rolePill, ...(selected.has(role) ? s.rolePillOn : {}) }}
              onClick={() => toggle(role)}
            >
              {selected.has(role) ? "✓ " : ""}{role}
            </button>
          ))}
        </div>

        <div style={s.customRow}>
          <input
            style={s.customInput}
            value={customRole}
            onChange={e => setCustomRole(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustom()}
            placeholder="Or type another role..."
          />
          <button style={s.addBtn} onClick={addCustom}>Add</button>
        </div>

        <button
          style={{ ...s.confirmBtn, ...(selected.size === 0 ? s.confirmBtnDisabled : {}) }}
          onClick={confirm}
          disabled={selected.size === 0}
        >
          Search {selected.size > 0 ? `${selected.size} role${selected.size > 1 ? "s" : ""}` : ""} →
        </button>
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
  roleList: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  rolePill: { background: "#fff", border: "1.5px solid #E4E6EB", borderRadius: 20, color: "#65676B", padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  rolePillOn: { background: "#EBF3FD", border: "1.5px solid #1A73E8", color: "#1A73E8", fontWeight: 600 },
  customRow: { display: "flex", gap: 8, marginBottom: 18 },
  customInput: { flex: 1, background: "#EBF3FD",padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E4E6EB", fontSize: 13, outline: "none", color: "#1C1E21" },
  addBtn: { background: "#F5F6F7", border: "1px solid #E4E6EB", borderRadius: 8, color: "#65676B", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  confirmBtn: { width: "100%", background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  confirmBtnDisabled: { background: "#BCC0C4", cursor: "not-allowed" },
}