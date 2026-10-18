import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';

import ErrorSign3D from '@/components/ErrorSign3D/ErrorSign3D';

import styles from './styles.module.scss';

interface Props {
    /** Human readable description of what went wrong. */
    message: string;
    /** Short heading above the message. */
    title?: string;
    /** Technical hint, e.g. an HTTP status or the failed endpoint. */
    detail?: string;
    /** Renders the retry button together with `onRetry`. */
    retryLabel?: string;
    onRetry?: () => void;
    className?: string;
}

export default function ErrorScreen({
    message,
    title = 'Something went wrong',
    detail,
    retryLabel = 'Try again',
    onRetry,
    className,
}: Props) {
    return (
        <div
            className={[styles.errorScreen, className].filter(Boolean).join(' ')}
            role="alert"
        >
            <div className={styles.scene}>
                <ErrorSign3D />
            </div>

            <div className={styles.content}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.message}>{message}</p>
                {detail && <p className={styles.detail}>{detail}</p>}

                {onRetry && (
                    <button type="button" className={styles.retry} onClick={onRetry}>
                        <FontAwesomeIcon icon={faRotateRight} />
                        <span>{retryLabel}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
