import React, { useEffect, useRef } from 'react';
import BarChart from './barchart';

// import * as d3 from 'd3';

// stats main / server / channel as FILTER w/ URL / time period


function Stats() {
    const node = useRef();

    useEffect(() => {
        fetch('/api/stats/activity', {credentials: 'include'})
            .then(res => res.json())
            .then(res => {
                console.log(res);

                const chart = new BarChart(node.current);
            })
            .catch(console.error);
    });

    return (
        <div className="stats">
            <div ref={node} />
        </div>
    );
}

export default Stats;
