import { useState, useEffect } from 'react';

export function useLocalState(name, obj) {
    const [state, setState] = useState(() => {
        const storage = localStorage.getItem(name);
        if (storage) {
            return JSON.parse(storage);
        } else {
            return obj;
        }
    });

    useEffect(() => {
        localStorage.setItem(name, JSON.stringify(state));
    }, [state])

    return [state, setState];
}

export function useFetch() {
    const [password, setPassword] = useLocalState('password', '');
    const [admin, setAdmin] = useLocalState('admin', false);
    const fetchAPI = (url, options = {}) => new Promise((resolve, reject) => {
        const init = {
            ...options,
            headers: {
                'Authorization': `Basic ${btoa(`web:${password}`)}`,
                'Content-Type': 'application/json',
            },
            body: options.body && JSON.stringify(options.body),
        };
        fetch(`/api/${url}`, init)
            .then(res => res.json())
            .then(resolve)
            .catch(reject);
    });

    return { fetchAPI, password, setPassword, admin, setAdmin };
}
