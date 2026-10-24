import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faLeetcode } from '@fortawesome/free-brands-svg-icons';
import PhotoSlider from '../PhotoSlider/PhotoSlider';
import styles from './styles.module.scss'
import TitleSeparator from '../TitleSeparator/TitleSeparator';

export default function AboutSection () {
    return (
        <div className={styles.AboutMe}>
            <section>
                <TitleSeparator children={<h1>Who <span>am</span> <div>I<span>?</span></div></h1>} />
                <PhotoSlider />
                <p>
                    Hello, stranger! <span>My name is Andrii</span>, a <span>Backend developer living in the Ukraine. </span><br/>
                    I'm driven by a deep curiosity to learn and solve problems, whether it's debugging a tricky system or building something from scratch. I thrive in environments where I can explore
                    new ideas and turn challenges into opportunities for growth.

                    One of my proudest achievements is implementing a Redis-based database system I call <a href='/projects/darko.db'>"darko.db"</a>, which I designed to streamline data management. I'm also passionate about creating 
                    tools that simplify everyday tasks—like the <a href='/projects/noteway'>"Noteway"</a> service, a note-sharing platform I built to help users organize their thoughts.  

                    While I specialize in **backend development**, I enjoy experimenting with **frontend** concepts too. I've also dipped my toes into <strong>**C++**</strong> and <strong>**Golang**</strong>, and I'm always eager to 
                    expand my toolkit.   

                    My journey in app development is fueled by a love for solving problems and building meaningful solutions. I'm excited to keep learning, growing, and creating—because every challenge 
                    is a chance to innovate.
                </p>
                <div className={styles.Links}>
                    <a href='https://github.com/wrouruy'> <FontAwesomeIcon icon={faGithub}/> Github</a>
                    <a href='https://leetcode.com/u/wrouruy/'> <FontAwesomeIcon icon={faLeetcode}/> LeetCode</a>
                </div>
            </section>
        </div>
    )
}