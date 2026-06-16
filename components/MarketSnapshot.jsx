import { useState, useEffect } from "react"
import { getCompanyTier, TIER_COLORS, TIER_LABELS } from "../lib/companyTiers"

function ChangeCell({ value }) {
  if (value === null || value === undefined) return <span style={s.dash}>—</span>
  if (value === 0) return <span style={s.neutral}>0</span>
  const up = value > 0
  return (
    <span style={{ ...s.change, color: up ? "#16A34A" : "#DC2626" }}>
      {up ? "+" : ""}{value}
    </span>
  )
}

export default function MarketSnapshot({ keywords, visible }) {
  const [open, setOpen] = useState(true)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    fetch("/api/market-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: keywords || null }),
    })
      .then(r => r.json())
      .then(d => setRows(d.rows || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [keywords, visible])

  if (!visible) return null

  const label = keywords ? `Market · "${keywords}"` : "Market Overview"

  return (
    <div style={s.wrap}>
      <button style={s.toggle} onClick={() => setOpen(o => !o)}>
        <span style={s.toggleLabel}>
          <span style={s.dot} />
          {label}
          {loading && <span style={s.spinner}>⟳</span>}
        </span>
        <span style={s.chevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={s.tableWrap}>
          {rows.length === 0 && !loading ? (
            <div style={s.empty}>No data yet — run a sync first.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, textAlign: "left" }}>Company</th>
                  <th style={s.th}>Open</th>
                  <th style={s.th}>7d</th>
                  <th style={s.th}>30d</th>
                  <th style={s.th}>4m</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const tier = getCompanyTier(row.company)
                  return (
                    <tr key={row.company} style={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                      <td style={s.tdLeft}>
                        <div style={s.companyCell}>
                          <span style={s.rank}>#{i + 1}</span>
                          <span style={s.companyName}>{row.company}</span>
                          {tier && (
                            <span style={{
                              fontSize: 8, fontWeight: 700, padding: "1px 5px",
                              borderRadius: 3, letterSpacing: 0.3,
                              color: TIER_COLORS[tier].color,
                              background: TIER_COLORS[tier].background,
                              border: `1px solid ${TIER_COLORS[tier].border}`,
                            }}>
                              {TIER_LABELS[tier]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={s.td}><strong>{row.count}</strong></td>
                      <td style={s.td}><ChangeCell value={row.change7d} /></td>
                      <td style={s.td}><ChangeCell value={row.change30d} /></td>
                      <td style={s.td}><ChangeCell value={row.change4m} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div style={s.note}>Change data accumulates weekly after each sync.</div>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: {
    borderBottom: "1px solid #E4E6EB",
    background: "#FAFAFA",
    flexShrink: 0,
  },
  toggle: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 16px", background: "none", border: "none",
    cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#1C1E21",
  },
  toggleLabel: { display: "flex", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#16A34A", flexShrink: 0 },
  spinner: { display: "inline-block", animation: "spin 1s linear infinite", color: "#9CA3AF" },
  chevron: { fontSize: 9, color: "#9CA3AF" },
  tableWrap: { padding: "0 16px 10px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 11 },
  th: {
    padding: "4px 8px", textAlign: "right", fontWeight: 600,
    color: "#9CA3AF", borderBottom: "1px solid #F0F2F5", fontSize: 10,
  },
  rowEven: { background: "transparent" },
  rowOdd: { background: "#F9FAFB" },
  tdLeft: { padding: "5px 8px 5px 0" },
  td: { padding: "5px 8px", textAlign: "right", color: "#1C1E21" },
  companyCell: { display: "flex", alignItems: "center", gap: 5 },
  rank: { fontSize: 9, color: "#9CA3AF", fontWeight: 600, minWidth: 18 },
  companyName: { fontSize: 11, color: "#1C1E21", fontWeight: 500 },
  change: { fontWeight: 600, fontSize: 11 },
  neutral: { color: "#9CA3AF", fontSize: 11 },
  dash: { color: "#D1D5DB", fontSize: 11 },
  empty: { fontSize: 11, color: "#9CA3AF", padding: "8px 0" },
  note: { fontSize: 9, color: "#D1D5DB", marginTop: 6 },
}
