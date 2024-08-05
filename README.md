# unplugin-inject

[![NPM version](https://img.shields.io/npm/v/unplugin-inject?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-inject)

🍣 A universal bundler plugin which scans modules for global variables and injects `import` statements where necessary.

## Install

```bash
npm i unplugin-inject
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import UnpluginInject from 'unplugin-inject/vite'

export default defineConfig({
  plugins: [
    UnpluginInject({
      /* options */
    }),
  ],
})
```

Example: [`playground/`](./playground/)

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import UnpluginInject from 'unplugin-inject/rollup'

export default {
  plugins: [
    UnpluginInject({
      /* options */
    }),
  ],
}
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-inject/webpack')({
      /* options */
    }),
  ],
}
```

<br></details>

<details>
<summary>Nuxt</summary><br>

```ts
// nuxt.config.js
export default defineNuxtConfig({
  modules: [
    [
      'unplugin-inject/nuxt',
      {
        /* options */
      },
    ],
  ],
})
```

> This module works for both Nuxt 2 and [Nuxt Vite](https://github.com/nuxt/vite)

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-inject/webpack')({
        /* options */
      }),
    ],
  },
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from 'esbuild'
import UnpluginInject from 'unplugin-inject/esbuild'

build({
  plugins: [UnpluginInject()],
})
```

<br></details>

## Usage

### Options

For all options please refer to [docs](https://github.com/rollup/plugins/tree/master/packages/inject#options).

This plugin accepts all [@rollup/plugin-inject](https://github.com/rollup/plugins/tree/master/packages/inject#options) options.
