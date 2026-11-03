// Proxy Claude pour Vacayo : garde la clé Anthropic côté serveur et ne sert
// que les utilisateurs Firebase connectés du projet configuré.
import { createRemoteJWKSet, jwtVerify } from 'jose'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ALLOWED_MODEL = 'claude-haiku-5-5'
const MAX_TOKENS = 16000

// Clés publiques des ID tokens Firebase (mises en cache par jose).
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

function corsHeaders(origin) {
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
}

// Erreur au même format que l'API Anthropic, pour que le SDK la lise normalement.
function errorResponse(status, type, message, headers = {}) {
  return new Response(JSON.stringify({ type: 'error', error: { type, message } }), {
    status,
    headers: { ...headers, 'content-type': 'application/json' }
  })
}

async function verifyFirebaseToken(request, projectId) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  if (!match) throw new Error('Missing bearer token')
  const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId
  })
  if (!payload.sub) throw new Error('Token has no subject')
  return payload
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin')
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
    if (!origin || !allowedOrigins.includes(origin)) {
      return errorResponse(403, 'permission_error', 'Origin not allowed')
    }
    const cors = corsHeaders(origin)

    const { pathname } = new URL(request.url)
    if (pathname !== '/v1/messages') {
      return errorResponse(404, 'not_found_error', 'Not found', cors)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers':
            request.headers.get('access-control-request-headers') || 'authorization, content-type, anthropic-version',
          'Access-Control-Max-Age': '86400'
        }
      })
    }
    if (request.method !== 'POST') {
      return errorResponse(404, 'not_found_error', 'Not found', cors)
    }

    try {
      await verifyFirebaseToken(request, env.FIREBASE_PROJECT_ID)
    } catch {
      return errorResponse(401, 'authentication_error', 'Invalid or missing Firebase ID token', cors)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'invalid_request_error', 'Body must be valid JSON', cors)
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse(400, 'invalid_request_error', 'Body must be a JSON object', cors)
    }
    if (body.model !== ALLOWED_MODEL) {
      return errorResponse(400, 'invalid_request_error', `Only ${ALLOWED_MODEL} is allowed`, cors)
    }
    if (typeof body.max_tokens === 'number') {
      body.max_tokens = Math.min(body.max_tokens, MAX_TOKENS)
    }

    if (!env.ANTHROPIC_API_KEY) {
      return errorResponse(500, 'api_error', 'Proxy is missing its API key', cors)
    }

    let upstream
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01'
        },
        body: JSON.stringify(body)
      })
    } catch {
      return errorResponse(502, 'api_error', 'Could not reach the Anthropic API', cors)
    }

    // Le corps est renvoyé tel quel en flux : le SSE (stream: true) passe sans être bufferisé.
    // retry-after & co. let the SDK time its retries; they must be exposed for CORS.
    const passThrough = ['content-type', 'request-id', 'retry-after', 'x-should-retry']
    const headers = { ...cors, 'Access-Control-Expose-Headers': 'request-id, retry-after, x-should-retry' }
    for (const name of passThrough) {
      const value = upstream.headers.get(name)
      if (value) headers[name] = value
    }
    return new Response(upstream.body, { status: upstream.status, headers })
  }
}
