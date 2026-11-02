const createSVGElement = tag =>
    document.createElementNS('http://www.w3.org/2000/svg', tag)

export function sanitizeColor(color, fallback = '#66ccff') {
    if (!color || typeof color !== 'string') return fallback;
    const trimmed = color.trim();
    const clean = trimmed.replace(/^#+/, '');
    if (/^[0-9a-fA-F]{3,8}$/.test(clean)) {
        return `#${clean}`;
    }
    const namedMap = {
        yellow: '#fef08a',
        green: '#bbf7d0',
        blue: '#66ccff',
        pink: '#fbcfe8',
        purple: '#e9d5ff',
    };
    return namedMap[clean.toLowerCase()] || fallback;
}

export class Overlayer {
    #svg = createSVGElement('svg')
    #map = new Map()
    #doc = null
    constructor(doc) {
        this.#doc = doc
        Object.assign(this.#svg.style, {
            position: 'absolute', top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none',
        })
    }
    get element() {
        return this.#svg
    }
    get #zoom() {
        // Safari does not zoom the client rects, while Chrome, Edge and Firefox does
        if (/^((?!chrome|android).)*AppleWebKit/i.test(navigator.userAgent) && !window.chrome) {
            return window.getComputedStyle(this.#doc.body).zoom || 1.0
        }
        return 1.0
    }
    #splitRangeByParagraph(range) {
        try {
            const doc = this.#doc || range?.startContainer?.ownerDocument || document
            const ancestor = range?.commonAncestorContainer
            const paragraphs = Array.from(ancestor?.querySelectorAll?.('p, h1, h2, h3, h4, div') || [])

            if (paragraphs.length === 0) return [range]

            const splitRanges = []
            paragraphs.forEach((p) => {
                try {
                    const pRange = doc.createRange()
                    if (range.intersectsNode(p)) {
                        pRange.selectNodeContents(p)
                        if (pRange.compareBoundaryPoints(Range.START_TO_START, range) < 0) {
                            pRange.setStart(range.startContainer, range.startOffset)
                        }
                        if (pRange.compareBoundaryPoints(Range.END_TO_END, range) > 0) {
                            pRange.setEnd(range.endContainer, range.endOffset)
                        }
                        splitRanges.push(pRange)
                    }
                } catch (_) {}
            })
            return splitRanges.length === 0 ? [range] : splitRanges
        } catch (_) {
            return [range]
        }
    }
    #extractRects(range, zoom) {
        let rects = []
        try {
            const ranges = this.#splitRangeByParagraph(range)
            ranges.forEach((pRange) => {
                try {
                    const pRects = Array.from(pRange.getClientRects()).map(rect => ({
                        left: rect.left * zoom,
                        top: rect.top * zoom,
                        right: rect.right * zoom,
                        bottom: rect.bottom * zoom,
                        width: rect.width * zoom,
                        height: rect.height * zoom,
                    }))
                    rects = rects.concat(pRects)
                } catch (_) {}
            })
        } catch (_) {}
        if (rects.length === 0 && range?.getClientRects) {
            try {
                rects = Array.from(range.getClientRects()).map(rect => ({
                    left: rect.left * zoom,
                    top: rect.top * zoom,
                    right: rect.right * zoom,
                    bottom: rect.bottom * zoom,
                    width: rect.width * zoom,
                    height: rect.height * zoom,
                }))
            } catch (_) {}
        }
        return rects
    }
    add(key, range, draw, options) {
        try {
            if (this.#map.has(key)) this.remove(key)
            if (typeof range === 'function') {
                const targetDoc = this.#doc || this.#svg.getRootNode?.() || document
                range = range(targetDoc)
            }
            if (!range) return
            const zoom = this.#zoom
            const rects = this.#extractRects(range, zoom)
            let opts = options || {}
            opts = { ...opts, color: sanitizeColor(opts.color, '#66ccff') }
            const element = draw(rects, opts)
            this.#svg.append(element)
            this.#map.set(key, { range, draw, options: opts, element, rects })
            if (rects.length === 0) {
                console.warn(`[Overlayer] Warning: annotation "${key}" produced 0 rectangles`)
                try {
                    const payload = JSON.stringify({
                        type: 'anx-diagnostic-log',
                        level: 'warn',
                        source: 'Foliate',
                        message: `Anotación "${key}" produjo 0 rectángulos visuales en el visor`,
                        details: { key, color: opts.color }
                    })
                    window.parent?.postMessage(payload, '*')
                } catch (_) {}
            } else {
                console.log(`[Overlayer] Added annotation "${key}" with ${rects.length} rects, color: ${opts.color}`)
                try {
                    const payload = JSON.stringify({
                        type: 'anx-diagnostic-log',
                        level: 'info',
                        source: 'Foliate',
                        message: `Anotación visual dibujada: ${rects.length} rectángulos [${opts.color}]`,
                        details: { key, rectCount: rects.length, color: opts.color }
                    })
                    window.parent?.postMessage(payload, '*')
                } catch (_) {}
            }
        } catch (err) {
            console.error('[Overlayer] Error in add():', err)
            try {
                const payload = JSON.stringify({
                    type: 'anx-diagnostic-log',
                    level: 'error',
                    source: 'Foliate',
                    message: `Error al agregar anotación "${key}": ${err?.message || err}`,
                    details: { key, error: String(err), stack: err?.stack }
                })
                window.parent?.postMessage(payload, '*')
            } catch (_) {}
        }
    }
    remove(key) {
        if (!this.#map.has(key)) return
        this.#svg.removeChild(this.#map.get(key).element)
        this.#map.delete(key)
    }
    redraw() {
        for (const obj of this.#map.values()) {
            try {
                const { range, draw, options, element } = obj
                if (element && element.parentNode === this.#svg) {
                    this.#svg.removeChild(element)
                }
                const zoom = this.#zoom
                const rects = this.#extractRects(range, zoom)
                const el = draw(rects, options)
                this.#svg.append(el)
                obj.element = el
                obj.rects = rects
            } catch (err) {
                console.error('[Overlayer] Error in redraw():', err)
            }
        }
    }
    hitTest({ x, y }) {
        const arr = Array.from(this.#map.entries())
        // loop in reverse to hit more recently added items first
        for (let i = arr.length - 1; i >= 0; i--) {
            const [key, obj] = arr[i]
            for (const { left, top, right, bottom } of obj.rects)
                if (top <= y && left <= x && bottom > y && right > x)
                    return [key, obj.range]
        }
        return []
    }
    static underline(rects, options = {}) {
        let { color = '#e11d48', width: strokeWidth = 3, padding = 0, writingMode } = options
        color = sanitizeColor(color, '#e11d48')
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        if (writingMode === 'vertical-rl' || writingMode === 'vertical-lr')
            for (const { right, top, height } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute('x', right - strokeWidth / 2 + padding)
                el.setAttribute('y', top)
                el.setAttribute('height', height)
                el.setAttribute('width', strokeWidth)
                g.append(el)
            }
        else for (const { left, bottom, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left)
            el.setAttribute('y', bottom - strokeWidth / 2 + padding)
            el.setAttribute('height', strokeWidth)
            el.setAttribute('width', width)
            g.append(el)
        }
        return g
    }
    static strikethrough(rects, options = {}) {
        const { color = 'red', width: strokeWidth = 2, writingMode } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        if (writingMode === 'vertical-rl' || writingMode === 'vertical-lr')
            for (const { right, left, top, height } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute('x', (right + left) / 2)
                el.setAttribute('y', top)
                el.setAttribute('height', height)
                el.setAttribute('width', strokeWidth)
                g.append(el)
            }
        else for (const { left, top, bottom, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left)
            el.setAttribute('y', (top + bottom) / 2)
            el.setAttribute('height', strokeWidth)
            el.setAttribute('width', width)
            g.append(el)
        }
        return g
    }
    static squiggly(rects, options = {}) {
        const { color = 'red', width: strokeWidth = 2, padding = 0, writingMode } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', 'none')
        g.setAttribute('stroke', color)
        g.setAttribute('stroke-width', strokeWidth)
        const block = strokeWidth * 1.5
        if (writingMode === 'vertical-rl' || writingMode === 'vertical-lr')
            for (const { right, top, height } of rects) {
                const el = createSVGElement('path')
                const n = Math.round(height / block / 1.5)
                const inline = height / n
                const ls = Array.from({ length: n },
                    (_, i) => `l${i % 2 ? -block : block} ${inline}`).join('')
                el.setAttribute('d', `M${right - strokeWidth / 2 + padding} ${top}${ls}`)
                g.append(el)
            }
        else for (const { left, bottom, width } of rects) {
            const el = createSVGElement('path')
            const n = Math.round(width / block / 1.5)
            const inline = width / n
            const ls = Array.from({ length: n },
                (_, i) => `l${inline} ${i % 2 ? block : -block}`).join('')
            el.setAttribute('d', `M${left} ${bottom + strokeWidth / 2 + padding}${ls}`)
            g.append(el)
        }
        return g
    }
    static highlight(rects, options = {}) {
        let { color = '#66ccff', padding = 0 } = options
        color = sanitizeColor(color, '#66ccff')
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        g.style.opacity = 'var(--overlayer-highlight-opacity, .42)'
        g.style.mixBlendMode = 'var(--overlayer-highlight-blend-mode, multiply)'
        for (const { left, top, height, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left - padding)
            el.setAttribute('y', top - padding)
            el.setAttribute('height', height + padding * 2)
            el.setAttribute('width', width + padding * 2)
            g.append(el)
        }
        return g
    }
    static outline(rects, options = {}) {
        const { color = 'red', width: strokeWidth = 3, padding = 0, radius = 3 } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', 'none')
        g.setAttribute('stroke', color)
        g.setAttribute('stroke-width', strokeWidth)
        for (const { left, top, height, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left - padding)
            el.setAttribute('y', top - padding)
            el.setAttribute('height', height + padding * 2)
            el.setAttribute('width', width + padding * 2)
            el.setAttribute('rx', radius)
            g.append(el)
        }
        return g
    }
    // make an exact copy of an image in the overlay
    // one can then apply filters to the entire element, without affecting them;
    // it's a bit silly and probably better to just invert images twice
    // (though the color will be off in that case if you do heu-rotate)
    static copyImage([rect], options = {}) {
        const { src } = options
        const image = createSVGElement('image')
        const { left, top, height, width } = rect
        image.setAttribute('href', src)
        image.setAttribute('x', left)
        image.setAttribute('y', top)
        image.setAttribute('height', height)
        image.setAttribute('width', width)
        return image
    }
}
