import type MarkdownIt from 'markdown-it'
import { addClassToHast, bundledLanguages, getHighlighter } from 'shikiji'
import type { BuiltinLanguage, BuiltinTheme, CodeOptionsMeta, CodeOptionsThemes, CodeToHastOptions, Highlighter, LanguageInput, TransformerOptions } from 'shikiji'
import type { Root } from 'hast'
import { parseHighlightLines } from '../../shared/line-highlight'

export type MarkdownItShikijiOptions = MarkdownItShikijiSetupOptions & {
  /**
   * Language names to include.
   *
   * @default Object.keys(bundledLanguages)
   */
  langs?: Array<LanguageInput | BuiltinLanguage>
}

export type MarkdownItShikijiSetupOptions = CodeOptionsThemes<BuiltinTheme>
  & TransformerOptions
  & CodeOptionsMeta
  & {
  /**
   * Add `highlighted` class to lines defined in after codeblock
   *
   * @default true
   */
    highlightLines?: boolean | string

    /**
     * Custom meta string parser
     * Return an object to merge with `meta`
     */
    parseMetaString?: (
      metaString: string,
      code: string,
      lang: string,
    ) => Record<string, any> | undefined | null
  }

function setup(markdownit: MarkdownIt, highlighter: Highlighter, options: MarkdownItShikijiSetupOptions) {
  const {
    highlightLines = true,
    parseMetaString,
  } = options

  markdownit.options.highlight = (code, lang = 'text', attrs) => {
    const meta = parseMetaString?.(attrs, code, lang) || {}
    const codeOptions: CodeToHastOptions = {
      ...options,
      lang,
      meta: {
        ...options.meta,
        ...meta,
        __raw: attrs,
      },
    }

    codeOptions.transformers ||= []

    if (highlightLines) {
      const lines = parseHighlightLines(attrs)
      if (lines) {
        const className = highlightLines === true
          ? 'highlighted'
          : highlightLines

        codeOptions.transformers.push({
          name: 'markdown-it-shikiji:line-class',
          line(node, line) {
            if (lines.includes(line))
              addClassToHast(node, className)
            return node
          },
        })
      }
    }

    codeOptions.transformers.push({
      name: 'markdown-it-shikiji:block-class',
      code(node) {
        node.properties.class = `language-${lang}`
      },
    })

    return highlighter.codeToHtml(
      code,
      codeOptions,
    )
  }
}

export default async function markdownItShikiji(options: MarkdownItShikijiOptions) {
  const themeNames = ('themes' in options
    ? Object.values(options.themes)
    : [options.theme]).filter(Boolean) as BuiltinTheme[]
  const highlighter = await getHighlighter({
    themes: themeNames,
    langs: options.langs || Object.keys(bundledLanguages) as BuiltinLanguage[],
  })

  return function (markdownit: MarkdownIt) {
    setup(markdownit, highlighter, options)
  }
}
