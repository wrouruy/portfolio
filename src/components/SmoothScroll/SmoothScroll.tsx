'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { prefersReducedMotion } from '@/lib/motion'

export default function SmoothScroll() {
    useEffect(() => {
        if (prefersReducedMotion()) return

        const lenis = new Lenis({
            autoRaf: false,
            lerp: 0.1,
        })

        window.__lenis = lenis

        const onScroll = () => ScrollTrigger.update()
        lenis.on('scroll', onScroll)

        const raf = (time: number) => lenis.raf(time * 1000)
        gsap.ticker.add(raf)
        gsap.ticker.lagSmoothing(0)

        const refresh = () => ScrollTrigger.refresh()
        window.addEventListener('load', refresh)

        let resizeFrame = 0
        const resizeObserver = new ResizeObserver(() => {
            if (resizeFrame) return
            resizeFrame = requestAnimationFrame(() => {
                resizeFrame = 0
                lenis.resize()
            })
        })
        resizeObserver.observe(document.body)

        return () => {
            window.removeEventListener('load', refresh)
            resizeObserver.disconnect()
            if (resizeFrame) cancelAnimationFrame(resizeFrame)
            lenis.off('scroll', onScroll)
            gsap.ticker.remove(raf)
            lenis.destroy()
            delete window.__lenis
        }
    }, [])

    return null
}
