<script setup lang="ts">
import type { MappedResult } from '~/lib/types'

defineProps<{ result: MappedResult; categories: (string | null)[] }>()
const emit = defineEmits<{ classify: [merchant: string, category: string] }>()
const won = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <section class="card">
    <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 px-4 py-3 md:px-5">
      <h2 class="text-sm font-semibold text-gray-900">거래 내역</h2>
      <p class="text-xs text-gray-500">
        {{ result.rows.length }}건
        <template v-if="result.missingAmount"> · 금액 없음 {{ result.missingAmount }}행(합계 제외)</template>
        <template v-if="result.skipped"> · 날짜 인식 불가 {{ result.skipped }}행 제외</template>
      </p>
    </div>
    <div class="max-h-[60vh] overflow-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-0 bg-gray-50 text-xs text-gray-500">
          <tr class="border-b border-gray-200 text-left">
            <th class="px-4 py-2.5 font-medium md:px-5">날짜</th>
            <th class="px-4 py-2.5 font-medium md:px-5">가맹점</th>
            <th class="px-4 py-2.5 text-right font-medium md:px-5">금액</th>
            <th class="px-4 py-2.5 font-medium md:px-5">분류</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, i) in result.rows" :key="i" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600 md:px-5">{{ t.date }}</td>
            <td class="px-4 py-2.5 md:px-5">{{ t.merchant }}</td>
            <td
              class="whitespace-nowrap px-4 py-2.5 text-right tabular-nums md:px-5"
              :class="{ 'text-red-600': (t.amount ?? 0) < 0 }"
            >
              {{ t.amount == null ? '' : won(t.amount) }}
            </td>
            <td class="px-4 py-1.5 md:px-5">
              <input
                :value="categories[i] ?? ''"
                :disabled="!t.merchant"
                :aria-label="`${t.merchant} 분류`"
                list="category-options"
                placeholder="미분류"
                class="input h-8 w-full min-w-28"
                @change="emit('classify', t.merchant, ($event.target as HTMLInputElement).value)"
              >
            </td>
          </tr>
        </tbody>
        <tfoot class="sticky bottom-0 bg-white">
          <tr class="border-t-2 border-gray-200 font-semibold">
            <td class="px-4 py-3 md:px-5" colspan="2">합계</td>
            <td class="px-4 py-3 text-right tabular-nums md:px-5" data-testid="total">{{ won(result.total) }}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>
