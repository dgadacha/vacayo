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
    :style="{ height: '88vh' }"
    @update:show="emit('update:modelValue', $event)"
  >
    <div class="h-full flex flex-col">
      <AiSheetHeader title="Copilote" :subtitle="trip?.name ? `Connaît tout « ${trip.name} »` : 'Claude Haiku'" @close="close">
        <template #actions>
          <button v-if="messages.length" type="button" class="btn-icon" aria-label="Nouvelle conversation" @click="reset">
            <RotateCcw class="w-[18px] h-[18px]" :stroke-width="2" />
          </button>
        </template>
      </AiSheetHeader>

      <div ref="scroller" class="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
        <div v-if="!messages.length" class="pt-6 text-center">
          <div class="inline-flex w-14 h-14 rounded-2xl items-center justify-center" style="background: var(--vc-primary-soft); color: var(--vc-primary)">
            <MessageCircle class="w-7 h-7" :stroke-width="1.75" />
          </div>
          <p class="mt-3 font-semibold">Pose-moi une question sur ton voyage</p>
          <p class="text-sm text-muted mt-1 max-w-xs mx-auto">Je vois tes hôtels, restos, activités, dates et budget.</p>
          <div class="mt-5 flex flex-col gap-2 max-w-sm mx-auto">
            <button v-for="s in SUGGESTIONS" :key="s" type="button" class="text-left text-sm px-4 py-2.5 rounded-2xl surface-2 active:scale-[0.99] transition" @click="send(s)">{{ s }}</button>
          </div>
        </div>

        <template v-for="(m, i) in messages" :key="i">
          <div v-if="m.role === 'user'" class="flex justify-end">
            <p class="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-[14px] whitespace-pre-line text-white" style="background: var(--vc-primary)">{{ m.text }}</p>
          </div>
          <div v-else class="flex justify-start">
            <div class="max-w-[92%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[14px] leading-relaxed surface-2">
              <div v-if="m.text" class="md" v-html="renderMarkdownLite(m.text)" />
              <div v-else-if="!m.error" class="flex gap-1 py-1.5" aria-label="L'IA réfléchit">
                <span v-for="d in 3" :key="d" class="typing-dot" :style="{ animationDelay: `${d * 0.15}s` }" />
              </div>
              <div v-if="m.error" class="text-rose-600 dark:text-rose-400 text-sm">
                {{ m.error }}
                <button type="button" class="block mt-1.5 font-semibold underline" @click="retry">Réessayer</button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <form class="flex-shrink-0 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t" style="border-color: var(--vc-border-soft)" @submit.prevent="send()">
        <div class="flex items-end gap-2 rounded-3xl surface-2 pl-4 pr-1.5 py-1.5">
          <textarea
            ref="inputEl"
            v-model="input"
            rows="1"
            placeholder="Demande n'importe quoi…"
            class="flex-1 bg-transparent outline-none resize-none text-[15px] py-1.5 max-h-28"
            aria-label="Message au copilote"
            @keydown="onKeydown"
            @input="e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }"
          />
          <button v-if="streaming" type="button" class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style="background: var(--vc-text); color: var(--vc-bg)" aria-label="Arrêter" @click="stop">
            <Square class="w-3.5 h-3.5" fill="currentColor" :stroke-width="0" />
          </button>
          <button v-else type="submit" class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition text-white disabled:opacity-40" style="background: var(--vc-ai)" :disabled="!canSend" aria-label="Envoyer">
            <ArrowUp class="w-[18px] h-[18px]" :stroke-width="2.5" />
          </button>
        </div>
      </form>
    </div>
  </van-popup>
</template>

<style scoped>
.md :deep(p) { margin: 0 0 0.5em; }
.md :deep(p:last-child) { margin-bottom: 0; }
.md :deep(ul), .md :deep(ol) { margin: 0.25em 0 0.6em; padding-left: 1.2em; }
.md :deep(ul) { list-style: disc; }
.md :deep(ol) { list-style: decimal; }
.md :deep(li) { margin: 0.15em 0; }
.md :deep(strong) { font-weight: 650; }
.typing-dot {
  @apply w-1.5 h-1.5 rounded-full;
  background: var(--vc-subtle);
  animation: bounce 1s infinite ease-in-out;
}
@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-4px); opacity: 1; } }
</style>
