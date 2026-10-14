<script setup lang="ts">
import type { Mapping } from '~/lib/types'

defineProps<{ headers: string[]; rowCount: number }>()
const mapping = defineModel<Mapping>({ required: true })

function setMode(mode: 'single' | 'split') {
  mapping.value.amount =
    mode === 'single' ? { mode, amount: -1, flipSign: false } : { mode, inflow: -1, outflow: -1 }
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <label class="field">
      헤더 행
      <input
        v-model.number="mapping.headerRow"
        type="number"
        min="1"
        :max="rowCount"
        class="input"
      >
    </label>

    <label class="field">
      금액 형식
      <select
        :value="mapping.amount.mode"
        class="input"
        @change="setMode(($event.target as HTMLSelectElement).value as 'single' | 'split')"
      >
        <option value="single">금액 한 열</option>
        <option value="split">입금/출금 분리</option>
      </select>
    </label>

    <ColumnSelect v-model="mapping.date" label="날짜" :headers="headers" />
    <ColumnSelect v-model="mapping.merchant" label="가맹점" :headers="headers" />

    <template v-if="mapping.amount.mode === 'single'">
      <ColumnSelect v-model="mapping.amount.amount" label="금액" :headers="headers" />
      <label class="flex h-9 items-center gap-2 self-end text-sm text-gray-700">
        <input v-model="mapping.amount.flipSign" type="checkbox" class="size-4 accent-blue-600">
        부호 반전 (양수가 지출인 파일)
      </label>
    </template>
    <template v-else>
      <ColumnSelect v-model="mapping.amount.inflow" label="입금" :headers="headers" />
      <ColumnSelect v-model="mapping.amount.outflow" label="출금" :headers="headers" />
    </template>
  </div>
</template>
