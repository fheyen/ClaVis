import React, { Component } from 'react';
import { scaleLinear } from 'd3-scale';
import { max, extent } from 'd3-array';
import '../../style/common/ConfusionMatrix.css';

export default class ConfusionMatrix extends Component {

    constructor(props) {
        super(props);
        this.state = {
            // ignore the diagonal values for the color map
            ignoreDiagnonal: true,
            // show values in percent of the class
            // and class totals in percent of total samples
            showPercent: true
        };
    }

    /**
     * Returns the maximum value in the matrix while respecting
     * this.state.ignoreDiagnonal
     * @param {number[][]} confMatrix confusion matrix
     * @returns {number} max value
     */
    getMatrixMaxValue(confMatrix) {
        let maxValue;
        if (!this.state.ignoreDiagnonal) {
            // with diagonal
            maxValue = max(confMatrix.map(row => max(row)));
        } else {
            // without diagonal
            maxValue = 0;
            for (let row = 0; row < confMatrix.length; row++) {
                for (let col = 0; col < confMatrix.length; col++) {
                    if (row !== col && confMatrix[row][col] > maxValue) {
                        maxValue = confMatrix[row][col];
                    }
                }
            }
        }
        return maxValue;
    }

    /**
     * Creates the confusion matrix SVG cells and numbers
     * @param {*} clfResult
     * @param {*} labelMargin
     * @param {*} cellSize
     * @param {*} margin
     * @param {*} colorMap
     * @param {*} numClasses
     * @param {*} classNames
     * @param {*} marginedSize
     * @param {*} fontSize
     * @returns {*} matrix cells
     */
    getMatrixSvg = (
        confMatrix,
        labelMargin,
        cellSize,
        margin,
        numClasses,
        classNames,
        classTotals,
        marginedSize,
        fontSize
    ) => {
        // colormap
        const maxValue = this.getMatrixMaxValue(confMatrix);
        const colorMap = scaleLinear().domain([0, maxValue]).range(['rgba(0, 0, 0, 0)', '#48f']);

        return confMatrix.map((row, i) => {
            return row.map((value, j) => {
                const x = labelMargin + cellSize * j + margin;
                const y = labelMargin + cellSize * i + margin;
                let color = colorMap(value);
                if (this.state.ignoreDiagnonal && i === j) {
                    color = 'none';
                }
                let title, text, percent;
                let mode = '(click to show percentages)';
                if (this.state.showPercent) {
                    // convert to percent by dividing by current class
                    value = value / classTotals[i] * 100;
                    percent = 'percent of';
                    mode = '(click to show sample counts)';
                }
                // maximum 1 digit after the period but no '.0'
                value = Math.round(value * 10) / 10;
                if (numClasses <= 10) {
                    const correct = i === j ? 'correctly ' : 'miss-';
                    title = (
                        <title>
                            {value} {percent} instances of {classNames[i]} where {correct}classified as {classNames[j]} {mode}
                        </title>
                    );
                    if (fontSize > 7) {
                        text = (
                            <text
                                x={x + marginedSize / 2}
                                y={y + marginedSize / 2 + fontSize * 0.35}
                                fontSize={fontSize}
                            >
                                {value}
                            </text>
                        );
                    }
                }
                return (
                    <g key={`${i}-${j}`}>
                        <rect
                            x={x}
                            y={y}
                            width={marginedSize}
                            height={marginedSize}
                            fill={color}
                        />
                        {title}
                        {text}
                    </g>
                );
            });
        });
    }

    /**
     * Creates additional matrix cells
     * with the totalnumber of samples per class
     */
    getClassTotals = (
        classNames,
        classTotals,
        numClasses,
        size,
        cellSize,
        labelMargin,
        margin,
        fontSize,
        marginedSize
    ) => {
        // get extent and colormap
        const colorMap = scaleLinear()
            .domain(extent(classTotals))
            .range(['rgba(0, 0, 0, 0)', '#888']);
        const y = size + cellSize * 0.2;
        // get sum of samples
        const totalSamples = classTotals.reduce((total, n) => total + n, 0);
        // create cells
        const classTotalCells = classTotals.map((value, i) => {
            const cellColor = colorMap(value);
            const x = labelMargin + cellSize * i + margin;
            let title = '';
            let text;
            if (this.state.showPercent) {
                value = value / totalSamples * 100;
            }
            value = Math.round(value * 10) / 10;
            let mode = 'percentages';
            if (numClasses <= 10) {
                if (this.state.showPercent) {
                    title = `percent of the total number of `;
                    mode = 'sample counts';
                }
                title = `${classNames[i]} has ${value} ${title}samples (click to show ${mode})`;
                if (fontSize > 7) {
                    text = (
                        <text
                            x={x + marginedSize / 2}
                            y={y + marginedSize / 2 + fontSize * 0.35}
                            fontSize={fontSize}
                        >
                            {value}
                        </text>
                    );
                }
            }
            return (
                <g key={`${i}-${i}`}>
                    <rect
                        x={x}
                        y={y}
                        width={marginedSize}
                        height={marginedSize}
                        fill={cellColor}
                    />
                    <title>
                        {title}
                    </title>
                    {text}
                </g>
            );
        });
        return classTotalCells;
    }

    /**
     * Creates colored rectanges as class indicators for the confusion matrix
     * @param {*} numClasses
     * @param {*} labelMargin
     * @param {*} cellSize
     * @param {*} margin
     * @param {*} marginedSize
     */
    getClassIndicators = (numClasses, labelMargin, cellSize, margin, marginedSize) => {
        let classIndicatorsLeft, classIndicatorsTop;
        if (numClasses <= 10) {
            classIndicatorsTop = new Array(numClasses).fill(0).map((d, i) => {
                const pos = labelMargin + cellSize * i + margin;
                const color = this.props.colorMap[i % this.props.colorMap.length];
                return (
                    <rect
                        key={i}
                        className='classIndicator'
                        x={pos}
                        y={labelMargin - 5}
                        width={marginedSize}
                        height={3}
                        fill={color}
                    />
                );
            });
            classIndicatorsLeft = new Array(numClasses).fill(0).map((d, i) => {
                const pos = labelMargin + cellSize * i + margin;
                const color = this.props.colorMap[i % this.props.colorMap.length];
                return (
                    <rect
                        key={numClasses + i}
                        className='classIndicator'
                        x={labelMargin - 5}
                        y={pos}
                        width={3}
                        height={marginedSize}
                        fill={color}
                    />
                );
            });
        }
        return [classIndicatorsTop, classIndicatorsLeft];
    }

    toogleDiagonal = (e) => {
        e.stopPropagation();
        this.setState({ ignoreDiagnonal: !this.state.ignoreDiagnonal });
    }

    render() {
        // constants
        const labelFontSize = 12;
        const minSize = 100;
        const maxCellSize = 30;
        const labelMargin = 25;

        // get props
        const confMatrix = this.props.confMatrix;
        let size = this.props.confMatrixSize;

        // confusion matrix
        let cellSize;
        let matrixSvg, classIndicators, classTotalCells, onClickFn;
        if (confMatrix) {
            const numClasses = confMatrix.length;

            if (labelMargin + maxCellSize * numClasses < size) {
                size = labelMargin + maxCellSize * numClasses;
            }
            size = Math.max(minSize, size);
            cellSize = (size - labelMargin) / numClasses;
            const margin = numClasses <= 10 ? cellSize * 0.05 : 0;
            const marginedSize = cellSize - 2 * margin;
            const fontSize = Math.min(11, cellSize / 2.3);

            // create placeholders if classnames are unknown
            let classNames;
            if (this.props.data && this.props.data.data) {
                classNames = this.props.data.data.class_names;
            }
            if (!classNames) {
                classNames = new Array(numClasses)
                    .fill(0)
                    .map((d, i) => `class ${i}`);
            }

            // get total number of samples per class
            const classTotals = classNames.map((d, i) => {
                return confMatrix[i].reduce((sum, item) => sum + item, 0);
            });

            // matrix cells
            matrixSvg = this.getMatrixSvg(confMatrix, labelMargin, cellSize,
                margin, numClasses, classNames, classTotals, marginedSize, fontSize);

            // class indicators for the matrix
            classIndicators = this.getClassIndicators(numClasses,
                labelMargin, cellSize, margin, marginedSize);

            // number of samples per class
            classTotalCells = this.getClassTotals(classNames, classTotals,
                numClasses, size, cellSize, labelMargin,
                margin, fontSize, marginedSize);

            // toggle percentage / sample count when clicking the confusion matrix
            // but only if it is small enough to draw labels
            if (fontSize > 7) {
                onClickFn = () => this.setState({
                    showPercent: !this.state.showPercent
                });
            }
        }

        return (
            <svg
                className='ConfusionMatrix'
                width={size}
                height={size + cellSize * 2}
                onClick={onClickFn}
            >
                {/* button to toggle the diagonal for the colormap */}
                <g
                    className='toggleDiagonalBtn'
                    onClick={this.toogleDiagonal}
                >
                    <title>
                        Click to ignore / use the diagonal for coloring.
                    </title>
                    <rect
                        x={0}
                        y={0}
                        width={labelMargin * 0.8}
                        height={labelMargin * 0.8}
                    />
                    <line
                        x1={labelMargin * 0.2}
                        y1={labelMargin * 0.2}
                        x2={labelMargin * 0.6}
                        y2={labelMargin * 0.6}
                    />
                </g>
                <text
                    x={labelMargin + (size - labelMargin) / 2}
                    y={size + cellSize * 1.7}
                >
                    {this.state.showPercent ? 'Values in %' : 'Sample counts'}
                </text>
                {classIndicators}
                <text
                    className='trueClassLabel'
                    x={labelMargin - labelFontSize / 2 - 5}
                    y={labelMargin + (size - labelMargin) / 2}
                    fontSize={labelFontSize}
                >
                    True Class
                </text>
                <text
                    className='predClassLabel'
                    x={labelMargin + (size - labelMargin) / 2}
                    y={labelMargin - labelFontSize / 2 - 5}
                    fontSize={labelFontSize}
                >
                    Predicted Class
                </text>
                {matrixSvg}
                {classTotalCells}
            </svg>
        );
    }
}
