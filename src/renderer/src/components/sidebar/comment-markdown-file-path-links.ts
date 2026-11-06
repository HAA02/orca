import {
  detectFilePathSegments,
  isFilePathCodeSpan,
  normalizeFilePath
} from '../../../../shared/markdown-file-path-detection'

type MarkdownTextNode = {
  type: 'text'
  value: string
}

type MarkdownInlineCodeNode = {
  type: 'inlineCode'
  value: string
}

type MarkdownLinkNode = {
  type: 'link'
  url: string
  title: null
  children: (MarkdownTextNode | MarkdownInlineCodeNode)[]
}

type MarkdownNode = {
  type: string
  value?: string
  children?: MarkdownNode[]
}

function filePathLink(href: string, children: MarkdownLinkNode['children']): MarkdownLinkNode {
  return { type: 'link', url: href, title: null, children }
}

function splitFilePathText(value: string): MarkdownNode[] {
  const segments = detectFilePathSegments(value)
  if (segments.length === 1 && segments[0]?.type === 'text') {
    return [{ type: 'text', value }]
  }
  return segments.map((segment) =>
    segment.type === 'file'
      ? filePathLink(segment.path, [{ type: 'text', value: segment.value }])
      : { type: 'text', value: segment.value }
  )
}

function transformFilePathChildren(node: MarkdownNode): void {
  if (!node.children || node.type === 'link' || node.type === 'linkReference') {
    return
  }
  const nextChildren: MarkdownNode[] = []
  for (const child of node.children) {
    if (child.type === 'text' && child.value !== undefined) {
      for (const part of splitFilePathText(child.value)) {
        nextChildren.push(part)
      }
      continue
    }
    if (child.type === 'inlineCode' && child.value && isFilePathCodeSpan(child.value)) {
      const href = normalizeFilePath(child.value.trim())
      nextChildren.push(filePathLink(href, [{ type: 'inlineCode', value: child.value }]))
      continue
    }
    transformFilePathChildren(child)
    nextChildren.push(child)
  }
  node.children = nextChildren
}

/** Turn bare file paths in chat prose into links the native-chat click handler can open. */
export function remarkChatFilePathLinks(): (tree: MarkdownNode) => void {
  return (tree) => transformFilePathChildren(tree)
}
