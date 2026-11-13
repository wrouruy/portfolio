'use client'
import ProjectsSection from '@/components/ProjectsSection/ProjectsSection';
import styles from './page.module.scss'

export default function Projects () {
    return (
        <div className={styles.projects}>
            <ProjectsSection />
        </div>
    )
}