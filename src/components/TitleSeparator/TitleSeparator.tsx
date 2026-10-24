import type { ReactNode } from 'react'
import styles from './style.module.scss'

interface Props {
    children: ReactNode
}

export default function TitleSeparator({ children }: Props) {
    return (
        <div className={styles.title}>
            <div className={styles.content}>{children}</div>
            <hr className={styles.line} aria-hidden="true" />
        </div>
    )
}
