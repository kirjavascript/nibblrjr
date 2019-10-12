const d3 = Object.assign({},
    require('d3-selection'),
    require('d3-scale'),
    require('d3-axis'),
    require('d3-transition'),
);


function rect({ x, y, width, height, radius }) {
    if (radius > height) {
        radius = height;
    }

    if (width < radius * 2) {
        radius = width /2;
    }

    return `
        M${x},${y + height}
        v${-height + radius}
        a${radius},${radius} 0 0 1 ${radius},${-radius}
        h${width - 2*radius}
        a${radius},${radius} 0 0 1 ${radius},${radius}
        v${height - radius}
        z
    `.replace(/\s\s+/g, ' ');
}

export default class BarChart {
    config = {
        margin: {
            top: 5, right: 20, bottom: 40, left: 60,
        },
        height: 400,
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
    contents;
    xAxisG;
    yAxisG;
    outerWidth;

    constructor(node) {
        this.container = d3.select(node);
        this.container.selectAll('*').remove();

        this.svg = this.container.append('svg');
        this.main = this.svg.append('g');
        this.contents = this.main.append('g');

        this.xAxisG = this.main
            .append('g')
            .attr('transform', `translate(0, ${this.dimensions.height})`)
            .attr('class', 'axis x');
        this.yAxisG = this.main
            .append('g')
            .attr('class', 'axis y');

        window.addEventListener('resize', this.resize);
    }

    // public

    destroy = () => {
        window.removeEventListener('resize', this.resize);
        this.container.selectAll('*').remove();
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

    render = (update = false) => {
        this.setWidth();
        const { width, height, top, right, bottom, left } = this.dimensions;

        const trans = selection => update ? selection.transition() : selection;

        // set margins / size
        this.svg
            .attr('width', width + left + right)
            .attr('height', height + top + bottom);
        this.main
            .attr('transform', `translate(${[left, top]})`);

        // scales

        const domainMax = this.config.data.reduce((a, c) => Math.max(a, c.count), 0);
        const yScale = d3.scaleLinear()
            .domain([0, domainMax])
            .range([height, 0]);
        const xScale = d3.scaleBand()
            .paddingInner(1 / 3)
            .paddingOuter(1 / 6)
            .rangeRound([0, width])
            .domain(this.config.data.map((d) => d.user));
        const xAxis = d3.axisBottom(xScale)
            .tickSize(10)
        trans(this.xAxisG)
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.55em')
            .attr('transform', 'rotate(-14)' );
        const yAxis = d3.axisLeft(yScale)
            .tickSize(10)
            .ticks(12);
        trans(this.yAxisG)
            .call(yAxis);

        const barsSelect = this.contents.selectAll('.bar')
            .data(this.config.data, this.config.accessor);

        barsSelect.exit().remove();

        const barsEnter = barsSelect.enter();

        const updateSelect = barsEnter
            .append('path')
            .classed('bar', 1)
            .merge(barsSelect);

        trans(updateSelect)
            .attr('d', d => rect({
                x: xScale(d.user),
                width: xScale.bandwidth(),
                height: Math.abs(yScale(d.count) - yScale(0)),
                y: yScale(Math.max(0, d.count)),
                radius: 3,
            }))
    };

};
