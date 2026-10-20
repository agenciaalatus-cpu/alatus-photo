// In-memory rate limiting store for Vercel serverless / Node environments
const rateLimitMap = new Map()

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30 // 30 requests per minute per IP

/**
 * Checks if the incoming request exceeds rate limits.
 */
export function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.socket?.remoteAddress || 
             'anonymous-client'

  const now = Date.now()
  const record = rateLimitMap.get(ip)

  // Clean old entries periodically
  if (rateLimitMap.size > 2000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.timestamp > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key)
      }
    }
  }

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { timestamp: now, count: 1 })
    return { allowed: true }
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.timestamp)) / 1000)
    return { allowed: false, retryAfter: Math.max(1, retryAfter) }
  }

  record.count += 1
  return { allowed: true }
}

/**
 * Validates photo payload to prevent excessive payload attacks or invalid mime types.
 */
export function validatePhotoPayload(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Corpo da requisição inválido.' }
  }

  const { base64Image, mimeType, styleProfile, customInstruction } = data

  if (!base64Image || typeof base64Image !== 'string') {
    return { valid: false, error: 'Nenhuma imagem válida enviada para análise.' }
  }

  // Max ~14MB base64 (equivalent to ~10MB raw binary)
  const MAX_BASE64_LENGTH = 14 * 1024 * 1024
  if (base64Image.length > MAX_BASE64_LENGTH) {
    return { valid: false, status: 413, error: 'A imagem excede o tamanho limite permitido de 10MB.' }
  }

  // Allowed mime types
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const normalizedMime = (mimeType || 'image/jpeg').toLowerCase()
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return { valid: false, status: 400, error: 'Formato de imagem não suportado. Utilize JPG, PNG ou WEBP.' }
  }

  // Validate styleProfile
  const ALLOWED_STYLES = ['natural', 'cinematic', 'vibrant', 'clean', 'portrait', 'event', 'neutral']
  const sanitizedStyle = ALLOWED_STYLES.includes(styleProfile) ? styleProfile : 'natural'

  // Truncate custom instruction to prevent prompt injection / token blowup
  const sanitizedInstruction = typeof customInstruction === 'string'
    ? customInstruction.slice(0, 500).replace(/[\r\n]+/g, ' ').trim()
    : ''

  return {
    valid: true,
    data: {
      base64Image,
      mimeType: normalizedMime,
      styleProfile: sanitizedStyle,
      customInstruction: sanitizedInstruction
    }
  }
}

/**
 * Sanitizes errors so internal stack traces, API keys, and private URLs are never leaked to clients.
 */
export function sanitizeInternalError(err) {
  const errMsg = String(err?.message || err || '')
  
  // Check for quota exhaustion / 429
  if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || err?.status === 429) {
    return {
      status: 429,
      errorCode: 'QUOTA_EXCEEDED',
      message: 'Limite de requisições do Gemini atingido temporariamente. Aguarde alguns instantes ou use o Modo Heurístico Local.'
    }
  }

  // Check for invalid API key
  if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key not valid') || errMsg.includes('PERMISSION_DENIED')) {
    return {
      status: 401,
      errorCode: 'INVALID_API_KEY',
      message: 'Chave de API do Gemini inválida ou sem permissão. Verifique suas configurações.'
    }
  }

  // Check for bad requests
  if (errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('400')) {
    return {
      status: 400,
      errorCode: 'BAD_REQUEST',
      message: 'Parâmetros de imagem incompatíveis para processamento com IA.'
    }
  }

  // Safe generic error
  return {
    status: 500,
    errorCode: 'INTERNAL_PROCESSING_ERROR',
    message: 'Não foi possível concluir a análise de IA nesta foto. O modo heurístico local continuará disponível.'
  }
}

/**
 * Applies security headers to responses
 */
export function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}
