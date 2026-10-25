import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import style from './styles.module.scss';

export interface Props {
    message: string;
    onClose(): void;
    /** Optional heading above the message. */
    title?: string;
}

export default function ErrorAlert({ message, onClose, title }: Props) {
    return (
        <div className={style.ErrorAlert} role="alert">
            <div className={style.text}>
                {title && <strong className={style.title}>{title}</strong>}
                <p>{message}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Dismiss error">
                <FontAwesomeIcon icon={faXmark} />
            </button>
        </div>
    )
}
