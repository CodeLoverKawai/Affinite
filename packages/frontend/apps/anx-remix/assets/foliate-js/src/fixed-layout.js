const parseViewport = str => str
    ?.split(/[,;\s]/) // NOTE: technically, only the comma is valid
    ?.filter(x => x)
    ?.map(x => x.split('=').map(x => x.trim()))

const getViewport = (doc, viewport) => {
    // use `viewBox` for SVG
    if (doc.documentElement.localName === 'svg') {
        const [, , width, height] = doc.documentElement
            .getAttribute('viewBox')?.split(/\s/) ?? []
        return { width, height }
    }

    // get `viewport` `meta` element
    const meta = parseViewport(doc.querySelector('meta[name="viewport"]')
        ?.getAttribute('content'))
    if (meta) return Object.fromEntries(meta)

    // fallback to book's viewport
    if (typeof viewport === 'string') return parseViewport(viewport)
    if (viewport) return viewport

    // if no viewport (possibly with image directly in spine), get image size
    const img = doc.querySelector('img')
    if (img) return { width: img.naturalWidth, height: img.naturalHeight }

    // just show *something*, i guess...
    console.warn(new Error('Missing viewport properties'))
    return { width: 1000, height: 2000 }
}

export class FixedLayout extends HTMLElement {
    #root = this.attachShadow({ mode: 'closed' })
    #observer = new ResizeObserver(() => this.#render())
    #spreads
    #index = -1
    defaultViewport
    spread
    #portrait = false
    #left
    #right
    #center
    #side
    #zoom = 1.0
    #panX = 0
    #panY = 0

    constructor() {
        super()

        const sheet = new CSSStyleSheet()
        this.#root.adoptedStyleSheets = [sheet]
        sheet.replaceSync(`:host {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            touch-action: none;
        }`)

        this.#observer.observe(this)
        this.#initZoomEvents(this)
    }

    #initZoomEvents(target) {
        let isDragging = false
        let startX = 0, startY = 0
        let initialPanX = 0, initialPanY = 0
        let lastTouchDist = 0

        let lastWheelPageTurn = 0
        target.addEventListener('wheel', e => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const delta = -e.deltaY
                const zoomFactor = delta > 0 ? 1.15 : 0.85
                const newZoom = Math.min(Math.max(this.#zoom * zoomFactor, 1.0), 4.0)
                if (newZoom !== this.#zoom) {
                    this.#zoom = newZoom
                    if (this.#zoom <= 1.0) {
                        this.#panX = 0
                        this.#panY = 0
                    }
                    this.#render()
                }
            } else if (this.#zoom <= 1.05) {
                const now = Date.now()
                if (now - lastWheelPageTurn < 220) return
                if (e.deltaY > 25 || e.deltaX > 25) {
                    lastWheelPageTurn = now
                    this.next()
                } else if (e.deltaY < -25 || e.deltaX < -25) {
                    lastWheelPageTurn = now
                    this.prev()
                }
            }
        }, { passive: false })

        target.addEventListener('dblclick', e => {
            if (this.#zoom > 1.05) {
                this.#zoom = 1.0
                this.#panX = 0
                this.#panY = 0
            } else {
                this.#zoom = 2.0
            }
            this.#render()
        })

        target.addEventListener('pointerdown', e => {
            if (this.#zoom > 1.0 && e.button === 0) {
                isDragging = true
                startX = e.clientX
                startY = e.clientY
                initialPanX = this.#panX
                initialPanY = this.#panY
                target.setPointerCapture?.(e.pointerId)
            }
        })

        target.addEventListener('pointermove', e => {
            if (isDragging && this.#zoom > 1.0) {
                this.#panX = initialPanX + (e.clientX - startX)
                this.#panY = initialPanY + (e.clientY - startY)
                this.#render()
            }
        })

        target.addEventListener('pointerup', e => {
            isDragging = false
            try { target.releasePointerCapture?.(e.pointerId) } catch (_) {}
        })

        target.addEventListener('pointercancel', () => {
            isDragging = false
        })

        target.addEventListener('touchstart', e => {
            if (e.touches.length === 2) {
                const t1 = e.touches[0]
                const t2 = e.touches[1]
                lastTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
            }
        }, { passive: true })

        target.addEventListener('touchmove', e => {
            if (e.touches.length === 2) {
                e.preventDefault()
                const t1 = e.touches[0]
                const t2 = e.touches[1]
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
                if (lastTouchDist > 0) {
                    const factor = dist / lastTouchDist
                    const newZoom = Math.min(Math.max(this.#zoom * factor, 1.0), 4.0)
                    this.#zoom = newZoom
                    if (this.#zoom <= 1.0) {
                        this.#panX = 0
                        this.#panY = 0
                    }
                    this.#render()
                }
                lastTouchDist = dist
            }
        }, { passive: false })

        target.addEventListener('touchend', e => {
            if (e.touches.length < 2) {
                lastTouchDist = 0
            }
        }, { passive: true })
    }

    async #createFrame(position, { index, src }) {
        const element = document.createElement('div')
        const iframe = document.createElement('iframe')
        element.append(iframe)
        Object.assign(iframe.style, {
            border: '0',
            display: 'none',
            overflow: 'hidden',
        })
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts')
        iframe.setAttribute('scrolling', 'no')
        iframe.setAttribute('part', 'filter')
        this.#root.append(element)
        if (!src) return { blank: true, element, iframe }
        return new Promise(resolve => {
            const onload = () => {
                iframe.removeEventListener('load', onload)
                const doc = iframe.contentDocument
                doc.position = position
                this.#initZoomEvents(doc)
                this.dispatchEvent(new CustomEvent('load', { detail: { doc, index } }))
                const { width, height } = getViewport(doc, this.defaultViewport)
                resolve({
                    element, iframe,
                    width: parseFloat(width),
                    height: parseFloat(height),
                })
            }
            iframe.addEventListener('load', onload)
            iframe.src = src
        })
    }
    #render(side = this.#side) {
        if (!side) return
        const left = this.#left ?? {}
        const right = this.#center ?? this.#right
        const target = side === 'left' ? left : right
        const { width, height } = this.getBoundingClientRect()
        const portrait = this.spread !== 'both' && this.spread !== 'portrait'
            && height > width
        this.#portrait = portrait
        const blankWidth = left.width ?? right.width
        const blankHeight = left.height ?? right.height

        const scale = portrait || this.#center
            ? Math.min(
                width / (target.width ?? blankWidth),
                height / (target.height ?? blankHeight))
            : Math.min(
                width / ((left.width ?? blankWidth) + (right.width ?? blankWidth)),
                height / Math.max(
                    left.height ?? blankHeight,
                    right.height ?? blankHeight))

        const transform = frame => {
            const { element, iframe, width, height, blank } = frame
            const finalScale = scale * this.#zoom
            iframe.contentDocument.scale = finalScale
            Object.assign(iframe.style, {
                width: `${width}px`,
                height: `${height}px`,
                transform: `translate(${this.#panX}px, ${this.#panY}px) scale(${finalScale})`,
                transformOrigin: 'top left',
                display: blank ? 'none' : 'block',
            })
            Object.assign(element.style, {
                width: `${(width ?? blankWidth) * finalScale}px`,
                height: `${(height ?? blankHeight) * finalScale}px`,
                overflow: 'visible',
                display: 'block',
                cursor: this.#zoom > 1.0 ? 'grab' : 'default',
            })
            if (portrait && frame !== target) {
                element.style.display = 'none'
            }
        }
        if (this.#center) {
            transform(this.#center)
        } else {
            transform(left)
            transform(right)
        }
    }
    async #showSpread({ left, right, center, side }) {
        this.#zoom = 1.0
        this.#panX = 0
        this.#panY = 0
        this.#root.replaceChildren()
        this.#left = null
        this.#right = null
        this.#center = null
        if (center) {
            this.#center = await this.#createFrame('center', center)
            this.#side = 'center'
            this.#render()
        } else {
            this.#left = await this.#createFrame('left', left)
            this.#right = await this.#createFrame('right', right)
            this.#side = this.#left.blank ? 'right'
                : this.#right.blank ? 'left' : side
            this.#render()
        }
    }
    #goLeft() {
        if (this.#center || this.#left?.blank) return
        if (this.#portrait && this.#left?.element?.style?.display === 'none') {
            this.#right.element.style.display = 'none'
            this.#left.element.style.display = 'block'
            this.#side = 'left'
            return true
        }
    }
    #goRight() {
        if (this.#center || this.#right?.blank) return
        if (this.#portrait && this.#right?.element?.style?.display === 'none') {
            this.#left.element.style.display = 'none'
            this.#right.element.style.display = 'block'
            this.#side = 'right'
            return true
        }
    }
    open(book) {
        this.book = book
        const { rendition } = book
        this.spread = rendition?.spread
        this.defaultViewport = rendition?.viewport

        const rtl = book.dir === 'rtl'
        const ltr = !rtl
        this.rtl = rtl

        if (rendition?.spread === 'none')
            this.#spreads = book.sections.map(section => ({ center: section }))
        else this.#spreads = book.sections.reduce((arr, section) => {
            const last = arr[arr.length - 1]
            const { linear, pageSpread } = section
            if (linear === 'no') return arr
            const newSpread = () => {
                const spread = {}
                arr.push(spread)
                return spread
            }
            if (pageSpread === 'center') {
                const spread = last.left || last.right ? newSpread() : last
                spread.center = section
            }
            else if (pageSpread === 'left') {
                const spread = last.center || last.left || ltr ? newSpread() : last
                spread.left = section
            }
            else if (pageSpread === 'right') {
                const spread = last.center || last.right || rtl ? newSpread() : last
                spread.right = section
            }
            else if (ltr) {
                if (last.center || last.right) newSpread().left = section
                else if (last.left) last.right = section
                else last.left = section
            }
            else {
                if (last.center || last.left) newSpread().right = section
                else if (last.right) last.left = section
                else last .right = section
            }
            return arr
        }, [{}])
    }
    get index() {
        const spread = this.#spreads[this.#index]
        const section = spread?.center ?? (this.side === 'left'
            ? spread.left ?? spread.right : spread.right ?? spread.left)
        return this.book.sections.indexOf(section)
    }
    #reportLocation(reason) {
        this.dispatchEvent(new CustomEvent('relocate', { detail:
            { reason, range: null, index: this.index, fraction: 0, size: 1 } }))
    }
    getSpreadOf(section) {
        const spreads = this.#spreads
        for (let index = 0; index < spreads.length; index++) {
            const { left, right, center } = spreads[index]
            if (left === section) return { index, side: 'left' }
            if (right === section) return { index, side: 'right' }
            if (center === section) return { index, side: 'center' }
        }
    }
    async goToSpread(index, side, reason) {
        if (index < 0 || index > this.#spreads.length - 1) return
        if (index === this.#index) {
            this.#render(side)
            return
        }
        this.#index = index
        const spread = this.#spreads[index]
        if (spread.center) {
            const index = this.book.sections.indexOf(spread.center)
            const src = await spread.center?.load?.()
            await this.#showSpread({ center: { index, src } })
        } else {
            const indexL = this.book.sections.indexOf(spread.left)
            const indexR = this.book.sections.indexOf(spread.right)
            const srcL = await spread.left?.load?.()
            const srcR = await spread.right?.load?.()
            const left = { index: indexL, src: srcL }
            const right = { index: indexR, src: srcR }
            await this.#showSpread({ left, right, side })
        }
        this.#reportLocation(reason)
    }
    async select(target) {
        await this.goTo(target)
        // TODO
    }
    async goTo(target) {
        const { book } = this
        const resolved = await target
        const section = book.sections[resolved.index]
        if (!section) return
        const { index, side } = this.getSpreadOf(section)
        await this.goToSpread(index, side)
    }
    async next() {
        const s = this.rtl ? this.#goLeft() : this.#goRight()
        if (s) this.#reportLocation('page')
        else return this.goToSpread(this.#index + 1, this.rtl ? 'right' : 'left', 'page')
    }
    async prev() {
        const s = this.rtl ? this.#goRight() : this.#goLeft()
        if (s) this.#reportLocation('page')
        else return this.goToSpread(this.#index - 1, this.rtl ? 'left' : 'right', 'page')
    }
    getContents() {
        return Array.from(this.#root.querySelectorAll('iframe'), frame => ({
            doc: frame.contentDocument,
            // TODO: index, overlayer
        }))
    }
    destroy() {
        this.#observer.unobserve(this)
    }
}

customElements.define('foliate-fxl', FixedLayout)
