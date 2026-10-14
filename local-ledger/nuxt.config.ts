import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  ssr: false,
  devtools: { enabled: false },
  telemetry: false,
  css: ['~/assets/main.css'],
  vite: { plugins: [tailwindcss()] },
  app: {
    head: { title: 'local-ledger', htmlAttrs: { lang: 'ko' } },
  },
})
