import React, { useState, useEffect, useRef } from 'react';
import marked from 'marked';

function Docs() {
    const [md, setMd] = useState('');
    const ref = useRef();

    useEffect(() => {
        fetch('/api/docs')
            .then(res => res.text())
            .then(res => {
                setMd(marked(res.split('(__docs__)').pop()));
                // jump to anchor
                if (window.location.hash.length) {
                    location.replace(window.location.hash);
                }
            })
            .catch(err => {
                console.error(err);
            });
    }, []);

    return (
        <div
            className="docs"
            ref={ref}
            dangerouslySetInnerHTML={{__html: md}}
        />
    );
}
export default Docs;
