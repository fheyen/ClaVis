import React, { Component } from 'react';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { extent, max, deviation, mean } from 'd3-array';
import { axisLeft, axisBottom } from 'd3-axis';
import { area, line } from 'd3-shape';
import Tools from '../../lib/Tools';
import '../../style/common/HistoryChartCombined.css';

export default class HistoryChartCombined extends Component {

    componentDidMount() {
        this.draw();
    }

    componentDidUpdate() {
        if (this.state.svg) {
            // only redraw when variable or size changed
            if (this.props.variable !== this.state.variable) {
                this.draw();
            }
            if (this.props.clfColorMap !== this.state.clfColorMap) {
                this.draw();
            }
            if (this.props.width !== this.state.width || this.props.height !== this.state.height) {
                this.draw();
            }
            // redraw when smoothing changed
            if (this.props.historySmoothingWeight !== this.state.historySmoothingWeight) {
                this.draw();
            }
            // react to training score lines display options
            if (this.props.showTrainLines !== this.state.showTrainLines) {
                if (!this.state.trainLines || !this.state.valLines) {
                    return;
                }
                for (let i = 0; i < this.state.trainLines.length; i++) {
                    this.state.trainAreas[i].style('display', this.props.showTrainLines ? 'block' : 'none');
                    this.state.trainLines[i].style('display', this.props.showTrainLines ? 'block' : 'none');
                }
                this.setState({ showTrainLines: this.props.showTrainLines });
            }
        }
    }

    /**
     * @param {object[]} clfResults classification result objects
     * @param {String} groupingAttribute attribute to group by (one group for each value)
     * @param {String} historyVariable 'Loss' or 'Accuracy'
     * @returns {object} {
     *      val: {Map} validation histories
     *      train: {Map} training histories
     * }
     */
    groupClfsForMeanAndVariance = (clfResults, groupingAttribute, historyVariable) => {
        // group classifiers
        const { aggregatedMap, accessor } = Tools.groupClassifiersByAttribute(clfResults, groupingAttribute);
        // calculate mean and variance for each group
        const attrValues = [];
        const clfsInGroup = [];
        const representantsVal = [];
        const representantsTrain = [];
        for (const [attrValue, clfs] of aggregatedMap.entries()) {
            attrValues.push(attrValue);
            clfsInGroup.push(clfs);
            // get histories and simplify
            const histories = Tools.getClfHistories(clfs, historyVariable);
            representantsVal.push(this.getSimplifiedHistory(histories.val));
            representantsTrain.push(this.getSimplifiedHistory(histories.train));
        }
        return {
            attrValues,
            clfsInGroup,
            val: representantsVal,
            train: representantsTrain
        };
    }

    /**
     * Takes a group of histories and returns a single history,
     * whith mean, min, max, and confidence interval for every epoch
     * @param {number[][]} historyArrays array of histories, which are arrays of numbers
     */
    getSimplifiedHistory(historyArrays) {
        const maxEpoch = max(historyArrays.map(d => d.length));
        const result = [];
        // for each epoch, calculate mean etc.
        for (let epoch = 0; epoch < maxEpoch; epoch++) {
            // get values
            const values = [];
            for (let arr of historyArrays) {
                if (epoch < arr.length) {
                    values.push(arr[epoch]);
                }
            }
            // calculate mean, confidence, extent
            // TODO: variance, median?
            // TODO: quantiles?
            const ext = extent(values);
            const m = mean(values);
            const dev = deviation(values);
            // 90% confidence interval
            // https://www.dummies.com/education/math/statistics/how-to-calculate-a-confidence-interval-for-a-population-mean-when-you-know-its-standard-deviation/
            const sqrtN = Math.sqrt(values.length);
            const ci1 = m - 1.645 * dev / sqrtN;
            const ci2 = m + 1.645 * dev / sqrtN;
            result.push({
                epoch: epoch + 1,
                mean: m,
                min: ext[0],
                max: ext[1],
                ci1,
                ci2,
                n: values.length
            });
        }
        return result;
    }

    draw = () => {
        // reset the component
        select(this.svg).selectAll('*').remove();

        const data = this.groupClfsForMeanAndVariance(this.props.clfResults, this.props.clfColorMapMode, this.props.variable);
        const { attrValues, val, train, clfsInGroup } = data;

        const margin = { top: 10, right: 20, bottom: 30, left: 40 },
            width = this.props.width - margin.left - margin.right,
            height = this.props.height - margin.top - margin.bottom;

        const xScale = scaleLinear().range([0, width]);
        const yScale = scaleLinear().range([height, 0]);
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

        // setup x and y accessors
        const xValue = d => d.epoch;
        const yValue = d => d.val;

        // get data ranges
        const allData = [];
        val.concat(train)
            .forEach(d => d.forEach(x => {
                allData.push(x.ci1);
                allData.push(x.ci2);
            }));
        const maxX = max(train.map(d => d.length));
        const [minY, maxY] = extent(allData);
        // don't want lines too close to axis, so add in buffer to data domain
        const xBuffer = (maxX - 0) * 0.025;
        const yBuffer = (maxY - minY) * 0.05;
        xScale.domain([0 - xBuffer, maxX]);
        yScale.domain([minY - yBuffer, maxY]);

        // axes
        xAxisSelection.call(xAxis);
        xAxisLabel.text('Epoch');
        yAxisSelection.call(yAxis);
        yAxisLabel.text(this.props.variable);

        // lines
        // line (just to set up the lines)
        const lineFunction = line()
            .x(d => xScale(d.epoch))
            .y(d => yScale(d.mean));
        const trainLines = train.map((d, i) => {
            const clf = clfsInGroup[i][0];
            return svg.append('path')
                .attr('class', 'trainLine')
                .attr('d', lineFunction(d))
                .attr('stroke', this.props.clfColorMap.get(clf.args.title));
        });
        const valLines = val.map((d, i) => {
            const clf = clfsInGroup[i][0];
            return svg.append('path')
                .attr('class', 'valLine')
                .attr('d', lineFunction(d))
                .attr('stroke', this.props.clfColorMap.get(clf.args.title));
        });

        // confidence interval areas
        const areaFunction = area()
            .x(d => xScale(d.epoch))
            .y0(d => yScale(isNaN(d.ci1) ? d.mean : d.ci1))
            .y1(d => yScale(isNaN(d.ci2) ? d.mean : d.ci2));
        const trainAreas = train.map((d, i) => {
            const clf = clfsInGroup[i][0];
            const p = svg.append('path')
                .attr('class', 'trainConfInterval')
                .attr('fill', this.props.clfColorMap.get(clf.args.title))
                .attr('d', areaFunction(d))
                .on('mouseover', () => {
                    console.log(attrValues[i]);
                    console.log(clfsInGroup[i]);
                });
            p.append('title').html(`${attrValues[i]} (training)`);
            return p;
        });
        const valAreas = val.map((d, i) => {
            const clf = clfsInGroup[i][0];
            const p = svg.append('path')
                .attr('class', 'valConfInterval')
                .attr('fill', this.props.clfColorMap.get(clf.args.title))
                .attr('d', areaFunction(d))
                .on('mouseover', () => {
                    console.log(attrValues[i]);
                    console.log(clfsInGroup[i]);
                });
            p.append('title').html(`${attrValues[i]} (validation)`);
            return p;
        });



        this.setState({
            svg,
            svg2,
            xAxisSelection,
            xAxisLabel,
            yAxisSelection,
            yAxisLabel,
            valAreas,
            trainAreas,
            valLines,
            trainLines,
            width: this.props.width,
            height: this.props.height,
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
