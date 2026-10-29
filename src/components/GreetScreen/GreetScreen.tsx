import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import ThreeBackground from '@/components/ThreeBackground/ThreeBackground'
import styles from './styles.module.scss'

interface Props {
    username: string,
    avatar_url: string,
    email: string,
    isAnimated: boolean
}

export default function GreetScreen({ username, avatar_url, email, isAnimated }: Props) {
    return (
        <div className={styles.greetScreen}>
            <ThreeBackground
                fov={30}
                animated={isAnimated}
            />

            <div className={styles.row}>
                <section>
                    <Image src={avatar_url || '/missing_texture.png'} width={170} height={170} alt='avatar' loading='eager' />
                    <div className={styles.column}>
                        <h1>@{username}</h1>
                        <h2>{email}</h2>
                    </div>
                </section>
                <section>
                    <a href='/projects' className={styles.projectsLink}>
                        <FontAwesomeIcon icon={faProjectDiagram}/> <span>View Projects</span>
                    </a>
                </section>
            </div>
        </div>
    )
}