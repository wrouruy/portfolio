import Image from 'next/image';
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
                <Image src={avatar_url || '/missing_texture.png'} width={170} height={170} alt='avatar' loading='eager' />
                <div>
                    <h1>@{username}</h1>
                    <h2>{email}</h2>
                </div>
            </div>
        </div>
    )
}