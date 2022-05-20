import React from 'react';

function Lock() {
    return (
        <span title="locked">
            <svg className="lock" width="10" height="10" viewBox="0 0 20 20">
                <path
                    fill="#07A"
                    d="m3,9h1V6a5,5 0 0,1 12,0V9h1v11H3M14,9V6a4,4 0 1,0-8,0v3"
                />
            </svg>
        </span>
    );
}

export default Lock;
