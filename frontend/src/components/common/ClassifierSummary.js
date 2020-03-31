import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSlidersH, faTable, faAngleDown, faAngleUp, faClock } from '@fortawesome/free-solid-svg-icons';
import Tools from '../../lib/Tools';
import ScoreBar from './ScoreBar';
import HistoryChart from './HistoryChart';
import ConfusionMatrix from './ConfusionMatrix';
import '../../style/common/ClassifierSummary.css';

export default class ClassifierSummary extends Component {

    constructor(props) {
        super(props);
        const p = this.props;
        this.state = {
            showScores: p.showScores !== undefined ? p.showScores : false,
            showHistory: p.showHistory !== undefined ? p.showHistory : true,
            showParams: p.showParams !== undefined ? p.showParams : false,
            // history: this.props.clfResult.history
        };
    }

    componentDidUpdate() {
        const p = this.props;
        const s = this.state;
        if (p.showScores !== undefined && p.showScores !== s.showScores) {
            this.setState({ showScores: p.showScores });
        }
        if (p.showHistory !== undefined && p.showHistory !== s.showHistory) {
            this.setState({ showHistory: p.showHistory });
        }
        if (p.showParams !== undefined && p.showParams !== s.showParams) {
            this.setState({ showParams: p.showParams });
        }

        // TODO: react to updating history (when smoothed)
        //     if (this.props.clfResult.history !== this.state.history) {
        //         this.setState(
        //             { history: this.props.clfResult.history },
        //             this.render
        //         );
        //     }
    }

    /**
     * Creates a table with score names and values
     * @param {*} clfResult
     */
    getScoreTable = (clfResult) => {
        const d = clfResult;
        const stats = this.props.dataStats;
        let scores = [
            {
                title: 'Accuracy',
                train: d.train_scores.accuracy,
                test: d.test_scores.accuracy
            }
        ];
        if (this.state.showScores) {
            // add other scores
            scores = scores.concat([
                {
                    title: 'Precision',
                    train: d.train_scores.pre_rec_fs_supp[0],
                    test: d.test_scores.pre_rec_fs_supp[0]
                },
                {
                    title: 'Recall',
                    train: d.train_scores.pre_rec_fs_supp[1],
                    test: d.test_scores.pre_rec_fs_supp[1]
                },
                {
                    title: 'F-score',
                    train: d.train_scores.pre_rec_fs_supp[2],
                    test: d.test_scores.pre_rec_fs_supp[2]
                }
            ]);
        }
        const scoreTable = (<table className='scoreTable'>
            <tbody>
                <tr>
                    <th>Score</th>
                    <th>Train</th>
                    <th>Test</th>
                </tr>
                {scores.map(d => {
                    return (<tr key={d.title}>
                        <td>{d.title}</td>
                        <td>
                            <ScoreBar ratio={d.train} />
                            {d.train.toFixed(4)}
                        </td>
                        <td>
                            <ScoreBar ratio={d.train} />
                            {d.test.toFixed(4)}
                        </td>
                    </tr>);
                })}
                <tr key='time'>
                    <td>Time</td>
                    <td>
                        {stats &&
                            <ScoreBar
                                ratio={1 - (d.clf_time / stats.trainTime[1])}
                            />
                        }
                        {Tools.formatTime(d.clf_time)}
                    </td>
                    <td>
                        {stats &&
                            <ScoreBar
                                ratio={1 - (d.pred_time / stats.testTime[1])}
                            />
                        }
                        {Tools.formatTime(d.pred_time)}
                    </td>
                </tr>
            </tbody>
        </table>);
        return scoreTable;
    }

    /**
     * Creates a table with parameter names and values
     */
    getParamsTable = (clfResult) => {
        const paramsTableRows = [];
        const params = clfResult.args;
        if (params.method !== 'optimal') {
            const clfInfo = this.props.serverInfo.classifiers.methods
                .filter(d => d.name === params.method)[0];
            // list method first
            paramsTableRows.push((<tr key='method'>
                <td>Method</td>
                <td>{clfInfo ? clfInfo.description : `Plugin not found for ${params.method}`}</td>
            </tr>));
            if (clfInfo) {
                for (const p in params) {
                    if (params.hasOwnProperty(p)) {
                        let description;
                        let value;
                        if (!['title', 'method', 'file'].includes(p)) {
                            try {
                                if (p === 'random_state') {
                                    description = p.replace('_', ' ');
                                    description = description[0].toUpperCase() + description.substr(1);
                                    value = params[p];
                                }
                                else {
                                    description = clfInfo.parameters.filter(d => d.name === p)[0].description;
                                    value = params[p].toString();
                                }
                                if (Array.isArray(value)) {
                                    value = value.join(', ');
                                }
                            }
                            catch (e) {
                                console.log(`Cannot display parameter information for ${p}, the plugin may have changed!`);
                                console.error(e);
                            }
                            paramsTableRows.push((<tr key={p}>
                                <td>{description}</td>
                                <td>{value}</td>
                            </tr>));
                        }
                    }
                }
            }
        }
        return paramsTableRows;
    }

    render() {
        const clfResult = this.props.clfResult;

        // table with parameters
        const paramsTableRows = this.getParamsTable(clfResult);

        // table with scores
        const scoreTable = this.getScoreTable(clfResult);

        return (
            <div className='ClassifierSummary'>
                <h2 className='title'>
                    {clfResult.args.title}
                </h2>

                <div>
                    <h3>
                        <FontAwesomeIcon icon={faCheck} />
                        Scores
                        <button
                            onClick={() => this.setState({ showScores: !this.state.showScores })}
                            title='Show more / less'
                        >
                            <FontAwesomeIcon icon={this.state.showScores ? faAngleUp : faAngleDown} />
                        </button>
                    </h3>
                    {scoreTable}
                </div>

                {clfResult.test_scores.conf_matrix &&
                    <div>
                        <h3>
                            <FontAwesomeIcon icon={faTable} />
                            Test confusion matrix
                        </h3>
                        <ConfusionMatrix
                            confMatrix={this.props.clfResult.test_scores.conf_matrix}
                            confMatrixSize={this.props.confMatrixSize}
                            data={this.props.data}
                            colorMap={this.props.colorMap}
                        />
                    </div>}

                {clfResult.history &&
                    <div>
                        <h3>
                            <FontAwesomeIcon icon={faClock} />
                            History
                            <button
                                onClick={() => this.setState({ showHistory: !this.state.showHistory })}
                                title='Show / hide'
                            >
                                <FontAwesomeIcon icon={this.state.showHistory ? faAngleUp : faAngleDown} />
                            </button>
                        </h3>
                        {this.state.showHistory &&
                            <HistoryChart
                                clfResult={clfResult}
                                variable={'Accuracy'}
                                width={290}
                                height={290}
                            />
                        }
                    </div>
                }

                <div>
                    <h3>
                        <FontAwesomeIcon icon={faSlidersH} />
                        Hyper parameters
                        <button
                            onClick={() => this.setState({ showParams: !this.state.showParams })}
                            title='Show / hide'
                        >
                            <FontAwesomeIcon icon={this.state.showParams ? faAngleUp : faAngleDown} />
                        </button>
                    </h3>
                    <table
                        className='paramTable'
                        style={{ display: this.state.showParams ? 'block' : 'none' }}
                    >
                        <tbody>
                            {paramsTableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}
