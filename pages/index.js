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
  const [sortOrder, setSortOrder] = useState("relevant")
  const [showAbout, setShowAbout] = useState(false)
  const uploadInputRef = useRef(null)
  const [filters, setFilters] = useState({
    industries: [],
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
  const topHirers = (() => {
    const counts = {}
    visibleJobs.forEach(j => { if (j.company) counts[j.company] = (counts[j.company] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
  })()
  const sortedJobs = sortOrder === "date"
    ? [...visibleJobs].sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0))
    : visibleJobs
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
    resumeRoles,
    activeRoles,
    manualRoles,
    matchState,
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
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      <div style={s.nav}>
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0, height: "100%" }}>
          <div style={s.navLogo}>recon</div>
          <div style={s.screenTabs}>
            <span style={{ ...s.screenTab, ...s.screenTabActive }}>Job Search</span>
            <a href="/agent" style={{ ...s.screenTab, textDecoration: "none" }}>AI Agent</a>
          </div>
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
          <button style={s.aboutBtn} onClick={() => setShowAbout(true)}>About</button>
          <div style={s.navAvatar}>N</div>
        </div>
      </div>

      <div style={s.filterBar}>
        <FilterField
          label="Role"
          placeholder="e.g. Product Manager"
          values={roleInput.split(",").map(s => s.trim()).filter(Boolean)}
          onAdd={v => setRoleInput(p => p.trim() ? p.trim() + ", " + v : v)}
          onRemove={v => setRoleInput(roleInput.split(",").map(s => s.trim()).filter(s => s && s !== v).join(", "))}
        />
        <div style={s.filterDivider} />
        <FilterField
          label="Location"
          placeholder="e.g. Singapore"
          values={locationInput.split(",").map(s => s.trim()).filter(Boolean)}
          onAdd={v => setLocationInput(p => p.trim() ? p.trim() + ", " + v : v)}
          onRemove={v => setLocationInput(locationInput.split(",").map(s => s.trim()).filter(s => s && s !== v).join(", "))}
        />
        <div style={s.filterDivider} />
        <FilterField
          label="Keywords"
          placeholder="e.g. AI, fintech"
          values={keywordInput.split(",").map(s => s.trim()).filter(Boolean)}
          onAdd={v => setKeywordInput(p => p.trim() ? p.trim() + ", " + v : v)}
          onRemove={v => setKeywordInput(keywordInput.split(",").map(s => s.trim()).filter(s => s && s !== v).join(", "))}
        />
        <button style={s.searchBtn} onClick={() => handleSearch()} disabled={loading.scraping}>
          {loading.scraping ? "Searching..." : "Search"}
        </button>
        {(roleInput || locationInput || keywordInput) && (
          <button style={s.clearAllBtn} onClick={() => { setRoleInput(""); setLocationInput(""); setKeywordInput("") }}>
            Clear all
          </button>
        )}
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
            <div style={s.listHeaderTop}>
              <div style={{ fontSize: 13 }}>
                {loading.scraping ? (
                  <span style={{ color: "#9CA3AF" }}>Searching...</span>
                ) : (
                  <>
                    <strong style={{ color: "#1C1E21" }}>{sortedJobs.length}</strong>
                    {activeRoles.length > 0 && (
                      <span style={{ color: "#1C1E21", fontWeight: 600 }}>{" "}{activeRoles[0]}</span>
                    )}
                    <span style={{ color: "#65676B" }}> jobs found</span>
                    {loading.rating && (
                      <span style={{ fontSize: 11, color: "#16825C", marginLeft: 8 }}>
                        <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                        {" "}Rating
                      </span>
                    )}
                  </>
                )}
              </div>
              <select style={s.sortSelect} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                <option value="relevant">Most relevant</option>
                <option value="date">Date posted</option>
              </select>
            </div>
            {topHirers.length > 0 && !loading.scraping && (
              <div style={s.topHirers}>
                <span style={s.topHirerLabel}>Top hirers:</span>
                {topHirers.map(([company, count]) => (
                  <span key={company} style={s.topHirerChip}>
                    {company} <span style={{ color: "#16825C", fontWeight: 700 }}>{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={s.listScroll}>
            {visibleJobs.length === 0 && !loading.scraping && jobs.length > 0 && (
              <div style={s.emptyList}>
                <div style={s.emptyListTitle}>No jobs match your filters.</div>
                <div style={s.emptyListSub}>Try adjusting the filters on the left.</div>
              </div>
            )}
            {sortedJobs.map(job => (
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

function AboutModal({ onClose }) {
  const features = [
    { icon: "📄", title: "Resume AI", desc: "Upload your PDF — Claude parses your skills, experience, and career trajectory." },
    { icon: "⭐", title: "Fit Scoring", desc: "Every listing is scored Strong Fit, Worth Exploring, or Low Priority against your profile." },
    { icon: "📊", title: "Market Snapshot", desc: "See which companies are actively hiring and how postings shift week over week." },
    { icon: "🤖", title: "AI Agent", desc: "Screenshot any job posting from LinkedIn or a company site for an instant fit breakdown." },
  ]
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 460, width: "90%", display: "flex", flexDirection: "column", gap: 22, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1C1E21", letterSpacing: "-0.8px" }}>recon</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Job intelligence for Singapore's market</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: "#9CA3AF", cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}>✕</button>
        </div>

        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: 0 }}>
          recon aggregates live job listings from <strong>MyCareersFuture</strong> and <strong>JobStreet</strong>, then uses Claude AI to score each role against your resume — so you spend time on jobs that actually fit, not ones you'll get filtered out of.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: "center", marginTop: 1 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1E21", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#65676B", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #F0F2F5", paddingTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>Built by Aalia Arshad</div>
          <a
            href="https://www.linkedin.com/in/aalia-a-875914201/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0A66C2", color: "#fff", borderRadius: 7, padding: "8px 14px", textDecoration: "none", fontSize: 12, fontWeight: 600 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            Connect on LinkedIn
          </a>
        </div>
      </div>
    </div>
  )
}

function FilterField({ label, values, onAdd, onRemove, placeholder }) {
  const [text, setText] = useState("")
  const inputRef = useRef(null)

  const commit = () => {
    const v = text.trim()
    if (v) { onAdd(v); setText("") }
  }

  return (
    <div style={ff.section} onClick={() => inputRef.current?.focus()}>
      <span style={ff.label}>{label}</span>
      {values.map((v, i) => (
        <span key={i} style={ff.chip}>
          {v}
          <button style={ff.chipX} onClick={e => { e.stopPropagation(); onRemove(v) }}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        style={ff.input}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") commit()
          if (e.key === "Backspace" && !text && values.length) onRemove(values[values.length - 1])
        }}
        placeholder={values.length === 0 ? placeholder : ""}
      />
    </div>
  )
}

const ff = {
  section: { display: "flex", alignItems: "center", gap: 6, cursor: "text", flex: 1, minWidth: 120 },
  label: { fontSize: 11, fontWeight: 700, color: "#16825C", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 4, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0 },
  chip: { display: "inline-flex", alignItems: "center", gap: 3, background: "#14201C", color: "#fff", borderRadius: 4, padding: "3px 4px 3px 8px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 },
  chipX: { background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1 },
  input: { border: "none", outline: "none", fontSize: 13, color: "#1C1E21", background: "transparent", fontFamily: "inherit", minWidth: 80, flex: 1 },
}

function QueryChip({ icon, label, value, editing, editValue, onEditChange, onStartEdit, onCommit, onCancel, onClear }) {
  const ref = useRef(null)
  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  if (editing) return (
    <div style={qc.editing}>
      <span style={qc.icon}>{icon}</span>
      <input
        ref={ref}
        style={qc.input}
        value={editValue}
        onChange={e => onEditChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel() }}
        onBlur={onCommit}
        placeholder={label}
      />
    </div>
  )

  if (value) return (
    <div style={qc.filled} onClick={onStartEdit}>
      <span style={qc.icon}>{icon}</span>
      <span style={qc.text}>{value}</span>
      <button style={qc.x} onClick={e => { e.stopPropagation(); onClear() }}>×</button>
    </div>
  )

  return (
    <button style={qc.empty} onClick={onStartEdit}>
      {icon} {label}
    </button>
  )
}

const qc = {
  filled: { display: "inline-flex", alignItems: "center", gap: 5, background: "#14201C", color: "#fff", borderRadius: 6, padding: "5px 4px 5px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", flexShrink: 0, userSelect: "none" },
  editing: { display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #16825C", borderRadius: 6, padding: "4px 10px", flexShrink: 0 },
  empty: { display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "1.5px dashed #D1D5DB", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#9CA3AF", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" },
  icon: { fontSize: 12 },
  text: { maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  x: { background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 16, cursor: "pointer", padding: "0 3px", lineHeight: 1 },
  input: { border: "none", outline: "none", fontSize: 12, color: "#1C1E21", width: 140, background: "transparent", fontFamily: "inherit" },
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
          background: "#F5F5F7", border: "1px solid #E4E4E7", borderRadius: 20,
          color: "#3F3F46", fontSize: 11, fontWeight: 600, padding: "3px 10px",
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
      background: selected ? "#F5F3FF" : "#fff",
      borderLeft: `3px solid ${selected ? "#16825C" : "transparent"}`,
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
        {job.salary && <><span style={m.jobCardSep}>·</span><span style={{ ...m.jobCardTag, color: "#16825C", fontWeight: 600 }}>{job.salary}</span></>}
        {date && <span style={{ ...m.jobCardTag, marginLeft: "auto" }}>{date}</span>}
      </div>
    </div>
  )
}

const NAVY = "#14201C"
const GREEN = "#16825C"

const s = {
  app: { height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#E8E8EE", overflow: "hidden" },
  nav: { background: "#000D19", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, zIndex: 10, borderBottom: "1px solid #F0F2F5" },
  navLogo: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", flexShrink: 0, color: "#fff" },
  filterBar: { background: "#fff", borderBottom: "1px solid #F0F2F5", padding: "0 16px", display: "flex", alignItems: "center", height: 46, flexShrink: 0, gap: 0 },
  filterDivider: { width: 1, height: 24, background: "#E4E6EB", flexShrink: 0, margin: "0 12px" },
  searchBtn: { background: GREEN, color: "#fff", border: "none", padding: "0 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", height: 34, flexShrink: 0, borderRadius: 6, letterSpacing: 0.1, whiteSpace: "nowrap", marginLeft: 6 },
  clearAllBtn: { background: "none", border: "none", color: "#9CA3AF", fontSize: 11, fontWeight: 500, cursor: "pointer", padding: 0 },
  navRight: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 },
  navAvatar: { width: 30, height: 30, borderRadius: "50%", background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
  aboutBtn: { background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#B2B7BC", fontSize: 11, fontWeight: 500, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" },
  screenTabs: { display: "flex", marginLeft: 16, paddingLeft: 16, gap: 0, borderLeft: "1px solid #F0F2F5", height: "100%", alignItems: "stretch" },
  screenTab: { fontSize: 13, fontWeight: 600, padding: "0 12px", cursor: "pointer", color: "#B2B7BC", background: "none", border: "none", borderBottom: "2px solid transparent", fontFamily: "inherit", display: "flex", alignItems: "center" },
  screenTabActive: { color: "#12DF8B", borderBottom: `2px solid ${GREEN}` },
  resumeBadge: { background: "#ECFDF5", color: GREEN, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "1px solid #A7F3D0" },
  bgPill: { background: "#ECFDF5", color: GREEN, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center" },
  pill: { background: "#ECFDF5", color: GREEN, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 },
  body: { display: "flex", flex: 1, overflow: "hidden", gap: 2, padding: 2 },
  sidebar: { width: 240, minWidth: 240, background: "#fff", borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 },
  resumeWrap: { padding: "14px 16px", borderBottom: "1px solid #F2F2F5", flexShrink: 0 },
  listPane: { width: 380, minWidth: 380, background: "#fff", borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 },
  listHeader: { padding: "10px 16px 8px", borderBottom: "1px solid #F2F2F5", flexShrink: 0 },
  listHeaderTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  listCount: { fontSize: 12, color: "#65676B", fontWeight: 500 },
  sortSelect: { fontSize: 11, color: "#65676B", border: "1px solid #E4E6EB", borderRadius: 6, padding: "4px 8px", cursor: "pointer", background: "#fff", outline: "none", fontFamily: "inherit" },
  topHirers: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" },
  topHirerLabel: { fontSize: 11, color: "#9CA3AF" },
  topHirerChip: { fontSize: 11, color: "#1C1E21", background: "#F5F6F7", border: "1px solid #E4E6EB", borderRadius: 20, padding: "2px 8px" },
  loadingMore: { fontSize: 11, color: "#D97706", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 },
  listScroll: { flex: 1, overflowY: "auto" },
  detailPane: { flex: 1, background: "#fff", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" },
  emptyList: { padding: "48px 24px", textAlign: "center" },
  emptyListTitle: { fontSize: 14, fontWeight: 600, color: "#1C1E21", marginBottom: 6 },
  emptyListSub: { fontSize: 12, color: "#9CA3AF" },
  overlay: { position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, backdropFilter: "blur(2px)" },
  overlayInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  overlayIcon: { fontSize: 28, display: "inline-block", animation: "spin 1s linear infinite", color: GREEN },
  overlayText: { fontSize: 13, color: "#65676B", fontWeight: 500 },
}

const m = {
  app: { height: "100dvh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", background: "#F5F6F7", overflow: "hidden" },
  topBar: { background: "#fff", borderBottom: "1px solid #E4E6EB", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  logoSmall: { fontSize: 16, fontWeight: 800, color: "#1C1E21", letterSpacing: "-0.5px", flexShrink: 0 },
  searchRow: { flex: 1, display: "flex", gap: 8 },
  searchInput: { flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E4E6EB", fontSize: 14, outline: "none", color: "#1C1E21", background: "#F5F6F7", minWidth: 0 },
  searchBtn: { background: "#16825C", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  backBtn: { background: "none", border: "none", color: "#16825C", fontSize: 15, fontWeight: 600, cursor: "pointer", flexShrink: 0, padding: 0 },
  detailNavTitle: { flex: 1, fontSize: 14, fontWeight: 600, color: "#1C1E21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  statusBar: { background: "#FEF3C7", padding: "6px 16px", display: "flex", gap: 8, flexShrink: 0 },
  statusPill: { fontSize: 11, color: "#92400E", fontWeight: 600 },
  content: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
  jobsScreen: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  listMeta: { padding: "8px 16px", background: "#fff", borderBottom: "1px solid #F0F2F5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" },
  listMetaText: { fontSize: 12, color: "#65676B", fontWeight: 500 },
  filterBtn: { background: "#F5F6F7", border: "1.5px solid #E4E6EB", borderRadius: 20, color: "#65676B", padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  filterBtnActive: { background: "#F5F3FF", border: "1.5px solid #16825C", color: "#16825C", fontWeight: 600 },
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