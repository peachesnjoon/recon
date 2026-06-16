import { useState, useCallback, useRef } from "react"

export function useJobSearch() {
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [resumeData, setResumeData] = useState(() => {
    if (typeof window === "undefined") return null
    const saved = sessionStorage.getItem("recon_resume")
    return saved ? JSON.parse(saved) : null
  })
  const [resumeSignal, setResumeSignal] = useState(() => {
    if (typeof window === "undefined") return null
    return sessionStorage.getItem("recon_signal") || null
  })
  const [resumeRoles, setResumeRoles] = useState(() => {
    if (typeof window === "undefined") return []
    const saved = sessionStorage.getItem("recon_roles")
    return saved ? JSON.parse(saved) : []
  })
  const [activeRoles, setActiveRoles] = useState(() => {
    if (typeof window === "undefined") return []
    const saved = sessionStorage.getItem("recon_active_roles")
    return saved ? JSON.parse(saved) : []
  })
  const [manualRoles, setManualRoles] = useState(() => {
    if (typeof window === "undefined") return []
    const saved = sessionStorage.getItem("recon_manual_roles")
    return saved ? JSON.parse(saved) : []
  })
  const [fitPreferences, setFitPreferences] = useState(() => {
    if (typeof window === "undefined") return null
    const saved = sessionStorage.getItem("recon_prefs")
    return saved ? JSON.parse(saved) : null
  })
  const [jobs, setJobs] = useState(() => {
    if (typeof window === "undefined") return []
    const saved = sessionStorage.getItem("recon_jobs")
    return saved ? JSON.parse(saved) : []
  })
  const [ratings, setRatings] = useState(() => {
    if (typeof window === "undefined") return {}
    const saved = sessionStorage.getItem("recon_ratings")
    return saved ? JSON.parse(saved) : {}
  })
  const [generatedResumes, setGeneratedResumes] = useState({})
  const [loading, setLoading] = useState({
    parsing: false,
    scraping: false,
    rating: false,
    resumeId: null,
  })
  const [error, setError] = useState(null)

  const resumeDataRef = useRef(resumeData)
  const fitPrefsRef = useRef(fitPreferences)
  const summarisingRef = useRef(new Set())

  const parseResume = useCallback(async (base64PDF) => {
    setLoading(l => ({ ...l, parsing: true }))
    setError(null)
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are a resume parser. Return ONLY valid JSON, no markdown, no explanation.`,
          pdf: base64PDF,
          prompt: `Parse this resume and return JSON with this exact shape:
{
  "name": string,
  "currentRole": string,
  "yearsExperience": number,
  "skills": string[],
  "achievements": string[],
  "industries": string[],
  "summary": string
}`,
          maxTokens: 1000,
        }),
      })
      const data = await res.json()
      const clean = data.text.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(clean)
      setResumeData(parsed)
      resumeDataRef.current = parsed
      sessionStorage.setItem("recon_resume", JSON.stringify(parsed))
      setResumeSignal(null)
      sessionStorage.removeItem("recon_signal")
      setResumeRoles([])
      sessionStorage.removeItem("recon_roles")
      setManualRoles([])
      sessionStorage.removeItem("recon_manual_roles")
      return parsed
    } catch (e) {
      setError("Could not parse resume. Try again.")
      return null
    } finally {
      setLoading(l => ({ ...l, parsing: false }))
    }
  }, [])

  const saveFitPreferences = useCallback((prefs) => {
    setFitPreferences(prefs)
    fitPrefsRef.current = prefs
    sessionStorage.setItem("recon_prefs", JSON.stringify(prefs))
  }, [])

  // fetch structured signal { signal, roles, focused } — called after parse
  const getSignal = useCallback(async (resume) => {
    try {
      const res = await fetch("/api/resume-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: resume }),
      })
      const d = await res.json()
      if (d.signal) {
        setResumeSignal(d.signal)
        sessionStorage.setItem("recon_signal", d.signal)
      }
      const roles = Array.isArray(d.roles) ? d.roles : []
      setResumeRoles(roles)
      sessionStorage.setItem("recon_roles", JSON.stringify(roles))
      return { signal: d.signal || null, roles, focused: d.focused !== false }
    } catch (e) {
      return { signal: null, roles: [], focused: true }
    }
  }, [])

  const setActiveRolesPersisted = useCallback((roles) => {
    setActiveRoles(roles)
    sessionStorage.setItem("recon_active_roles", JSON.stringify(roles))
  }, [])

  const setManualRolesPersisted = useCallback((roles) => {
    setManualRoles(roles)
    sessionStorage.setItem("recon_manual_roles", JSON.stringify(roles))
  }, [])

    // lazy summarise — only called when a job is opened, only once per job
  const summariseJob = useCallback(async (job) => {
    if (!job || job.jdSummary) return
    if (summarisingRef.current.has(job.id)) return
    summarisingRef.current.add(job.id)
    try {
      const res = await fetch("/api/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: [job] }),
      })
      const { summaries } = await res.json()
      if (summaries && summaries[job.id]) {
        setJobs(prev => {
          const updated = prev.map(j =>
            j.id === job.id ? { ...j, jdSummary: summaries[job.id] } : j
          )
          sessionStorage.setItem("recon_jobs", JSON.stringify(updated))
          return updated
        })
      }
    } catch (e) {
      console.error("Summarise failed:", e)
    } finally {
      summarisingRef.current.delete(job.id)
    }
  }, [])

  const rateJobs = useCallback(async (resume, jobList, preferences) => {
    setLoading(l => ({ ...l, rating: true }))
    const prefs = preferences || fitPrefsRef.current

    if (!sessionStorage.getItem("recon_signal")) {
      fetch("/api/resume-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: resume, preferences: prefs }),
      }).then(r => r.json()).then(d => {
        if (d.signal) {
          setResumeSignal(d.signal)
          sessionStorage.setItem("recon_signal", d.signal)
        }
      }).catch(() => {})
    }

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: resume, jobs: jobList, preferences: prefs }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRatings(data.ratings)
      sessionStorage.setItem("recon_ratings", JSON.stringify(data.ratings))
    } catch (e) {
      setError("Could not rate jobs.")
    } finally {
      setLoading(l => ({ ...l, rating: false }))
    }
  }, [])

  const scrapeJobs = useCallback(async (rolesOrKeyword, location = "Singapore") => {
    // accept either a single string or an array of role titles
    const roleList = Array.isArray(rolesOrKeyword)
      ? rolesOrKeyword.filter(Boolean)
      : [rolesOrKeyword].filter(Boolean)
    if (roleList.length === 0) return []

    setLoading(l => ({ ...l, scraping: true }))
    setBackgroundLoading(true)
    setError(null)
    setJobs([])

    try {
      // scrape MCF once per role, merge + dedupe
      const perRoleLimit = roleList.length > 1 ? Math.ceil(100 / roleList.length) : 100
      const results = await Promise.all(
        roleList.map(role =>
          fetch("/api/scrape-mcf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keywords: role, location, limit: perRoleLimit }),
          }).then(r => r.json()).then(d => d.jobs || []).catch(() => [])
        )
      )

      const seen = new Set()
      const mcfJobs = []
      for (const jobsForRole of results) {
        for (const job of jobsForRole) {
          if (!seen.has(job.id)) {
            seen.add(job.id)
            mcfJobs.push(job)
          }
        }
      }

      setJobs(mcfJobs)
      sessionStorage.setItem("recon_jobs", JSON.stringify(mcfJobs))
      setLoading(l => ({ ...l, scraping: false }))

      // batch-summarize all jobs in background (20 at a time)
      const batchSummarise = async (jobList) => {
        const BATCH = 20
        for (let i = 0; i < jobList.length; i += BATCH) {
          const batch = jobList.slice(i, i + BATCH).filter(j => !j.jdSummary)
          if (!batch.length) continue
          try {
            const res = await fetch("/api/summarise", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobs: batch }),
            })
            const { summaries } = await res.json()
            if (!summaries) continue
            setJobs(prev => {
              const updated = prev.map(j => summaries[j.id] ? { ...j, jdSummary: summaries[j.id] } : j)
              sessionStorage.setItem("recon_jobs", JSON.stringify(updated))
              return updated
            })
          } catch (e) { /* silent */ }
        }
      }
      batchSummarise(mcfJobs)

      // merge JobStreet for the first role in background
      setTimeout(() => {
        const existingKeys = mcfJobs.map(j =>
          (j.title + j.company).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30)
        )
        fetch("/api/scrape-jobstreet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: roleList[0], location, limit: 20, existingIds: existingKeys }),
        }).then(r => r.json()).then(jsData => {
          const jsJobs = jsData.jobs || []
          if (jsJobs.length > 0) {
            setJobs(prev => {
              const existingIds = new Set(prev.map(j => j.id))
              const newJobs = jsJobs.filter(j => !existingIds.has(j.id))
              if (newJobs.length === 0) return prev
              const merged = [...prev, ...newJobs]
              sessionStorage.setItem("recon_jobs", JSON.stringify(merged))
              batchSummarise(newJobs)
              return merged
            })
          }
          setBackgroundLoading(false)
        }).catch(e => {
          console.error("JobStreet failed:", e)
          setBackgroundLoading(false)
        })
      }, 3000)

      return mcfJobs
    } catch (err) {
      setError("Could not fetch jobs.")
      setLoading(l => ({ ...l, scraping: false }))
      setBackgroundLoading(false)
      return []
    }
  }, [])

  const generateResume = useCallback(async (job) => {
    if (generatedResumes[job.id]) return generatedResumes[job.id]
    setLoading(l => ({ ...l, resumeId: job.id }))
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: resumeDataRef.current, job }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGeneratedResumes(prev => ({ ...prev, [job.id]: data.resume }))
      return data.resume
    } catch (e) {
      setError("Could not generate resume.")
      return null
    } finally {
      setLoading(l => ({ ...l, resumeId: null }))
    }
  }, [generatedResumes])

  return {
    resumeData, resumeSignal, resumeRoles, activeRoles, manualRoles, fitPreferences,
    jobs, ratings, generatedResumes,
    loading, backgroundLoading, error,
    parseResume, saveFitPreferences, scrapeJobs, rateJobs, generateResume, summariseJob,
    getSignal, setActiveRoles: setActiveRolesPersisted, setManualRoles: setManualRolesPersisted,
  }
}