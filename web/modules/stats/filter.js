import React, { useEffect, useState, useMemo } from 'react';
import Select from '../select';

import format from 'date-fns/format';
import subMonths from 'date-fns/sub_months';

function Filter({ onMonth, onChange, base, history, location }) {
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
                month,
            ].join('')
        );
        onChange({ server, channel, month });
    }, [server, channel, month]);

    useEffect(() => {
        onMonth({ server, channel, month });
    }, [month]);

    const servers = base.servers.map(({ server }) => (
        { label: server, value: server }
    ));

    const channels = base.servers.reduce((a, c) => {
        if (server === '' || c.server === server) {
            a.push(...c.channels.map(channel => (
                { label: channel, value: channel }
            )));
        }
        return a;
    }, []).filter((d, i, a) => a.findIndex(e => e.value == d.value) === i);

    const months = Array.from({ length: 12 }, (_, i) => {
        const dtTo = subMonths(new Date(), i);
        const dtFrom = subMonths(dtTo, 1);
        return {
            label: format(dtFrom, 'MMMM YYYY').toLowerCase(),
            value: format(dtTo, 'YYYY-MM'),
        }
    });

    useEffect(() => {
        // reset stats if clicking main URL
        if ((server || channel || month) && location.pathname === '/stats') {
            setServer(''); setChannel(''); setMonth('');
        }
    }, [location.pathname]);

    return (
        <div className="stats-filter">
            <Select
                value={server}
                items={[
                    {label: 'servers', value: ''},
                    ...servers
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
                    ...channels
                ]}
                onChange={(e) => setChannel(e.target.value)}
            />
            <Select
                value={month}
                items={[
                    {label: 'this month', value: ''},
                    ...months
                ]}
                onChange={(e) => setMonth(e.target.value)}
            />
        </div>
    );
}

export default Filter;
