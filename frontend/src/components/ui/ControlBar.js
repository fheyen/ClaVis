import React, { Component } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripHorizontal, faGripVertical, faSearchPlus, faSearchMinus, faSortAmountUp, faSortAmountDown, faPalette, faColumns, faChartLine, faCog } from '@fortawesome/free-solid-svg-icons';
import '../../style/ui/ControlBar.css';
import Tools from '../../lib/Tools';

export default class ControlBar extends Component {

    constructor(props) {
        super(props);
        this.state = {
            // this is changed to let React know the smoothing value has been reset
            smoothingResetTrigger: true
        };
    }

    /**
     * Returns true iff an option should be shown.
     * @param {string[]} supportedViews list of view names for which to show this
     */
    shouldShowOption = (supportedViews) => {
        const cv = this.props.currentView;
        const cv2 = this.props.currentSecondView;
        if (supportedViews.includes(cv) || supportedViews.includes(cv2)) {
            return true;
        }
        return false;
    }

    render() {
        const cv = this.props.currentView;
        const cv2 = this.props.currentSecondView;

        // show only options that make sense for the current view(s)
        const allButMenuHelpData = ['filter', 'ranking', 'map', 'plot', 'summary', 'history', 'comparison'];
        const showOrdering = this.shouldShowOption(allButMenuHelpData);
        const showColorMap = this.shouldShowOption(allButMenuHelpData);
        const showCircleRadius = this.shouldShowOption(['data']);
        const showColumns = this.shouldShowOption(['summary', 'history']);
        const showSmoothing = this.shouldShowOption(allButMenuHelpData);

        // view buttons (for left view)
        const viewButtons = this.props.views.map(d => {
            const className = d.name === cv ? 'current' : '';
            const disabled = !this.props.dataReady && !['menu', 'help'].includes(d.name);
            return (
                <Button
                    key={d.name}
                    title={disabled ? null : d.title}
                    className={className}
                    onClick={() => this.props.showView(d.name)}
                    disabled={disabled}
                >
                    {d.icon}
                </Button>
            );
        });

        // view buttons (for right view)
        let viewButtons2;
        if (this.props.twoColumnLayout) {
            viewButtons2 = this.props.views
                .filter(d => !['menu', 'help'].includes(d.name))
                .map(d => {
                    const className = d.name === cv2 ? 'current' : '';
                    const disabled = !this.props.dataReady && !['menu', 'help'].includes(d.name);
                    return (
                        <Button
                            key={d.name}
                            title={disabled ? null : d.title}
                            className={className}
                            onClick={() => this.props.showView(d.name, 'right')}
                            disabled={disabled}
                        >
                            {d.icon}
                        </Button>
                    );
                });
        }

        // provide options for all parameters of the current clfResults
        let paramOptions;
        if (this.props.dataReady) {
            const params = Tools.getParameterNames(this.props.clfResults);
            paramOptions = params.map(d => (
                <option
                    key={d}
                    value={d}
                >
                    {d}
                </option>
            ));
        }

        let ordering;
        if (showOrdering) {
            let icon = (<FontAwesomeIcon icon={faSortAmountDown} />);
            let mode = 'best';
            if (this.props.sortAscending) {
                icon = (<FontAwesomeIcon icon={faSortAmountUp} />);
                mode = 'worst';
            }
            ordering = (
                <span>
                    <ButtonGroup>
                        <Button
                            title={`Invert ordering (current: ${mode} at top)`}
                            onClick={this.props.toggleSortDirection}
                        >
                            {icon}
                        </Button>
                        <select
                            title='Sort classifiers by ...'
                            onChange={this.props.orderingChanged}
                            defaultValue={this.props.clfOrdering}
                        >
                            <optgroup label='General'>
                                <option value='title'>Title</option>
                                <option value='method'>Method</option>
                                <option value='fold'>Fold</option>
                            </optgroup>
                            <optgroup label='Scores'>
                                <option value='train_accuracy'>Training accuracy</option>
                                <option value='test_accuracy'>Test accuracy</option>
                                <option value='total_accuracy'>Total accuracy</option>
                                <option value='train_time'>Training time</option>
                                <option value='test_time'>Test time</option>
                            </optgroup>
                            <optgroup label='Parameters'>
                                {paramOptions}
                            </optgroup>
                        </select>
                    </ButtonGroup>
                </span>
            );
        }


        let clfColorMap;
        if (showColorMap) {
            clfColorMap = (
                <span>
                    <ButtonGroup>
                        <Button
                            title='Reset classifier color to "method"'
                            onClick={() => this.props.changeClfColorMap('method')}
                        >
                            <FontAwesomeIcon icon={faPalette} />
                        </Button>
                        <select
                            onChange={(e) => this.props.changeClfColorMap(e.target.value)}
                            title='Color classifiers by ...'
                            defaultValue={this.props.clfColorMapMode}
                        >
                            <optgroup label='General'>
                                <option value='title'>Title</option>
                                <option value='method'>Method</option>
                                <option value='fold'>Fold</option>
                            </optgroup>
                            <optgroup label='Scores'>
                                <option value='train_accuracy'>Training accuracy</option>
                                <option value='test_accuracy'>Test accuracy</option>
                                <option value='total_accuracy'>Total accuracy</option>
                                <option value='train_time'>Training time</option>
                                <option value='test_time'>Test time</option>
                            </optgroup>
                            <optgroup label='Parameters'>
                                {paramOptions}
                            </optgroup>
                        </select>
                    </ButtonGroup>
                </span>
            );
        }

        let circleRadius;
        if (showCircleRadius) {
            circleRadius = (
                <span>
                    <ButtonGroup>
                        <Button variant='secondary' onClick={this.props.increaseCircleRadius} title='Increase circle radius'>
                            <FontAwesomeIcon icon={faSearchPlus} />
                        </Button>
                        <Button variant='secondary' onClick={this.props.decreaseCircleRadius} title='Decrease circle radius'>
                            <FontAwesomeIcon icon={faSearchMinus} />
                        </Button>
                    </ButtonGroup>
                </span>
            );
        }

        let columns;
        if (showColumns) {
            columns = (
                <span>
                    <ButtonGroup>
                        <Button variant='secondary' title='Increase number of columns' onClick={this.props.increaseColumns}>
                            <FontAwesomeIcon icon={faGripHorizontal} />
                        </Button>
                        <Button variant='secondary' title='Decrease number of columns' onClick={this.props.decreaseColumns}>
                            <FontAwesomeIcon icon={faGripVertical} />
                        </Button>
                    </ButtonGroup>
                </span>
            );
        }

        // smooth history like TensorBoard
        let smoothing;
        if (showSmoothing) {
            smoothing = (
                <span>
                    <ButtonGroup>
                        <Button
                            title='Disable history smoothing'
                            onClick={() => {
                                this.props.changeHistorySmoothing(0);
                                this.setState({ smoothingResetTrigger: !this.state.smoothingResetTrigger });
                            }}
                        >
                            <FontAwesomeIcon icon={faChartLine} />
                        </Button>
                        <input
                            key={this.state.smoothingResetTrigger}
                            title='History smoothing weight (between 0 and 1)'
                            type='number'
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={this.props.historySmoothingWeight}
                            onChange={(e) => this.props.changeHistorySmoothing(e.target.value)}
                        />
                    </ButtonGroup>
                </span>
            );
        }

        return (
            <div className='ControlBar'>
                <span title='Change the current view'>
                    <ButtonGroup>
                        {viewButtons}
                    </ButtonGroup>
                </span>

                {this.props.dataReady &&
                    <span>
                        <button
                            onClick={() => this.props.toggleLayoutColumns('blank')}
                            title='Toggle single- and two-column layout'
                        >
                            <FontAwesomeIcon icon={faColumns} />
                        </button>
                    </span>
                }

                {this.props.twoColumnLayout &&
                    <span title='Change the current view (in the right column)'>
                        <ButtonGroup>
                            {viewButtons2}
                        </ButtonGroup>
                    </span>
                }

                {ordering}
                {clfColorMap}
                {smoothing}
                {circleRadius}
                {columns}

                <span>
                    <button
                        onClick={this.props.toggleSettings}
                        title='Settings'
                    >
                        <FontAwesomeIcon icon={faCog} />
                    </button>
                </span>
            </div>
        );
    }
}
