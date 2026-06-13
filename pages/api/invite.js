export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { code } = req.body
  const valid = code?.trim().toUpperCase() === process.env.INVITE_CODE?.toUpperCase()
  return res.status(200).json({ valid })
}