/**
 * Unit tests for @/lib/api
 *
 * Covers: auth flow, error handling, CRUD operations, URL builders,
 * localStorage integration, and edge-cases (204, 422, network failure).
 */

import {
  API_BASE_URL,
  setAuthToken,
  loadAuthToken,
  logout,
  login,
  register,
  getCurrentUser,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getImages,
  analyzeVegetation,
  healthCheck,
  getDashboardStats,
  getImageThumbnailUrl,
  getHeatmapUrl,
  ApiError,
  analyzeNDVI,
  analyzePlantCount,
  detectPestDisease,
  estimateBiomass,
  analyzeProject,
  deleteAnalysis,
  analyzeROI,
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotationApi,
  saveImagePerimeter,
  getProjectAlerts,
  getProjectTimeline,
  getDashboardStats as getDashboard,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal fetch Response mock. */
function mockResponse(
  data: unknown,
  status = 200,
  ok?: boolean,
): Response {
  const resolved = ok !== undefined ? ok : status >= 200 && status < 300
  return {
    ok: resolved,
    status,
    json: jest.fn().mockResolvedValue(data),
    blob: jest.fn().mockResolvedValue(new Blob()),
  } as unknown as Response
}

/** Shorthand for a successful (200 OK) response. */
function okResponse(data: unknown): Response {
  return mockResponse(data, 200, true)
}

/** Shorthand for an empty 204 No Content response. */
function noContentResponse(): Response {
  return mockResponse(null, 204, true)
}

/** Shorthand for a failed response. */
function errorResponse(status: number, detail: unknown): Response {
  return mockResponse({ detail }, status, false)
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BACKEND_USER = {
  id: 1,
  email: 'user@example.com',
  username: 'user_abc',
  full_name: 'Test User',
  phone: null,
  bio: null,
  company: null,
  language: null,
  theme: null,
  email_notifications: null,
  push_notifications: null,
  weekly_report: null,
  is_active: true,
  plan: 'free',
  created_at: '2026-01-01T00:00:00Z',
}

const FRONTEND_USER = {
  id: 1,
  email: 'user@example.com',
  name: 'Test User',
  phone: null,
  bio: null,
  company: null,
  language: null,
  theme: null,
  email_notifications: null,
  push_notifications: null,
  weekly_report: null,
  created_at: '2026-01-01T00:00:00Z',
}

const TOKEN_RESPONSE = {
  access_token: 'tok_abc123',
  token_type: 'bearer',
}

const PROJECT = {
  id: 42,
  name: 'Fazenda Norte',
  description: 'Projeto teste',
  image_count: 3,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

const ANALYSIS = {
  id: 10,
  analysis_type: 'vegetation',
  status: 'completed',
  image_id: 5,
  created_at: '2026-01-01T00:00:00Z',
  results: { vegetation_percentage: 0.72 },
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset all mocks before each test.
  jest.resetAllMocks()

  // Provide a fresh fetch mock.
  global.fetch = jest.fn()

  // Provide a localStorage mock (jsdom already provides one, but we spy on it
  // so we can make assertions and control values precisely).
  const store: Record<string, string> = {}
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null)
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { store[key] = value })
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete store[key] })

  // Ensure token state is cleared between tests by calling logout.
  // We call it after the spy is in place so the removeItem call is captured.
  logout()
})

// ---------------------------------------------------------------------------
// 1. Token management — setAuthToken / loadAuthToken / logout
// ---------------------------------------------------------------------------

describe('setAuthToken', () => {
  it('persists a non-null token to localStorage', () => {
    setAuthToken('my-token')
    expect(localStorage.setItem).toHaveBeenCalledWith('roboroca_token', 'my-token')
  })

  it('removes the key from localStorage when token is null', () => {
    setAuthToken(null)
    expect(localStorage.removeItem).toHaveBeenCalledWith('roboroca_token')
  })
})

describe('loadAuthToken', () => {
  it('reads the stored token from localStorage', () => {
    ;(localStorage.getItem as jest.Mock).mockReturnValueOnce('stored-token')
    const token = loadAuthToken()
    expect(token).toBe('stored-token')
    expect(localStorage.getItem).toHaveBeenCalledWith('roboroca_token')
  })

  it('returns null when no token is stored', () => {
    ;(localStorage.getItem as jest.Mock).mockReturnValueOnce(null)
    const token = loadAuthToken()
    expect(token).toBeNull()
  })
})

describe('logout', () => {
  it('removes the token from localStorage', () => {
    logout()
    expect(localStorage.removeItem).toHaveBeenCalledWith('roboroca_token')
  })
})

// ---------------------------------------------------------------------------
// 2. login()
// ---------------------------------------------------------------------------

describe('login', () => {
  it('calls fetch twice: POST /auth/login then GET /auth/me', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))  // login endpoint
      .mockResolvedValueOnce(okResponse(BACKEND_USER))    // /auth/me

    await login({ email: 'user@example.com', password: 'secret' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [firstCall] = fetchMock.mock.calls
    expect(firstCall[0]).toBe(`${API_BASE_URL}/auth/login`)
    expect(firstCall[1].method).toBe('POST')
  })

  it('sends credentials as form-urlencoded with username field', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(okResponse(BACKEND_USER))

    await login({ email: 'user@example.com', password: 'secret' })

    const body: string = fetchMock.mock.calls[0][1].body.toString()
    expect(body).toContain('username=user%40example.com')
    expect(body).toContain('password=secret')
  })

  it('stores the access_token in localStorage after successful login', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(okResponse(BACKEND_USER))

    await login({ email: 'user@example.com', password: 'secret' })

    expect(localStorage.setItem).toHaveBeenCalledWith('roboroca_token', 'tok_abc123')
  })

  it('returns an AuthResponse with a converted User object', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(okResponse(BACKEND_USER))

    const result = await login({ email: 'user@example.com', password: 'secret' })

    expect(result.access_token).toBe('tok_abc123')
    expect(result.token_type).toBe('bearer')
    expect(result.user).toMatchObject(FRONTEND_USER)
  })

  it('converts full_name → name on the returned User', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(okResponse({ ...BACKEND_USER, full_name: 'Ana Lima', username: 'ana_x' }))

    const result = await login({ email: 'user@example.com', password: 'secret' })
    expect(result.user.name).toBe('Ana Lima')
  })

  it('falls back to username when full_name is null', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(okResponse({ ...BACKEND_USER, full_name: null, username: 'user_xyz' }))

    const result = await login({ email: 'user@example.com', password: 'secret' })
    expect(result.user.name).toBe('user_xyz')
  })

  it('throws ApiError on failed login (401)', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'Credenciais inválidas'))

    await expect(login({ email: 'bad@user.com', password: 'wrong' })).rejects.toThrow(ApiError)
  })

  it('sets Authorization header on the /auth/me request after login', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(okResponse(BACKEND_USER))

    await login({ email: 'user@example.com', password: 'secret' })

    // Second call is apiRequest('/auth/me') which uses getHeaders()
    const meCallHeaders = fetchMock.mock.calls[1][1].headers
    expect(meCallHeaders['Authorization']).toBe('Bearer tok_abc123')
  })
})

// ---------------------------------------------------------------------------
// 3. register()
// ---------------------------------------------------------------------------

describe('register', () => {
  it('calls /auth/register then falls through to login (3 total fetch calls)', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(BACKEND_USER))   // POST /auth/register
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE)) // POST /auth/login
      .mockResolvedValueOnce(okResponse(BACKEND_USER))   // GET  /auth/me

    await register({ name: 'Test User', email: 'user@example.com', password: 'pass' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const registerUrl: string = fetchMock.mock.calls[0][0]
    expect(registerUrl).toContain('/auth/register')
  })

  it('sends full_name and email in the register body', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(okResponse(BACKEND_USER))
      .mockResolvedValueOnce(okResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(okResponse(BACKEND_USER))

    await register({ name: 'Test User', email: 'user@example.com', password: 'pass123' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.email).toBe('user@example.com')
    expect(body.full_name).toBe('Test User')
    expect(body.password).toBe('pass123')
    // username is generated as email-prefix + random suffix
    expect(body.username).toMatch(/^user_/)
  })
})

// ---------------------------------------------------------------------------
// 4. getCurrentUser()
// ---------------------------------------------------------------------------

describe('getCurrentUser', () => {
  it('GETs /auth/me and converts the backend user', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(BACKEND_USER))
    setAuthToken('test-tok')

    const user = await getCurrentUser()

    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/auth/me')
    expect(user).toMatchObject(FRONTEND_USER)
  })
})

// ---------------------------------------------------------------------------
// 5. Auth token is sent in Authorization header
// ---------------------------------------------------------------------------

describe('Authorization header', () => {
  it('includes Bearer token on authenticated requests', async () => {
    setAuthToken('my-bearer-token')
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({ projects: [], total: 0 }))

    await getProjects()

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers
    expect(headers['Authorization']).toBe('Bearer my-bearer-token')
  })

  it('omits the Authorization header when no token is set', async () => {
    // logout() already called in beforeEach, so no token is present.
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({ projects: [], total: 0 }))

    await getProjects()

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers
    expect(headers['Authorization']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 6. Error handling — ApiError
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('is thrown with the correct status and detail on non-ok responses', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse(403, 'Acesso negado'))

    let caught: ApiError | null = null
    try {
      await getProject(99)
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught).toBeInstanceOf(ApiError)
    expect(caught!.status).toBe(403)
    expect(caught!.detail).toBe('Acesso negado')
    expect(caught!.name).toBe('ApiError')
  })

  it('falls back to "Erro na requisição" when detail is absent', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({}, 500, false))

    await expect(getProject(1)).rejects.toMatchObject({
      status: 500,
      detail: 'Erro na requisição',
    })
  })

  it('falls back to "Erro desconhecido" when response body cannot be parsed', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    } as unknown as Response)

    await expect(getProject(1)).rejects.toMatchObject({
      status: 500,
      detail: 'Erro desconhecido',
    })
  })
})

// ---------------------------------------------------------------------------
// 7. 422 Validation error formatting
// ---------------------------------------------------------------------------

describe('422 Pydantic validation error', () => {
  it('joins multiple validation messages with "; "', async () => {
    const pydanticDetail = [
      { msg: 'field required', loc: ['body', 'name'], type: 'missing' },
      { msg: 'value is not a valid email', loc: ['body', 'email'], type: 'value_error' },
    ]
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({ detail: pydanticDetail }, 422, false),
    )

    let caught: ApiError | null = null
    try {
      await createProject({ name: '' })
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught).toBeInstanceOf(ApiError)
    expect(caught!.status).toBe(422)
    expect(caught!.detail).toBe('field required; value is not a valid email')
  })
})

// ---------------------------------------------------------------------------
// 8. 204 No Content returns null
// ---------------------------------------------------------------------------

describe('204 No Content', () => {
  it('returns null for DELETE endpoints that respond with 204', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(noContentResponse())

    const result = await deleteProject(42)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 9. Projects — CRUD
// ---------------------------------------------------------------------------

describe('getProjects', () => {
  it('calls GET /projects/ with default pagination', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ projects: [PROJECT], total: 1 }),
    )

    const result = await getProjects()
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/projects/')
    expect(url).toContain('skip=0')
    expect(url).toContain('limit=20')
    expect(result.projects[0].id).toBe(42)
  })

  it('supports custom skip and limit', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ projects: [], total: 0 }),
    )

    await getProjects(10, 5)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('skip=10')
    expect(url).toContain('limit=5')
  })
})

describe('getProject', () => {
  it('calls GET /projects/{id}', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(PROJECT))

    const result = await getProject(42)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/projects/42')
    expect(result.name).toBe('Fazenda Norte')
  })
})

describe('createProject', () => {
  it('calls POST /projects/ with the provided data as JSON body', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(PROJECT))

    await createProject({ name: 'Novo Projeto', description: 'Desc' })

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/projects/')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toMatchObject({ name: 'Novo Projeto', description: 'Desc' })
  })
})

describe('updateProject', () => {
  it('calls PUT /projects/{id} with partial data', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({ ...PROJECT, name: 'Renamed' }))

    const result = await updateProject(42, { name: 'Renamed' })

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/projects/42')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ name: 'Renamed' })
    expect(result.name).toBe('Renamed')
  })
})

describe('deleteProject', () => {
  it('calls DELETE /projects/{id}', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(noContentResponse())

    await deleteProject(42)

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/projects/42')
    expect(opts.method).toBe('DELETE')
  })
})

// ---------------------------------------------------------------------------
// 10. Images
// ---------------------------------------------------------------------------

describe('getImages', () => {
  it('appends project_id query param when provided', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ images: [], total: 0 }),
    )

    await getImages(7)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/images/')
    expect(url).toContain('project_id=7')
  })

  it('omits project_id when not provided', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ images: [], total: 0 }),
    )

    await getImages()
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).not.toContain('project_id')
  })
})

// ---------------------------------------------------------------------------
// 11. Analysis endpoints
// ---------------------------------------------------------------------------

describe('analyzeVegetation', () => {
  it('calls POST /analysis/vegetation/{id} with default threshold', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ANALYSIS))

    await analyzeVegetation(5)

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/analysis/vegetation/5')
    expect(url).toContain('threshold=0.3')
    expect(opts.method).toBe('POST')
  })

  it('passes a custom threshold', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ANALYSIS))

    await analyzeVegetation(5, 0.6)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('threshold=0.6')
  })
})

describe('analyzeNDVI', () => {
  it('calls POST /analysis/ndvi/{id}', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ANALYSIS))

    await analyzeNDVI(3)
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/analysis/ndvi/3')
    expect(opts.method).toBe('POST')
  })
})

describe('detectPestDisease', () => {
  it('calls POST /analysis/pest-disease/{id}', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ANALYSIS))

    await detectPestDisease(8)
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/analysis/pest-disease/8')
    expect(opts.method).toBe('POST')
  })
})

describe('estimateBiomass', () => {
  it('calls POST /analysis/biomass/{id} with default min_canopy_area', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ANALYSIS))

    await estimateBiomass(9)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/analysis/biomass/9')
    expect(url).toContain('min_canopy_area=50')
  })
})

describe('analyzeProject', () => {
  it('calls POST /projects/{id}/analyze without force by default', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ message: 'ok', analyses_started: 4 }),
    )

    await analyzeProject(42)
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/projects/42/analyze')
    expect(url).not.toContain('force=true')
    expect(opts.method).toBe('POST')
  })

  it('appends ?force=true when force flag is set', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ message: 'ok', analyses_started: 4 }),
    )

    await analyzeProject(42, true)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('force=true')
  })
})

describe('deleteAnalysis', () => {
  it('calls DELETE /analysis/{id} and returns null on 204', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(noContentResponse())

    const result = await deleteAnalysis(10)
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/analysis/10')
    expect(opts.method).toBe('DELETE')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 12. ROI analysis
// ---------------------------------------------------------------------------

describe('analyzeROI', () => {
  it('calls POST /analysis/roi/{id} with roi_polygon and analyses in the body', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ANALYSIS))

    const polygon = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]
    await analyzeROI(5, polygon, ['vegetation', 'health'])

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/analysis/roi/5')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.roi_polygon).toEqual(polygon)
    expect(body.analyses).toEqual(['vegetation', 'health'])
  })
})

// ---------------------------------------------------------------------------
// 13. Annotations
// ---------------------------------------------------------------------------

describe('getAnnotations', () => {
  it('calls GET /annotations/?image_id={id}', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ annotations: [], total: 0 }),
    )

    await getAnnotations(11)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/annotations/')
    expect(url).toContain('image_id=11')
  })
})

describe('createAnnotation', () => {
  it('calls POST /annotations/ with image_id, annotation_type and data', async () => {
    const ann = { id: 1, image_id: 11, annotation_type: 'polygon', data: {}, created_at: '', updated_at: '' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ann))

    await createAnnotation(11, 'polygon', { points: [[0, 0]] })

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/annotations/')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.image_id).toBe(11)
    expect(body.annotation_type).toBe('polygon')
    expect(body.data).toEqual({ points: [[0, 0]] })
  })
})

describe('updateAnnotation', () => {
  it('calls PUT /annotations/{id} with updated data', async () => {
    const ann = { id: 1, image_id: 11, annotation_type: 'polygon', data: {}, created_at: '', updated_at: '' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(ann))

    await updateAnnotation(1, { annotation_type: 'zone' })

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/annotations/1')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ annotation_type: 'zone' })
  })
})

describe('deleteAnnotationApi', () => {
  it('calls DELETE /annotations/{id}', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(noContentResponse())

    await deleteAnnotationApi(1)

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/annotations/1')
    expect(opts.method).toBe('DELETE')
  })
})

// ---------------------------------------------------------------------------
// 14. saveImagePerimeter
// ---------------------------------------------------------------------------

describe('saveImagePerimeter', () => {
  it('calls PUT /images/{id}/perimeter with perimeter_polygon', async () => {
    const polygon = [[0, 0], [1, 0], [1, 1], [0, 1]]
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ image_id: 5, perimeter_polygon: polygon, message: 'ok' }),
    )

    await saveImagePerimeter(5, polygon)

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/images/5/perimeter')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ perimeter_polygon: polygon })
  })
})

// ---------------------------------------------------------------------------
// 15. healthCheck()
// ---------------------------------------------------------------------------

describe('healthCheck', () => {
  it('calls the root endpoint (without /api/v1)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({ status: 'ok' }))

    const result = await healthCheck()

    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).not.toContain('/api/v1')
    expect(url.endsWith('/')).toBe(true)
    expect(result).toEqual({ status: 'ok' })
  })

  it('throws ApiError when fetch rejects (network failure)', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(healthCheck()).rejects.toThrow(ApiError)
  })
})

// ---------------------------------------------------------------------------
// 16. getDashboardStats()
// ---------------------------------------------------------------------------

describe('getDashboardStats', () => {
  it('calls GET /projects/stats and returns stats', async () => {
    const stats = {
      total_projects: 5,
      total_images: 20,
      total_analyses: 80,
      total_area_ha: 340.5,
      projects_by_status: { active: 3, inactive: 2 },
      analyses_by_type: { vegetation: 40, ndvi: 40 },
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(okResponse(stats))

    const result = await getDashboardStats()

    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/projects/stats')
    expect(result.total_projects).toBe(5)
    expect(result.total_area_ha).toBe(340.5)
  })
})

// ---------------------------------------------------------------------------
// 17. URL builders (synchronous, no fetch)
// ---------------------------------------------------------------------------

describe('getImageThumbnailUrl', () => {
  it('returns the correct thumbnail URL for a given image id', () => {
    const url = getImageThumbnailUrl(99)
    expect(url).toBe(`${API_BASE_URL}/images/99/thumbnail`)
  })
})

describe('getHeatmapUrl', () => {
  it('returns URL with default colormap "green"', () => {
    const url = getHeatmapUrl(55)
    expect(url).toBe(`${API_BASE_URL}/analysis/heatmap/55?colormap=green`)
  })

  it('returns URL with a custom colormap', () => {
    const url = getHeatmapUrl(55, 'viridis')
    expect(url).toBe(`${API_BASE_URL}/analysis/heatmap/55?colormap=viridis`)
  })
})

// ---------------------------------------------------------------------------
// 18. Project-level helpers
// ---------------------------------------------------------------------------

describe('getProjectAlerts', () => {
  it('calls GET /projects/{id}/alerts', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ project_id: 42, alerts: [], summary: 'OK' }),
    )

    await getProjectAlerts(42)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/projects/42/alerts')
  })
})

describe('getProjectTimeline', () => {
  it('calls GET /projects/{id}/timeline', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      okResponse({ project_id: 42, timeline: [] }),
    )

    await getProjectTimeline(42)
    const url: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(url).toContain('/projects/42/timeline')
  })
})

// ---------------------------------------------------------------------------
// 19. ApiError class invariants
// ---------------------------------------------------------------------------

describe('ApiError class', () => {
  it('is an instance of Error', () => {
    const err = new ApiError(404, 'Not found')
    expect(err).toBeInstanceOf(Error)
  })

  it('exposes status and detail properties', () => {
    const err = new ApiError(500, 'Server error')
    expect(err.status).toBe(500)
    expect(err.detail).toBe('Server error')
  })

  it('has name "ApiError"', () => {
    const err = new ApiError(400, 'Bad request')
    expect(err.name).toBe('ApiError')
  })

  it('uses detail as the Error message', () => {
    const err = new ApiError(403, 'Forbidden')
    expect(err.message).toBe('Forbidden')
  })
})
