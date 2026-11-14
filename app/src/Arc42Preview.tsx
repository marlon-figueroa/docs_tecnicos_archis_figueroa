import { useEffect, useId, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { loadMermaidForPreview } from './mermaidLoader'

function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reactId = useId()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelled = false

    const renderId = `arc42-mmd-${reactId.replace(/:/g, '')}-${Math.random().toString(36).slice(2, 9)}`

    void loadMermaidForPreview()
      .then((mermaid) => mermaid.render(renderId, chart.trim()))
      .then(({ svg, bindFunctions }) => {
        if (cancelled) return
        el.innerHTML = svg
        bindFunctions?.(el)
        setError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message || 'No se pudo renderizar el diagrama')
        el.innerHTML = ''
      })

    return () => {
      cancelled = true
    }
  }, [chart, reactId])

  return (
    <figure className="my-5 rounded-xl border border-base-300 bg-base-100 p-4 overflow-x-auto">
      <div ref={containerRef} className="mermaid-diagram flex justify-center min-w-0 [&_svg]:max-w-full" />
      {error ? (
        <figcaption className="text-xs text-error mt-2">
          Diagrama: {error}
        </figcaption>
      ) : (
        <figcaption className="sr-only">Diagrama Mermaid</figcaption>
      )}
    </figure>
  )
}

export function Arc42Preview({ markdown }: { markdown: string }) {
  return (
    <article className="arc42-preview mx-auto w-full max-w-4xl rounded-xl border border-base-300 bg-base-100 p-6 text-[15px] leading-relaxed shadow-sm md:p-10">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-base-content border-b border-base-200 pb-2 mb-4">{children}</h1>
          ),
          h2: ({ children }) => <h2 className="text-lg font-semibold mt-6 mb-3 text-base-content">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-base-content">{children}</h3>,
          p: ({ children }) => <p className="mb-3 text-base-content/90">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-base-content/90">{children}</li>,
          em: ({ children }) => <em className="text-base-content/60 not-italic text-xs">{children}</em>,
          strong: ({ children }) => <strong className="font-semibold text-base-content">{children}</strong>,
          hr: () => <hr className="my-6 border-base-300" />,
          code: ({ className, children }) => {
            const text = String(children).replace(/\n$/, '')
            const lang = /language-(\w+)/.exec(className || '')?.[1]
            if (lang === 'mermaid') {
              return <MermaidBlock chart={text} />
            }
            return (
              <code className="px-1 py-0.5 rounded bg-base-200 text-xs font-mono text-base-content">{children}</code>
            )
          },
          pre: ({ children }) => <div className="my-2">{children}</div>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}