import { openUrl } from '@tauri-apps/plugin-opener'

function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const anchor = target.closest('a')

  if (!anchor) return

  const href = anchor.getAttribute('href')
  if (!href) return

  const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')
  if (!isExternal) return

  event.preventDefault()
  openUrl(href)
}

export function registerExternalLinks() {
  document.addEventListener('click', handleClick)
}
