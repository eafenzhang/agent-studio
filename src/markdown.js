/**
 * Agent Studio Desktop - Markdown Renderer
 * Wraps marked + DOMPurify + highlight.js
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Configure highlight.js on code blocks
 * @param {string} html - sanitized HTML string
 */
function highlightCodeBlocks(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('pre code').forEach((block) => {
    try {
      hljs.highlightElement(block);
    } catch {
      // ignore highlighting errors
    }
  });
  return container.innerHTML;
}

/**
 * Render markdown text to sanitized HTML
 * @param {string} text - raw markdown text
 * @returns {string} sanitized HTML string
 */
export function renderMarkdown(text) {
  if (!text) return '';

  // Parse markdown to HTML
  const rawHtml = marked.parse(text);

  // Sanitize with DOMPurify to prevent XSS
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'strong', 'em', 'del', 's', 'u',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div',
      'input', // for checkboxes in task lists
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class',
      'target', 'rel', 'type', 'checked', 'disabled',
      'data-language',
    ],
  });

  // Apply syntax highlighting
  const highlighted = highlightCodeBlocks(cleanHtml);

  return highlighted;
}

/**
 * Render markdown and return a DOM element
 * @param {string} text
 * @returns {HTMLElement}
 */
export function renderMarkdownToElement(text) {
  const div = document.createElement('div');
  div.className = 'markdown-content';
  div.innerHTML = renderMarkdown(text);
  return div;
}

export default { renderMarkdown, renderMarkdownToElement };
