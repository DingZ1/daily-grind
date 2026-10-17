import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => ({
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver({ importStyle: mode === 'test' ? false : 'css' })],
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: mode === 'test' ? false : 'css' })],
    }),
  ],
}))
