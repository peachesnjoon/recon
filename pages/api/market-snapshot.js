import supabase from "../../lib/supabase"
import { FEATURED_COMPANIES, isRecruiter } from "../../lib/companyTiers"

const MIN_OPENINGS = 2 // ignore companies with fewer than this

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { keywords } = req.body

  try {
    let currentCounts = []

    if (keywords) {
      // role search: top 5 companies for this keyword from jobs table
      const { data, error } = await supabase
        .from("jobs")
        .select("company")
        .ilike("title", `%${keywords}%`)
        .eq("source", "MCF")

      if (error) throw new Error(error.message)

      const counts = {}
      for (const row of data || []) {
        if (!row.company || isRecruiter(row.company)) continue
        counts[row.company] = (counts[row.company] || 0) + 1
      }
      currentCounts = Object.entries(counts)
        .filter(([, count]) => count >= MIN_OPENINGS)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([company, count]) => ({ company, count }))
    } else {
      // default: featured companies
      const results = await Promise.all(
        FEATURED_COMPANIES.map(async company => {
          const { count } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .ilike("company", `%${company}%`)
            .eq("source", "MCF")
          return { company, count: count || 0 }
        })
      )
      currentCounts = results.filter(r => r.count >= MIN_OPENINGS).sort((a, b) => b.count - a.count)
    }

    // fetch historical snapshots for change calculations
    const companies = currentCounts.map(r => r.company)
    const roleKey = keywords || ""

    const { data: snapshots } = await supabase
      .from("job_snapshots")
      .select("company, count, snapped_at")
      .in("company", companies)
      .eq("role_keyword", roleKey)
      .order("snapped_at", { ascending: false })

    const now = Date.now()
    const snapshotMap = {}
    for (const snap of snapshots || []) {
      if (!snapshotMap[snap.company]) snapshotMap[snap.company] = []
      snapshotMap[snap.company].push(snap)
    }

    const rows = currentCounts.map(({ company, count }) => {
      const history = snapshotMap[company] || []
      const getChange = (days) => {
        const cutoff = new Date(now - days * 864e5).toISOString()
        const old = history.find(s => s.snapped_at <= cutoff)
        if (!old) return null
        return count - old.count
      }
      return {
        company,
        count,
        change7d: getChange(7),
        change30d: getChange(30),
        change4m: getChange(120),
      }
    })

    return res.status(200).json({ rows })
  } catch (err) {
    console.error("market-snapshot error:", err.message)
    return res.status(200).json({ rows: [], error: err.message })
  }
}
