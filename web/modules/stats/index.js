import React, { useState } from 'react';
import Filter from './filter';
import { useFetch } from '../hooks';
import BarChart from './barchart';
import LineChart from './linechart';
import ForceSim from './forcesim';
import Factoids from './factoids';
// add sudo commands to docs, talk about modules
// topics
// todo: truncate nibblr messages to log
//
//// december bug
// loading animation / opacity / fade page

// size for nodes with activity qty
// toggle orbiters
// popup on force
// activity user ranking (*)

function Stats({ history, location }) {
    const { fetchAPI } = useFetch();
    const [base, setBase] = useState({ servers: [] });
    const [stats, setStats] = useState({});

    return (
        <>
            <div className="stats">
                <Filter
                    history={history}
                    location={location}
                    base={base}
                    onChange={({ month, server, channel }) => {
                        fetchAPI('stats/all', {
                            body: { month, server, channel },
                            method: 'POST',
                        })
                            .then(setStats)
                            .catch(console.error);
                    }}
                    onMonth={({ month }) => {
                        fetchAPI('stats/base', {
                            body: { month },
                            method: 'POST',
                        })
                            .then(setBase)
                            .catch(console.error);
                    }}
                />
                <div className="row">
                    <div className="base">
                        <span>updated hourly</span>
                        <div className="uptime">
                            <h4>uptime{' '}</h4>
                            <span>{base.uptime || '0'}h</span>
                        </div>
                    </div>
                    <div className="command-chart">
                        <h3 className="title">most used commands</h3>
                        <BarChart
                            items={stats.commands}
                            accessor={d => d.command}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="half">
                        <h3 className="title">activity / days</h3>
                        <LineChart
                            items={stats.activityDays}
                            accessor={d => d.day}
                            tickFormatX={d => d.slice(8)}
                        />
                    </div>
                    <div className="half">
                        <h3 className="title">activity / hours</h3>
                        <LineChart
                            items={stats.activityHours}
                            accessor={d => d.hour}
                        />
                    </div>
                </div>
                <Factoids stats={stats} />
            </div>
            <h4> network graph </h4>
            <span>tracking who talks to popular users</span>
            <div style={{borderTop: '5px solid rgba(235, 51, 110)'}}>
                <ForceSim items={stats.links} />
            </div>
        </>
    );
}

export default Stats;
