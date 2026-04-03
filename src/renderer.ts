import type { TextLine, Orb } from './types'

export const syncPool = (
  stage: HTMLDivElement,
  pool: HTMLDivElement[],
  count: number,
  className: string,
) => {
  const needed = count - pool.length
  if (needed > 0) {
    const fragment = document.createDocumentFragment()
    for (let i = 0; i < needed; i++) {
      const el = document.createElement('div')
      el.className = className
      fragment.appendChild(el)
      pool.push(el)
    }
    stage.appendChild(fragment)
  }

  for (let i = 0; i < pool.length; i++) {
    pool[i].style.display = i < count ? '' : 'none'
  }
}

export const renderHeadlineLines = (
  pool: HTMLDivElement[],
  lines: TextLine[],
  left: number,
  gutter: number,
  font: string,
  lineHeight: number,
) => {
  for (let i = 0; i < lines.length; i++) {
    const el = pool[i]
    const line = lines[i]
    el.textContent = line.text
    el.style.left = `${left}px`
    el.style.top = `${gutter + line.y}px`
    el.style.font = font
    el.style.lineHeight = `${lineHeight}px`
    el.style.visibility = 'visible'
  }
}

export const renderBodyLines = (
  pool: HTMLDivElement[],
  lines: TextLine[],
  font: string,
  lineHeight: number,
) => {
  for (let i = 0; i < lines.length; i++) {
    const el = pool[i]
    const line = lines[i]
    el.textContent = line.text
    el.style.left = `${line.x}px`
    el.style.top = `${line.y}px`
    el.style.font = font
    el.style.lineHeight = `${lineHeight}px`
    el.style.visibility = 'visible'
  }
}

export const renderOrbs = (
  orbs: Orb[],
  orbEls: (HTMLButtonElement | null)[],
  scrollY: number,
) => {
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i]
    const el = orbEls[i]
    if (!el) continue
    const visualY = o.paused ? o.y - (scrollY - o.frozenScrollY) : o.y
    el.style.left = `${o.x - o.r}px`
    el.style.top = `${visualY - o.r}px`
    el.style.width = `${o.r * 2}px`
    el.style.height = `${o.r * 2}px`
    el.style.visibility = 'visible'
    el.classList.toggle('paused', o.paused)
  }
}

export const renderDropCap = (
  el: HTMLDivElement,
  char: string,
  font: string,
  size: number,
  left: number,
  top: number,
) => {
  el.textContent = char
  el.style.font = font
  el.style.lineHeight = `${size}px`
  el.style.left = `${left}px`
  el.style.top = `${top}px`
}
