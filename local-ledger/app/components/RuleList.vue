<script setup lang="ts">
import { deleteRule, importRules, saveRule } from '~/lib/db'
import { parseRulesJson, toRulesJson } from '~/lib/rules'
import type { Rule } from '~/lib/types'

const props = defineProps<{ rules: Rule[] }>()
const emit = defineEmits<{ changed: [] }>()
const message = ref('')

/** 빈 값이면 저장하지 않고 다시 그려서 원래 값으로 되돌린다 */
async function onEdit(r: Rule, field: 'pattern' | 'category', e: Event) {
  const value = (e.target as HTMLInputElement).value.trim()
  if (value) await saveRule({ id: r.id, pattern: r.pattern, category: r.category, [field]: value })
  emit('changed')
}

async function onDelete(r: Rule) {
  await deleteRule(r.id!)
  emit('changed')
}

function onExport() {
  const url = URL.createObjectURL(new Blob([toRulesJson(props.rules)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `local-ledger-rules-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  try {
    const { rules, invalid } = parseRulesJson(await file.text())
    const { added, updated } = await importRules(rules)
    message.value = `가져오기 완료: 추가 ${added} · 갱신 ${updated} · 무시 ${invalid}`
    emit('changed')
  } catch {
    message.value = '규칙 파일 형식이 올바르지 않습니다'
  }
}
</script>

<template>
  <section class="card">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 md:px-5">
      <h2 class="text-sm font-semibold text-gray-900">분류 규칙 {{ rules.length }}개</h2>
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="message" class="text-sm text-blue-700" data-testid="rules-message">{{ message }}</span>
        <label
          class="flex h-9 cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          JSON 가져오기
          <input type="file" accept=".json,application/json" class="sr-only" @change="onImport">
        </label>
        <button
          class="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          :disabled="!rules.length"
          @click="onExport"
        >
          JSON 내보내기
        </button>
      </div>
    </div>
    <p v-if="!rules.length" class="px-4 py-8 text-center text-sm text-gray-500 md:px-5">
      규칙이 없습니다. 미분류 화면이나 거래 표에서 분류를 입력하면 규칙이 저장됩니다.
    </p>
    <div v-else class="overflow-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr class="border-b border-gray-200 text-left">
            <th class="px-4 py-2.5 font-medium md:px-5">가맹점에 포함된 문자열</th>
            <th class="px-4 py-2.5 font-medium md:px-5">분류</th>
            <th class="px-4 py-2.5 md:px-5" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.id" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-1.5 md:px-5">
              <input
                :value="r.pattern"
                :aria-label="`${r.pattern} 패턴`"
                class="input h-8 w-full min-w-36"
                @change="onEdit(r, 'pattern', $event)"
              >
            </td>
            <td class="px-4 py-1.5 md:px-5">
              <input
                :value="r.category"
                :aria-label="`${r.pattern} 분류`"
                list="category-options"
                class="input h-8 w-full min-w-28"
                @change="onEdit(r, 'category', $event)"
              >
            </td>
            <td class="px-4 py-1.5 text-right md:px-5">
              <button
                :aria-label="`${r.pattern} 삭제`"
                class="h-8 rounded-md px-3 text-sm text-red-600 hover:bg-red-50"
                @click="onDelete(r)"
              >
                삭제
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
