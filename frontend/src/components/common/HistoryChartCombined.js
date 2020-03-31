import React, { Component } from 'react';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { extent } from 'd3-array';
import { axisLeft, axisBottom } from 'd3-axis';
import { line } from 'd3-shape';
import Tools from '../../lib/Tools';
import '../../style/common/HistoryChartCombined.css';

export default class HistoryChartCombined extends Component {

    componentDidMount() {
        this.drawInitialLayout();
    }

    componentDidUpdate() {
        if (this.state.svg) {
            // only redraw when variable or size changed
            if (this.props.variable !== this.state.variable) {
                this.draw();
            }
            if (this.props.clfColorMap !== this.state.clfColorMap) {
                // this.drawInitialLayout();
                if (!this.state.trainLines || !this.state.valLines) {
                    return;
                }
                for (let i = 0; i < this.state.trainLines.length; i++) {
                    const clf = this.props.clfResults[i];
                    const color = this.props.clfColorMap.get(clf.args.title);
                    this.state.trainLines[i].attr('stroke', color);
                    this.state.valLines[i].attr('stroke', color);
                }
                this.setState({ clfColorMap: this.props.clfColorMap });
            }
            if (this.props.width !== this.state.width || this.props.height !== this.state.height) {
                this.drawInitialLayout();
            }
            // redraw when smoothing changed
            if (this.props.historySmoothingWeight !== this.state.historySmoothingWeight) {
                this.draw();
            }
            // react to highlight
            if (this.props.highlightClf !== this.state.highlightClf) {
                if (!this.state.trainLines || !this.state.valLines) {
                    return;
                }
                for (let i = 0; i < this.state.trainLines.length; i++) {
                    let strokeWidth = this.props.clfResults[i] === this.props.highlightClf ? 2 : 0.5;
                    this.state.trainLines[i].attr('stroke-width', strokeWidth);
                    this.state.valLines[i].attr('stroke-width', strokeWidth);
                }
                this.setState({ highlightClf: this.props.highlightClf });
            }
            // react to training score lines display options
            if (this.props.showTrainLines !== this.state.showTrainLines) {
                if (!this.state.trainLines || !this.state.valLines) {
                    return;
                }
                for (let i = 0; i < this.state.trainLines.length; i++) {
                    this.state.trainLines[i].style('display', this.props.showTrainLines ? 'block' : 'none');
                }
                this.setState({ showTrainLines: this.props.showTrainLines });
            }
        }
    }

    drawInitialLayout = () => {
        // reset the component
        select(this.svg).selectAll('*').remove();

        const data = Tools.getClfHistories(this.props.clfResults, this.props.variable);

        const margin = { top: 10, right: 20, bottom: 30, left: 40 },
            width = this.props.width - margin.left - margin.right,
            height = this.props.height - margin.top - margin.bottom;

        const xScale = scaleLinear().domain([0, 1]).range([0, width]);
        const yScale = scaleLinear().domain([0, 1]).range([height, 0]);
        const xAxis = axisBottom().scale(xScale);
        const yAxis = axisLeft().scale(yScale);

        const svg2 = select(this.svg)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        const svg = svg2
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // x-axis
        const xAxisSelection = svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);
        const xAxisLabel = xAxisSelection.append('text')
            .attr('x', width)
            .attr('y', -6)
            .text('Epoch');

        // y-axis
        const yAxisSelection = svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        const yAxisLabel = yAxisSelection.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 6)
            .attr('dy', '.71em')
            .text(this.props.variable);

        // line
        const lineFunction = line()
            .x((d, i) => i)
            .y(d => 0.5);

        const trainLines = data.train.map((d, i) => {
            const clf = this.props.clfResults[i];
            return svg.append('path')
                .attr('d', lineFunction(d))
                .attr('stroke', this.props.clfColorMap.get(clf.args.title))
                .attr('class', 'trainLine')
                .on('mouseover', () => this.props.onHighlightClf(clf));
        });

        const valLines = data.val.map((d, i) => {
            const clf = this.props.clfResults[i];
            return svg.append('path')
                .attr('d', lineFunction(d))
                .attr('stroke', this.props.clfColorMap.get(clf.args.title))
                .attr('class', 'valLine')
                .on('mouseover', () => this.props.onHighlightClf(clf));
        });

        this.setState(
            {
                svg,
                svg2,
                xAxisSelection,
                xAxisLabel,
                yAxisSelection,
                yAxisLabel,
                valLines,
                trainLines,
                width: this.props.width,
                height: this.props.height
            },
            this.draw
        );
    }

    draw = () => {
        const rawData = Tools.getClfHistories(this.props.clfResults, this.props.variable);
        const valData = rawData.val.map(clfh => clfh.map((d, i) => { return { val: d, epoch: i + 1 }; }));
        const trainData = rawData.train.map(clfh => clfh.map((d, i) => { return { val: d, epoch: i + 1 }; }));

        const margin = { top: 10, right: 20, bottom: 30, left: 40 },
            width = this.props.width - margin.left - margin.right,
            height = this.props.height - margin.top - margin.bottom;

        // setup x
        const xValue = d => d.epoch,
            xScale = scaleLinear().range([0, width]),
            xAxis = axisBottom().scale(xScale);

        // setup y
        const yValue = d => d.val,
            yScale = scaleLinear().range([height, 0]),
            yAxis = axisLeft().scale(yScale);

        const allData = [];
        valData.concat(trainData).forEach(d => d.forEach(x => allData.push(x)));
        const [minX, maxX] = extent(allData, xValue);
        const [minY, maxY] = extent(allData, yValue);
        // don't want lines too close to axis, so add in buffer to data domain
        const xBuffer = (maxX - minX) * 0.025;
        const yBuffer = (maxY - minY) * 0.05;
        xScale.domain([minX - xBuffer, maxX]);
        yScale.domain([minY - yBuffer, maxY]);

        // x-axis
        this.state.xAxisSelection.call(xAxis);
        this.state.xAxisLabel.text('Epoch');

        // y-axis
        this.state.yAxisSelection.call(yAxis);
        this.state.yAxisLabel.text(this.props.variable);

        // line
        const lineFunction = line()
            .x(d => xScale(d.epoch))
            .y(d => yScale(d.val));
        this.state.trainLines.forEach((trainLine, i) => {
            trainLine
                .transition()
                .duration(1000)
                .attr('d', lineFunction(trainData[i]));
        });
        this.state.valLines.forEach((valLine, i) => {
            valLine
                .transition()
                .duration(1000)
                .attr('d', lineFunction(valData[i]));
        });

        this.setState({
            xValue,
            yValue,
            xScale,
            yScale,
            xAxis,
            yAxis,
            variable: this.props.variable,
            clfColorMap: this.props.clfColorMap,
            historySmoothingWeight: this.props.historySmoothingWeight
        });
    }

    render() {
        return (
            <div className='HistoryChartCombined'>
                <svg
                    className='Plot'
                    width={this.props.width}
                    height={this.props.height}
                    ref={n => this.svg = n}
                >
                </svg>
            </div>
        );
    }
}
