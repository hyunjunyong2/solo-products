<script setup lang="ts">
import { toResultCsv } from '~/lib/exportCsv'
import { parseAmount } from '~/lib/parseAmount'
import { isConsistent, summarize } from '~/lib/summary'
import type { MappedResult } from '~/lib/types'

const props = defineProps<{ result: MappedResult; categories: (string | null)[]; fileName: string }>()
const won = (n: number) => n.toLocaleString('ko-KR')

const summary = computed(() => summarize(props.result.rows, props.categories))
const consistent = computed(() => isConsistent(summary.value, props.result))
const kpis = computed(() => [
  { key: 'income', label: '수입', value: summary.value.total.income },
  { key: 'expense', label: '지출', value: summary.value.total.expense },
  { key: 'net', label: '순액', value: summary.value.total.net },
])

/** 직접 입력값이 있으면 그것을, 없으면 파일 안 합계 행을 비교 기준으로 쓴다. 부호는 파일마다 달라 절댓값으로 비교 */
const manualTotal = ref('')
const target = computed(() => parseAmount(manualTotal.value) ?? props.result.sourceTotal)
const diff = computed(() => (target.value == null ? null : Math.abs(props.result.total) - Math.abs(target.value)))

function onExport() {
  const url = URL.createObjectURL(new Blob([toResultCsv(props.result.rows, props.categories)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.fileName.replace(/\.[^.]+$/, '')}-분류.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-4">
      <div v-for="k in kpis" :key="k.key" class="card px-4 py-3 md:px-5">
        <p class="text-xs text-gray-500">{{ k.label }}</p>
        <p
          class="mt-1 text-lg font-semibold tabular-nums"
          :class="{ 'text-red-600': k.value < 0 }"
          :data-testid="`kpi-${k.key}`"
        >
          {{ won(k.value) }}
        </p>
      </div>
      <div class="card flex items-center justify-between gap-2 px-4 py-3 md:px-5">
        <div>
          <p class="text-xs text-gray-500">거래</p>
          <p class="mt-1 text-lg font-semibold tabular-nums">{{ summary.total.count }}건</p>
        </div>
        <button
          class="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          @click="onExport"
        >
          CSV 내보내기
        </button>
      </div>
    </div>

    <section class="card">
      <h2 class="card-title">합계 검증</h2>
      <div class="space-y-3 p-4 text-sm md:p-5">
        <p data-testid="consistency-check">
          <template v-if="consistent">✅ 월별·분류별 합계가 거래표 합계와 일치</template>
          <template v-else>❌ 월별·분류별 합계가 거래표 합계와 다름</template>
        </p>
        <div class="flex flex-wrap items-end gap-3">
          <label class="field">
            명세서 총액
            <input
              v-model="manualTotal"
              inputmode="numeric"
              :placeholder="result.sourceTotal == null ? '직접 입력' : `파일 안 합계 ${won(result.sourceTotal)}`"
              class="input w-48"
            >
          </label>
          <p class="pb-2" data-testid="source-check">
            <template v-if="diff == null">비교할 원본 합계가 없습니다. 명세서 총액을 입력하세요</template>
            <template v-else-if="diff === 0">✅ 원본 합계 일치 ({{ won(Math.abs(target!)) }})</template>
            <template v-else>❌ 원본 합계 불일치 · 차이 {{ won(diff) }}</template>
          </p>
        </div>
        <p class="text-xs text-gray-500">
          거래표 합계 {{ won(result.total) }}
          <template v-if="result.sourceTotal != null"> · 파일 안 합계 행 {{ won(result.sourceTotal) }}</template>
          · 부호는 무시하고 금액 크기로 비교합니다
        </p>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">월별 합계</h2>
      <div class="overflow-auto">
        <table class="w-full border-collapse text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr class="border-b border-gray-200 text-left">
              <th class="px-4 py-2.5 font-medium md:px-5">월</th>
              <th class="px-4 py-2.5 text-right font-medium md:px-5">건수</th>
              <th class="px-4 py-2.5 text-right font-medium md:px-5">수입</th>
              <th class="px-4 py-2.5 text-right font-medium md:px-5">지출</th>
              <th class="px-4 py-2.5 text-right font-medium md:px-5">순액</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in summary.months"
              :key="m.month"
              class="border-b border-gray-100 tabular-nums hover:bg-gray-50"
              data-testid="month-row"
            >
              <td class="px-4 py-2.5 md:px-5">{{ m.month }}</td>
              <td class="px-4 py-2.5 text-right md:px-5">{{ m.count }}</td>
              <td class="px-4 py-2.5 text-right md:px-5">{{ won(m.income) }}</td>
              <td class="px-4 py-2.5 text-right text-red-600 md:px-5">{{ won(m.expense) }}</td>
              <td class="px-4 py-2.5 text-right font-medium md:px-5" :class="{ 'text-red-600': m.net < 0 }">
                {{ won(m.net) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">분류별 합계</h2>
      <div class="overflow-auto">
        <table class="w-full border-collapse text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr class="border-b border-gray-200 text-left">
              <th class="px-4 py-2.5 font-medium md:px-5">분류</th>
              <th v-for="m in summary.months" :key="m.month" class="px-4 py-2.5 text-right font-medium md:px-5">
                {{ m.month }}
              </th>
              <th class="px-4 py-2.5 text-right font-medium md:px-5">합계</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in summary.categories"
              :key="c.category ?? ''"
              class="border-b border-gray-100 tabular-nums hover:bg-gray-50"
              data-testid="category-row"
            >
              <td class="px-4 py-2.5 md:px-5" :class="{ 'text-gray-400': c.category == null }">
                {{ c.category ?? '미분류' }}
              </td>
              <td v-for="m in summary.months" :key="m.month" class="px-4 py-2.5 text-right md:px-5">
                {{ c.byMonth[m.month] == null ? '-' : won(c.byMonth[m.month]!) }}
              </td>
              <td class="px-4 py-2.5 text-right font-medium md:px-5" :class="{ 'text-red-600': c.total < 0 }">
                {{ won(c.total) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
