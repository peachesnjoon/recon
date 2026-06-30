export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    return res.status(200).json({
      ok: false,
      error: "Env vars not set on this deployment",
      hasUrl: !!url,
      hasKey: !!key,
    })
  }

  try {
    const { createClient } = await import("@supabase/supabase-js")
    const client = createClient(url, key)
    const { data, error } = await client.from("jobs").select("id").limit(3)
    if (error) return res.status(200).json({ ok: false, error: error.message, hasUrl: true, hasKey: true })
    return res.status(200).json({ ok: true, rowCount: data.length, hasUrl: true, hasKey: true })
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message, hasUrl: !!url, hasKey: !!key })
  }
}
