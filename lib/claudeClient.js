export async function callClaude({ system, prompt, maxTokens = 4000 }) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, maxTokens }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Claude API error")
  }

  const data = await res.json()
  return data.text
}