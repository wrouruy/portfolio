import styles from './style.module.scss'

interface Props { text: string };

export default function TitleSeparator({ text }: Props) {
    return (
        <div className={styles.title}>
            <span>{text}</span>
        </div>
    )
}