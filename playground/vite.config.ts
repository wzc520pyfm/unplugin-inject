import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import UnpluginInject from '../src/vite'

export default defineConfig({
  plugins: [
    Inspect(),
    UnpluginInject(),
  ],
})
