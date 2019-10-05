import React, { useEffect, useRef } from 'react';
import BarChart from './barchart';

// stats main / server / channel as FILTER w/ URL / time period


function Stats() {
    const node = useRef();

    useEffect(() => {
        const chart = new BarChart(node.current);

        fetch('/api/stats/activity', {credentials: 'include'})
            .then(res => res.json())
            .then(res => {
                chart
                    .data(res.reverse(), d => d.name)
                    .render();
            })
            .catch(console.error);
    });

    return (
        <div className="stats">
            <h3 style={{
                margin: 10,
            }}>linecount / month / #rubik</h3>
            <div ref={node} />
        </div>
    );
}

export default Stats;
