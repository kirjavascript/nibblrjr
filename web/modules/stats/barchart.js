const d3 = Object.assign({},
    require('d3-selection'),
    require('d3-scale'),
    require('d3-axis'),
);

export default class BarChart {
    config = {
        margin: {
            top: 40, right: 40, bottom: 40, left: 40,
        },
        height: 500,
        data: undefined,
        accessor: undefined,
    };

    get dimensions() {
        const { top, right, bottom, left } = this.config.margin;
        return {
            width: this.outerWidth - left - right,
            height: this.config.height - top - bottom,
            top,
            right,
            bottom,
            left,
        };
    }

    container;
    svg;
    main;
    xAxisG;
    yAxisG;
    outerWidth;

    constructor(node) {
        this.container = d3.select(node);
        this.container.selectAll('*').remove();

        this.svg = this.container.append('svg');
        this.main = this.svg.append('g');

        this.xAxisG = this.main
            .append('g')
            .attr('class', 'axis x');
        this.yAxisG = this.main
            .append('g')
            .attr('class', 'axis y');

        window.addEventListener('resize', this.resize);
    }

    // public

    destroy = () => {
        window.removeEventListener('resize', this.resize);
    };

    data = (data, accessor) => {
        this.config.data = data;
        this.config.accessor = accessor;
        return this;
    };

    setWidth = () => {
        this.outerWidth = this.container.node().getBoundingClientRect().width;
    };

    resize = () => {
        this.render();
    };

    render = () => {
        this.setWidth();
        const { width, height, top, right, bottom, left } = this.dimensions;
        // set margins / size
        this.svg
            .attr('width', width + left + right)
            .attr('height', height + top + bottom);
        this.main
            .attr('transform', `translate(${[left, top]})`);

        // scales

        const domainMax = this.config.data.reduce((a, c) => Math.max(a, c.count), 0);
        this.yScale = d3.scaleLinear()
            .domain([0, domainMax])
            .range([height, 0]);
        this.xScale = d3.scaleBand()
            .paddingInner(1 / 3)
            .paddingOuter(1 / 6)
            .rangeRound([0, width])
            .domain(this.config.data.map((d) => d.user));
        this.xAxis = d3.axisBottom(this.xScale)
            .tickSize(5)
            // force correct label
            // .tickFormat((d, i) => this.dataObj[i].name);
        this.xAxisG
            .attr('transform', `translate(0,${height})`)
            .call(this.xAxis)
            .selectAll('text')
            .style('text-anchor', 'start')
            .attr('dx', '.8em')
            .attr('dy', '.55em')
            .attr('transform', 'rotate(14)' );
        this.yAxis = d3.axisLeft(this.yScale)
            .tickSize(5)
            .ticks(5);
        this.yAxisG
            .call(this.yAxis);


        const barsSelect = this.main.selectAll('.bar')
            .data(this.config.data, this.config.accessor);

        barsSelect.exit().remove();

        const barsEnter = barsSelect.enter();

        barsEnter
            .append('rect')
            .classed('bar', 1)
            .merge(barsSelect)
            .attr('x', (d) => this.xScale(d.user))
            .attr('width', this.xScale.bandwidth())
            .attr('height', (d) => (
                Math.abs(this.yScale(d.count) - this.yScale(0))
            ))
            .attr('y', (d) => this.yScale(Math.max(0, d.count)));

    };

};
