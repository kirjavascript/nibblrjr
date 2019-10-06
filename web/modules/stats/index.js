import React, { useEffect, useRef, useState, useMemo } from 'react';
import BarChart from './barchart';
import Select from '../select';

// stats main / server / channel as FILTER w/ URL / time period
// open code in modal on mobil

function Stats({ history, location }) {
    const node = useRef();
    const [base, setBase] = useState({ servers: [] });

    const path = useMemo(() => location.pathname.split('/'), []);

    const [server, setServer] = useState(path[2] || '');
    const [channel, setChannel] = useState(decodeURIComponent(path[3] || ''))
    const [month, setMonth] = useState(path[4] || '');

    useEffect(() => {
        history.replace(
            [
                '/stats',
                (server || channel || month) ? '/' : '',
                server,
                (channel || month) ? '/' : '',
                encodeURIComponent(channel),
                month ? '/' : '',
                month
            ].join('')
        );
    }, [server, channel, month]);

    useEffect(() => {
        fetch('/api/stats/base')
            .then(res => res.json())
            .then(setBase)
            .catch(console.error);
    }, [month]);

    useEffect(() => {
        const chart = new BarChart(node.current);

        fetch('/api/stats/activity')
            .then(res => res.json())
            .then(res => {
                chart
                    .data(res.reverse(), d => d.name)
                    .render();
            })
            .catch(console.error);
    }, []);

    return (
        <div className="stats">
            <div className="stats-filter">
                <Select
                    value={server}
                    items={[
                        {label: 'servers', value: ''},
                        ...base.servers.map(({ server }) => (
                            { label: server, value: server }
                        ))
                    ]}
                    onChange={(e) => {
                        setServer(e.target.value)
                        if (e.target.value) {
                            setChannel('');
                        }
                    }}
                />
                <Select
                    value={channel}
                    items={[
                        {label: 'channels', value: ''},
                        ...(
                            base.servers.reduce((a, c) => {
                                if (server === '' || c.server === server) {
                                    a.push(...c.channels.map(channel => (
                                        { label: channel, value: channel }
                                    )));
                                }
                                return a;
                            }, [])
                        )
                    ]}
                    onChange={(e) => setChannel(e.target.value)}
                />
                <Select
                    value={month}
                    items={[
                        {label: 'this month', value: ''},

                    ]}
                    onChange={(e) => setMonth(e.target.value)}
                />
            </div>
            <div ref={node} />
            <h4>commands</h4>
            <pre>
                {JSON.stringify([server, channel, month, base],0,4)}
            </pre>
        </div>
    );
}

export default Stats;
