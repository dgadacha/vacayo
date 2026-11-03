// Claude Haiku features. The SDK is loaded on first use so it stays out of the
// main bundle. Two ways to reach the API (see stores/ai.js):
//  - VITE_AI_PROXY_URL: our proxy (ai-proxy/) holds the key, we send the Firebase ID token;
//  - otherwise the user's own key, called straight from the browser.
import { format } from 'date-fns'
import { auth } from './firebase'
import { useAiStore, AI_PROXY_URL, AI_MODEL } from '@/stores/ai'
import { ACTIVITY_TYPES } from '@/utils/constants'
import { formatDayKey, expandHotelDates, formatTime } from '@/utils/helpers'

export { AI_MODEL }

export class AiSetupError extends Error {}
export class AiRefusalError extends Error {
  constructor() { super("L'IA a refusé de répondre à cette demande.") }
}

let sdk = null
async function loadSdk() {
  if (!sdk) {
    const [core, helpers] = await Promise.all([
      import('@anthropic-ai/sdk'),
      import('@anthropic-ai/sdk/helpers/json-schema')
    ])
    sdk = { Anthropic: core.default, jsonSchemaOutputFormat: helpers.jsonSchemaOutputFormat }
  }
  return sdk
}

async function getClient() {
  const { Anthropic } = await loadSdk()
  if (AI_PROXY_URL) {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new AiSetupError("Connecte-toi pour utiliser l'IA.")
    const baseURL = new URL(AI_PROXY_URL, window.location.origin).href.replace(/\/$/, '')
    return new Anthropic({ baseURL, authToken: token, dangerouslyAllowBrowser: true, maxRetries: 1 })
  }
  const key = useAiStore().apiKey
  if (!key) throw new AiSetupError("Ajoute ta clé API Anthropic dans les réglages IA.")
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1 })
}

// French, user-facing message for any error thrown by the functions below.
// Returns '' for a user-cancelled request (nothing to show).
export function aiErrorMessage(e) {
  if (e instanceof AiSetupError || e instanceof AiRefusalError) return e.message
  const A = sdk?.Anthropic
  if (A) {
    if (e instanceof A.APIUserAbortError) return ''
    if (e instanceof A.AuthenticationError) {
      return AI_PROXY_URL ? 'Session expirée, reconnecte-toi.' : 'Clé API refusée — vérifie-la dans les réglages IA.'
    }
    if (e instanceof A.PermissionDeniedError) return "Accès à l'IA refusé."
    if (e instanceof A.RateLimitError) return 'Trop de demandes, réessaie dans un instant.'
    if (e instanceof A.BadRequestError) return `Demande refusée : ${e.error?.error?.message || e.message}`
    if (e instanceof A.APIConnectionError) return "Impossible de joindre le service IA. Vérifie ta connexion."
    if (e instanceof A.APIError && (e.status ?? 0) >= 500) return 'Le service IA est surchargé, réessaie.'
  }
  if (e?.name === 'AbortError') return ''
  return e?.message || 'Erreur inattendue'
}

// ---------------------------------------------------------------- context

const SYSTEM_BASE = `Tu es le copilote voyage de Vacayo, une app où des amis planifient un voyage ensemble (hôtels, restaurants, activités, planning jour par jour).
Tu réponds toujours en français, en tutoyant, de façon concrète et concise.
Tu ne proposes que des lieux réels et connus que tu es sûr d'identifier ; si tu as un doute sur un lieu, préfère une valeur sûre.
Les prix sont des estimations par personne dans la devise du voyage ; mets 0 si c'est gratuit ou inconnu.`

function itemLine(a, symbol) {
  const t = ACTIVITY_TYPES[a.type]?.label || 'Activité'
  let when = 'non planifié'
  if (a.type === 'hotel' && a.date) when = `du ${a.date} au ${a.endDate || '?'}`
  else if (a.date) when = a.date.replace('T', ' ')
  const flags = [a.isBooked ? 'réservé' : 'pas réservé', a.isDone ? 'fait' : ''].filter(Boolean).join(', ')
  const notes = (a.notes || '').replace(/\s+/g, ' ').slice(0, 160)
  return `- [${a.id}] ${t} · ${a.name} · ${a.city || 'ville ?'} · ${a.category || '-'} · ${when} · ${Number(a.price) || 0} ${symbol} · priorité ${a.priority || 'normal'} · ${flags}${notes ? ` · notes: ${notes}` : ''}`
}

export function buildTripContext(trip, items = []) {
  const symbol = trip?.currencySymbol || '€'
  // Chronological, wishlist last: easier for the model to reason day by day
  items = [...items].sort((a, b) => (a.date || '~').localeCompare(b.date || '~') || (a.name || '').localeCompare(b.name || ''))
  const lines = [
    `Date du jour : ${format(new Date(), 'yyyy-MM-dd')}`,
    `Voyage : ${trip?.name || 'Sans nom'}`,
    `Destination : ${[trip?.destination, trip?.country].filter(Boolean).join(', ') || 'non précisée'}`,
    `Dates : ${trip?.startDate ? `du ${trip.startDate} au ${trip.endDate || '?'}` : 'non définies'}`,
    `Devise : ${trip?.currency || 'EUR'} (${symbol})${Number(trip?.budget) ? ` · budget total ${trip.budget} ${symbol}` : ''}`,
    '',
    `Éléments du voyage (${items.length}) :`,
    ...(items.length ? items.map(a => itemLine(a, symbol)) : ['(aucun pour l’instant)'])
  ]
  return lines.join('\n')
}

// Where we sleep each night: { 'yyyy-MM-dd': 'Kyoto' }
function nightsByDay(items) {
  const map = {}
  items.filter(a => a.type === 'hotel').forEach(h => {
    expandHotelDates(h).forEach(d => { map[formatDayKey(d)] = h.city || h.name })
  })
  return map
}

// ---------------------------------------------------------------- core calls

async function generateJson({ system, prompt, schema, effort = 'low', maxTokens = 8000, signal }) {
  const client = await getClient()
  const { jsonSchemaOutputFormat } = sdk
  const res = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system,
    output_config: { effort, format: jsonSchemaOutputFormat(schema) },
    messages: [{ role: 'user', content: prompt }]
  }, { signal })
  if (res.stop_reason === 'refusal') throw new AiRefusalError()
  if (res.stop_reason === 'max_tokens') throw new Error('Réponse trop longue — essaie avec une demande plus courte.')
  if (!res.parsed_output) throw new Error("Réponse de l'IA illisible, réessaie.")
  return res.parsed_output
}

/**
 * Streams a chat answer. `history` is [{ role, text }] (oldest first, ending with
 * the new user message). Only text goes back to the API: the trip context is
 * rebuilt every turn, so replaying earlier thinking blocks would be invalid.
 */
export async function chatStream({ trip, items, history, onText, signal }) {
  const client = await getClient()
  const system = [
    { type: 'text', text: `${SYSTEM_BASE}\nTu aides à organiser ce voyage : réponds à partir des données ci-dessous, signale ce qui manque (réservations, jours vides, budget), et reste bref (listes courtes, pas de long préambule). Utilise **gras** et des listes à puces simples si utile.` },
    { type: 'text', text: buildTripContext(trip, items) }
  ]
  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 8000,
    cache_control: { type: 'ephemeral' },
    output_config: { effort: 'medium' },
    system,
    messages: history.map(m => ({ role: m.role, content: m.text }))
  }, { signal })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText(event.delta.text)
  }
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') throw new AiRefusalError()
  return final
}

// ---------------------------------------------------------------- features

const TYPE_ENUM = { type: 'string', enum: ['hotel', 'restaurant', 'activity'] }
const PRIORITY_ENUM = { type: 'string', enum: ['must-do', 'high', 'normal'] }

/** Ideas of places to add, avoiding what is already planned. */
export async function suggestIdeas({ trip, items, type, wish = '', count = 6, signal }) {
  const label = ACTIVITY_TYPES[type]?.plural?.toLowerCase() || 'activités'
  const stays = [...new Set(items.filter(a => a.type === 'hotel' && a.city).map(a => a.city))]
  const out = await generateJson({
    signal,
    system: `${SYSTEM_BASE}\n\n${buildTripContext(trip, items)}`,
    prompt: [
      `Propose ${count} ${label} à ajouter à ce voyage (type "${type}").`,
      wish ? `Envie exprimée : « ${wish} ».` : '',
      stays.length ? `Répartis-les entre les villes où on dort : ${stays.join(', ')}.` : '',
      'Ne propose rien qui soit déjà dans la liste. Varie les styles et les budgets.',
      '"why" : une phrase qui explique pourquoi ça vaut le coup. "tip" : un conseil pratique court (horaires, réservation, astuce).'
    ].filter(Boolean).join('\n'),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['suggestions'],
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'type', 'city', 'category', 'price', 'priority', 'why', 'tip'],
            properties: {
              name: { type: 'string' },
              type: TYPE_ENUM,
              city: { type: 'string', description: 'Ville (et quartier si utile, format "Ville - Quartier")' },
              category: { type: 'string', description: 'Catégorie courte : Ramen, Musée, Temple…' },
              price: { type: 'number', description: 'Prix estimé par personne, devise du voyage' },
              priority: PRIORITY_ENUM,
              why: { type: 'string' },
              tip: { type: 'string' }
            }
          }
        }
      }
    }
  })
  return out.suggestions.map(s => ({ ...s, type: s.type || type }))
}

/** Turns pasted free text (booking e-mail, list, blog notes) into items. */
export async function extractFromText({ trip, items, text, signal }) {
  const out = await generateJson({
    signal,
    system: `${SYSTEM_BASE}\n\n${buildTripContext(trip, items)}`,
    prompt: [
      "Extrais du texte ci-dessous tous les hôtels, restaurants et activités qu'il mentionne, pour les ajouter au voyage.",
      '- Hôtel : "date" = arrivée, "endDate" = départ.',
      '- Dates au format YYYY-MM-DD, heures au format HH:mm, chaîne vide si absent. Si l’année manque, déduis-la des dates du voyage.',
      '- "isBooked" = true seulement si le texte confirme une réservation.',
      '- "notes" : numéro de réservation, adresse, infos pratiques trouvées dans le texte (sinon vide).',
      '- Montants : garde le montant total indiqué ; s’il est dans une autre devise que celle du voyage, mets 0 et indique le montant d’origine dans les notes.',
      "- N'invente rien qui n'est pas dans le texte, à part la catégorie et la ville si elles sont évidentes.",
      '',
      '<texte>',
      text.slice(0, 20000),
      '</texte>'
    ].join('\n'),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'name', 'city', 'category', 'date', 'time', 'endDate', 'endTime', 'price', 'isBooked', 'notes', 'bookingUrl'],
            properties: {
              type: TYPE_ENUM,
              name: { type: 'string' },
              city: { type: 'string' },
              category: { type: 'string' },
              date: { type: 'string', description: 'YYYY-MM-DD ou vide' },
              time: { type: 'string', description: 'HH:mm ou vide' },
              endDate: { type: 'string', description: 'YYYY-MM-DD ou vide (hôtels)' },
              endTime: { type: 'string', description: 'HH:mm ou vide (hôtels)' },
              price: { type: 'number' },
              isBooked: { type: 'boolean' },
              notes: { type: 'string' },
              bookingUrl: { type: 'string', description: 'URL trouvée dans le texte ou vide' }
            }
          }
        }
      }
    }
  })
  const day = /^\d{4}-\d{2}-\d{2}$/
  const hour = /^\d{2}:\d{2}$/
  return out.items.map(i => ({
    type: i.type,
    name: i.name,
    city: i.city,
    category: i.category,
    price: Math.max(0, Number(i.price) || 0),
    isBooked: !!i.isBooked,
    notes: i.notes,
    bookingUrl: /^https?:\/\//.test(i.bookingUrl) ? i.bookingUrl : '',
    date: day.test(i.date) ? `${i.date}T${hour.test(i.time) ? i.time : (i.type === 'hotel' ? '15:00' : '10:00')}` : '',
    endDate: i.type === 'hotel' && day.test(i.endDate) ? `${i.endDate}T${hour.test(i.endTime) ? i.endTime : '11:00'}` : ''
  }))
}

/** Spreads the unscheduled items over the trip days. Returns a proposal; nothing is saved. */
export async function planWishlist({ trip, items, signal }) {
  const wishlist = items.filter(a => a.type !== 'hotel' && !a.date)
  if (!wishlist.length) return { summary: 'Tout est déjà planifié.', assignments: [], unplaced: [] }
  const nights = nightsByDay(items)
  const busy = {}
  items.filter(a => a.type !== 'hotel' && a.date).forEach(a => {
    const k = formatDayKey(a.date)
    ;(busy[k] ||= []).push(`${formatTime(a.date) || '?'} ${a.name}`)
  })
  const days = Object.keys({ ...nights, ...busy }).sort()
  const dayLines = days.map(d => `- ${d} : nuit à ${nights[d] || '?'} · déjà prévu : ${(busy[d] || []).join(', ') || 'rien'}`)

  const out = await generateJson({
    signal,
    effort: 'medium',
    maxTokens: 16000,
    system: `${SYSTEM_BASE}\n\n${buildTripContext(trip, items)}`,
    prompt: [
      'Répartis les éléments NON PLANIFIÉS ci-dessous sur les jours du voyage.',
      `Jours du voyage : ${trip?.startDate && trip?.endDate ? `du ${trip.startDate} au ${trip.endDate}` : 'ceux listés ci-dessous'}.`,
      'Règles :',
      '- place chaque élément un jour où l’on dort dans la même ville (ou une ville proche) ;',
      '- restaurants vers 12:30 ou 19:30, activités en journée, sans chevaucher ce qui est déjà prévu ;',
      '- 3 ou 4 éléments maximum par jour, les priorités "must-do" en premier ;',
      '- si un élément ne peut pas être placé raisonnablement, mets-le dans "unplaced" avec la raison.',
      '"why" : une phrase courte. "summary" : 1 ou 2 phrases sur la logique d’ensemble.',
      '',
      'Jours :',
      ...dayLines,
      '',
      'Éléments non planifiés (id entre crochets) :',
      ...wishlist.map(a => itemLine(a, trip?.currencySymbol || '€'))
    ].join('\n'),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'assignments', 'unplaced'],
      properties: {
        summary: { type: 'string' },
        assignments: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'date', 'time', 'why'],
            properties: {
              id: { type: 'string' },
              date: { type: 'string', description: 'YYYY-MM-DD' },
              time: { type: 'string', description: 'HH:mm' },
              why: { type: 'string' }
            }
          }
        },
        unplaced: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'why'],
            properties: { id: { type: 'string' }, why: { type: 'string' } }
          }
        }
      }
    }
  })

  // Keep only what we can apply safely: known wishlist ids, valid day inside the trip.
  const byId = new Map(wishlist.map(a => [a.id, a]))
  const inTrip = d => (!trip?.startDate || d >= trip.startDate) && (!trip?.endDate || d <= trip.endDate)
  const seen = new Set()
  const assignments = out.assignments
    .filter(x => byId.has(x.id) && !seen.has(x.id) && seen.add(x.id))
    .filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && inTrip(x.date))
    .map(x => ({ ...x, time: /^\d{2}:\d{2}$/.test(x.time) ? x.time : '10:00', item: byId.get(x.id) }))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const unplaced = out.unplaced.filter(x => byId.has(x.id) && !seen.has(x.id)).map(x => ({ ...x, item: byId.get(x.id) }))
  return { summary: out.summary, assignments, unplaced }
}

/** Fills the blanks of an item being edited (category, price, tips…). */
export async function enrichDraft({ trip, draft, signal }) {
  return generateJson({
    signal,
    system: SYSTEM_BASE,
    prompt: [
      `Voyage : ${[trip?.destination, trip?.country].filter(Boolean).join(', ') || 'destination inconnue'} · devise ${trip?.currency || 'EUR'} (${trip?.currencySymbol || '€'}).`,
      `Élément (${ACTIVITY_TYPES[draft.type]?.label || 'Activité'}) : « ${draft.name} »${draft.city ? ` à ${draft.city}` : ''}${draft.category ? ` (${draft.category})` : ''}.`,
      'Complète la fiche : ville (format "Ville - Quartier" si pertinent), catégorie courte, prix estimé par personne, priorité, et "notes" = 2 ou 3 conseils pratiques sur des lignes séparées commençant par "• " (horaires, réservation, astuce, quoi commander/voir).',
      "Si tu ne connais pas ce lieu, laisse ville et catégorie vides, prix 0, et dis-le en une phrase dans notes."
    ].join('\n'),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['city', 'category', 'price', 'priority', 'notes'],
      properties: {
        city: { type: 'string' },
        category: { type: 'string' },
        price: { type: 'number' },
        priority: PRIORITY_ENUM,
        notes: { type: 'string' }
      }
    }
  })
}

export function mapsSearchUrl(name, city) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, city].filter(Boolean).join(' '))}`
}
