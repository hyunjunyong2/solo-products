import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173', browserName: 'chromium' },
  webServer: {
    command: 'serve .output/public -l 4173 --no-request-logging',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
})
