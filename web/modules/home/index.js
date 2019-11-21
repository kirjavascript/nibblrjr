import React, { useState, useEffect, useRef } from 'react';
import marked from 'marked';

function Home() {
    const [readme, setReadme] = useState('');
    const ref = useRef();

    useEffect(() => {
        fetch('/api/readme')
            .then(res => res.text())
            .then(res => {
                setReadme(marked(res.replace(/\[\/\/\](.*?)\(__repo__\)[\S\s]*/, '')));
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        [...ref.current.querySelectorAll('a')]
            .forEach(node => node.setAttribute('target', '_blank'));
    }, [readme]);

    return (
        <div
            ref={ref}
            className="document"
            dangerouslySetInnerHTML={{__html: readme}}
        />
    );
}

export default Home;
