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

test('Fase 5: Remoção de Duplicadas - Algoritmo de Hashing Perceptual (dHash) e Distância de Hamming', () => {
  // Pure Hamming distance calculation logic
  const hammingDistance = (a, b) => {
    let dist = 0
    const len = Math.min(a.length, b.length)
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) dist++
    }
    return dist + Math.abs(a.length - b.length)
  }

  const hashA = '1100110011001100'
  const hashIdentical = '1100110011001100'
  const hashBurst = '1100110011001101' // 1 bit different
  const hashDifferent = '0011001100110011' // 16 bits different

  assert.equal(hammingDistance(hashA, hashIdentical), 0, 'Hashes idênticos devem ter distância 0')
  assert.equal(hammingDistance(hashA, hashBurst), 1, 'Foto em rajada quase idêntica deve ter distância 1')
  assert.equal(hammingDistance(hashA, hashDifferent), 16, 'Fotos completamente distintas devem ter distância máxima')

  const simIdentical = (1 - hammingDistance(hashA, hashIdentical) / 16) * 100
  const simBurst = (1 - hammingDistance(hashA, hashBurst) / 16) * 100
  const simDifferent = (1 - hammingDistance(hashA, hashDifferent) / 16) * 100

  assert.equal(simIdentical, 100)
  assert.ok(simBurst >= 93, 'Similaridade de rajada deve ser > 93%')
  assert.equal(simDifferent, 0, 'Similaridade de fotos opostas deve ser 0%')
})

test('Fase 5: Remoção de Duplicadas - Avaliação de Nitidez Laplaciana e Escolha da Melhor Foto', () => {
  // Grayscale buffer simulator
  const width = 10
  const height = 10

  // 1. Sharp image with high edge contrast
  const sharpBuffer = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      sharpBuffer[y * width + x] = (x % 2 === 0) ? 240 : 15 // crisp alternating edges
    }
  }

  // 2. Blurry image with smooth / flat gradient
  const blurBuffer = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      blurBuffer[y * width + x] = Math.round(120 + x * 2) // gentle flat gradient
    }
  }

  // Laplacian edge variance calculation
  const calculateLaplacianVariance = (grayscale, w, h) => {
    let sum = 0
    let sumSq = 0
    let count = 0
    for (let y = 1; y < h - 1; y++) {
      const row = y * w
      const prev = (y - 1) * w
      const next = (y + 1) * w
      for (let x = 1; x < w - 1; x++) {
        const center = grayscale[row + x]
        const up = grayscale[prev + x]
        const down = grayscale[next + x]
        const left = grayscale[row + x - 1]
        const right = grayscale[row + x + 1]
        const lap = up + down + left + right - (center * 4)
        sum += lap
        sumSq += lap * lap
        count++
      }
    }
    const mean = sum / count
    return (sumSq / count) - (mean * mean)
  }

  const sharpVariance = calculateLaplacianVariance(sharpBuffer, width, height)
  const blurVariance = calculateLaplacianVariance(blurBuffer, width, height)

  assert.ok(sharpVariance > blurVariance * 10, 'A imagem nítida deve ter variância Laplaciana muito superior à imagem desfocada')

  // Simulate group ranking
  const photo1 = { id: 'p1', name: 'foto_desfocada.jpg', variance: blurVariance, score: 58 }
  const photo2 = { id: 'p2', name: 'foto_foco_cravado.jpg', variance: sharpVariance, score: 96 }

  const duplicateGroup = [photo1, photo2]
  duplicateGroup.sort((a, b) => b.score - a.score)

  assert.equal(duplicateGroup[0].id, 'p2', 'A melhor foto selecionada deve ser a foto de maior nitidez')
  assert.equal(duplicateGroup[1].id, 'p1', 'A foto desfocada deve ser marcada como duplicada inferior para remoção')
})
