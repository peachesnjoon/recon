import { useState, useEffect, useRef } from "react"
import { useJobSearch } from "../hooks/useJobSearch"
import { applyFilters, categoryColor, categoryBg, categoryEmoji, formatDate } from "../lib/filters"
import InviteGate from "../components/InviteGate"
import ResumeUpload from "../components/ResumeUpload"
import JobListItem from "../components/JobListItem"
import JobDetail from "../components/JobDetail"
import FilterPanel from "../components/FilterPanel"
import FitPreferencesModal from "../components/FitPreferencesModal"
import DummyResumeModal from "../components/DummyResumeModal"
import RoleChoiceModal from "../components/RoleChoiceModal"
import MismatchModal from "../components/MismatchModal"
import MarketSnapshot from "../components/MarketSnapshot"

const INDUSTRIES = ["Tech", "Consultancy", "Finance", "Logistics", "E-commerce", "Healthcare"]
const DEFAULT_ROLE = "Product Manager"
const DEFAULT_LOCATION = "Singapore"

if (typeof document !== "undefined") {
  if (!document.getElementById("recon-spin")) {
    const style = document.createElement("style")
    style.id = "recon-spin"
    style.textContent = `@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`
    document.head.appendChild(style)
  }
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [roleInput, setRoleInput] = useState(DEFAULT_ROLE)
  const [locationInput, setLocationInput] = useState(DEFAULT_LOCATION)
  const [keywordInput, setKeywordInput] = useState("")
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [mobileTab, setMobileTab] = useState("jobs")
  const [showPrefModal, setShowPrefModal] = useState(false)
  const [pendingParsed, setPendingParsed] = useState(null)
  const [isEditingPrefs, setIsEditingPrefs] = useState(false)
  const [showDummyModal, setShowDummyModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [signalData, setSignalData] = useState({ signal: null, roles: [], focused: true })
  const [mismatchDismissed, setMismatchDismissed] = useState(false)
  const [showMismatchModal, setShowMismatchModal] = useState(false)
  const [searchKey, setSearchKey] = useState(0)
  const uploadInputRef = useRef(null)
  const [filters, setFilters] = useState({
    industries: [...INDUSTRIES],
    companyType: "Both",
    category: "All",
    languages: { selected: [], mode: "exclude_any" },
    education: { selected: [], mode: "include_any" },
    jobTypes: { selected: [], mode: "include_any" },
    yoe: [0, 20],
    certification: "any",
    hasRatings: false,
  })

  const {
    resumeData, resumeSignal, resumeRoles, activeRoles, manualRoles, fitPreferences,
    jobs, ratings, generatedResumes,
    loading, backgroundLoading, error,
    parseResume, saveFitPreferences, scrapeJobs, rateJobs, generateResume, summariseJob,
    getSignal, setActiveRoles, setManualRoles,
  } = useJobSearch()

  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 1024)
    const params = new URLSearchParams(window.location.search)
    const forced = params.get("demo") === "1"
    if (forced) localStorage.setItem("recon_unlocked", "true")
    setUnlocked(forced || localStorage.getItem("recon_unlocked") === "true")
    const saved = sessionStorage.getItem("recon_selected")
    if (saved) setSelectedJobId(saved)
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (unlocked && mounted) handleSearch()
  }, [unlocked, mounted])

  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      const first = jobs[0].id
      setSelectedJobId(first)
      sessionStorage.setItem("recon_selected", first)
    }
  }, [jobs])

  useEffect(() => {
    if (Object.keys(ratings).length > 0) {
      setFilters(f => ({ ...f, hasRatings: true }))
    }
  }, [ratings])

  const applyYoeFilter = (prefs, yearsExperience) => {
    if (!prefs.flexibleYoe && yearsExperience) {
      const max = Math.min(yearsExperience + 2, 20)
      setFilters(f => ({ ...f, yoe: [0, max] }))
    } else {
      setFilters(f => ({ ...f, yoe: [0, 20] }))
    }
  }

  const handleSearch = async (kw) => {
    const raw = kw || roleInput
    // split comma-separated roles; allow empty to show all
    const roles = raw.trim()
      ? raw.split(",").map(r => r.trim()).filter(Boolean)
      : []
    const searchRoles = roles.length > 0
      ? (keywordInput ? roles.map(r => `${r} ${keywordInput}`) : roles)
      : keywordInput
      ? [keywordInput]
      : [""]  // empty string = show all from Supabase

    setActiveRoles(roles.length > 0 ? roles : keywordInput ? [keywordInput] : [])
    setMismatchDismissed(false)
    setSearchKey(k => k + 1)
    const fetched = await scrapeJobs(searchRoles, locationInput || "Singapore")
    if (fetched.length > 0 && resumeData) {
      await rateJobs(resumeData, fetched.slice(0, 24), fitPreferences)
      if (fetched.length > 24) {
        ;(async () => {
          for (let i = 24; i < Math.min(fetched.length, 96); i += 24) {
            await rateJobs(resumeData, fetched.slice(i, i + 24), fitPreferences)
          }
        })()
      }
    }
    if (fetched.length > 0) {
      setSelectedJobId(fetched[0].id)
      sessionStorage.setItem("recon_selected", fetched[0].id)
    }
  }

  const handleResumeParsed = async (base64) => {
    const parsed = await parseResume(base64)
    if (parsed) {
      setPendingParsed(parsed)
      setIsEditingPrefs(false)
      // fetch structured signal, then show the role-choice modal
      const sig = await getSignal(parsed)
      setSignalData(sig)
      setMismatchDismissed(false)
      setShowRoleModal(true)
    }
  }

  const handleUploadFile = (file) => {
    if (!file || file.type !== "application/pdf") return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1]
      await handleResumeParsed(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleDummyPick = async (path) => {
    setShowDummyModal(false)
    try {
      const res = await fetch(path)
      const blob = await res.blob()
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1]
        await handleResumeParsed(base64)
      }
      reader.readAsDataURL(blob)
    } catch (e) {}
  }

  const handleRoleConfirm = (chosenRoles, chosenManual) => {
    setActiveRoles(chosenRoles)
    setManualRoles(chosenManual || [])
    setRoleInput(chosenRoles.join(", "))
    setShowRoleModal(false)
    // proceed to fit preferences next
    setShowPrefModal(true)
  }

  const handleRoleSkip = () => {
    // keep whatever roles are already active, jump straight to fit preferences
    setShowRoleModal(false)
    setShowPrefModal(true)
  }

  const handlePrefConfirm = async (prefs) => {
    saveFitPreferences(prefs)
    setShowPrefModal(false)
    const parsed = pendingParsed || resumeData
    applyYoeFilter(prefs, parsed?.yearsExperience)

    // both fresh-upload and edit flows pass through the role modal, so scrape the chosen roles
    const roles = activeRoles.length > 0 ? activeRoles : (roleInput ? [roleInput] : [])
    const fetched = await scrapeJobs(roles, locationInput || "Singapore")
    if (fetched.length > 0 && parsed) {
      await rateJobs(parsed, fetched.slice(0, 24), prefs)
      if (fetched.length > 24) {
        ;(async () => {
          for (let i = 24; i < Math.min(fetched.length, 96); i += 24) {
            await rateJobs(parsed, fetched.slice(i, i + 24), prefs)
          }
        })()
      }
      setSelectedJobId(fetched[0].id)
      sessionStorage.setItem("recon_selected", fetched[0].id)
    }
    setPendingParsed(null)
    setIsEditingPrefs(false)
  }

  const handlePrefSkip = () => {
    setShowPrefModal(false)
    if (!isEditingPrefs && pendingParsed && jobs.length > 0) {
      rateJobs(pendingParsed, jobs.slice(0, 24), null)
    }
    setPendingParsed(null)
    setIsEditingPrefs(false)
  }

  const handleEditPreferences = () => {
    setIsEditingPrefs(true)
    // restore the signal context so the role modal shows the same roles + manual additions
    setSignalData({ signal: resumeSignal, roles: resumeRoles, focused: true })
    setShowRoleModal(true)
  }

  const handleRemoveResume = () => {
    sessionStorage.removeItem("recon_resume")
    sessionStorage.removeItem("recon_ratings")
    sessionStorage.removeItem("recon_signal")
    sessionStorage.removeItem("recon_prefs")
    window.location.reload()
  }

  const handleJobSelect = (id) => {
    setSelectedJobId(id)
    sessionStorage.setItem("recon_selected", id)
    const job = jobs.find(j => j.id === id)
    if (job && !job.jdSummary) summariseJob(job)
    if (isMobile) setMobileTab("detail")
  }

  // ── mismatch detection: compare resume's signalled roles vs what's being searched ──
  const computeMatchState = () => {
    if (!resumeData || resumeRoles.length === 0 || activeRoles.length === 0) return "aligned"
    const norm = (s) => s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean)
    const resumeWords = new Set(resumeRoles.flatMap(norm))
    const searchWords = activeRoles.flatMap(norm)
    if (searchWords.length === 0) return "aligned"
    const hits = searchWords.filter(w => resumeWords.has(w)).length
    const ratio = hits / searchWords.length
    if (ratio >= 0.5) return "aligned"
    if (ratio > 0) return "partial"
    return "mismatch"
  }
  const matchState = computeMatchState()

  // fire mismatch modal once per mismatch occurrence
  useEffect(() => {
    if (matchState === "mismatch" && !mismatchDismissed) {
      setShowMismatchModal(true)
    }
  }, [matchState, mismatchDismissed])

  const visibleJobs = applyFilters(jobs, ratings, filters)
  const selectedJob = jobs.find(j => j.id === selectedJobId) || null
  const isAnyLoading = loading.scraping || backgroundLoading

  if (!mounted) return null

  if (!unlocked) return (
    <InviteGate onUnlock={() => {
      localStorage.setItem("recon_unlocked", "true")
      setUnlocked(true)
    }} />
  )

  const mismatchModalEl = showMismatchModal && (
    <MismatchModal
      resumeRoles={resumeRoles}
      searchRoles={activeRoles}
      onResumeHelp={() => {}}
      onSearchAnyway={() => { setShowMismatchModal(false); setMismatchDismissed(true) }}
    />
  )

  const roleModalEl = showRoleModal && (
    <RoleChoiceModal
      sentence={signalData.signal}
      roles={signalData.roles}
      focused={signalData.focused}
      initialSelected={isEditingPrefs ? activeRoles : null}
      initialManual={manualRoles}
      onConfirm={handleRoleConfirm}
      onSkip={handleRoleSkip}
      isEditing={isEditingPrefs}
      onClose={() => setShowRoleModal(false)}
    />
  )

  const dummyModalEl = showDummyModal && (
    <DummyResumeModal onPick={handleDummyPick} onClose={() => setShowDummyModal(false)} />
  )

  const prefModalEl = showPrefModal && (
    <FitPreferencesModal
      onConfirm={handlePrefConfirm}
      onSkip={handlePrefSkip}
      initialPrefs={isEditingPrefs ? fitPreferences : null}
    />
  )

  const resumeUploadProps = {
    onParsed: handleResumeParsed,
    parsing: loading.parsing,
    resumeData,
    resumeSignal,
    fitPreferences,
    ratings,
    activeCategory: filters.category,
    onFilterClick: (cat) => setFilters(f => ({ ...f, category: cat })),
    onRemove: handleRemoveResume,
    onEditPreferences: handleEditPreferences,
    onRerate: () => {
      if (resumeData && jobs.length > 0) rateJobs(resumeData, jobs.slice(0, 24), fitPreferences)
    },
    isRating: loading.rating,
    onTrialClick: () => setShowDummyModal(true),
  }

  const jobDetailProps = {
    job: selectedJob,
    rating: selectedJob ? ratings[selectedJob.id] : null,
    hasResume: !!resumeData,
    onAssist: generateResume,
    generating: loading.resumeId === selectedJob?.id,
    generated: selectedJob ? generatedResumes[selectedJob.id] : null,
    isRating: loading.rating,
    onTrialClick: () => setShowDummyModal(true),
    onUploadClick: () => uploadInputRef.current?.click(),
    matchState,
    resumeRoles,
    activeRoles,
    manualRoles,
  }

  const filterPanelProps = {
    filters,
    onChange: setFilters,
    totalJobs: jobs.length,
    filteredCount: visibleJobs.length,
    fitPreferences,
  }

  // ── MOBILE: desktop-only notice ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        height: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "40px 28px", fontFamily: "'Inter', sans-serif", background: "#F5F6F7", gap: 16,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1C1E21", letterSpacing: "-0.5px" }}>recon</div>
        <div style={{ fontSize: 40 }}>🖥️</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#1C1E21" }}>Best viewed on desktop</div>
        <div style={{ fontSize: 14, color: "#65676B", lineHeight: 1.6, maxWidth: 320 }}>
          recon is a desktop-first experience while in development. Open this link on a laptop or desktop browser for the full experience.
        </div>
      </div>
    )
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.app}>
      {prefModalEl}
      {dummyModalEl}
      {roleModalEl}
      {mismatchModalEl}
      <input ref={uploadInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => handleUploadFile(e.target.files[0])} />
      <div style={s.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
          <div style={s.navLogo}>recon</div>
          <div style={s.screenTabs}>
            <span style={{ ...s.screenTab, ...s.screenTabActive }}>Job Search</span>
            <a href="/agent" style={{ ...s.screenTab, color: "#65676B", textDecoration: "none" }}>AI Agent</a>
          </div>
        </div>
        <div style={s.searchGroup}>
          <div style={s.searchField}>
            <span style={s.searchFieldLabel}>Role</span>
            <input style={s.searchInput} value={roleInput}
              onChange={e => setRoleInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Product Manager, BA..." />
          </div>
          <div style={s.searchDivider} />
          <div style={s.searchField}>
            <span style={s.searchFieldLabel}>Location</span>
            <input style={s.searchInput} value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Singapore" />
          </div>
          <div style={s.searchDivider} />
          <div style={s.searchField}>
            <span style={s.searchFieldLabel}>Keyword</span>
            <input style={s.searchInput} value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="AI, fintech, SaaS..." />
          </div>
          <button style={s.searchBtn} onClick={() => handleSearch()} disabled={loading.scraping}>
            {loading.scraping ? "Searching..." : "Search"}
          </button>
        </div>
        <div style={s.navRight}>
          {resumeData && <div style={s.resumeBadge}>✓ {resumeData.name}</div>}
          {backgroundLoading && (
            <div style={s.bgPill}>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 4 }}>⟳</span>
              Loading more
            </div>
          )}
          {loading.parsing && <div style={s.pill}>⟳ Parsing...</div>}
        </div>
      </div>

      <div style={s.body}>
        <div style={s.sidebar}>
          <div style={s.resumeWrap}>
            <ResumeUpload {...resumeUploadProps} />
          </div>
          <FilterPanel {...filterPanelProps} />
        </div>

        <div style={{ ...s.listPane, position: "relative" }}>
          <MarketSnapshot key={searchKey} keywords={activeRoles[0] || null} visible={!loading.scraping} />
          <div style={s.listHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {loading.rating && (
                <span style={{ fontSize: 13, display: "inline-block", animation: "spin 1s linear infinite", color: "#1A73E8" }}>⟳</span>
              )}
              <span style={s.listCount}>
                {loading.scraping ? "Searching..." : loading.rating ? "Rating..." : `${visibleJobs.length}${jobs.length > visibleJobs.length ? ` of ${jobs.length}` : ""} jobs`}
              </span>
              {activeRoles.length > 0 && <RolePill roles={activeRoles} />}
            </div>
            {backgroundLoading && !loading.scraping && (
              <span style={s.loadingMore}>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                {" "}loading more
              </span>
            )}
          </div>
          <div style={s.listScroll}>
            {visibleJobs.length === 0 && !loading.scraping && jobs.length > 0 && (
              <div style={s.emptyList}>
                <div style={s.emptyListTitle}>No jobs match your filters.</div>
                <div style={s.emptyListSub}>Try adjusting the filters on the left.</div>
              </div>
            )}
            {visibleJobs.map(job => (
              <JobListItem key={job.id} job={job} rating={ratings[job.id]}
                selected={selectedJobId === job.id} onClick={() => handleJobSelect(job.id)} />
            ))}
          </div>
          {loading.scraping && (
            <div style={s.overlay}>
              <div style={s.overlayInner}>
                <span style={s.overlayIcon}>⟳</span>
                <span style={s.overlayText}>Fetching listings...</span>
              </div>
            </div>
          )}
        </div>

        <div style={s.detailPane}>
          <JobDetail {...jobDetailProps} />
        </div>
      </div>
    </div>
  )
}

function RolePill({ roles }) {
  const [open, setOpen] = useState(false)
  if (!roles || roles.length === 0) return null
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "#EBF3FD", border: "1px solid #BFDBFE", borderRadius: 20,
          color: "#1A73E8", fontSize: 11, fontWeight: 600, padding: "3px 10px",
          cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        Displaying {roles.length} role{roles.length > 1 ? "s" : ""} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "#fff", border: "1px solid #E4E6EB", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "6px 0",
          minWidth: 160, zIndex: 50,
        }}>
          {roles.map((r, i) => (
            <div key={i} style={{ padding: "5px 12px", fontSize: 12, color: "#1C1E21", whiteSpace: "nowrap" }}>
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MobileJobCard({ job, rating, selected, onClick }) {
  const cat = rating?.category
  const date = formatDate(job.postedAt)
  return (
    <div onClick={onClick} style={{
      ...m.jobCard,
      background: selected ? "#F0F7FF" : "#fff",
      borderLeft: `3px solid ${selected ? "#1A73E8" : "transparent"}`,
    }}>
      <div style={m.jobCardTop}>
        <div style={m.jobCardTitle}>{job.title}</div>
        {cat && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
            whiteSpace: "nowrap", flexShrink: 0,
            color: categoryColor(cat), background: categoryBg(cat),
          }}>{categoryEmoji(cat)} {cat}</span>
        )}
      </div>
      <div style={m.jobCardCompany}>{job.company}</div>
      <div style={m.jobCardMeta}>
        {job.jobType && <span style={m.jobCardTag}>{job.jobType}</span>}
        {job.salary && <><span style={m.jobCardSep}>·</span><span style={{ ...m.jobCardTag, color: "#1A73E8", fontWeight: 600 }}>{job.salary}</span></>}
        {date && <span style={{ ...m.jobCardTag, marginLeft: "auto" }}>{date}</span>}
      </div>
    </div>
  )
}

const s = {
  app: { height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", background: "#F5F6F7", overflow: "hidden" },
  nav: { background: "#fff", borderBottom: "1px solid #E4E6EB", padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, zIndex: 10 },
  navLogo: { fontSize: 17, fontWeight: 800, color: "#1C1E21", letterSpacing: "-0.5px", flexShrink: 0 },
  searchGroup: { flex: 1, display: "flex", alignItems: "center", background: "#F5F6F7", borderRadius: 8, border: "1.5px solid #E4E6EB", overflow: "hidden", maxWidth: 800, height: 38 },
  searchField: { flex: 1, display: "flex", flexDirection: "column", padding: "4px 14px", justifyContent: "center" },
  searchFieldLabel: { fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  searchInput: { background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#1C1E21", padding: 0, width: "100%" },
  searchDivider: { width: 1, height: 28, background: "#E4E6EB", flexShrink: 0 },
  searchBtn: { background: "#1A73E8", color: "#fff", border: "none", padding: "0 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", height: 38, flexShrink: 0, borderRadius: "0 6px 6px 0" },
  navRight: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 },
  screenTabs: { display: "flex", marginLeft: 16, borderLeft: "1px solid #E4E6EB", paddingLeft: 16, gap: 2 },
  screenTab: { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer" },
  screenTabActive: { color: "#1A73E8", background: "#EBF3FD" },
  resumeBadge: { background: "#F0FFF4", color: "#16A34A", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "1px solid #BBF7D0" },
  bgPill: { background: "#FEF3C7", color: "#92400E", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center" },
  pill: { background: "#EBF3FD", color: "#1A73E8", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 240, minWidth: 240, background: "#fff", borderRight: "1px solid #E4E6EB", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 },
  resumeWrap: { padding: "14px 16px", borderBottom: "1px solid #F0F2F5", flexShrink: 0 },
  listPane: { width: 320, minWidth: 320, background: "#fff", borderRight: "1px solid #E4E6EB", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 },
  listHeader: { padding: "10px 16px", borderBottom: "1px solid #F0F2F5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" },
  listCount: { fontSize: 12, color: "#65676B", fontWeight: 500 },
  loadingMore: { fontSize: 11, color: "#D97706", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 },
  listScroll: { flex: 1, overflowY: "auto" },
  detailPane: { flex: 1, background: "#fff", overflow: "hidden", display: "flex", flexDirection: "column" },
  emptyList: { padding: "48px 24px", textAlign: "center" },
  emptyListTitle: { fontSize: 14, fontWeight: 600, color: "#1C1E21", marginBottom: 6 },
  emptyListSub: { fontSize: 12, color: "#9CA3AF" },
  overlay: { position: "absolute", inset: 0, background: "rgba(255,255,255,0.80)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, backdropFilter: "blur(1px)" },
  overlayInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  overlayIcon: { fontSize: 28, display: "inline-block", animation: "spin 1s linear infinite", color: "#1A73E8" },
  overlayText: { fontSize: 13, color: "#65676B", fontWeight: 500 },
}

const m = {
  app: { height: "100dvh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", background: "#F5F6F7", overflow: "hidden" },
  topBar: { background: "#fff", borderBottom: "1px solid #E4E6EB", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  logoSmall: { fontSize: 16, fontWeight: 800, color: "#1C1E21", letterSpacing: "-0.5px", flexShrink: 0 },
  searchRow: { flex: 1, display: "flex", gap: 8 },
  searchInput: { flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E4E6EB", fontSize: 14, outline: "none", color: "#1C1E21", background: "#F5F6F7", minWidth: 0 },
  searchBtn: { background: "#1A73E8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  backBtn: { background: "none", border: "none", color: "#1A73E8", fontSize: 15, fontWeight: 600, cursor: "pointer", flexShrink: 0, padding: 0 },
  detailNavTitle: { flex: 1, fontSize: 14, fontWeight: 600, color: "#1C1E21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  statusBar: { background: "#FEF3C7", padding: "6px 16px", display: "flex", gap: 8, flexShrink: 0 },
  statusPill: { fontSize: 11, color: "#92400E", fontWeight: 600 },
  content: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
  jobsScreen: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  listMeta: { padding: "8px 16px", background: "#fff", borderBottom: "1px solid #F0F2F5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" },
  listMetaText: { fontSize: 12, color: "#65676B", fontWeight: 500 },
  filterBtn: { background: "#F5F6F7", border: "1.5px solid #E4E6EB", borderRadius: 20, color: "#65676B", padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  filterBtnActive: { background: "#EBF3FD", border: "1.5px solid #1A73E8", color: "#1A73E8", fontWeight: 600 },
  spinnerText: { fontSize: 11, color: "#D97706", fontWeight: 500 },
  list: { flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" },
  empty: { padding: "60px 24px", textAlign: "center" },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: "#1C1E21", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#65676B" },
  jobCard: { padding: "14px 16px", borderBottom: "1px solid #F0F2F5", cursor: "pointer", background: "#fff", display: "flex", flexDirection: "column", gap: 5 },
  jobCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  jobCardTitle: { fontSize: 15, fontWeight: 650, color: "#1C1E21", lineHeight: 1.3, flex: 1 },
  jobCardCompany: { fontSize: 13, color: "#65676B" },
  jobCardMeta: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 2 },
  jobCardTag: { fontSize: 11, color: "#9CA3AF" },
  jobCardSep: { fontSize: 11, color: "#D1D5DB" },
  tabBar: { display: "flex", background: "#fff", borderTop: "1px solid #E4E6EB", flexShrink: 0 },
  tabBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "10px 0", background: "none", border: "none", cursor: "pointer" },
  tabLabel: { fontSize: 10, fontWeight: 600 },
}