import supabase from "../../lib/supabase"

export default async function handler(req, res) {
  const { data, error } = await supabase.from("jobs").select("id").limit(1)
  if (error) return res.status(500).json({ ok: false, error: error.message })
  return res.status(200).json({ ok: true, rowCount: data.length })
}
