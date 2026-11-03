<script setup>
import { ref, computed, inject, watch, nextTick } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { chatStream, aiErrorMessage } from '@/services/ai'
import { renderMarkdownLite } from '@/utils/markdown'
import AiSheetHeader from './AiSheetHeader.vue'
import { ArrowUp, Square, RotateCcw, MessageCircle } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean,
  initialPrompt: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const activities = useActivitiesStore()
const trip = inject('trip')

const messages = ref([]) // { role: 'user' | 'assistant', text, error? }
const input = ref('')
const streaming = ref(false)
const scroller = ref(null)
const inputEl = ref(null)
let abort = null

const SUGGESTIONS = [
  "Qu'est-ce qu'il me reste à réserver ?",
  'Quels jours sont encore vides ?',
  'Fais-moi un résumé du voyage',
  'Comment tenir le budget ?'
]

const canSend = computed(() => input.value.trim() && !streaming.value)

watch(() => props.modelValue, (open) => {
  if (!open) { abort?.abort(); return }
  if (props.initialPrompt) send(props.initialPrompt)
  else nextTick(() => inputEl.value?.focus())
})

function scrollToBottom() {
  nextTick(() => { if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight })
}

async function send(text = input.value) {
  const q = text.trim()
  if (!q || streaming.value) return
  input.value = ''
  // Drop a failed answer before retrying so roles keep alternating
  if (messages.value.at(-1)?.error) messages.value.splice(-2, 2)
  messages.value.push({ role: 'user', text: q })
  messages.value.push({ role: 'assistant', text: '' })
  const reply = messages.value[messages.value.length - 1] // reactive proxy: mutations re-render
  streaming.value = true
  abort = new AbortController()
  scrollToBottom()
  try {
    await chatStream({
      trip: trip.value,
      items: activities.all,
      history: messages.value.slice(0, -1).filter(m => !m.error),
      signal: abort.signal,
      onText: (t) => { reply.text += t; scrollToBottom() }
    })
  } catch (e) {
    const msg = aiErrorMessage(e)
    if (msg) { reply.error = msg }
    else if (!reply.text) messages.value.splice(-2, 2) // cancelled before any text
  } finally {
    streaming.value = false
    abort = null
    scrollToBottom()
  }
}

function retry() {
  const lastUser = [...messages.value].reverse().find(m => m.role === 'user')
  if (lastUser) send(lastUser.text)
}
function stop() { abort?.abort() }
function reset() { stop(); messages.value = [] }
function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() }
}
function close() { emit('update:modelValue', false) }
</script>

<template>
  <van-popup
    :show="modelValue"
    position="bottom"
    round
    teleport="body"
    :style="{ height: 'var(--vc-sheet-h)', background: 'var(--vc-surface-elevated)' }"
    @update:show="emit('update:modelValue', $event)"
  >
    <div class="h-full flex flex-col">
      <AiSheetHeader title="Copilote" :subtitle="trip?.name || 'Claude Haiku'" @close="close">
        <template #actions>
          <button v-if="messages.length" type="button" class="t-body text-tint active:opacity-40" aria-label="Nouvelle conversation" @click="reset">
            <RotateCcw class="w-5 h-5" :stroke-width="2.2" />
          </button>
        </template>
      </AiSheetHeader>

      <div ref="scroller" class="flex-1 overflow-y-auto px-3 py-3 space-y-1.5" aria-live="polite">
        <div v-if="!messages.length" class="pt-8 px-4 text-center">
          <div class="inline-flex w-16 h-16 rounded-[18px] items-center justify-center text-white" style="background: var(--vc-ai)">
            <MessageCircle class="w-8 h-8" :stroke-width="1.8" />
          </div>
          <p class="t-title3 mt-4">Pose une question sur ton voyage</p>
          <p class="t-subhead text-muted mt-1 max-w-xs mx-auto">Le copilote voit tes hôtels, restos, activités, dates et budget.</p>
          <div class="list !mx-0 mt-6 text-left">
            <button v-for="s in SUGGESTIONS" :key="s" type="button" class="row t-body text-tint" @click="send(s)">{{ s }}</button>
          </div>
        </div>

        <template v-for="(m, i) in messages" :key="i">
          <div v-if="m.role === 'user'" class="flex justify-end pl-12">
            <p class="bubble bubble-me whitespace-pre-line">{{ m.text }}</p>
          </div>
          <div v-else class="flex justify-start pr-8">
            <div class="bubble bubble-them">
              <div v-if="m.text" class="md" v-html="renderMarkdownLite(m.text)" />
              <div v-else-if="!m.error" class="flex gap-1 py-1.5 px-0.5" aria-label="L'IA réfléchit">
                <span v-for="d in 3" :key="d" class="typing-dot" :style="{ animationDelay: `${d * 0.18}s` }" />
              </div>
              <div v-if="m.error" class="t-subhead" style="color: var(--vc-red)">
                {{ m.error }}
                <button type="button" class="block mt-1 font-semibold text-tint" @click="retry">Réessayer</button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <form class="flex-shrink-0 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] material hairline-t" @submit.prevent="send()">
        <div class="composer flex items-end gap-1.5 rounded-[20px] pl-3.5 pr-1 py-1" :class="{ 'ai-glow': streaming }">
          <textarea
            ref="inputEl"
            v-model="input"
            rows="1"
            placeholder="Demande au copilote"
            enterkeyhint="send"
            class="flex-1 bg-transparent outline-none resize-none text-[17px] leading-[22px] py-[5px] max-h-28"
            aria-label="Message au copilote"
            @keydown="onKeydown"
            @input="e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }"
          />
          <button v-if="streaming" type="button" class="w-[30px] h-[30px] mb-px rounded-full flex items-center justify-center flex-shrink-0" style="background: var(--vc-primary); color: #fff" aria-label="Arrêter" @click="stop">
            <Square class="w-3 h-3" fill="currentColor" :stroke-width="0" />
          </button>
          <button v-else type="submit" class="w-[30px] h-[30px] mb-px rounded-full flex items-center justify-center flex-shrink-0 transition text-white disabled:opacity-30" style="background: var(--vc-primary)" :disabled="!canSend" aria-label="Envoyer">
            <ArrowUp class="w-[18px] h-[18px]" :stroke-width="3" />
          </button>
        </div>
      </form>
    </div>
  </van-popup>
</template>

<style scoped>
/* iMessage-like bubbles */
.bubble { padding: 7px 12px; border-radius: 18px; font-size: 17px; line-height: 22px; max-width: 100%; overflow-wrap: anywhere; }
.bubble-me { background: var(--vc-primary); color: #fff; border-bottom-right-radius: 6px; }
.bubble-them { background: var(--vc-bubble); color: var(--vc-text); border-bottom-left-radius: 6px; }
.composer { background: var(--vc-surface); box-shadow: inset 0 0 0 0.5px var(--vc-border); }
.md :deep(p) { margin: 0 0 0.45em; }
.md :deep(p:last-child) { margin-bottom: 0; }
.md :deep(ul), .md :deep(ol) { margin: 0.2em 0 0.5em; padding-left: 1.15em; }
.md :deep(ul) { list-style: disc; }
.md :deep(ol) { list-style: decimal; }
.md :deep(li) { margin: 0.1em 0; }
.md :deep(strong) { font-weight: 600; }
.typing-dot {
  @apply w-2 h-2 rounded-full;
  background: var(--vc-gray);
  animation: blink 1.2s infinite ease-in-out;
}
@keyframes blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
</style>
