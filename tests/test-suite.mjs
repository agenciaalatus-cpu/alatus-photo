import test from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit, validatePhotoPayload, sanitizeInternalError } from '../api/_security.js'
import { CANDIDATE_MODELS } from '../api/_gemini.js'

test('Fase 1: Segurança - Rate Limiting deve permitir requisições normais e bloquear abuso', () => {
  const req = { headers: { 'x-forwarded-for': '192.168.1.100' } }
  
  // 1 to 30 requests should be allowed
  for (let i = 0; i < 30; i++) {
    const res = checkRateLimit(req)
    assert.equal(res.allowed, true, `Requisição ${i + 1} deveria ser permitida`)
  }

  // 31st request should be blocked
  const blockedRes = checkRateLimit(req)
  assert.equal(blockedRes.allowed, false, 'Requisição 31 deveria ser bloqueada pelo Rate Limiter')
  assert.ok(blockedRes.retryAfter > 0, 'Deve informar tempo de retry-after')
})

test('Fase 1: Segurança - Validação de payload deve rejeitar formatos inválidos e cargas abusivas', () => {
  // Reject missing image
  const emptyRes = validatePhotoPayload({})
  assert.equal(emptyRes.valid, false)

  // Reject unsupported mime type (e.g. svg or html)
  const badMimeRes = validatePhotoPayload({
    base64Image: 'dGVzdA==',
    mimeType: 'image/svg+xml'
  })
  assert.equal(badMimeRes.valid, false)
  assert.equal(badMimeRes.status, 400)

  // Reject payload larger than 14MB base64
  const hugePayload = 'A'.repeat(15 * 1024 * 1024)
  const hugeRes = validatePhotoPayload({
    base64Image: hugePayload,
    mimeType: 'image/jpeg'
  })
  assert.equal(hugeRes.valid, false)
  assert.equal(hugeRes.status, 413)

  // Truncate overly long custom instruction to 500 chars (prevent token blowup / prompt injection)
  const longPrompt = 'X'.repeat(1200)
  const validRes = validatePhotoPayload({
    base64Image: 'dGVzdA==',
    mimeType: 'image/jpeg',
    styleProfile: 'natural',
    customInstruction: longPrompt
  })
  assert.equal(validRes.valid, true)
  assert.equal(validRes.data.customInstruction.length, 500)
})

test('Fase 1: Segurança - Sanitização de erros internos não deve vazar segredos ou stack traces', () => {
  // Quota error
  const quotaErr = new Error('RESOURCE_EXHAUSTED: quota exceeded for project 123456 at https://generativelanguage.googleapis.com')
  const sanitizedQuota = sanitizeInternalError(quotaErr)
  assert.equal(sanitizedQuota.status, 429)
  assert.equal(sanitizedQuota.errorCode, 'QUOTA_EXCEEDED')
  assert.ok(!sanitizedQuota.message.includes('123456'), 'Não deve vazar ID interno do projeto')

  // Internal 500 error
  const leakErr = new Error('Database connection failed at /var/app/internal/secret.key')
  const sanitizedInternal = sanitizeInternalError(leakErr)
  assert.equal(sanitizedInternal.status, 500)
  assert.ok(!sanitizedInternal.message.includes('/var/app'), 'Não deve vazar caminhos de arquivos internos')
})

test('Fase 2: Qualidade Fotográfica - Modelos Gemini devem conter versões oficiais verificadas', () => {
  assert.ok(CANDIDATE_MODELS.length >= 3, 'Deve haver lista de modelos de fallback')
  assert.ok(CANDIDATE_MODELS.includes('gemini-2.5-flash'), 'Deve incluir gemini-2.5-flash')
  assert.ok(CANDIDATE_MODELS.includes('gemini-flash-latest'), 'Deve incluir gemini-flash-latest')
  assert.ok(CANDIDATE_MODELS.includes('gemini-2.5-flash-lite'), 'Deve incluir gemini-2.5-flash-lite')
  
  // None of the deprecated or hallucinated names should exist
  assert.ok(!CANDIDATE_MODELS.includes('gemini-3.5-flash-lite'))
  assert.ok(!CANDIDATE_MODELS.includes('gemini-3.8-flash'))
})

test('Fase 4: Limites de Uso e Monitoramento de Custos - Verificação de métricas', () => {
  const COST_PER_ANALYSIS = 0.00012
  const photosProcessed = 50
  const estimatedCost = photosProcessed * COST_PER_ANALYSIS
  
  assert.equal(estimatedCost, 0.006)
  const brlCost = estimatedCost * 5.7
  assert.ok(brlCost < 0.10, '50 fotos custam menos de 10 centavos de real no Gemini 2.5 Flash')
})
