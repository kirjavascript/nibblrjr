import React from 'react';
import { Link } from 'react-router-dom';
import Lock from './lock';

import { useRef, useState, useEffect } from 'react';

function CmdList({ commands }) {
    const ref = useRef();
    const [{ height, width }, setBbox] = useState({});
    const [scroll, setScroll] = useState();

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

    let keyIndex = 0;

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
                            }}
                        >
                            <Link
                                to={`/cmds/${encodeURIComponent(command.name)}`}
                            >
                                {command.name}
                                {command.starred && <span className="star"> ★</span>}
                                {' '}
                                {command.locked && <Lock />}
                            </Link>
                        </div>
                    ) : false;
                })}
            </div>
        </div>
    );
}

function _CmdList({ commands }) {
    return (
        <div className="cmd-list">
            {commands.map((command) => {
                return <div key={command.name}>
                    <Link
                        to={`/cmds/${encodeURIComponent(command.name)}`}
                    >
                        {command.name}
                        {command.starred && <span className="star"> ★</span>}
                        {' '}
                        {command.locked && <Lock />}
                    </Link>
                </div>;
            })}
        </div>
    );
}

export default CmdList;
