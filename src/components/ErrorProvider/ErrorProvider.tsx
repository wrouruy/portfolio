'use client';

import ErrorAlert from '@/components/ErrorAlert/ErrorAlert';
import { useErrors } from '@/lib/error-store';

import styles from './styles.module.scss';

/**
 * Renders every error from the global store as a fixed popup.
 * Mounted once in app/layout.tsx, so alerts are visible on every page
 * regardless of which component reported them.
 */
export default function ErrorProvider() {
    const { errors, dismissError } = useErrors();

    return (
        // The live region is always rendered so screen readers announce
        // alerts that appear later.
        <div className={styles.stack} role="region" aria-live="assertive" aria-label="Error notifications">
            {errors.map((error) => (
                <ErrorAlert
                    key={error.id}
                    message={error.message}
                    title={error.title}
                    onClose={() => dismissError(error.id)}
                />
            ))}
        </div>
    );
}
