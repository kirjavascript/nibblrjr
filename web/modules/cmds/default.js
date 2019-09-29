import React from 'react';

export default function Default() {
    return (
        <div className="cmd-default">
            <input
                type="password"
                placeholder="admin pwd"
            />
            <p>
                alternatively, try the{' '}
                <a
                    href="https://www.github.com/kirjavascript/nibblrjr.vim"
                >
                    vim plugin
                </a>
            </p>
        </div>
    );
}
