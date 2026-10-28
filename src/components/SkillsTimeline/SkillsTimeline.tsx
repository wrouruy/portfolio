'use client'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import TitleSeparator from '../TitleSeparator/TitleSeparator'
import { prefersReducedMotion } from '@/lib/motion'
import { dataSkills } from './data'
import type { SkillMilestone } from './types'
import styles from './styles.module.scss'

export type { SkillMilestone } from './types'

interface Props {
    title?: ReactNode
    className?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Point {
    year: number
    month: number | null
    ts: number
}

function parsePoint (value?: string | null): Point | null {
    if (!value) return null

    const match = /^(\d{4})(?:-(\d{1,2}))?/.exec(value.trim())
    if (!match) return null

    const year = Number(match[1])
    const month = match[2] ? Number(match[2]) : null

    return {
        year,
        month,
        ts: Date.UTC(year, month ? month - 1 : 0, 1),
    }
}

function formatPoint (value: string | null | undefined, fallback: string) {
    if (!value) return fallback

    const point = parsePoint(value)
    if (!point) return value
    if (point.month === null) return String(point.year)

    return `${MONTHS[point.month - 1] ?? ''} ${point.year}`.trim()
}

function levelLabel (level: number) {
    if (level <= 35) return 'learning'
    if (level <= 60) return 'practicing'
    if (level <= 80) return 'confident'
    return 'advanced'
}

function clampLevel (level: number) {
    if (!Number.isFinite(level)) return 0
    return Math.max(0, Math.min(100, Math.round(level)))
}

export default function SkillsTimeline ({ title, className }: Props) {
    const listRef = useRef<HTMLOListElement>(null)
    const [progress, setProgress] = useState(0)
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<SkillMilestone[]>([])

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const data = await dataSkills()
            if (cancelled) return

            setItems(data)
            setLoading(false)
        })()

        return () => { cancelled = true }
    }, [])

    const entries = useMemo(() => {
        const sorted = [...items].sort((a, b) => {
            const aTs = parsePoint(a.start_date || '')?.ts ?? 0
            const bTs = parsePoint(b.start_date || '')?.ts ?? 0
            return aTs - bTs
        })

        return sorted.map((item, index) => {
            const start = parsePoint(item.start_date)
            const year = start?.year ?? null
            const previousYear = index > 0 ? parsePoint(sorted[index - 1].start_date)?.year ?? null : null
            const isYearStart = index === 0 || year !== previousYear
            const level = clampLevel(item.level)
            const icon_url = item.icon_url;

            return {
                item,
                level,
                year,
                isYearStart,
                ongoing: !item.end_date,
                fromLabel: formatPoint(item.start_date, '—'),
                toLabel: formatPoint(item.end_date, 'now'),
                // accent: item.color ?? ACCENTS[index % ACCENTS.length],
                levelLabel: levelLabel(level),
                initials: item.short ?? item.name.slice(0, 2),
                icon_url
            }
        })
    }, [items])

    const firstYear = entries[0]?.year
    const lastYear = entries[entries.length - 1]?.year

    // Reveal cards once they enter the viewport.
    useEffect(() => {
        const root = listRef.current
        if (!root) return

        const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))

        if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
            rows.forEach((row) => row.classList.add(styles.revealed))
            return
        }

        const observer = new IntersectionObserver((observed) => {
            observed.forEach((entry) => {
                if (!entry.isIntersecting) return

                entry.target.classList.add(styles.revealed)
                observer.unobserve(entry.target)
            })
        }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' })

        rows.forEach((row) => observer.observe(row))

        return () => observer.disconnect()
    }, [entries.length])

    // Draw the spine as the list scrolls through the viewport.
    useEffect(() => {
        const root = listRef.current
        if (!root) return

        if (prefersReducedMotion()) return

        let frame = 0

        const measure = () => {
            frame = 0

            const rect = root.getBoundingClientRect()
            const viewport = window.innerHeight
            const passed = viewport * 0.75 - rect.top
            const total = rect.height + viewport * 0.25

            setProgress(Math.max(0, Math.min(1, passed / total)))
        }

        const requestMeasure = () => {
            if (frame) return
            frame = window.requestAnimationFrame(measure)
        }

        requestMeasure()
        window.addEventListener('scroll', requestMeasure, { passive: true })
        window.addEventListener('resize', requestMeasure)

        return () => {
            window.removeEventListener('scroll', requestMeasure)
            window.removeEventListener('resize', requestMeasure)
            if (frame) window.cancelAnimationFrame(frame)
        }
    }, [entries.length]);

    const categoryIdToString = ['Language', 'Framework or Library', 'DataBase', 'Tool', 'Platform']

    return (
        <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
            <section className={styles.section}>
                <TitleSeparator>
                    {title ?? <h1>Skills <span>Timeline</span></h1>}
                </TitleSeparator>

                {loading ? (
                    <div className={styles.loaderBox}>
                        <div
                            className={styles.loader}
                            role="status"
                            aria-label="Loading skills timeline"
                        />
                    </div>
                ) : entries.length === 0 ? (
                    <p className={styles.empty}>
                        No milestones yet.
                    </p>
                ) : (
                    <>
                        <div className={styles.summary}>
                            <span className={styles.summaryCount}>
                                {String(entries.length).padStart(2, '0')}
                            </span>
                            <span>milestones</span>
                            <span className={styles.summaryRule} aria-hidden="true" />
                            <span>{firstYear ?? '—'} → {lastYear ?? 'now'}</span>
                        </div>

                        <ol
                            ref={listRef}
                            className={styles.timeline}
                            style={{ '--progress': progress } as CSSProperties}
                            aria-label="Skill timeline"
                        >
                            <span className={styles.spine} aria-hidden="true" />
                            <span className={styles.spineProgress} aria-hidden="true" />

                            {entries.map((entry) => {
                                const { item } = entry

                                return (
                                    <li
                                        key={item.id}
                                        className={styles.row}
                                        data-reveal
                                        style={{
                                            '--level': `${entry.level}%`,
                                        } as CSSProperties}
                                    >
                                        <div className={styles.year} aria-hidden={!entry.isYearStart}>
                                            {entry.isYearStart && (
                                                <>
                                                    <span className={styles.yearNumber}>{entry.year ?? '—'}</span>
                                                    <span className={styles.yearLabel}>year</span>
                                                </>
                                            )}
                                        </div>

                                        <div className={styles.rail} aria-hidden="true">
                                            <span
                                                className={styles.node}
                                                data-current={entry.ongoing || undefined}
                                            />
                                        </div>

                                        <article className={styles.card}>
                                            <header className={styles.cardHeader}>
                                                <Image src={item.icon_url} width={50} height={50} alt={item.name} />

                                                <div className={styles.heading}>
                                                    <h2>{item.name}</h2>
                                                    <p className={styles.period}>
                                                        <span>{entry.fromLabel}</span>
                                                        to
                                                        <span>{entry.toLabel}</span>
                                                        <span className={styles.separator}>·</span>
                                                        {entry.levelLabel}
                                                    </p>
                                                </div>

                                                <span className={styles.percent}>
                                                    {entry.level}
                                                    <small>%</small>
                                                </span>
                                            </header>

                                            {item.description && (
                                                <p className={styles.description}>{item.description}</p>
                                            )}

                                            <div
                                                className={styles.meter}
                                                role="progressbar"
                                                aria-label={`${item.name} proficiency`}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuenow={entry.level}
                                            >
                                                <span className={styles.meterFill} style={{ '--level': entry.level + '%' } as CSSProperties} />
                                            </div>

                                            {(item.category_id || item.tags?.length || entry.ongoing) && (
                                                <footer className={styles.meta}>
                                                    {item.category_id && (
                                                        <span className={styles.category}>{categoryIdToString[item.category_id - 1]}</span>
                                                    )}

                                                    {item.tags?.map((tag) => (
                                                        <span key={tag} className={styles.tag}>{tag}</span>
                                                    ))}

                                                    {entry.ongoing && (
                                                        <span className={styles.current}>
                                                            <span className={styles.currentDot} aria-hidden="true" />
                                                            in progress
                                                        </span>
                                                    )}
                                                </footer>
                                            )}
                                        </article>
                                    </li>
                                )
                            })}
                        </ol>
                    </>
                )}
            </section>
        </div>
    )
}
