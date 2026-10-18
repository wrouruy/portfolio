'use client';
import { useState, useEffect } from 'react'

import GreetScreen from '@/components/GreetScreen/GreetScreen';
import ErrorAlert from '@/components/ErrorAlert/ErrorAlert';

import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen/ErrorScreen';

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
        bio: string,
        
        public_repos: number
    }
}

export default function App() {
    const [loading, setLoad] = useState<boolean>(true);
    const [response, setResponse] = useState<Response | null>(null);
    const [ errors, setErrors ] = useState<string[]>([]);

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
            } catch(err: any) {
                addError('Please, check your internet connection');
            } finally {
                setLoad(false);
            }
        })();
    }, []);

    if (loading)
        return <LoadingScreen />

    if (!response || !response.user)
        return
            <ErrorScreen message='REST API Error. Please reload the page' />

    return (
        <>
            <div className={styles.App}>
                <GreetScreen
                    username={response.user.login}
                    avatar_url={response.user.avatar_url}
                    email={response.user.email}   
                />
                
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
