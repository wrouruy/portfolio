'use client';
import { useState, useEffect, useSyncExternalStore } from 'react'

import GreetScreen from '@/components/GreetScreen/GreetScreen';
import GreetingTransition from '@/components/GreetingTransition/GreetingTransition';
import ErrorAlert from '@/components/ErrorAlert/ErrorAlert';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen/ErrorScreen';
import AboutSection from '@/components/AboutSection/AboutSection';

import styles from './page.module.scss'

interface Response {
    ok: boolean,
    message ?: string, 
    user ?: {
        login: string,
        avatar_url: string,
        html_url: string,
        name: string,
        location: string,
        email: string,
    }
}

function greetingIsOnScreen() {
    return window.scrollY < 1;
}

function subscribeToViewport(onChange: () => void) {
    window.addEventListener('scroll', onChange, { passive: true });
    window.addEventListener('resize', onChange);

    return () => {
        window.removeEventListener('scroll', onChange);
        window.removeEventListener('resize', onChange);
    };
}

export default function App() {
    const [loading, setLoad] = useState<boolean>(true);
    const [response, setResponse] = useState<Response | null>(null);
    const [ errors, setErrors ] = useState<string[]>([]);

    const animatedThree = useSyncExternalStore(
        subscribeToViewport,
        greetingIsOnScreen,
        () => true,
    );

    function addError(message: string) {
        setErrors(prev => [ ...prev, message]);
    }

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/user');
                const data = await res.json();
                if (!data.ok)
                    addError(data.message);

                setResponse(data);
            } catch {
                addError('Please, check your internet connection');
            } finally {
                setLoad(false);
            }
        })();
    }, []);

    if (loading)
        return <LoadingScreen />

    if (!response || !response.user)
        return <ErrorScreen message='REST API Error. Please reload the page' />

    return (
        <>
            <div className={styles.App}>
                <GreetingTransition
                    greeting={
                        <GreetScreen
                            username={response.user.login}
                            avatar_url={response.user.avatar_url}
                            email={response.user.email}
                            isAnimated={animatedThree}
                        />
                    }
                >
                    <div className={styles.contentContainer}>
                        <AboutSection />
                    </div>
                </GreetingTransition>
            </div>

        { errors && errors.length > 0 && (
            errors.map((e, i) =>
                <ErrorAlert
                    onClose={() => setErrors(e => e && e.filter((_, index) => index !== i))}
                    message={e}
                    index={i}
                    key={i}
                />)
        )}
        </>
    )
}
