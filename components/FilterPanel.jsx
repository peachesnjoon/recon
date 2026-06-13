import { useState, useEffect } from "react"

function Section({ label, defaultOpen = false, count, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={s.section}>
      <button style={s.sectionHeader} onClick={() => setOpen(o => !o)}>
        <span style={s.sectionLabel}>{label}</span>
        <div style={s.sectionRight}>
          {count > 0 && <span style={s.activeDot} />}
          <span style={s.chevron}>{open ? "↑" : "↓"}</span>
        </div>
      </button>
      {open && <div style={s.sectionBody}>{children}</div>}
    </div>
  )
}

function TagGroup({ options, selected, onToggle }) {
  return (
    <div style={s.tagGroup}>
      {options.map(opt => (
        <button
          key={opt}
          style={{ ...s.tag, ...(selected.includes(opt) ? s.tagOn : {}) }}
          onClick={() => onToggle(opt)}
        >{opt}</button>
      ))}
    </div>
  )
}

function ModeToggle({ options, value, onChange }) {
  return (
    <div style={s.modeRow}>
      {options.map(opt => (
        <button
          key={opt.value}
          style={{ ...s.modeBtn, ...(value === opt.value ? s.modeBtnOn : {}) }}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      ))}
    </div>
  )
}

function RangeSlider({ min, max, value, onChange }) {
  return (
    <div style={s.rangeWrap}>
      <div style={s.rangeLabels}>
        <span style={s.rangeVal}>{value[0]} yrs</span>
        <span style={s.rangeVal}>{value[1] >= max ? `${max}+` : `${value[1]} yrs`}</span>
      </div>
      <div style={s.sliderTrack}>
        <input type="range" min={min} max={max} value={value[0]}
          onChange={e => {
            const v = Math.min(Number(e.target.value), value[1] - 1)
            onChange([v, value[1]])
          }}
          style={s.slider}
        />
        <input type="range" min={min} max={max} value={value[1]}
          onChange={e => {
            const v = Math.max(Number(e.target.value), value[0] + 1)
            onChange([value[0], v])
          }}
          style={s.slider}
        />
      </div>
    </div>
  )
}

const LANGUAGES = ["English", "Mandarin", "Malay", "Tamil", "Japanese", "Korean"]
const EDU_LEVELS = ["Diploma", "Degree", "Masters", "PhD"]
const JOB_TYPES = ["Full Time", "Part Time", "Contract", "Internship", "Freelance"]
const INDUSTRIES = ["Tech", "Consultancy", "Finance", "Logistics", "E-commerce", "Healthcare"]

const DEFAULT_FILTERS = {
  industries: [...INDUSTRIES],
  companyType: "Both",
  category: "All",
  languages: { selected: [], mode: "exclude_any" },
  education: { selected: [], mode: "include_any" },
  jobTypes: { selected: [], mode: "include_any" },
  yoe: [0, 20],
  certification: "any",
  hasRatings: false,
}

export default function FilterPanel({ filters, fitPreferences, onChange, totalJobs, filteredCount }) {
  const [draft, setDraft] = useState(filters)
  const [pending, setPending] = useState(false)

  useEffect(() => {
  setDraft(f => ({ ...f, category: filters.category, yoe: filters.yoe }))
  setPending(false)
}, [filters.category, JSON.stringify(filters.yoe)])

  const updateDraft = (key, val) => {
    setDraft(d => ({ ...d, [key]: val }))
    setPending(true)
  }

  const updateDraftGroup = (key, subKey, val) => {
    setDraft(d => ({ ...d, [key]: { ...d[key], [subKey]: val } }))
    setPending(true)
  }

  const toggleTag = (key, tag) => {
    const current = draft[key]?.selected || []
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag]
    updateDraftGroup(key, "selected", next)
  }

  const applyFilters = () => {
    onChange({ ...draft, hasRatings: filters.hasRatings })
    setPending(false)
  }

  const clearAll = () => {
  const cleared = {
    ...DEFAULT_FILTERS,
    hasRatings: filters.hasRatings,
    // preserve YOE if strict mode is on — it's locked by preferences
    yoe: (fitPreferences && !fitPreferences.flexibleYoe) ? filters.yoe : [0, 20],
  }
  setDraft(cleared)
  onChange(cleared)
  setPending(false)
}

  const activeCount = (key) => draft[key]?.selected?.length || 0

  const hasAnyFilter =
    activeCount("languages") > 0 ||
    activeCount("education") > 0 ||
    activeCount("jobTypes") > 0 ||
    draft.certification !== "any" ||
    draft.yoe?.[0] > 0 || draft.yoe?.[1] < 20 ||
    draft.category !== "All" ||
    draft.industries?.length < INDUSTRIES.length ||
    draft.companyType !== "Both"

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerLabel}>Filters</span>
          <span style={s.jobCount}>{filteredCount} / {totalJobs} jobs</span>
        </div>
        {hasAnyFilter && (
          <button style={s.clearBtn} onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* 1. Fit */}
      {filters.hasRatings && (
        <Section label="Fit" defaultOpen={true} count={draft.category !== "All" ? 1 : 0}>
          <TagGroup
            options={["All", "Strong Fit", "Worth Exploring", "Low Priority"]}
            selected={[draft.category]}
            onToggle={c => updateDraft("category", c)}
          />
        </Section>
      )}

      {/* 2. Experience */}
      <Section label="Experience (years)" count={draft.yoe?.[0] > 0 || draft.yoe?.[1] < 20 ? 1 : 0}>
        {fitPreferences && !fitPreferences.flexibleYoe ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <RangeSlider min={0} max={20} value={draft.yoe || [0, 20]} onChange={v => updateDraft("yoe", v)} />
            <div style={{ fontSize: 10, color: "#1A73E8" }}>⚙ Locked by Strict YOE preference</div>
          </div>
        ) : (
          <RangeSlider min={0} max={20} value={draft.yoe || [0, 20]} onChange={v => updateDraft("yoe", v)} />
        )}
      </Section>

      {/* 3. Industry */}
      <Section label="Industry" defaultOpen={true} count={draft.industries?.length < INDUSTRIES.length ? 1 : 0}>
        <TagGroup
          options={INDUSTRIES}
          selected={draft.industries || []}
          onToggle={ind => {
            const current = draft.industries || []
            updateDraft("industries", current.includes(ind)
              ? current.filter(i => i !== ind)
              : [...current, ind])
          }}
        />
      </Section>

      {/* 4. Company type */}
      <Section label="Company type" defaultOpen={true} count={draft.companyType !== "Both" ? 1 : 0}>
        <TagGroup
          options={["Startup", "MNC", "Both"]}
          selected={[draft.companyType]}
          onToggle={t => updateDraft("companyType", t)}
        />
      </Section>

      {/* 5. Job type */}
      <Section label="Job type" count={activeCount("jobTypes")}>
        <TagGroup
          options={JOB_TYPES}
          selected={draft.jobTypes?.selected || []}
          onToggle={tag => toggleTag("jobTypes", tag)}
        />
        {activeCount("jobTypes") > 0 && (
          <ModeToggle
            value={draft.jobTypes?.mode || "include_any"}
            onChange={v => updateDraftGroup("jobTypes", "mode", v)}
            options={[
              { value: "include_any", label: "Include" },
              { value: "exclude", label: "Exclude" },
            ]}
          />
        )}
      </Section>

      {/* 6. Education */}
      <Section label="Education" count={activeCount("education")}>
        <TagGroup
          options={EDU_LEVELS}
          selected={draft.education?.selected || []}
          onToggle={tag => toggleTag("education", tag)}
        />
        {activeCount("education") > 0 && (
          <ModeToggle
            value={draft.education?.mode || "include_any"}
            onChange={v => updateDraftGroup("education", "mode", v)}
            options={[
              { value: "include_any", label: "Include" },
              { value: "exclude", label: "Exclude" },
            ]}
          />
        )}
      </Section>

      {/* 7. Certification */}
      <Section label="Certification" count={draft.certification !== "any" ? 1 : 0}>
        <TagGroup
          options={["Any", "Required", "Not required"]}
          selected={[draft.certification === "any" ? "Any" : draft.certification === "required" ? "Required" : "Not required"]}
          onToggle={t => updateDraft("certification", t === "Any" ? "any" : t === "Required" ? "required" : "not_required")}
        />
      </Section>

      {/* 8. Language */}
      <Section label="Language" count={activeCount("languages")}>
        <TagGroup
          options={LANGUAGES}
          selected={draft.languages?.selected || []}
          onToggle={tag => toggleTag("languages", tag)}
        />
        {activeCount("languages") > 0 && (
          <ModeToggle
            value={draft.languages?.mode || "exclude_any"}
            onChange={v => updateDraftGroup("languages", "mode", v)}
            options={[
              { value: "exclude_any", label: "Exclude selected" },
              { value: "include_any", label: "Include any" },
              { value: "include_all", label: "Must have all" },
            ]}
          />
        )}
        <div style={s.hint}>
          {draft.languages?.mode === "exclude_any" && "Hide jobs mentioning any selected language"}
          {draft.languages?.mode === "include_any" && "Show jobs mentioning at least one"}
          {draft.languages?.mode === "include_all" && "Show jobs mentioning all selected"}
        </div>
      </Section>

      {pending && (
        <div style={s.applyWrap}>
          <button style={s.applyBtn} onClick={applyFilters}>Apply filters</button>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { display: "flex", flexDirection: "column", overflowY: "auto", flex: 1 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px", flexShrink: 0 },
  headerLeft: { display: "flex", flexDirection: "column", gap: 2 },
  headerLabel: { fontSize: 13, fontWeight: 700, color: "#1C1E21" },
  jobCount: { fontSize: 11, color: "#9CA3AF" },
  clearBtn: { background: "none", border: "none", color: "#1A73E8", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 },
  section: { borderTop: "1px solid #F0F2F5" },
  sectionHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#65676B", textTransform: "uppercase", letterSpacing: 0.8 },
  sectionRight: { display: "flex", alignItems: "center", gap: 6 },
  activeDot: { width: 6, height: 6, borderRadius: "50%", background: "#1A73E8" },
  chevron: { fontSize: 10, color: "#9CA3AF" },
  sectionBody: { padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 },
  tagGroup: { display: "flex", flexWrap: "wrap", gap: 6 },
  tag: { background: "#fff", border: "1.5px solid #E4E6EB", borderRadius: 20, color: "#65676B", padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: 500 },
  tagOn: { background: "#EBF3FD", border: "1.5px solid #1A73E8", color: "#1A73E8", fontWeight: 600 },
  modeRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  modeBtn: { background: "#F5F6F7", border: "1px solid transparent", borderRadius: 6, color: "#65676B", padding: "4px 10px", fontSize: 11, cursor: "pointer" },
  modeBtnOn: { background: "#1C1E21", color: "#fff" },
  hint: { fontSize: 10, color: "#BCC0C4", lineHeight: 1.4, minHeight: 14 },
  rangeWrap: { display: "flex", flexDirection: "column", gap: 6 },
  rangeLabels: { display: "flex", justifyContent: "space-between" },
  rangeVal: { fontSize: 12, fontWeight: 600, color: "#1C1E21" },
  sliderTrack: { position: "relative", height: 20 },
  slider: { width: "100%", position: "absolute", top: 0, left: 0, accentColor: "#1A73E8", cursor: "pointer" },
  applyWrap: { padding: "12px 16px", borderTop: "1px solid #E4E6EB", background: "#fff", flexShrink: 0, position: "sticky", bottom: 0 },
  applyBtn: { width: "100%", background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" },
}