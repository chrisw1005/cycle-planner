import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // On newer Node versions, use jsdom's browser storage rather than Node's
    // file-backed localStorage, which shadows it in the test environment.
    execArgv: process.allowedNodeEnvironmentFlags.has('--no-experimental-webstorage')
      ? ['--no-experimental-webstorage']
      : [],
    environmentOptions: { jsdom: { url: 'https://cycle-planner.test/login' } },
    include: ['tests/**/*.test.tsx'],
  },
})
