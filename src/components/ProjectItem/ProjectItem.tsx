import Image from 'next/image'

import styles from './styles.module.scss'

interface Props {
    name: string,
    website_url: string,
    source_code_url: string,
    image_url: string,

    skills: {
        id: number,
        name: string
    }[]
}

export default function ProjectItem({ name, website_url, source_code_url, image_url, skills }: Props) {
    return (
        <article className={styles.projectItem}>
            <div className={styles.preview}>
                {image_url ? (
                    <Image
                        src={image_url}
                        alt={name}
                        fill
                        sizes="(max-width: 760px) 92vw, (max-width: 1280px) 46vw, 600px"
                        className={styles.image}
                    />
                ) : (
                    <span className={styles.imageFallback} aria-hidden="true">no preview</span>
                )}
            </div>

            <div className={styles.body}>
                <div className={styles.header}>
                    <h2 className={styles.name}>{name}</h2>

                    {(website_url || source_code_url) && (
                        <div className={styles.links}>
                            {website_url && (
                                <a
                                    href={website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.link}
                                >
                                    Website <span aria-hidden="true">↗</span>
                                </a>
                            )}
                            {source_code_url && (
                                <a
                                    href={source_code_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.link}
                                >
                                    Source <span aria-hidden="true">↗</span>
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {skills?.length > 0 && (
                    <ul className={styles.skills}>
                        {skills.map((e) => (
                            <li key={e.id}>{e.name}</li>
                        ))}
                    </ul>
                )}
            </div>
        </article>
    )
}
