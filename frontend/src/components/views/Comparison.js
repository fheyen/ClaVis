import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo, faSquare, faCheckSquare, faClock, faTable, faCheck, faSlidersH } from '@fortawesome/free-solid-svg-icons';
import { scaleDiverging } from 'd3-scale';
import { min, max } from 'd3-array';
import ClassifierSummary from '../common/ClassifierSummary';
import ScoreBar from '../common/ScoreBar';
import HistoryChartCombined from '../common/HistoryChartCombined';
import Tools from '../../lib/Tools';
import '../../style/views/Comparison.css';

export default class Comparison extends Component {

    constructor(props) {
        super(props);

        this.state = {
            // current user selection
            classifiers: new Set(),
            variable: 'Accuracy',
            ignoreDiagnonal: false
        };
    }

    classifierChanged = (hash) => {
        const classifiers = this.state.classifiers;
        if (!this.state.classifiers.has(hash)) {
            // only two may be added
            if (classifiers.size === 2) {
                classifiers.delete(classifiers.keys().next().value);
            }
            classifiers.add(hash);
        } else {
            classifiers.delete(hash);
        }
        this.setState({ classifiers });
    }

    arrayDifference = (a, b) => new Array(a.length).fill(0).map((d, i) => a[i] - b[i])

    matrixDifference = (A, B) => new Array(A.length).fill(0).map((d, i) => this.arrayDifference(A[i], B[i]))

    /**
     * Returns a style object with a text color depending on the value.
     */
    colorCode = (value, minAbsolute = 0.001) => {
        let color;
        if (Math.abs(value) < minAbsolute) {
            color = '--textColor';
        } else {
            color = value > 0 ? 'green' : 'red';
        }
        return { color };
    }

    /**
     * Creates a table with scores
     * @param {object} A a clfResult
     * @param {object} B a clfResult
     * @return score table
     */
    getScoreComparisonTable(A, B) {
        const comp = [
            {
                title: 'Training acc.',
                a: A.train_scores.accuracy,
                b: B.train_scores.accuracy,
                diff: A.train_scores.accuracy - B.train_scores.accuracy,
                format: d => (d * 100).toFixed(1)
            },
            {
                title: 'Test acc.',
                a: A.test_scores.accuracy,
                b: B.test_scores.accuracy,
                diff: A.test_scores.accuracy - B.test_scores.accuracy,
                format: d => (d * 100).toFixed(1)
            },
            {
                title: 'Training time',
                a: A.clf_time,
                b: B.clf_time,
                diff: B.clf_time - A.clf_time,
                format: Tools.formatTime
            },
            {
                title: 'Test time',
                a: A.pred_time,
                b: B.pred_time,
                diff: B.pred_time - A.pred_time,
                format: Tools.formatTime
            }
        ];
        const rows = comp.map((d, i) => {
            return (
                <tr key={i}>
                    <td>
                        {d.title}
                    </td>
                    <td style={this.colorCode(d.diff)}>
                        {d.format ? d.format(d.a) : d.a}
                    </td>
                    <td style={this.colorCode(-d.diff)}>
                        {d.format ? d.format(d.b) : d.b}
                    </td>
                    <td>
                        {d.format ? d.format(d.diff) : d.diff}
                    </td>
                </tr>
            );
        });
        return (
            <table>
                <tbody>
                    <tr>
                        <th>Score</th>
                        <th>{A.args.title}</th>
                        <th>{B.args.title}</th>
                        <th>Difference</th>
                    </tr>
                    {rows}
                </tbody>
            </table>
        );
    }

    /**
     * Returns the maximum value in the matrix while respecting
     * this.state.ignoreDiagnonal
     * @param {number[][]} matrix confusion matrix
     * @returns {number[]} min and max value
     */
    getMatrixMinMaxValue(matrix) {
        let minValue, maxValue;
        if (!this.state.ignoreDiagnonal) {
            // with diagonal
            minValue = min(matrix.map(row => min(row)));
            maxValue = max(matrix.map(row => max(row)));
        } else {
            // without diagonal
            minValue = 0;
            maxValue = 0;
            for (let row = 0; row < matrix.length; row++) {
                for (let col = 0; col < matrix.length; col++) {
                    if (row !== col) {
                        let value = matrix[row][col];
                        if (value < minValue) {
                            minValue = value;
                        } else if (value > maxValue) {
                            maxValue = value;
                        }
                    }
                }
            }
        }
        return [minValue, maxValue];
    }

    /**
     * Computes the difference confusion matrix of clfResults A and B
     * @param {object} A a clfResult
     * @param {object} B a clfResult
     * @return difference confusionsion matrix
     */
    getDifferenceMatrix(A, B) {
        // fixed constants
        const minSize = 100;
        const maxCellSize = 30;
        const labelMargin = 25;
        const labelFontSize = 12;

        const numClasses = A.test_scores.conf_matrix.length;
        // get difference matrix
        const differenceMatrix = [];
        for (let i = 0; i < numClasses; i++) {
            const row = new Array(numClasses).fill(0);
            for (let j = 0; j < numClasses; j++) {
                row[j] = A.test_scores.conf_matrix[i][j] - B.test_scores.conf_matrix[i][j];
            }
            differenceMatrix.push(row);
        }
        // visualize matrix
        let size = this.props.confMatrixSize;
        const classNames = this.props.data.data.class_names;
        if (labelMargin + maxCellSize * numClasses < size) {
            size = labelMargin + maxCellSize * numClasses;
        }
        size = Math.max(minSize, size);
        const cellSize = (size - labelMargin) / numClasses;
        const margin = numClasses <= 10 ? cellSize * 0.05 : 0;
        const marginedSize = cellSize - 2 * margin;
        const fontSize = Math.min(11, cellSize / 2.2);
        // colormap: on diagonal, more is better, otherwise less is better
        const [minValue, maxValue] = this.getMatrixMinMaxValue(differenceMatrix);
        const colorMapDiv = this.props.divergingColorMap;
        const colorMap = scaleDiverging([maxValue, 0, minValue], colorMapDiv);
        const colorMapDiagonal = scaleDiverging([minValue, 0, maxValue], colorMapDiv);
        // confusion matrix
        const matrixSvg = differenceMatrix.map((row, i) => {
            return row.map((value, j) => {
                const x = labelMargin + cellSize * j + margin;
                const y = labelMargin + cellSize * i + margin;
                let cellColor, textColor;
                if (i === j) {
                    cellColor = colorMapDiagonal(value);
                    // if background is bright make text black else white
                    textColor = Tools.getBrigthness(cellColor) > 128 ? 'black' : 'white';
                    if (this.state.ignoreDiagnonal) {
                        cellColor = 'rgba(0, 0, 0, 0)';
                        textColor = this.props.theme === 'dark' ? 'white' : 'black';
                    }
                } else {
                    cellColor = colorMap(value);
                    // if background is bright make text black else white
                    textColor = Tools.getBrigthness(cellColor) > 128 ? 'black' : 'white';
                }
                let title, text;
                if (numClasses <= 10) {
                    // A is better than B if its values on the diagonal are higher and others are lower than B's
                    const betterVal = i === j ? value : -value;
                    let betterOrNot = 'worse than';
                    if (betterVal > 0) {
                        betterOrNot = 'better than';
                    }
                    else if (betterVal === 0) {
                        title = <title>A is equal to B in this case</title>;
                    }
                    const moreOrLess = value >= 0 ? 'more' : 'less';
                    const correct = i === j ? 'correctly ' : 'miss-';
                    if (classNames) {
                        title = <title>Left is {betterOrNot} right: {Math.abs(value)} {moreOrLess} samples of {classNames[i]} where {correct}labelled as {classNames[j]}</title>;
                    }
                    else {
                        title = <title>Left is {betterOrNot} right: {Math.abs(value)} {moreOrLess} samples of class {i} where {correct}labelled as class {j}</title>;
                    }
                    value = Math.round(value * 10) / 10;
                    text = (
                        <text
                            x={x + marginedSize / 2}
                            y={y + marginedSize / 2 + fontSize * 0.35}
                            fontSize={fontSize}
                            fill={textColor}
                            textAnchor='middle'
                        >
                            {value}
                        </text>
                    );
                }
                return (
                    <g key={`${i}-${j}`}>
                        <rect
                            x={x}
                            y={y}
                            width={marginedSize}
                            height={marginedSize}
                            fill={cellColor}
                        />
                        {title}
                        {text}
                    </g>
                );
            });
        });
        return (
            <svg
                width={size}
                height={size}
            >
                {/* button to toggle the diagonal for the colormap */}
                <g
                    className='toggleDiagonalBtn'
                    onClick={() => this.setState({ ignoreDiagnonal: !this.state.ignoreDiagnonal })}
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
            </svg>
        );
    }

    /**
     * Creates a table with parameter differences
     * @param {object} A a clfResult
     * @param {object} B a clfResult
     * @return parameter differences table
     */
    getParamComparisonTable(A, B) {
        const params = Tools.getParameterNames([A, B]);
        params.unshift('method');
        const rows = params.map((d, i) => {
            const valueA = A.args.hasOwnProperty(d) ? A.args[d] : '';
            const valueB = B.args.hasOwnProperty(d) ? B.args[d] : '';
            return (
                <tr
                    key={i}
                    style={{ opacity: valueA === valueB ? 0.7 : 1 }}
                >
                    <td>
                        {d}
                    </td>
                    <td>
                        {valueA.toString()}
                    </td>
                    <td>
                        {valueB.toString()}
                    </td>
                </tr>
            );
        });
        return (
            <table>
                <tbody>
                    <tr>
                        <th>Parameter</th>
                        <th>{A.args.title}</th>
                        <th>{B.args.title}</th>
                    </tr>
                    {rows}
                </tbody>
            </table>
        );
    }

    render() {
        const classifiers = this.props.clfResults.map((d, i) => {
            const hash = d.hash;
            const title = d.args.title;
            const selected = this.state.classifiers.has(hash);
            return (
                <li
                    key={i}
                    className={this.props.highlightClf === d ? 'highlighted' : selected ? 'selected' : ''}
                    onClick={() => this.classifierChanged(hash)}
                    onMouseOver={() => this.props.onHighlightClf(d)}
                    style={{ color: this.props.clfColorMap.get(d.args.title) }}
                >
                    <ScoreBar ratio={d.test_scores.accuracy} />
                    <FontAwesomeIcon icon={selected ? faCheckSquare : faSquare} />
                    {title}
                </li>
            );
        });

        // get selected classification objects from titles
        const selected = Array.from(this.state.classifiers.values())
            .map((d, i) => {
                return this.props.clfResults.filter(r => r.hash === d)[0];
            });

        // show summaries for the selected clfResults
        const juxtapositionSummary = selected.map((clf, i) => {
            return (
                <ClassifierSummary
                    key={i}
                    data={this.props.data}
                    clfResult={clf}
                    serverInfo={this.props.serverInfo}
                    dataStats={this.props.dataStats}

                    confMatrixSize={this.props.confMatrixSize}
                    colorMap={this.props.colorMap}
                />
            );
        });

        // show combined comparison
        let scoreTable, comparisonConfMatrix, paramTable;
        if (selected.length === 2) {
            const A = selected[0];
            const B = selected[1];
            // table with comparison for each score
            scoreTable = this.getScoreComparisonTable(A, B);
            // comparison confusion matrix
            comparisonConfMatrix = this.getDifferenceMatrix(A, B);
            // parameter comparison
            paramTable = this.getParamComparisonTable(A, B);
        }

        const clfResultsWithHistory = selected.filter(clfResult => clfResult.history);

        return (
            <div className='Comparison'>
                <div className='list'>
                    <div>
                        <span className='accent'>
                            <FontAwesomeIcon icon={faInfo} />
                        </span>
                        Select two classification results to compare them:
                    </div>
                    <ul>
                        {classifiers}
                    </ul>
                </div>
                <div className='juxtaposition'>
                    {juxtapositionSummary}
                </div>
                <div className='comparison'>
                    <h2>Comparison</h2>
                    <div>
                        <h3>
                            <FontAwesomeIcon icon={faCheck} />
                            Scores
                        </h3>
                        {scoreTable}
                    </div>
                    <div>
                        <h3>
                            <FontAwesomeIcon icon={faTable} />
                            Test confusion matrix (difference)
                        </h3>
                        {comparisonConfMatrix}
                        <p className='colorLegend'>
                            {
                                // using the color map, since it might change
                                [
                                    ['Left is better', 1],
                                    ['Both are equal', 0.5],
                                    ['Left is worse', 0]
                                ].map((d, i) => {
                                    const color = this.props.divergingColorMap(d[1]);
                                    const textColor = Tools.getBrigthness(color) > 128 ? 'black' : 'white';
                                    return (
                                        <span
                                            key={i}
                                            style={{ background: color, color: textColor }}
                                        >
                                            {d[0]}
                                        </span>
                                    );
                                })}
                        </p>
                    </div>
                    {clfResultsWithHistory.length === 2 &&
                        <div>
                            <h3>
                                <FontAwesomeIcon icon={faClock} />
                                History
                            </h3>
                            <HistoryChartCombined
                                // force update on change
                                key={clfResultsWithHistory.map(d => d.args.title).join('-')}
                                clfResults={clfResultsWithHistory}
                                variable={this.state.variable}
                                width={300}
                                height={300}
                                clfColorMap={this.props.clfColorMap}
                                onHighlightClf={this.props.onHighlightClf}
                            />
                            {clfResultsWithHistory.map((d, i) => {
                                return (
                                    <div
                                        key={i}
                                        style={{ color: this.props.clfColorMap.get(d.args.title) }}
                                    >
                                        {d.args.title}
                                    </div>
                                );
                            })}
                        </div>
                    }
                    <div>
                        <h3>
                            <FontAwesomeIcon icon={faSlidersH} />
                            Parameters
                        </h3>
                        {paramTable}
                    </div>
                </div>
            </div>
        );
    }
}
