import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

const components: Components = {
  a({ href, children }) {
    const safe = href && (href.startsWith("http") || href.startsWith("/")) ? href : undefined
    return (
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline break-all"
      >
        {children}
      </a>
    )
  },
  img({ src, alt }) {
    const safe = src && (src.startsWith("http") || src.startsWith("/")) ? src : undefined
    if (!safe) return null
    return (
      <img
        src={safe}
        alt={alt ?? ""}
        className="max-w-full rounded-lg my-2 border border-border/40"
        style={{ maxHeight: 480, objectFit: "contain" }}
      />
    )
  },
  pre({ children }) {
    return (
      <pre className="bg-muted/60 border border-border/40 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2 whitespace-pre">
        {children}
      </pre>
    )
  },
  code({ className, children }) {
    if (className) {
      // Fenced code block — styling comes from <pre> wrapper
      return <code className={`${className} text-xs font-mono`}>{children}</code>
    }
    return (
      <code className="bg-muted/60 border border-border/30 px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    )
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground/70 my-2">
        {children}
      </blockquote>
    )
  },
  ul({ children }) {
    return <ul className="list-disc list-inside space-y-0.5 my-2 ml-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside space-y-0.5 my-2 ml-1">{children}</ol>
  },
  h1({ children }) {
    return <h1 className="text-base font-bold text-foreground mt-3 mb-1">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="text-sm font-bold text-foreground mt-3 mb-1">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold text-foreground mt-2 mb-0.5">{children}</h3>
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>
  },
  em({ children }) {
    return <em className="italic">{children}</em>
  },
  hr() {
    return <hr className="my-3 border-border/40" />
  },
}

export function MarkdownBody({
  content,
  className = "",
  clamp = false,
}: {
  content: string
  className?: string
  clamp?: boolean
}) {
  return (
    <div
      className={`text-sm text-muted-foreground break-words ${clamp ? "line-clamp-4 overflow-hidden" : ""} ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
