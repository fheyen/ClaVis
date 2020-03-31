import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare, faSquare } from '@fortawesome/free-solid-svg-icons';
import ScoreBar from '../common/ScoreBar';
import ClassifierStatistic from '../common/ClassifierStatistic';
import ConfusionMatrix from '../common/ConfusionMatrix';
import Tools from '../../lib/Tools';
import '../../style/views/Filter.css';

export default class Filter extends Component {

    getAllValues = (param) => {
        const allValues = new Set();
        this.props.clfResultsAll.forEach(d => allValues.add(d.args[param]));
        return Array.from(allValues).sort();
    }

    getCurrentValues = (param) => {
        const allValues = new Set();
        this.props.clfResults.forEach(d => allValues.add(d.args[param]));
        return allValues;
    }

    removeClfResult = (clfResult) => this.props.setClfResults(this.props.clfResults.filter(d => d !== clfResult))

    addClfResult = (clfResult) => {
        // recreate array so views notice the change
        const newResults = this.props.clfResults.slice(0);
        newResults.push(clfResult);
        this.props.setClfResults(newResults);
    }

    // simply copy clfResultsAll
    selectAll = () => this.props.setClfResults(this.props.clfResultsAll.slice(0))

    selectNone = () => this.props.setClfResults([])

    invertSelection = () => this.props.setClfResults(this.props.clfResultsAll.filter(d => !this.props.clfResults.includes(d)))

    selectTopX = (e) => this.props.setClfResults(this.props.clfResultsAll.slice(0, e.target.value))

    /**
     * @param {string} param parameter to filter by
     * @param {any} value of the parameter
     * @param {boolean} remove if true, all clfResults where param==value will be removed, else added
     */
    filterOnParam = (param, value, remove) => {
        let newResults;
        if (remove) {
            newResults = this.props.clfResults.filter(d => d.args[param] !== value);
        } else {
            // get clfResults that should be added
            let difference = this.props.clfResultsAll.filter(d => d.args[param] === value);
            // add only those that are not already there
            newResults = this.props.clfResults.concat(difference.filter(d => !this.props.clfResults.includes(d)));
        }
        this.props.setClfResults(newResults);
    }

    /**
     * @param {string} score score to filter by
     * @param {any} value of the parameter
     */
    filterOnScore = (score, min, max) => {
        let accessor;
        switch (score) {
            case 'train_accuracy':
                accessor = d => -d.train_scores.accuracy;
                break;
            case 'test_accuracy':
                accessor = d => -d.test_scores.accuracy;
                break;
            case 'train_time':
                accessor = d => d.clf_time;
                break;
            case 'test_time':
                accessor = d => d.pred_time;
                break;
            default:
                console.warn(`Invalid score: ${score}`);
                accessor = d => -d.train_scores.accuracy;
        }
        // filter those that have values in [min, max]
        let newResults = this.props.clfResultsAll.filter(d => {
            const value = accessor(d);
            return value >= min && value <= max;
        });
        this.props.setClfResults(newResults);
    }

    /**
     * Checks if there are cross validation fold classifiers
     * (Classifiers for each fold)
     */
    hasCrossValidationFolds = () => {
        for (let i = 0; i < this.props.clfResultsAll.length; i++) {
            const clf = this.props.clfResultsAll[i];
            if (this.isCvFold(clf)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Selects all classifiers that DO NOT HAVE 'fold' in the last word of their title
     */
    selectCvSummaries = () => {
        const newResults = this.props.clfResultsAll.filter(d => !this.isCvFold(d));
        this.props.setClfResults(newResults);
    }

    /**
     * Selects all classifiers that HAVE 'fold' in the last word of their title
     */
    selectCvFolds = () => {
        const newResults = this.props.clfResultsAll.filter(d => this.isCvFold(d));
        this.props.setClfResults(newResults);
    }

    /**
     * Returns true iff clfResults contains 'fold' in its last word.
     */
    isCvFold = (clfResult) => Tools.getClassifierFoldNumber(clfResult) !== -1

    /**
     * Returns a table with score extents.
     */
    getScoreExtendsTable() {
        let scoreExtents;
        if (this.props.clfResults.length > 0) {
            scoreExtents = (
                <div>
                    <h4>Score Extents</h4>
                    <table>
                        <tbody>
                            <tr>
                                <th>Score</th>
                                <th>Min</th>
                                <th>Max</th>
                            </tr>
                            <tr>
                                <td>Training Accuracy</td>
                                <td>{this.props.dataStats.trainAccuracy[0].toFixed(2)}</td>
                                <td>{this.props.dataStats.trainAccuracy[1].toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Test Accuracy</td>
                                <td>{this.props.dataStats.testAccuracy[0].toFixed(2)}</td>
                                <td>{this.props.dataStats.testAccuracy[1].toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Training Time</td>
                                <td>{this.props.dataStats.trainTime[0].toFixed(2)}</td>
                                <td>{this.props.dataStats.trainTime[1].toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Test Time</td>
                                <td>{this.props.dataStats.testTime[0].toFixed(2)}</td>
                                <td>{this.props.dataStats.testTime[1].toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        }
        return scoreExtents;
    }

    render() {
        // list currently selected classifiers
        const selectedClassifiers = this.props.clfResults.map((d, i) => {
            return (
                <li
                    key={i}
                    onMouseOver={() => this.props.onHighlightClf(d)}
                    style={{ color: this.props.clfColorMap.get(d.args.title) }}
                    className={this.props.highlightClf === d ? 'highlighted' : ''}
                >
                    <ScoreBar ratio={d.test_scores.accuracy} />
                    {d.args.title}
                </li>
            );
        });

        // list all classifiers
        const allClassifiers = this.props.sortClfResults(this.props.clfResultsAll).map((d, i) => {
            const selected = this.props.clfResults.includes(d);
            let color = 'var(--textColor)';
            if (this.props.clfColorMap.has(d.args.title)) {
                color = this.props.clfColorMap.get(d.args.title);
            }
            return (
                <li
                    key={i}
                    className={this.props.highlightClf === d ? 'highlighted' : selected ? 'selected' : ''}
                    title={selected ? 'Click to remove' : 'Click to select'}
                    onMouseOver={() => this.props.onHighlightClf(d)}
                    onClick={() => selected ? this.removeClfResult(d) : this.addClfResult(d)}
                    style={{ color: color }}
                >
                    <ScoreBar ratio={d.test_scores.accuracy} />
                    <FontAwesomeIcon icon={selected ? faCheckSquare : faSquare} />
                    {d.args.title}
                </li>
            );
        });

        // list all methods and mark those that have currently selected classifiers
        const currentMethods = this.getCurrentValues('method');
        const allMethods = this.getAllValues('method').map((d, i) => {
            const selected = currentMethods.has(d);
            return (
                <li
                    key={i}
                    className={selected ? 'selected' : ''}
                    onClick={() => this.filterOnParam('method', d, selected)}
                >
                    {d}
                </li>
            );
        });

        // show current score extents
        const scoreExtents = this.getScoreExtendsTable();

        // show mean test confusion matrix
        let confMatrix;
        if (this.props.clfResults.length > 0) {
            const meanTestConfMatrix = Tools.getMeanTestConfMatrix(this.props.clfResults);
            confMatrix = (
                <div style={{ textAlign: 'center' }}>
                    <h4>Mean Confusion Matrix</h4>
                    <ConfusionMatrix
                        confMatrix={meanTestConfMatrix}
                        confMatrixSize={this.props.mainSize.width / 4 - 20}
                        data={this.props.data}
                        colorMap={this.props.colorMap}
                    />
                </div>
            );
        }

        // render
        return (
            <div className='Filter'>
                <div>
                    <h2>Selected</h2>
                    <ul>
                        {selectedClassifiers}
                    </ul>
                </div>

                <div>
                    <h2>All</h2>
                    <ul>
                        {allClassifiers}
                    </ul>
                </div>

                <div>
                    <h2>Filter</h2>
                    <div>
                        <button onClick={this.selectAll}>
                            Select all
                        </button>
                        <button onClick={this.selectNone}>
                            Clear
                        </button>
                        <button onClick={this.invertSelection}>
                            Invert
                        </button>
                    </div>
                    <div title='Depending on current sorting'>
                        Select top*
                        <input
                            type='number'
                            defaultValue='10'
                            step='5'
                            min='5'
                            max='10000'
                            onChange={this.selectTopX}
                        />
                    </div>
                    {this.hasCrossValidationFolds() &&
                        <div
                            title='Only applies for cross validation with saved summaries and folds'
                        >
                            <button onClick={this.selectCvSummaries}>
                                Select summaries
                            </button>
                            <button onClick={this.selectCvFolds}>
                                Select folds
                            </button>
                        </div>
                    }
                    <h4>
                        Method
                    </h4>
                    <ul>
                        {allMethods}
                    </ul>
                </div>

                <div>
                    <h2>Statistics</h2>

                    {scoreExtents}

                    {confMatrix}

                    <ClassifierStatistic
                        clfResults={this.props.clfResults}
                        clfResultsAll={this.props.clfResultsAll}
                        filterOnParam={this.filterOnParam}
                    />
                </div>
            </div>
        );
    }
}
