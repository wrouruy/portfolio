import Image from 'next/image';
import ThreeBackground from '@/components/ThreeBackground/ThreeBackground'
import styles from './styles.module.scss'

interface Props {
    username: string,
    avatar_url: string,
    email: string
}

export default function GreetScreen({ username, avatar_url, email }: Props) {
    return (
        <div className={styles.greetScreen}>
            <ThreeBackground
                fov={35}
            />

            <div className={styles.row}>
                <Image src={avatar_url} width={180} height={180} alt='avatar' loading='eager' />
                <div>
                    <h1>@{username}</h1>
                    <h2>{email}</h2>
                </div>
            </div>
        </div>
    )
}