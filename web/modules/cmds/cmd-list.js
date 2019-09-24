import React from 'react';
import { Link } from 'react-router-dom';

function CmdList({ commands }) {
    return (
        <div className="cmd-list">
            {commands.map((command) => {
                return <div key={command.name}>
                    <Link
                        to={`/cmds/${encodeURIComponent(command.name)}`}
                    >
                        {command.name}
                    </Link>
                    {command.starred && <span className="star"> ★</span>}
                    {' '}
                    {command.locked && (
                        <svg width="8" height="8" viewBox="0 0 20 20">
                            <path
                                fill="#006ADC"
                                d="m3,9h1V6a5,5 0 0,1 12,0V9h1v11H3M14,9V6a4,4 0 1,0-8,0v3"
                            />
                        </svg>
                    )}
                </div>;
            })}
        </div>
    );
}

export default CmdList;
