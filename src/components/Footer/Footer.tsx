import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import styles from './styles.module.scss';

export default function Footer () {
    return (
        <footer className={styles.footer}>
            <div>
                <p>made with</p>
                <FontAwesomeIcon icon={faHeart} style={{ color: 'rgb(197, 64, 118)', width: '20px' }}/>
                <p>in</p>
                <svg width={30} height={20} style={{ borderRadius: '5px' }}>
                    <rect width="100%" height="50%" fill="#6578c4" />
                    <rect width="100%" height="50%" y="50%" fill="#e9fa76" />
                </svg>
            </div>
            <div className={styles.linksContainer}>
                <a href='https://github.com/wrouruy'> <FontAwesomeIcon icon={faGithub} />   </a>
                <a href='mailto:wroyruy@gmail.com'>   <FontAwesomeIcon icon={faEnvelope} /> </a>
            </div>
        </footer>
    )
}