import React, { useState } from 'react'
import { 
  X, 
  Key, 
  Palette, 
  Sliders, 
  Shield, 
  Download, 
  Check, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ExternalLink,
  DollarSign,
  TrendingUp,
  Lock,
  Cpu
} from 'lucide-react'
import { AppSettings, StyleProfile, UsageStats } from '../types/photo'
import { GeminiService } from '../services/geminiService'
import { StorageService } from '../services/storageService'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onSave: (updated: AppSettings) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings })
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'api' | 'usage' | 'style' | 'export' | 'privacy'>('api')
  const [usageStats] = useState<UsageStats>(() => StorageService.loadUsage())

  if (!isOpen) return null

  const handleTestKey = async () => {
    if (!formData.geminiApiKey?.trim()) {
      setTestResult({ success: false, message: 'Digite uma chave Gemini válida antes de testar.' })
      return
    }
    setIsTestingKey(true)
    setTestResult(null)
    try {
      const res = await GeminiService.testApiKey(formData.geminiApiKey.trim())
      setTestResult(res)
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Falha ao testar conexão' })
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleSaveAndClose = () => {
    onSave(formData)
    onClose()
  }

  const styleProfiles: { id: StyleProfile; name: string; desc: string }[] = [
    { id: 'natural', name: 'Natural', desc: 'Preserva a autenticidade com iluminação realista e tons fiéis' },
    { id: 'cinematic', name: 'Cinematic', desc: 'Contraste suave, tons quentes e atmosfera cinematográfica' },
    { id: 'vibrant', name: 'Vibrante', desc: 'Cores ricas, saturação seletiva e energia visual' },
    { id: 'clean', name: 'Clean', desc: 'Sombras abertas, visual minimalista e nitidez cristalina' },
    { id: 'portrait', name: 'Retrato', desc: 'Prioridade total para suavidade e tons naturais de pele' },
    { id: 'event', name: 'Evento', desc: 'Equilíbrio dinâmico para fotos em grupo e iluminação mista' },
    { id: 'neutral', name: 'Neutro', desc: 'Ajustes estritamente corretivos para precisão técnica' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00509E]/20 text-[#00509E] border border-[#00509E]/30">
              <Sliders className="w-4 h-4 text-[#FFC72C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Configurações • ALATUS PHOTO</h2>
              <p className="text-xs text-[var(--text-secondary)]">Gemini API, limites, custos e preferências</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border-color)] px-6 bg-[var(--bg-subtle)]/50 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'api'
                ? 'border-[#00509E] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[#FFC72C]" />
            Gemini API
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'usage'
                ? 'border-[#00509E] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Custos & Limites
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'style'
                ? 'border-[#00509E] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-[#00509E]" />
            Meu Estilo
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'export'
                ? 'border-[#00509E] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Exportação
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'privacy'
                ? 'border-[#00509E] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Segurança
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Google Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.geminiApiKey}
                    onChange={(e) => {
                      setFormData({ ...formData, geminiApiKey: e.target.value })
                      setTestResult(null)
                    }}
                    placeholder="AIzaSy..."
                    className="flex-1 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00509E] transition-all font-mono"
                  />
                  <button
                    onClick={handleTestKey}
                    disabled={isTestingKey}
                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--color-gray-border)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isTestingKey ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#FFC72C]" />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#FFC72C]" />
                        <span>Testar Chave</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Sua chave é armazenada de forma segura e nunca compartilhada.</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00509E] hover:underline flex items-center gap-1 font-medium"
                  >
                    Obter chave gratuita no Google AI Studio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-medium">{testResult.message}</span>
                </div>
              )}

              <div className="bg-[var(--bg-subtle)] border border-[var(--border-color-subtle)] rounded-xl p-4 text-xs text-[var(--text-secondary)] space-y-2">
                <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                  Fallback Heurístico de Inteligência
                </div>
                <p>
                  Caso você processe fotos sem chave ou atinja os limites da sua cota, o aplicativo utilizará automaticamente nosso motor heurístico local de calibração fotográfica para que seu fluxo de trabalho nunca seja interrompido.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-5 animate-fade-in">
              {/* Cost & Volume Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Custo Estimado</span>
                  </div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                    ${usageStats.estimatedCostUsd.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    ≈ R$ {(usageStats.estimatedCostUsd * 5.7).toFixed(2)} BRL
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <TrendingUp className="w-4 h-4 text-[#FFC72C]" />
                    <span>Fotos Hoje</span>
                  </div>
                  <div className="text-xl font-black text-[var(--text-primary)] font-mono mt-1">
                    {usageStats.dailyCount} / {formData.dailyLimit || 100}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Limite diário seguro
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Cpu className="w-4 h-4 text-[#1A6DC2]" />
                    <span>Total Acumulado</span>
                  </div>
                  <div className="text-xl font-black text-[var(--text-primary)] font-mono mt-1">
                    {usageStats.totalPhotosProcessed}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {usageStats.totalAiAnalyses} via Gemini IA
                  </div>
                </div>
              </div>

              {/* Daily Limit Setting */}
              <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Limite de Fotos por Dia</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Evita consumo acidental excessivo de requisições de API no servidor.
                    </p>
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={10}
                    value={formData.dailyLimit || 100}
                    onChange={(e) => setFormData({ ...formData, dailyLimit: Math.max(10, parseInt(e.target.value) || 100) })}
                    className="w-24 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs text-right font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[#00509E]"
                  />
                </div>
              </div>

              {/* Supported Gemini Models List */}
              <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#00509E]" />
                    Modelos Gemini em Operação
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                    Ativo
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] space-y-1 font-mono">
                  <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-primary)]">1. gemini-2.5-flash</span>
                    <span className="text-emerald-400 text-[10px]">Principal (Baixa latência)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span>2. gemini-flash-latest</span>
                    <span className="text-[var(--text-muted)] text-[10px]">Fallback estável</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>3. gemini-2.5-flash-lite</span>
                    <span className="text-[var(--text-muted)] text-[10px]">Ultra econômico</span>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] pt-1">
                  O sistema alterna automaticamente entre os modelos em caso de indisponibilidade momentânea ou limite de cota sem perda de qualidade.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">
                  Preferência Global de Estilo ("Meu estilo")
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {styleProfiles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, styleProfile: style.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formData.styleProfile === style.id
                          ? 'border-[#00509E] bg-[#00509E]/10 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-app)] hover:border-[var(--color-gray-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{style.name}</span>
                        {formData.styleProfile === style.id && (
                          <span className="w-2 h-2 rounded-full bg-[#FFC72C]"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">{style.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-2">
                  * O estilo serve como diretriz. O Gemini continua analisando CADA foto individualmente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Como você quer que suas fotos sejam editadas? (Instrução personalizada)
                </label>
                <textarea
                  rows={3}
                  value={formData.customInstruction}
                  onChange={(e) => setFormData({ ...formData, customInstruction: e.target.value })}
                  placeholder="Ex.: Quero fotos naturais, com pele realista, contraste moderado e cores elegantes. Evite aparência artificial."
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#00509E] transition-all resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Formato de Exportação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'image/jpeg', label: 'JPG (Padrão)' },
                    { id: 'image/png', label: 'PNG (Sem perdas)' },
                    { id: 'image/webp', label: 'WEBP (Compacto)' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, exportFormat: fmt.id as any })}
                      className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                        formData.exportFormat === fmt.id
                          ? 'border-[#00509E] bg-[#00509E]/10 text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Qualidade da Compressão
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 100, label: '100% (Máxima)' },
                    { val: 90, label: '90% (Recomendado)' },
                    { val: 80, label: '80% (Leve)' }
                  ].map((q) => (
                    <button
                      key={q.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, exportQuality: q.val as any })}
                      className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                        formData.exportQuality === q.val
                          ? 'border-[#00509E] bg-[#00509E]/10 text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Sufixo no Nome dos Arquivos
                </label>
                <input
                  type="text"
                  value={formData.exportSuffix}
                  onChange={(e) => setFormData({ ...formData, exportSuffix: e.target.value })}
                  placeholder="_AI"
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] font-mono"
                />
                <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                  Exemplo de saída: IMG_1234{formData.exportSuffix}.jpg (deixe vazio para manter nome idêntico)
                </span>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Excluir imagens após exportação</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Libera memória do navegador e limpa caches temporários imediatamente após o download.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.deleteAfterExport}
                    onChange={(e) => setFormData({ ...formData, deleteAfterExport: e.target.checked })}
                    className="w-4 h-4 rounded text-[#00509E] accent-[#00509E] cursor-pointer"
                  />
                </div>
              </div>

              <div className="text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
                <h4 className="font-bold text-[var(--text-primary)]">Compromisso de Privacidade Fotográfica:</h4>
                <ul className="list-disc pl-5 space-y-1 text-[var(--text-muted)]">
                  <li>Suas fotografias não são armazenadas permanentemente em servidores externos.</li>
                  <li>As edições e processamentos de imagem ocorrem diretamente no seu navegador.</li>
                  <li>A análise é transmitida exclusivamente para a API oficial do Gemini sem redistribuição.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-5 py-2.5 rounded-xl bg-[#00509E] hover:bg-[#003F7E] text-white text-xs font-bold shadow-md shadow-[#00509E]/30 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-[#FFC72C]" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  )
}
