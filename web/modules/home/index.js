import React, { useState, useEffect } from 'react';
import marked from 'marked';

function Home() {
    const [readme, setReadme] = useState('');

    useEffect(() => {
        fetch('/api/readme')
            .then(res => res.text())
            .then(res => {
                setReadme(marked(res.replace(/\[\/\/\](.*?)\(__repo__\)[\S\s]*/, '')));
            })
            .catch(console.error);
    }, []);
    return (
        <div
            className="document"
            dangerouslySetInnerHTML={{__html: readme}}
        />
    );
}

export default Home;
