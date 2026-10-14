<script setup lang="ts">
defineProps<{ label: string; headers: string[] }>()
const col = defineModel<number>({ required: true })
const id = useId()
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <select :id="id" v-model.number="col" class="input">
      <option :value="-1">선택</option>
      <option v-for="(h, i) in headers" :key="i" :value="i">{{ i + 1 }}열: {{ h }}</option>
    </select>
  </div>
</template>
