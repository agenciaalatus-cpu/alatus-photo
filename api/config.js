export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY)
  return res.status(200).json({ hasEnvKey })
}
