import React from 'react';
import { Link } from 'react-router-dom';
import { CommandName } from './index';

import { useRef, useState, useEffect } from 'react';

function CmdList({ commands }) {
    const ref = useRef();
    const [{ height }, setBbox] = useState({});
    const [scroll, setScroll] = useState(0);

    const { length: quantity } = commands;
    const boxHeight = 20;
    const wrapperHeight = quantity * boxHeight;

    useEffect(() => {
        const handleResize = () => setBbox(ref.current.getBoundingClientRect());
        handleResize();
        window.addEventListener('resize', handleResize);

        const handleScroll = (e) => setScroll(e.target.scrollTop);
        ref.current.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('resize', handleResize);
            ref.current.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="cmd-list" ref={ref}>
            <div style={{ height: wrapperHeight }}>
                {commands.map((command, index) => {
                    const top = index * boxHeight;
                    const topBound = top + boxHeight > scroll;
                    const bottomBound = top - boxHeight < scroll + height;

                    return (topBound && bottomBound) ? (
                        <div
                            key={command.name}
                            style={{
                                position: 'absolute',
                                height: boxHeight,
                                top,
                                width: '100%',
                            }}
                        >
                            <Link
                                to={`/cmds/${encodeURIComponent(command.name)}`}
                            >
                                <CommandName command={command} />
                            </Link>
                        </div>
                    ) : false;
                })}
            </div>
        </div>
    );
}

export default CmdList;
