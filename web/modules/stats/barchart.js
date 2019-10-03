const d3 = Object.assign({},
    require('d3-selection'),
);

export default class BarChart {
    config = {
        margin: {
            top: 40, right: 40, bottom: 40, left: 40,
        },
        height: 500,
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
    data;

    outerSvg;
    svg;
    xAxisG;
    yAxisG;
    outerWidth;

    constructor(node) {
        this.container = d3.select(node);
        this.container.selectAll('*').remove();
        this.setWidth();

        this.outerSvg = this.container.append('svg').append('g');

        this.svg = this.outerSvg.append('g'); // TODO: rename to something more generic

        this.xAxisG = this.outerSvg
            .insert('g', 'g')
            .attr('class', 'axis x');
        this.yAxisG = this.outerSvg
            .insert('g', 'g')
            .attr('class', 'axis y');
    }

    // public

    destroy = () => {
    };

    // private

    setWidth = () => {
        this.outerWidth = this.container.node().getBoundingClientRect().width;
    };

    setScale = () => {

    };

};
