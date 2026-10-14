<script setup lang="ts">
import type { MerchantGroup } from '~/lib/rules'

defineProps<{ groups: MerchantGroup[] }>()
const emit = defineEmits<{ classify: [merchant: string, category: string] }>()
const won = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <section class="card">
    <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 px-4 py-3 md:px-5">
      <h2 class="text-sm font-semibold text-gray-900">미분류 가맹점</h2>
      <p class="text-xs text-gray-500">분류를 입력하면 가맹점 이름으로 규칙이 저장됩니다</p>
    </div>
    <p v-if="!groups.length" class="px-4 py-8 text-center text-sm text-gray-500 md:px-5">미분류 가맹점이 없습니다.</p>
    <div v-else class="overflow-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr class="border-b border-gray-200 text-left">
            <th class="px-4 py-2.5 font-medium md:px-5">가맹점</th>
            <th class="px-4 py-2.5 text-right font-medium md:px-5">건수</th>
            <th class="px-4 py-2.5 text-right font-medium md:px-5">합계</th>
            <th class="px-4 py-2.5 font-medium md:px-5">분류</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="g in groups"
            :key="g.merchant"
            class="border-b border-gray-100 hover:bg-gray-50"
            data-testid="unclassified-group"
          >
            <td class="px-4 py-2.5 md:px-5">{{ g.merchant }}</td>
            <td class="whitespace-nowrap px-4 py-2.5 text-right tabular-nums md:px-5">{{ g.count }}</td>
            <td
              class="whitespace-nowrap px-4 py-2.5 text-right tabular-nums md:px-5"
              :class="{ 'text-red-600': g.total < 0 }"
            >
              {{ won(g.total) }}
            </td>
            <td class="px-4 py-1.5 md:px-5">
              <input
                :aria-label="`${g.merchant} 분류`"
                list="category-options"
                placeholder="분류 입력"
                class="input h-8 w-full min-w-28"
                @change="emit('classify', g.merchant, ($event.target as HTMLInputElement).value)"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
