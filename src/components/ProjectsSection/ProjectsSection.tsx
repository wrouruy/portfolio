import { useState, useEffect } from 'react'
import ProjectItem from '@/components/ProjectItem/ProjectItem'
import ErrorScreen from '@/components/ErrorScreen/ErrorScreen'
import TitleSeparator from '../TitleSeparator/TitleSeparator'
import Footer from '../Footer/Footer'

import { addError } from '@/lib/error-store'
import styles from './styles.module.scss'

interface Project {
    id: number,
    name: string,
    website_url: string,
    source_code_url: string,
    image_url: string,

    skills: {
        id: number,
        name: string
    }[]
}

export default function ProjectsSection() {
    const [loading, setLoad] = useState<boolean>(true);
    const [projects, setProjects] = useState<Project[] | null>(null)

    const fetchProjects = async () => {
        setLoad(true);
        try {
            const res = await fetch('/api/projects');
            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                const errorMessage = errorData?.message || `Error: ${res.status} ${res.statusText}`;
                
                addError(errorMessage);
                return;
            }

            const data = await res.json();
            if (!data.ok) {
                addError(data.message)
                return;
            }
            
            setProjects(data.projects);
        } catch(err: any) {
            addError(err.message || 'Please, check your internet connection')
            return;
        } finally {
            setLoad(false)
        }
    }

    useEffect(() => {
        fetchProjects();
    }, []);

    if (!projects && !loading)
        return <ErrorScreen
            message='REST API Error. Please reload the page'
            detail='GET /api/projects'
            onRetry={() => window.location.reload()}
        />

    return (
        <div className={styles.projects}>
            <TitleSeparator children={<p>Projects</p>} />

            {
                loading ? <div className={styles.loader}><div></div></div> :

                <div className={styles.grid}>
                    {projects?.map((e) => (
                        <ProjectItem
                            key={e.id}
                            name={e.name}
                            website_url={e.website_url}
                            source_code_url={e.source_code_url}
                            image_url={e.image_url}
                            skills={e.skills}
                        />
                    ))}
                </div>
            }
        </div>
    )
}