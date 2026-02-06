/**
 * API Client para Roboroça
 * Conexão com o backend FastAPI
 */

// URL base da API - pode ser configurada via variável de ambiente
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// Token de autenticação (será armazenado após login)
let authToken: string | null = null

/**
 * Configurar token de autenticação
 */
export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('roboroca_token', token)
  } else {
    localStorage.removeItem('roboroca_token')
  }
}

/**
 * Recuperar token do localStorage
 */
export function loadAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('roboroca_token')
  }
  return authToken
}

/**
 * Headers padrão para requisições
 */
function getHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (includeAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  return headers
}

/**
 * Tratamento de erros da API
 */
class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
    this.name = 'ApiError'
  }
}

/**
 * Função base para requisições
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(!options.headers),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new ApiError(response.status, errorData.detail || 'Erro na requisição')
  }

  // Se for 204 No Content, retornar null
  if (response.status === 204) {
    return null as T
  }

  return response.json()
}

// ============================================
// AUTH - Autenticação
// ============================================

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

// Interface interna para dados enviados ao backend
interface RegisterRequest {
  email: string
  username: string
  password: string
  full_name: string
}

// Resposta do backend para usuário
interface UserBackend {
  id: number
  email: string
  username: string
  full_name: string | null
  is_active: boolean
  plan: string
  created_at: string
}

// Interface pública do usuário (simplificada)
export interface User {
  id: number
  name: string
  email: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// Converte usuário do backend para o formato do frontend
function convertUser(backendUser: UserBackend): User {
  return {
    id: backendUser.id,
    name: backendUser.full_name || backendUser.username,
    email: backendUser.email,
    created_at: backendUser.created_at,
  }
}

/**
 * Login do usuário
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const formData = new URLSearchParams()
  formData.append('username', credentials.email)
  formData.append('password', credentials.password)

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro no login' }))
    throw new ApiError(response.status, error.detail)
  }

  const tokenData = await response.json()
  setAuthToken(tokenData.access_token)

  // Buscar dados do usuário após login
  const userBackend = await apiRequest<UserBackend>('/auth/me')

  return {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type || 'bearer',
    user: convertUser(userBackend),
  }
}

/**
 * Registrar novo usuário
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  // Converter dados do frontend para o formato do backend
  const registerRequest: RegisterRequest = {
    email: data.email,
    username: data.email.split('@')[0], // Usar parte do email como username
    password: data.password,
    full_name: data.name,
  }

  // Registrar usuário
  await apiRequest<UserBackend>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerRequest),
    headers: { 'Content-Type': 'application/json' },
  })

  // Fazer login automaticamente após registro
  return login({ email: data.email, password: data.password })
}

/**
 * Logout
 */
export function logout() {
  setAuthToken(null)
}

/**
 * Obter usuário atual
 */
export async function getCurrentUser(): Promise<User> {
  const userBackend = await apiRequest<UserBackend>('/auth/me')
  return convertUser(userBackend)
}

// ============================================
// PROJECTS - Projetos
// ============================================

export interface Project {
  id: number
  name: string
  description?: string
  latitude?: number
  longitude?: number
  total_area_ha?: number
  area_hectares?: number
  image_count: number
  status: string
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  name: string
  description?: string
  latitude?: number
  longitude?: number
  area_hectares?: number
}

/**
 * Listar projetos do usuário
 */
export async function getProjects(skip = 0, limit = 20): Promise<{ projects: Project[]; total: number }> {
  return apiRequest(`/projects/?skip=${skip}&limit=${limit}`)
}

/**
 * Obter projeto por ID
 */
export async function getProject(id: number): Promise<Project> {
  return apiRequest(`/projects/${id}`)
}

/**
 * Criar novo projeto
 */
export async function createProject(data: CreateProjectData): Promise<Project> {
  return apiRequest('/projects/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Atualizar projeto
 */
export async function updateProject(id: number, data: Partial<CreateProjectData>): Promise<Project> {
  return apiRequest(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Excluir projeto
 */
export async function deleteProject(id: number): Promise<void> {
  return apiRequest(`/projects/${id}`, { method: 'DELETE' })
}

// ============================================
// IMAGES - Imagens
// ============================================

export interface ImageData {
  id: number
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  image_type: string
  width?: number
  height?: number
  center_lat?: number
  center_lon?: number
  capture_date?: string
  status: string
  project_id: number
  created_at: string
}

/**
 * Listar imagens (opcionalmente de um projeto específico)
 */
export async function getImages(
  projectId?: number,
  skip = 0,
  limit = 20
): Promise<{ images: ImageData[]; total: number }> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (projectId) params.append('project_id', String(projectId))
  return apiRequest(`/images/?${params}`)
}

/**
 * Obter imagem por ID
 */
export async function getImage(id: number): Promise<ImageData> {
  return apiRequest(`/images/${id}`)
}

/**
 * Upload de uma imagem
 */
export async function uploadImage(
  file: File,
  projectId: number,
  imageType: 'drone' | 'satellite' = 'drone',
  onProgress?: (progress: number) => void
): Promise<{ message: string; image: ImageData }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', String(projectId))
    formData.append('image_type', imageType)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch {
          reject(new ApiError(xhr.status, 'Erro ao processar resposta'))
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new ApiError(xhr.status, error.detail || 'Erro no upload'))
        } catch {
          reject(new ApiError(xhr.status, 'Erro no upload'))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new ApiError(0, 'Erro de conexão'))
    })

    xhr.open('POST', `${API_BASE_URL}/images/upload`)
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    }
    xhr.send(formData)
  })
}

/**
 * Upload de múltiplas imagens
 */
export async function uploadMultipleImages(
  files: File[],
  projectId: number,
  imageType: 'drone' | 'satellite' = 'drone',
  onProgress?: (totalProgress: number, fileIndex: number) => void
): Promise<{ uploaded_count: number; error_count: number; errors?: { filename: string; error: string }[] }> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  formData.append('project_id', String(projectId))
  formData.append('image_type', imageType)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100
        onProgress(progress, -1)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new ApiError(xhr.status, 'Erro ao processar resposta'))
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new ApiError(xhr.status, error.detail || 'Erro no upload'))
        } catch {
          reject(new ApiError(xhr.status, 'Erro no upload'))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new ApiError(0, 'Erro de conexão'))
    })

    xhr.open('POST', `${API_BASE_URL}/images/upload-multiple`)
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    }
    xhr.send(formData)
  })
}

/**
 * Obter URL do thumbnail de uma imagem
 */
export function getImageThumbnailUrl(imageId: number): string {
  return `${API_BASE_URL}/images/${imageId}/thumbnail`
}

/**
 * Excluir imagem
 */
export async function deleteImage(id: number): Promise<void> {
  return apiRequest(`/images/${id}`, { method: 'DELETE' })
}

// ============================================
// ANALYSIS - Análises
// ============================================

export interface Analysis {
  id: number
  analysis_type: string
  status: string
  error_message?: string
  results?: Record<string, unknown>
  output_files?: string[]
  processing_time_seconds?: number
  image_id: number
  created_at: string
  completed_at?: string
}

/**
 * Listar análises
 */
export async function getAnalyses(
  imageId?: number,
  projectId?: number,
  analysisType?: string,
  skip = 0,
  limit = 20
): Promise<{ analyses: Analysis[]; total: number }> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (imageId) params.append('image_id', String(imageId))
  if (projectId) params.append('project_id', String(projectId))
  if (analysisType) params.append('analysis_type', analysisType)
  return apiRequest(`/analysis/?${params}`)
}

/**
 * Obter análise por ID
 */
export async function getAnalysis(id: number): Promise<Analysis> {
  return apiRequest(`/analysis/${id}`)
}

/**
 * Executar análise de vegetação em uma imagem
 */
export async function analyzeVegetation(imageId: number, threshold = 0.3): Promise<Analysis> {
  return apiRequest(`/analysis/vegetation/${imageId}?threshold=${threshold}`, { method: 'POST' })
}

/**
 * Executar análise de saúde das plantas
 */
export async function analyzePlantHealth(imageId: number): Promise<Analysis> {
  return apiRequest(`/analysis/plant-health/${imageId}`, { method: 'POST' })
}

/**
 * Executar análise de cores
 */
export async function analyzeColors(imageId: number, bins = 32): Promise<Analysis> {
  return apiRequest(`/analysis/colors/${imageId}?bins=${bins}`, { method: 'POST' })
}

/**
 * Gerar relatório completo
 */
export async function generateReport(imageId: number, threshold = 0.3): Promise<Analysis> {
  return apiRequest(`/analysis/report/${imageId}?threshold=${threshold}`, { method: 'POST' })
}

/**
 * Obter URL do heatmap de vegetação
 */
export function getHeatmapUrl(imageId: number, colormap: 'green' | 'jet' | 'viridis' = 'green'): string {
  return `${API_BASE_URL}/analysis/heatmap/${imageId}?colormap=${colormap}`
}

/**
 * Obter URL da máscara de vegetação
 */
export function getVegetationMaskUrl(imageId: number, threshold = 0.3): string {
  return `${API_BASE_URL}/analysis/mask/${imageId}?threshold=${threshold}`
}

/**
 * Excluir análise
 */
export async function deleteAnalysis(id: number): Promise<void> {
  return apiRequest(`/analysis/${id}`, { method: 'DELETE' })
}

/**
 * Disparar análise em todas as imagens de um projeto
 */
export async function analyzeProject(projectId: number): Promise<{ message: string; analyses_started: number }> {
  return apiRequest(`/projects/${projectId}/analyze`, { method: 'POST' })
}

/**
 * Obter resumo de análises de um projeto
 */
export async function getProjectAnalysisSummary(projectId: number): Promise<{
  total_images: number
  analyzed_images: number
  pending_images: number
  total_area_ha: number
  vegetation_coverage_avg: number
  health_index_avg: number
  healthy_percentage: number
  stressed_percentage: number
  critical_percentage: number
  total_objects_detected: number
  objects_by_class: Record<string, number>
  land_use_summary: Record<string, number>
  segmentation_summary: Record<string, number>
  dominant_vegetation_type: string | null
  status: string
}> {
  return apiRequest(`/projects/${projectId}/analysis-summary`)
}

// ============================================
// ML ANALYSIS - Análises de Machine Learning
// ============================================

export interface Detection {
  class: string
  confidence: number
  bbox: [number, number, number, number]  // x1, y1, x2, y2
  center: [number, number]
  area_pixels: number
}

export interface DetectionResult {
  total_detections: number
  by_class: Record<string, number>
  avg_confidence: number
  detections: Detection[]
}

export interface SegmentationResult {
  class_percentages: Record<string, number>
  category_percentages: Record<string, number>
  num_classes_detected: number
  image_size: [number, number]
}

export interface ClassificationResult {
  land_use_percentages: Record<string, number>
  vegetation_classification: {
    vegetation_type: string
    vegetation_density: string
    confidence: number
  }
  summary: Record<string, unknown>
}

export interface FeatureResult {
  texture: Record<string, unknown>
  colors: Record<string, unknown>
  patterns?: Record<string, unknown>
}

export interface VideoAnalysisResult {
  video_info: {
    filename: string
    width: number
    height: number
    fps: number
    frame_count: number
    duration_seconds: number
  }
  key_frames: Array<{
    index: number
    frame_number: number
    timestamp_seconds: number
    path: string
    vegetation_percentage: number
  }>
  frames_analyzed: number
  temporal_summary: {
    total_frames_analyzed: number
    vegetation: {
      mean_percentage: number
      min_percentage: number
      max_percentage: number
      trend?: string
    }
    health: {
      mean_index: number
    }
    land_use_average: Record<string, number>
  }
  mosaic_path?: string
}

/**
 * Detectar objetos na imagem usando YOLO
 */
export async function detectObjects(imageId: number, confidence = 0.25): Promise<Analysis> {
  return apiRequest(`/analysis/detect/${imageId}?confidence=${confidence}`, { method: 'POST' })
}

/**
 * Classificar uso do solo na imagem
 */
export async function classifyLandUse(imageId: number): Promise<Analysis> {
  return apiRequest(`/analysis/classify/${imageId}`, { method: 'POST' })
}

/**
 * Extrair características visuais da imagem
 */
export async function extractFeatures(imageId: number): Promise<Analysis> {
  return apiRequest(`/analysis/features/${imageId}`, { method: 'POST' })
}

/**
 * Executar análise completa com ML
 */
export async function runFullMLAnalysis(imageId: number): Promise<Analysis> {
  return apiRequest(`/analysis/full/${imageId}`, { method: 'POST' })
}

/**
 * Analisar vídeo completo
 */
export async function analyzeVideo(
  imageId: number,
  sampleRate = 30,
  maxFrames = 50
): Promise<Analysis> {
  return apiRequest(
    `/analysis/video/${imageId}?sample_rate=${sampleRate}&max_frames=${maxFrames}`,
    { method: 'POST' }
  )
}

/**
 * Extrair key frames de um vídeo
 */
export async function extractVideoKeyframes(imageId: number, numFrames = 10): Promise<Analysis> {
  return apiRequest(`/analysis/video/${imageId}/keyframes?num_frames=${numFrames}`, { method: 'POST' })
}

/**
 * Obter URL do mosaico de vídeo
 */
export function getVideoMosaicUrl(imageId: number): string {
  return `${API_BASE_URL}/analysis/video/${imageId}/mosaic`
}

/**
 * Exportar análise como PDF
 */
export async function exportAnalysisPDF(analysisId: number): Promise<Blob> {
  const url = `${API_BASE_URL}/analysis/export/pdf/${analysisId}`
  const response = await fetch(url, {
    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao exportar PDF' }))
    throw new ApiError(response.status, error.detail)
  }

  return response.blob()
}

/**
 * Download do PDF de análise
 */
export async function downloadAnalysisPDF(analysisId: number, filename?: string): Promise<void> {
  const blob = await exportAnalysisPDF(analysisId)

  // Criar link de download
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `relatorio_analise_${analysisId}.pdf`
  document.body.appendChild(a)
  a.click()

  // Limpar
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

// ============================================
// ENRICHED DATA - Dados Enriquecidos
// ============================================

// ============================================
// ENRICHED DATA - Typed Interfaces
// ============================================

export interface WeatherCurrent {
  temperature_c: number
  relative_humidity_pct: number
  precipitation_mm: number
  wind_speed_kmh: number
  weather_description?: string
}

export interface WeatherData {
  current?: WeatherCurrent
  error?: string
}

export interface SoilPropertyValue {
  label?: string
  unit?: string
  depths?: Record<string, number>
}

export interface SoilData {
  properties?: Record<string, SoilPropertyValue>
  interpretation?: Record<string, string> | string
  error?: string
}

export interface TerrainClassification {
  category?: string
  description?: string
}

export interface ElevationData {
  elevation_m?: number
  terrain_classification?: TerrainClassification
  error?: string
}

export interface GeocodingAddress {
  city?: string
  state?: string
  country?: string
}

export interface GeocodingData {
  display_name?: string
  address?: GeocodingAddress
  error?: string
}

export interface EnrichedData {
  project_id: number
  cached: boolean
  cached_at?: string
  coordinates?: { latitude: number; longitude: number }
  weather?: WeatherData
  soil?: SoilData
  elevation?: ElevationData
  geocoding?: GeocodingData
}

/**
 * Obter dados enriquecidos de um projeto (clima, solo, elevação, endereço)
 */
export async function getProjectEnrichedData(projectId: number): Promise<EnrichedData> {
  return apiRequest(`/projects/${projectId}/enriched-data`)
}

/**
 * Obter todas as análises completas de um projeto
 */
export async function getProjectAnalyses(
  projectId: number,
  skip = 0,
  limit = 100
): Promise<{ analyses: Analysis[]; total: number }> {
  const params = new URLSearchParams({
    project_id: String(projectId),
    skip: String(skip),
    limit: String(limit),
  })
  return apiRequest(`/analysis/?${params}`)
}

// ============================================
// Utilitários
// ============================================

/**
 * Verificar se a API está online
 */
export async function healthCheck(): Promise<{ status: string }> {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/`)
    return response.json()
  } catch {
    throw new ApiError(0, 'API não está respondendo')
  }
}

/**
 * Obter informações da API
 */
export async function getApiInfo(): Promise<{ message: string; version: string; docs: string }> {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/`)
    return response.json()
  } catch {
    throw new ApiError(0, 'API não está respondendo')
  }
}

export { ApiError }
