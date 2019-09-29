import React, { useEffect } from 'react';
import { useFetch } from './hooks';

export default function Default() {
    const { fetchAPI, password, setPassword, admin, setAdmin } = useFetch();

    useEffect(() => {
        fetchAPI('is-admin')
            .then(setAdmin)
            .catch(console.error);
    }, [password]);

    return (
        <div className="cmd-default">
            <input
                type="password"
                placeholder="admin pwd"
                value={password}
                className={admin ? 'admin' : 'error'}
                onChange={(e) => setPassword(e.target.value)}
            />
            <p>
                alternatively, try the{' '}
                <a
                    href="https://www.github.com/kirjavascript/nibblrjr.vim"
                    target="_blank"
                >
                    vim plugin
                </a>
            </p>
        </div>
    );
}
