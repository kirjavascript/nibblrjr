import React, { useRef, useEffect, useState } from 'react';
import color from './color';
import Checkbox from '../checkbox';

const d3 = Object.assign({},
    require('d3-selection'),
    require('d3-force'),
    require('d3-drag'),
);

Object.defineProperty(d3, 'event', { get: () => require('d3-selection').event });

export default function ForceSim({
    items = [],
}) {
    const node = useRef();
    const chart = useRef();
    const [orbit, setOrbit] = useState(false);

    useEffect(() => {
        // unpack activity
        const activity = items.reduce((acc, [_, activity] = []) => {
            activity.forEach(({ user, count }, index) => {
                acc[user] = { count, index };
            });
            return acc;
        }, {});

        // unpack links
        const links = [];
        items.forEach(([server, _activity, linkData]) => {
            Object
                .entries(linkData)
                .forEach(([source, targets]) => {
                    Object.entries(targets)
                        .forEach(([target, count]) => {
                            links.push({
                                source, target, count, server,
                                activity: activity[source],
                            });
                        });
                })
        });

        // calculate nodes and ids
        const nodes = links.map(d => [d.source, d.server])
            .concat(links.map(d => [d.target, d.server]))
            .map(([name, server]) => [`${name}-${server}`, name, server])
            .filter((d, i, a) => a.findIndex(node => node[0] === d[0]) === i)
            .map(([id, name, server]) => ({
                id, name, server,
                activity: activity[name],
            }));
        // adjust source/target to match id
        links.forEach(link => {
            link.source = link.source + '-' + link.server;
            link.target = link.target + '-' + link.server;
        });
        // attach to/from data to nodes
        nodes.forEach(node => {
            const get = (key) => links.filter(link => link[key] === node.id).length;
            if (node.activity) {
                node.activity.from = get('target');
                node.activity.to = get('source');
            }
        });

        if (!chart.current) {
            chart.current = new ForceSimObj(node.current);
        }
        chart.current.data(links, nodes);
    }, [items]);

    useEffect(() => {
        chart.current.orbit(orbit);
        chart.current.render();
    }, [orbit]);

    useEffect(() => () => chart.current.destroy(), []);

    return (
        <>
            <div className="canvas" ref={node} />
            <div className="hud">
                orbiters
                <Checkbox
                    checked={orbit}
                    onChange={() => setOrbit(!orbit)}
                />
            </div>
        </>
    );
}

class ForceSimObj {
    config = {
        /* links, nodes */
        orbit: false,
    };

    constructor(node) {
        this.container = d3.select(node);
        this.container.selectAll('*').remove();
        this.canvas = this.container.append('canvas');
        window.addEventListener('resize', this.resize);

        this.ctx = this.canvas.node().getContext('2d');

        this.simulation = d3.forceSimulation()
            .on('tick', this.render);

        this.setSize();

        const { width, height } = this;

        // dragging
        this.canvas
            .attr('width', width)
            .attr('height', height)
            .call(d3.drag()
                .container(this.canvas.node())
                .subject(() => this.simulation.find(d3.event.x, d3.event.y))
                .on('start', () => {
                    if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
                    d3.event.subject.fx = d3.event.subject.x;
                    d3.event.subject.fy = d3.event.subject.y;
                })
                .on('drag', () => {
                    d3.event.subject.fx = d3.event.x;
                    d3.event.subject.fy = d3.event.y;
                })
                .on('end', () => {
                    if (!d3.event.active) this.simulation.alphaTarget(0);
                    d3.event.subject.fx = null;
                    d3.event.subject.fy = null;
                }));

        // popup
        this.container
            .style('position', 'relative');
        this.popup = this.container
            .append('div')
            .classed('popup', true);
    }

    destroy = () => {
        this.simulation.stop();
        window.removeEventListener('resize', this.resize);
        this.container.selectAll('*').remove();
    };

    setSize = () => {
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = 800;
        const { width, height } = this;
        Object.assign(this.canvas.node(), { width, height });
        this.setOrbitCharge();
        this.simulation
            .force('center', d3.forceCenter(width / 2, height / 2));
    };

    setOrbitCharge = () => {
        const small = this.width < 650;
        this.simulation
            .force('x', d3.forceX().strength(small ? 0.2 : 0.1))
            .force('y', d3.forceY().strength(small ? 0.1 : 0.2))
            .force('charge', d3.forceManyBody()
                .strength(() => -(this.width / (this.config.orbit ? 3 : 7)))
            );
    };

    orbit = (orbit) => {
        this.config.orbit = orbit;
        this.setOrbitCharge();
        this.simulation
            .alphaTarget(0.1)
            .restart();
    }

    data = (links, nodes) => {
        Object.assign(this.config, { links, nodes });
        this.simulation
            .nodes(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
            )
            .alphaTarget(0.1)
            .restart();

        let focused;
        this.focusedNode = undefined;
        this.canvas
            .on('mousemove', () => {
                const [x, y] = d3.mouse(this.canvas.node());
                const node = this.simulation.find(x, y);
                if (node && focused !== node.id) {
                    focused = node.id;
                    nodes.forEach(node => {
                        node.focused = node.id === focused;
                    });
                    links.forEach(link => {
                        link.from = link.source.id === focused;
                        link.to = link.target.id === focused;
                    });
                    this.focusedNode = node;
                }
                this.render();
            });

        return this;
    };

    resize = () => {
        this.setSize();
        this.simulation.alphaTarget(0.1).restart();
        this.render();
    };

    render = () => {
        const { width, height, ctx } = this;
        const { links: linkList = [], nodes: nodeList = [], orbit } = this.config;

        const nodes = orbit ? nodeList : nodeList.filter(({ activity }) => !!activity);
        const links = orbit ? linkList : linkList.filter(({ activity }) => !!activity);

        if (this.focusedNode && this.focusedNode.activity) {
            const { x, y, name, server, activity: { count, index, to, from } } = this.focusedNode;
            this.popup
                .classed('visible', true)
                .style('left', `${x+5}px`)
                .style('top', `${y-18}px`)
                .selectAll('div')
                .data([
                    ['name', [name, server]],
                    ['stat rank', ['rank', index + 1]],
                    ['stat msgs', ['msgs', count]],
                    ['stat sent', ['sent', to]],
                    ['stat recv', ['recv', from]],
                ])
                .join('div')
                .attr('class', ([name]) => name)
                .selectAll('span')
                .data(([_, d]) => d)
                .join('span')
                .text(d => d);

        } else {
            this.popup.classed('visible', false);
        }

        ctx.clearRect(0, 0, width, height);
        // links
        ctx.beginPath();
        links.forEach(d => {
            if (!d.to && !d.from) {
                ctx.moveTo(d.source.x, d.source.y);
                ctx.lineTo(d.target.x, d.target.y);
            }
        });
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.stroke();

        // highlighted links
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(235, 51, 110, 0.8)';
        links.forEach(d => {
            if (d.from) {
                ctx.moveTo(d.source.x, d.source.y);
                ctx.quadraticCurveTo(d.source.x - 10, d.target.y + 10, d.target.x, d.target.y);
            }
        });
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 255, 1)';
        links.forEach(d => {
            if (d.to) {
                ctx.moveTo(d.source.x, d.source.y);
                ctx.quadraticCurveTo(d.target.x + 10, d.source.y - 10, d.target.x, d.target.y);
            }
        });
        ctx.stroke();
        // nodes
        ctx.beginPath();
        nodes.forEach(d => {
            const r = d.focused ? 8 : 6;
            ctx.moveTo(d.x + r, d.y);
            ctx.arc(d.x, d.y, r, 0, 2 * Math.PI);
        });
        ctx.fillStyle = 'limegreen';
        ctx.fill();
        // names
        ctx.fillStyle = 'black';
        ctx.font = `12px Hack`;
        nodes.forEach(d => {
            if (!d.focused || !d.activity) {
                ctx.fillText(d.name, d.x, d.y);
            }
        });
    };
};
