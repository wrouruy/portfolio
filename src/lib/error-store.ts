'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Global error store.
 *
 * Errors are shown by <ErrorProvider /> (mounted once in app/layout.tsx),
 * so any client component — at any depth — can report an error:
 *
 *   import { addError } from '@/lib/error-store';
 *
 *   addError('Please, check your internet connection');
 *   addError('Skills are unavailable', { title: 'API error' });
 *
 * Inside React components you can also use the hook:
 *
 *   const { errors, addError, dismissError, clearErrors } = useErrors();
 */

export interface AppError {
    id: number;
    message: string;
    title?: string;
    createdAt: number;
}

export interface AddErrorOptions {
    /** Optional heading rendered above the message. */
    title?: string;
}

/** Older alerts are dropped when there are more than this many. */
const MAX_VISIBLE_ERRORS = 5;

const EMPTY: readonly AppError[] = [];

let errors: readonly AppError[] = EMPTY;
let nextId = 1;

const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getErrors(): readonly AppError[] {
    return errors;
}

/** Server snapshot must be referentially stable. */
export function getServerErrors(): readonly AppError[] {
    return EMPTY;
}

/**
 * Adds an error alert. Identical messages are de-duplicated, so a component
 * that reports the same failure twice won't stack identical popups.
 */
export function addError(message: string, options: AddErrorOptions = {}): number {
    const text = String(message ?? '').trim();
    if (!text) return -1;

    const duplicate = errors.find((error) => error.message === text);
    if (duplicate) return duplicate.id;

    const error: AppError = {
        id: nextId++,
        message: text,
        title: options.title,
        createdAt: Date.now(),
    };

    errors = [...errors, error].slice(-MAX_VISIBLE_ERRORS);
    emit();

    return error.id;
}

export function dismissError(id: number) {
    const next = errors.filter((error) => error.id !== id);
    if (next.length === errors.length) return;

    errors = next.length > 0 ? next : EMPTY;
    emit();
}

export function clearErrors() {
    if (errors.length === 0) return;

    errors = EMPTY;
    emit();
}

/** Reactive access to the store for components. */
export function useErrors() {
    const list = useSyncExternalStore(subscribe, getErrors, getServerErrors);

    const dismiss = useCallback((id: number) => dismissError(id), []);
    const clear = useCallback(() => clearErrors(), []);

    return useMemo(
        () => ({
            errors: list,
            addError,
            dismissError: dismiss,
            clearErrors: clear,
        }),
        [list, dismiss, clear],
    );
}
