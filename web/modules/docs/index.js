import React, { useState, useEffect } from 'react';
import marked from 'marked';

function Docs() {
    const [md, setMd] = useState('');

    useEffect(() => {
        fetch('/api/docs')
            .then(res => res.text())
            .then(res => {
                setMd(marked(res.split('(__docs__)').pop()));
                // jump to anchor
                if (window.location.hash.length) {
                    window.location.replace(window.location.hash);
                }
            })
            .catch(console.error);
    }, []);

    return (
        <div
            className="document"
            dangerouslySetInnerHTML={{__html: md}}
        />
    );
}
export default Docs;
