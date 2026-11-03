// Vercel Function servie sur /api/v1/messages (et /v1/messages via vercel.json).
import { handleRequest } from '../../proxy.js'

export default {
  fetch(request) {
    return handleRequest(request, process.env)
  }
}
