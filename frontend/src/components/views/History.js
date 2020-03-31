import React, { Component } from 'react';
import { ControlLabel, FormGroup } from 'react-bootstrap';
import HistoryChart from '../common/HistoryChart';
import HistoryChartCombined from '../common/HistoryChartCombined';
import HistoryChartCombinedSimplified from '../common/HistoryChartCombinedSimplified';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortAmountUp } from '@fortawesome/free-solid-svg-icons';
import '../../style/views/History.css';
export default class History extends Component {

    constructor(props) {
        super(props);
        this.state = {
            variable: 'Accuracy',
            showTrainLines: true,
            groupLines: false,
        };
    }

    componentDidUpdate() {
        if (this.props.highlightClf) {
            this.render();
        }
    }

    render() {
        const limit = 20;
        const size = (this.props.mainSize.width) / this.props.columns - 2.5;
        const variables = ['Accuracy', 'Loss'];
        const variableOptions = variables.map((d, i) => (
            <option
                key={i}
                value={d}
            >
                {d}
            </option>
        ));

        // filter out those without history
        const clfResultsWithHistory = this.props.clfResults.filter(clfResult => clfResult.history);
        let shownResults = clfResultsWithHistory;
        // return if there are no clfResults with history
        if (clfResultsWithHistory.length === 0) {
            return (
                <div className='History'>
                    <p>
                        No classifification result in the current selection and filter contains a history.
                    </p>
                </div>
            );
        }
        // limit to avoid clutter and bad performance
        if (clfResultsWithHistory.length > limit) {
            shownResults = clfResultsWithHistory.slice(0, limit);
        }

        // small indicators to make highlighting easier
        let indicators = [];
        if (!this.state.groupLines) {
            indicators = clfResultsWithHistory.map((d, i) => (
                <div
                    key={i}
                    className='clfIndicator'
                    title={d.args.title}
                    style={{
                        background: this.props.clfColorMap.get(d.args.title),
                        borderColor: this.props.highlightClf === d ? 'white' : 'transparent'
                    }}
                    onMouseOver={() => this.props.onHighlightClf(d)}
                />
            ));
        }

        // get single classifier charts
        let charts = [];
        if (!this.state.groupLines) {
            charts = shownResults.map((clfResult, i) => {
                return (
                    <div
                        key={i}
                        style={{
                            background: clfResult === this.props.highlightClf ? 'rgba(128, 128, 128, 0.2)' : 'none'
                        }}
                        onMouseOver={() => this.props.onHighlightClf(clfResult)}
                    >
                        <h4 style={{
                            color: this.props.clfColorMap.get(clfResult.args.title)
                        }}>
                            {clfResult.args.title}
                        </h4>
                        <HistoryChart
                            clfResult={clfResult}
                            variable={this.state.variable}
                            width={size}
                            height={size}
                        />
                    </div>
                );
            });
        }

        return (
            <div className='History'>
                <div className='control'>
                    <FormGroup>
                        <ControlLabel>
                            Variable
                        </ControlLabel>
                        <select
                            onChange={(e) => this.setState({ variable: e.target.value }, this.render)}
                            defaultValue={this.state.variable}
                        >
                            {variableOptions}
                        </select>
                    </FormGroup>
                    <FormGroup>
                        <button
                            onClick={() => this.setState({ groupLines: !this.state.groupLines })}
                            title='Shows mean and 90% confidence interval for each group'
                        >
                            Toggle grouping by color
                        </button>
                        <button
                            onClick={() => this.setState({ showTrainLines: !this.state.showTrainLines })}
                        >
                            Show/hide training scores
                        </button>
                    </FormGroup>
                </div>
                <div>
                    <p>
                        Dashed lines show training scores, solid lines show validation scores. Hover a line or one of the boxes below to highlight a classifier.
                    </p>
                    <div>
                        {indicators}
                    </div>
                    {// simplified chart with group mean and confidence interval
                        this.state.groupLines &&
                        <HistoryChartCombinedSimplified
                            clfResults={clfResultsWithHistory}
                            variable={this.state.variable}

                            width={this.props.mainSize.width}
                            height={this.props.mainSize.height / 2}
                            clfColorMap={this.props.clfColorMap}
                            clfColorMapMode={this.props.clfColorMapMode}
                            historySmoothingWeight={this.props.historySmoothingWeight}
                            showTrainLines={this.state.showTrainLines}

                            onHighlightClf={this.props.onHighlightClf}
                            highlightClf={this.props.highlightClf}
                        />
                    }
                    {// detailed chart with one line per clf
                        !this.state.groupLines &&
                        <HistoryChartCombined
                            clfResults={clfResultsWithHistory}
                            variable={this.state.variable}

                            width={this.props.mainSize.width}
                            height={this.props.mainSize.height / 2}
                            clfColorMap={this.props.clfColorMap}
                            historySmoothingWeight={this.props.historySmoothingWeight}
                            showTrainLines={this.state.showTrainLines}

                            onHighlightClf={this.props.onHighlightClf}
                            highlightClf={this.props.highlightClf}
                        />
                    }
                </div>
                {clfResultsWithHistory.length > limit &&
                    <div>
                        Below: Only showing the top {limit} of {clfResultsWithHistory.length} classifiers, ordered by the current sorting order (see toolbar <FontAwesomeIcon icon={faSortAmountUp} />).
                    </div>
                }
                <div
                    className='Charts'
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${this.props.columns}, 1fr)`
                    }}>
                    {charts}
                </div>
            </div>
        );
    }
}
