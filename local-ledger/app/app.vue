<script setup lang="ts">
import { db, findProfileByHeaders, saveProfile, type Profile } from '~/lib/db'
import { isMappingComplete, mapRows } from '~/lib/mapRows'
import { readTable } from '~/lib/readTable'
import type { Grid, Mapping } from '~/lib/types'

const emptyMapping = (): Mapping => ({
  headerRow: 1,
  date: -1,
  merchant: -1,
  amount: { mode: 'single', amount: -1, flipSign: false },
})

const fileName = ref('')
const encoding = ref('')
const grid = shallowRef<Grid>([])
const mapping = ref<Mapping>(emptyMapping())
const profiles = ref<Profile[]>([])
const profileName = ref('')
const message = ref('')

const headers = computed(() => grid.value[mapping.value.headerRow - 1] ?? [])
const result = computed(() => (isMappingComplete(mapping.value) ? mapRows(grid.value, mapping.value) : null))

async function loadProfiles() {
  profiles.value = await db.profiles.orderBy('name').toArray()
}
onMounted(loadProfiles)

function applyProfile(p: Profile) {
  mapping.value = JSON.parse(JSON.stringify(p.mapping))
  profileName.value = p.name
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const t = readTable(file.name, await file.arrayBuffer())
    grid.value = t.grid
    encoding.value = t.encoding
    fileName.value = file.name
  } catch {
    message.value = '파일을 읽지 못했습니다'
    return
  }
  const p = findProfileByHeaders(profiles.value, grid.value)
  if (p) {
    applyProfile(p)
    message.value = `프로필 "${p.name}" 자동 적용`
  } else {
    mapping.value = emptyMapping()
    profileName.value = ''
    message.value = ''
  }
}

function onSelectProfile(e: Event) {
  const p = profiles.value.find((x) => x.id === Number((e.target as HTMLSelectElement).value))
  if (p) applyProfile(p)
}

async function onSave() {
  const name = profileName.value.trim()
  if (!name) return
  await saveProfile({ name, headers: headers.value, mapping: mapping.value })
  await loadProfiles()
  message.value = `프로필 "${name}" 저장됨`
}
</script>

<template>
  <div class="flex min-h-screen">
    <aside class="hidden w-56 shrink-0 flex-col bg-gray-900 text-gray-300 md:flex">
      <div class="flex h-14 items-center px-5 text-base font-semibold text-white">local-ledger</div>
      <nav class="flex-1 space-y-1 px-3 py-2 text-sm">
        <span class="flex items-center rounded-md bg-gray-800 px-3 py-2 font-medium text-white">내역 가져오기</span>
        <span
          v-for="item in ['분류 규칙', '미분류', '월별 요약']"
          :key="item"
          class="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-gray-500"
          aria-disabled="true"
        >
          {{ item }}
          <span class="text-xs">준비 중</span>
        </span>
      </nav>
      <p class="px-5 py-4 text-xs leading-relaxed text-gray-500">
        파일은 브라우저 안에서만 처리되며 어디로도 전송되지 않습니다.
      </p>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
        <h1 class="text-base font-semibold text-gray-900">
          <span class="text-gray-400 md:hidden">local-ledger / </span>내역 가져오기
        </h1>
        <span class="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">로컬 처리 · 전송 없음</span>
      </header>

      <main class="flex-1 space-y-4 p-4 md:p-6">
        <section class="card">
          <h2 class="card-title">파일 업로드</h2>
          <div class="flex flex-wrap items-center gap-3 p-4 md:p-5">
            <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              내역 파일 (CSV, xlsx)
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                class="text-sm font-normal text-gray-600 file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                @change="onFile"
              >
            </label>
            <p v-if="fileName" class="flex flex-wrap gap-1.5 self-end text-xs" data-testid="file-info">
              <span class="badge">{{ fileName }}</span>
              <span class="badge">{{ encoding }}</span>
              <span class="badge">{{ grid.length }}행</span>
            </p>
          </div>
        </section>

        <section v-if="grid.length" class="card">
          <h2 class="card-title">컬럼 매핑</h2>
          <div class="space-y-5 p-4 md:p-5">
            <div class="flex flex-wrap items-end gap-3 border-b border-gray-100 pb-5">
              <label class="field">
                저장된 프로필
                <select class="input" @change="onSelectProfile">
                  <option value="">선택</option>
                  <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </label>
              <label class="field">
                프로필 이름
                <input v-model="profileName" class="input">
              </label>
              <button
                class="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                :disabled="!profileName.trim() || !result"
                @click="onSave"
              >
                매핑 저장
              </button>
              <span v-if="message" class="self-center text-sm text-blue-700" data-testid="message">{{ message }}</span>
            </div>

            <ColumnMapper v-model="mapping" :headers="headers" :row-count="grid.length" />
          </div>
        </section>

        <TransactionTable v-if="result" :result="result" />
      </main>
    </div>
  </div>
</template>
