import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortAmountUp, faCheck, faClock, faSlidersH } from '@fortawesome/free-solid-svg-icons';
import ClassifierSummary from '../common/ClassifierSummary';
import '../../style/views/Summary.css';

export default class Summary extends Component {

    constructor(props) {
        super(props);
        this.state = {
            showScores: false,
            showParams: false,
            showHistory: false
        };
    }

    render() {
        const limit = 50;
        const clfs = this.props.clfResults;
        let shownResults = clfs;
        if (clfs.length > limit) {
            shownResults = clfs.slice(0, limit);
        }
        const content = shownResults.map((clfResult, i) => {
            return (
                <div
                    key={i}
                    style={{
                        height: '100%',
                        background: clfResult === this.props.highlightClf ? 'rgba(128, 128, 128, 0.2)' : 'none',
                        border: `2px solid ${this.props.clfColorMapOpacity.get(clfResult.args.title)}`
                    }}
                    onMouseOver={() => this.props.onHighlightClf(clfResult)}
                >
                    <ClassifierSummary
                        data={this.props.data}
                        clfResult={clfResult}
                        serverInfo={this.props.serverInfo}
                        dataStats={this.props.dataStats}

                        confMatrixSize={this.props.confMatrixSize}
                        colorMap={this.props.colorMap}

                        showScores={this.state.showScores}
                        showHistory={this.state.showHistory}
                        showParams={this.state.showParams}
                    />
                </div>
            );
        });
        return (
            <div className='Summary'>
                {clfs.length > limit &&
                    <p className='infoMessage'>
                        Showing the top {limit} of {clfs.length} classifiers, ordered by the current sorting order (see toolbar <FontAwesomeIcon icon={faSortAmountUp} />).
                    </p>
                }
                <div className='control'>
                    <button
                        onClick={() => this.setState({ showScores: !this.state.showScores })}
                        title='Toggle scores'
                    >
                        <FontAwesomeIcon icon={faCheck} /> Toggle scores
                    </button>
                    <button
                        onClick={() => this.setState({ showHistory: !this.state.showHistory })}
                        title='Toggle histories'
                    >
                        <FontAwesomeIcon icon={faClock} /> Toggle histories
                    </button>
                    <button
                        onClick={() => this.setState({ showParams: !this.state.showParams })}
                        title='Toggle parameters'
                    >
                        <FontAwesomeIcon icon={faSlidersH} /> Toggle parameters
                    </button>
                </div>
                <div className='summaries' style={{ gridTemplateColumns: `repeat(${this.props.columns}, 1fr)` }}>
                    {content}
                </div>
            </div>
        );
    }
}
