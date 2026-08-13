// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AtlantaServiceIntro } from './AtlantaServiceIntro'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | undefined
let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

describe('AtlantaServiceIntro', () => {
  it('renders the approved Atlanta service copy and descriptive internal links', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <MemoryRouter>
          <AtlantaServiceIntro />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Atlanta Photography')
    expect(container.textContent).toContain('wedding photography')
    expect(container.textContent).toContain('metro Atlanta')
    expect(container.textContent).toContain('Atlanta wedding photographer')
    expect(container.textContent).toContain('non-discriminatory')
    expect(container.querySelectorAll('h2')).toHaveLength(1)
    expect(container.querySelectorAll('p')).toHaveLength(4)
    expect([...container.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/portfolio/weddings',
      '/portfolio/events',
      '/portfolio/portraits',
      '/book',
    ])
  })
})
