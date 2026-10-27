'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'

import TitleSeparator from '../TitleSeparator/TitleSeparator'
import { addError } from '@/lib/error-store'
import styles from './styles.module.scss'

interface Response {
    ok: boolean,
    message ?: string,
    skills ?: Skill[]
}

interface Skill {
    id: number,
    name: string,
    icon_url: string,
    category_id: number,
    sort_order: number
}

const SKILL_CATEGORIES = [
    { id: 1, label: 'Languages' },
    { id: 2, label: 'Frameworks' },
    { id: 3, label: 'DataBases' },
    { id: 4, label: 'Tools' },
    { id: 5, label: 'Platforms' },
];

export default function SkillsSection () {
    const [loading, setLoad] = useState<boolean>(true);
    const [response, setResponse] = useState<Response | null>(null);
    const [categoryId, setCategoryId] = useState<number | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    const skills = useMemo(() => {
        const allSkills = response?.skills ?? [];

        return categoryId === null
            ? allSkills
            : allSkills.filter((skill) => Number(skill.category_id) === categoryId);
    }, [response, categoryId]);

    async function fetchSkills () {
        setLoad(true);
        try {
            const res = await fetch('/api/skills');
            const data: Response = await res.json();

            if (!data.ok) {
                addError(data.message ?? 'Failed to load skills', { title: 'GET /api/skills' });
                return;
            }
            if (data.skills)
                data.skills.sort((a, b) => {
                    const orderA = a.sort_order;
                    const orderB = b.sort_order;
                    return orderA - orderB;
                });
            setResponse(data);
        } catch (err) {
            addError(
                err instanceof Error ? err.message : 'Please, check your internet connection',
                { title: 'Network error' },
            );
        } finally {
            setLoad(false);
        }
    }

    useEffect(() => {
        fetchSkills();
    }, []);

    useEffect(() => {
        if (loading || !response?.ok || !containerRef.current) return;

        const container = containerRef.current;

        if (typeof IntersectionObserver === 'undefined') {
            container.classList.add(styles.revealed);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;

            observer.disconnect();
            container.classList.add(styles.revealed);
        }, { threshold: 0.2 });

        observer.observe(container);

        return () => observer.disconnect();
    }, [loading, response]);

    return (
        <div className={styles.skillsSection}>
            <section>
                <TitleSeparator>
                    <h1><span>Hard</span> Skills</h1>
                </TitleSeparator>
                
                {
                loading ?
                    <div className={styles.loader}></div> :

                    !response?.ok ?
                        <div className={styles.error}> <h1>Failed to load skills</h1> <button onClick={fetchSkills}>reload</button></div> :
                        <div className={styles.mainContainer}>
                            <div className={styles.filterContainer}>
                                <button
                                    className={categoryId === null ? styles.active : undefined}
                                    aria-pressed={categoryId === null}
                                    onClick={() => setCategoryId(null)}
                                > All </button>
                                {
                                    SKILL_CATEGORIES.map((category) => (
                                        <button
                                            key={category.id}
                                            className={categoryId === category.id ? styles.active : undefined}
                                            aria-pressed={categoryId === category.id}
                                            onClick={() => setCategoryId(category.id)}
                                        >
                                            {category.label}
                                        </button>
                                    ))
                                }
                            </div>
                            <div
                                ref={containerRef}
                                className={styles.skillsContainer}
                            >
                                {
                                    skills.map((e, index) => (
                                        <div
                                            key={e.id}
                                            className={styles.skillItem}
                                            style={{ '--i': index } as CSSProperties}
                                        >
                                            <Image
                                                src={e.icon_url}
                                                width={44}
                                                height={44}
                                                alt=""
                                                className={styles.skillIcon}
                                            />
                                            <span className={styles.skillName}>{e.name}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                }
            </section>
        </div>
    )
}
