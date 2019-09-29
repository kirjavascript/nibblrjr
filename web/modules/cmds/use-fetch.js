import { useState, useEffect } from 'react';

function useLocalState(name, obj) {
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

export default function useFetch() {

}
