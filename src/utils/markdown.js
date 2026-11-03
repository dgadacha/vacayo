// Tiny markdown subset for AI answers: **bold**, *italic*, bullet / numbered
// lists and paragraphs. Input is HTML-escaped first, so the output is safe for v-html.

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
}

export function renderMarkdownLite(text = '') {
  const lines = escapeHtml(text).split('\n')
  const out = []
  let list = null
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^#{1,4}\s+(.*)$/)
    if (bullet || numbered) {
      const tag = bullet ? 'ul' : 'ol'
      if (list !== tag) { closeList(); out.push(`<${tag}>`); list = tag }
      out.push(`<li>${inline((bullet || numbered)[1])}</li>`)
    } else if (heading) {
      closeList()
      out.push(`<p><strong>${inline(heading[1])}</strong></p>`)
    } else if (!line.trim()) {
      closeList()
    } else {
      closeList()
      out.push(`<p>${inline(line)}</p>`)
    }
  }
  closeList()
  return out.join('')
}
