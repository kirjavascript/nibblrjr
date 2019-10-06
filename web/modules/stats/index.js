import React, { useEffect, useRef, useState } from 'react';
import BarChart from './barchart';
import Select from '../select';

// stats main / server / channel as FILTER w/ URL / time period


function Stats() {
    const node = useRef();
    const [base, setBase] = useState({});

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

        fetch('/api/stats/base')
            .then(res => res.json())
            .then(setBase)
            .catch(console.error);

    }, []);

    return (
        <div className="stats">
            <div className="filter">
                <Select
                    value={'a'}
                    items={[{label: 'servers', value: 'test'}]}
                    onChange={() => {}}
                />
                <Select
                    value={'a'}
                    items={[{label: 'channels', value: 'test'}]}
                    onChange={() => {}}
                />
                <Select
                    value={'a'}
                    items={[{label: 'this month', value: 'test'}]}
                    onChange={() => {}}
                />
            </div>
            <div ref={node} />
            <h4>commands</h4>
            <pre>
                {JSON.stringify(base,0,4)}
            </pre>
        </div>
    );
}

export default Stats;
