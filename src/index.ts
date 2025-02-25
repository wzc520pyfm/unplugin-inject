import { sep } from 'node:path'
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'
import { attachScopes, createFilter, makeLegalIdentifier } from '@rollup/pluginutils'
import { walk } from 'estree-walker'

import MagicString from 'magic-string'
import type { Options } from './types'

const escape = (str: string) => str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')

function isReference(node: any, parent: any): boolean {
  if (node.type === 'MemberExpression')
    return !node.computed && isReference(node.object, node)

  if (node.type === 'Identifier') {
    // TODO is this right?
    if (parent.type === 'MemberExpression')
      return parent.computed || node === parent.object

    // disregard the `bar` in { bar: foo }
    if (parent.type === 'Property' && node !== parent.value)
      return false

    // disregard the `bar` in `class Foo { bar () {...} }`
    if (parent.type === 'MethodDefinition')
      return false

    // disregard the `bar` in `export { foo as bar }`
    if (parent.type === 'ExportSpecifier' && node !== parent.local)
      return false

    // disregard the `bar` in `import { bar as foo }`
    if (parent.type === 'ImportSpecifier' && node === parent.imported)
      return false

    return true
  }

  return false
}

function flatten(startNode: any) {
  const parts = []
  let node = startNode

  while (node.type === 'MemberExpression') {
    parts.unshift(node.property.name)
    node = node.object
  }

  const { name } = node
  parts.unshift(name)

  return { name, keypath: parts.join('.') }
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}) => {
  if (!options)
    throw new Error('Missing options')

  const filter = createFilter(options.include, options.exclude)

  let { modules } = options

  if (!modules) {
    modules = Object.assign({}, options)
    delete modules.include
    delete modules.exclude
    delete modules.sourceMap
    delete modules.sourcemap
  }

  const modulesMap = new Map(Object.entries(modules))

  // Fix paths on Windows
  if (sep !== '/') {
    modulesMap.forEach((mod, key) => {
      modulesMap.set(
        key,
        Array.isArray(mod) ? [mod[0].split(sep).join('/'), mod[1]] : (mod as string).split(sep).join('/'),
      )
    })
  }

  const firstpass = new RegExp(`(?:${Array.from(modulesMap.keys()).map(escape).join('|')})`, 'g')
  const sourceMap = options.sourceMap !== false && options.sourcemap !== false

  return {
    name: 'unplugin-inject',
    transform(code, id) {
      if (!filter(id))
        return null
      if (code.search(firstpass) === -1)
        return null

      if (sep !== '/')
        id = id.split(sep).join('/')

      let ast: any = null
      try {
        ast = this.parse(code)
      }
      catch (err) {
        this.warn({
          code: 'PARSE_ERROR',
          message: `@rollup/plugin-inject: failed to parse ${id}. Consider restricting the plugin to particular files via options.include`,
        })
      }
      if (!ast)
        return null

      const imports = new Set()
      ast.body.forEach((node: any) => {
        if (node.type === 'ImportDeclaration') {
          node.specifiers.forEach((specifier: any) => {
            imports.add(specifier.local.name)
          })
        }
      })

      // analyse scopes
      let scope = attachScopes(ast, 'scope')

      const magicString = new MagicString(code)

      const newImports = new Map()

      function handleReference(node: any, name: string, keypath: string) {
        let mod = modulesMap.get(keypath)
        if (mod && !imports.has(name) && !scope.contains(name)) {
          if (typeof mod === 'string')
            mod = [mod, 'default']

          // prevent module from importing itself
          if ((mod as any)[0] === id)
            return false

          const hash = `${keypath}:${(mod as any)[0]}:${(mod as any)[1]}`

          const importLocalName
            = name === keypath ? name : makeLegalIdentifier(`$inject_${keypath}`)

          if (!newImports.has(hash)) {
            // escape apostrophes and backslashes for use in single-quoted string literal
            const modName = (mod as any)[0].replace(/[''\\]/g, '\\$&')
            if ((mod as any)[1] === '*')
              newImports.set(hash, `import * as ${importLocalName} from '${modName}';`)

            else
              newImports.set(hash, `import { ${(mod as any)[1]} as ${importLocalName} } from '${modName}';`)
          }

          if (name !== keypath) {
            magicString.overwrite(node.start, node.end, importLocalName, {
              storeName: true,
            })
          }

          return true
        }

        return false
      }

      walk(ast, {
        enter(node: any, parent) {
          if (sourceMap) {
            magicString.addSourcemapLocation(node.start)
            magicString.addSourcemapLocation(node.end)
          }

          if (node.scope)
            scope = node.scope

          // special case – shorthand properties. because node.key === node.value,
          // we can't differentiate once we've descended into the node
          if (node.type === 'Property' && node.shorthand && node.value.type === 'Identifier') {
            const { name } = node.key
            handleReference(node, name, name)
            this.skip()
            return
          }

          if (isReference(node, parent)) {
            const { name, keypath } = flatten(node)
            const handled = handleReference(node, name, keypath)
            if (handled)
              this.skip()
          }
        },
        leave(node: any) {
          if (node.scope)
            scope = scope.parent as any
        },
      })

      if (newImports.size === 0) {
        return {
          code,
          ast,
          map: sourceMap ? magicString.generateMap({ hires: true }) : null,
        }
      }
      const importBlock = Array.from(newImports.values()).join('\n\n')

      magicString.prepend(`${importBlock}\n\n`)

      return {
        code: magicString.toString(),
        map: sourceMap ? magicString.generateMap({ hires: true }) : null,
      }
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
