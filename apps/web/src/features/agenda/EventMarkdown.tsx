import ReactMarkdown from "react-markdown"

import { cn } from "@/lib/utils"

type EventMarkdownProps = {
  content: string
  className?: string
}

/** Renders event descriptions that may contain Markdown (Intra + BI). */
export function EventMarkdown({ content, className }: EventMarkdownProps) {
  return (
    <div
      className={cn(
        "text-sm text-muted-foreground",
        "[&_a]:underline [&_a]:underline-offset-2",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        "[&_p]:mb-2 [&_p:last-child]:mb-0",
        "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4",
        "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4",
        "[&_li]:my-0.5",
        "[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        className,
      )}
    >
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
