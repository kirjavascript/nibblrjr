import React, { useRef, useEffect } from 'react';

const d3 = Object.assign({},
    require('d3-selection'),
    require('d3-force'),
    require('d3-drag'),
);

Object.defineProperty(d3, 'event', { get: () => require('d3-selection').event });

export default function ForceSim({
    items: links = [],
    ...config
}) {
    const node = useRef();
    const chart = useRef();

    useEffect(() => {
        if (!chart.current) {
            chart.current = new ForceSimObj(node.current, config);
        }
        const nodes = links.map(d => d.source)
            .concat(links.map(d => d.target))
            .filter((d, i, a) => a.indexOf(d) === i);

        chart.current
            .data(links, nodes.map(node => ({ id: node })))
            .render(true);
    }, [links]);

    useEffect(() => () => chart.current.destroy(), []);

    return (
        <div ref={node} />
    );
}

class ForceSimObj {
    config = {/* links, nodes */};

    container;
    canvas;
    simulation;

    constructor(node, config = {}) {
        this.container = d3.select(node);
        this.container.selectAll('*').remove();
        Object.assign(this.config, config);

        this.canvas = this.container.append('canvas');

        window.addEventListener('resize', this.resize);
    }

    // public

    destroy = () => {
        window.removeEventListener('resize', this.resize);
        this.container.selectAll('*').remove();
    };

    data = (links, nodes) => {
        this.config.links = links;
        this.config.nodes = nodes;
        return this;
    };

    resize = () => {
        // this.render();
        // TODO: free moving but resize canvas
        // zoom etc
    };

    render = (update = false) => {
        this.outerWidth = this.container.node().getBoundingClientRect().width;

        const height = 800;
        const width = 1000;

        const canvas = this.canvas.node();


        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        const { links, nodes } = this.config;

        // TODO: arc with arrows
        // TODO: lazy scroll load
        // TODO: simulation.stop() / cleanup
        // TODO: nodesize =

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            // links
            ctx.beginPath();
            links.forEach(d => {
                ctx.moveTo(d.source.x, d.source.y);
                ctx.lineTo(d.target.x, d.target.y);
            });
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.stroke();

            // highlighted links
            ctx.beginPath();
            links.forEach(d => {
                if (d.from) {
                    ctx.moveTo(d.source.x, d.source.y);
                    ctx.quadraticCurveTo(d.source.x - 100, d.target.y + 100, d.target.x, d.target.y);
                }
            });
            ctx.strokeStyle = 'rgba(200, 0, 255, 1)';
            ctx.stroke();
            ctx.beginPath();
            links.forEach(d => {
                if (d.to) {
                    ctx.moveTo(d.source.x, d.source.y);
                    ctx.quadraticCurveTo(d.source.x + 100, d.target.y - 100, d.target.x, d.target.y);
                }
            });
            ctx.strokeStyle = 'rgba(0, 255, 255, 1)';
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
            ctx.strokeStyle = 'black';
            ctx.strokeWidth = 4;
            ctx.stroke();
            // names
            ctx.fillStyle = 'black';
            nodes.forEach(d => {
                ctx.font = `${d.focused ? 18 : 12}px Hack`;
                ctx.fillText(d.id, d.x, d.y);
            });
        };

        const simulation = d3.forceSimulation()
            .nodes(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                // .strength(d => 1 / d.count)
            )
            .force('charge', d3.forceManyBody()
                .strength(() => -500)
            )
            // .force('box', boxForce)
            .force('x', d3.forceX())
            .force('y', d3.forceY())
            .force('center', d3.forceCenter(width / 2, height / 2))
            .on('tick', render);

        // dragging
        this.canvas
            .attr('width', width)
            .attr('height', height)
            .call(d3.drag()
                .container(canvas)
                .subject(dragsubject)
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // focused
        let focused;
        this.canvas
            .on('mousemove', () => {
                const [x, y] = d3.mouse(this.canvas.node());
                const node = simulation.find(x, y);
                if (node && focused !== node.id) {
                    focused = node.id;
                    nodes.forEach(node => {
                        node.focused = node.id === focused;
                    });
                    links.forEach(link => {
                        link.from = link.source.id === focused;
                        link.to = link.target.id === focused;
                    });
                    render();
                }
            });
        // mouseleave


        function dragsubject() {
            return simulation.find(d3.event.x, d3.event.y);
        }

        function dragstarted() {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d3.event.subject.fx = d3.event.subject.x;
            d3.event.subject.fy = d3.event.subject.y;
        }

        function dragged() {
            d3.event.subject.fx = d3.event.x;
            d3.event.subject.fy = d3.event.y;
        }

        function dragended() {
            if (!d3.event.active) simulation.alphaTarget(0);
            d3.event.subject.fx = null;
            d3.event.subject.fy = null;
        }
        function boxForce() {
            const radius = 100;
            for (var i = 0, n = nodes.length; i < n; ++i) {
                const curr_node = nodes[i];
                curr_node.x = Math.max(radius, Math.min(width - radius, curr_node.x));
                curr_node.y = Math.max(radius, Math.min(height - radius, curr_node.y));
            }
        }
    };

};
