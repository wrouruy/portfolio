import { useState, useEffect } from 'react'
import styles from './styles.module.scss'

export default function LoadingScreen() {
    useEffect(() => {

    }, []);

    return (
        <div className={styles.loadingScreen}>
            <div></div>
        </div>
    )
}