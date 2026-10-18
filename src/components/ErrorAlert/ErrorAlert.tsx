import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import style from './styles.module.scss';

interface Props {
    message: string,
    onClose(): void,
    index: number,
}

export default function ErrorAlert({ message, onClose, index = 0 }: Props) {
    return (
        <div className={style.ErrorAlert} style={{ top: 10 + index * 50  }}>
            <p>{message}</p>
            <button onClick={onClose}>
                <FontAwesomeIcon icon={faXmark} />
            </button>
        </div>
    )
}