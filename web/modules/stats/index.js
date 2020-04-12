import React, { useState } from 'react';
import Filter from './filter';
import { useFetch } from '../hooks';
import BarChart from './barchart';
import LineChart from './linechart';
import ForceSim from './forcesim';
import Factoids from './factoids';
// nginx: static, htaccess

// activity user ranking (*)
// toggle orbiters show explanation in grey
// size for nodes with activity qty
// popup / big on force

function Stats({ history, location }) {
    const { fetchAPI } = useFetch();
    const [base, setBase] = useState({ servers: [] });
    const [stats, setStats] = useState({});
    const [ready, setReady] = useState(false);

    return (
        <>
            <Filter
                history={history}
                location={location}
                base={base}
                ready={ready}
                onChange={({ month, server, channel }) => {
                    const timeout = setTimeout(() => setReady(false), 150);
                    fetchAPI('stats/all', {
                        body: { month, server, channel },
                        method: 'POST',
                    })
                        .then(stats => {
                            setStats(stats);
                            clearTimeout(timeout);
                            setReady(true);
                        })
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
            <div className={`stats-container${ready ? '' : ' loading'}`}>
                <div className="stats">
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
                                tickFormatX={d => +d.slice(8)}
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
                <div className="stats-forcesim">
                    <h4> network graph </h4>
                    <span>tracking who talks to popular users</span>
                    <div className="sim">
                        <ForceSim items={stats.links} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default Stats;
