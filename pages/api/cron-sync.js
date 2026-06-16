export const config = { maxDuration: 300 }

// Called weekly by Vercel cron (GET only)
// Triggers full MCF sync with default keywords
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end()

  const result = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync-mcf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pages: 5 }),
  })

  const data = await result.json()
  return res.status(200).json(data)
}
