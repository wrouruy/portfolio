'use client'

import { useRef, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { prefersReducedMotion } from '@/lib/motion'
import styles from './styles.module.scss'

interface Props {
    greeting: ReactNode
    children: ReactNode
}

export default function GreetingTransition({ greeting, children }: Props) {
    const root = useRef<HTMLDivElement>(null)
    const hero = useRef<HTMLDivElement>(null)
    const inner = useRef<HTMLDivElement>(null)
    const veil = useRef<HTMLDivElement>(null)
    const content = useRef<HTMLDivElement>(null)

    useGSAP(() => {
        if (prefersReducedMotion()) return
        if (!hero.current || !inner.current || !veil.current || !content.current) return

        const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
                trigger: hero.current,
                start: 'top top',
                end: '+=100%',
                scrub: true,
                pin: true,
                pinSpacing: false,
                anticipatePin: 1,
                invalidateOnRefresh: true,
            },
        })

        tl.to(
            inner.current,
            {
                scale: 0.9,
                yPercent: -6,
                rotateX: 8,
                transformPerspective: 1400,
                transformOrigin: 'center top',
                duration: 1,
                ease: 'power1.in',
            },
            0,
        )
            .to(veil.current, { opacity: 0.72, duration: 1 }, 0)
            .to(
                content.current,
                { borderTopLeftRadius: 0, borderTopRightRadius: 0, duration: 1 },
                0,
            )
    }, { scope: root })

    return (
        <div ref={root} className={styles.root}>
            <div ref={hero} className={styles.hero}>
                <div ref={inner} className={styles.inner}>
                    {greeting}
                </div>
                <div ref={veil} className={styles.veil} aria-hidden='true' />
            </div>

            <div ref={content} className={styles.content}>
                {children}
            </div>
        </div>
    )
}
