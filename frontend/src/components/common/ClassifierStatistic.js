import React, { Component } from 'react';
import { Checkbox } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';

export default class ClassifierStatistic extends Component {

    constructor(props) {
        super(props);
        this.state = {
            aggregate: true,
            minOccurrence: 0,
            // hide parameters where all clfResults have the same value
            hideSingleValues: false
        };
    }

    render() {
        const paramStatistics = new Map();
        const paramValueStatistics = new Map();
        // add all exisiting parameters with occurece 0 first
        this.props.clfResultsAll.forEach(d => {
            const params = d.args;
            for (const p in params) {
                if (params.hasOwnProperty(p)) {
                    if (['title', 'file', 'model_file'].includes(p)) {
                        continue;
                    }
                    // param stats
                    if (!paramStatistics.has(p)) {
                        paramStatistics.set(p, 0);
                    }
                    // param value stats
                    const value = params[p];
                    const key = `${p}: ${value}`;
                    if (!paramValueStatistics.has(key)) {
                        paramValueStatistics.set(key, {
                            param: p,
                            value: value,
                            occurrence: 0
                        });
                    }
                }
            }
        });
        // then update occurences with the currently selected clfResults
        this.props.clfResults.forEach(d => {
            const params = d.args;
            for (const p in params) {
                if (params.hasOwnProperty(p)) {
                    if (['title', 'file', 'model_file'].includes(p)) {
                        continue;
                    }
                    // param stats
                    paramStatistics.set(p, paramStatistics.get(p) + 1);
                    // param value stats
                    const value = params[p];
                    const key = `${p}: ${value}`;
                    const current = paramValueStatistics.get(key);
                    paramValueStatistics.set(key, {
                        param: p,
                        value: value,
                        occurrence: current.occurrence + 1
                    });
                }
            }
        });

        // sort by occurrence of parameter name
        const occurrencesValue = Array.from(paramValueStatistics);
        const occurrenceValueTable = occurrencesValue
            .filter(d => {
                // remove parameters where all clfs have the same value
                if (this.state.hideSingleValues) {
                    const paramOcc = paramStatistics.get(d[1].param);
                    if (d[1].occurrence === paramOcc) {
                        return false;
                    }
                }
                // filter by minimum occurence
                return d[1].occurrence >= this.state.minOccurrence;
            })
            .sort((a, b) => {
                if (this.state.aggregate && a[1].param !== b[1].param) {
                    return b[1].param > a[1].param ? 1 : -1;
                }
                return b[1].occurrence - a[1].occurrence;
            })
            .map((d, i) => {
                const p = d[1];
                let name = p.param;
                if (name.length > 15) {
                    name = `${name.substr(0, 13)}...`;
                }
                let value = p.value.toString();
                if (value.length > 15) {
                    value = `${value.substr(0, 13)}...`;
                }
                return (
                    <tr
                        key={i}
                        style={{ opacity: p.occurrence > 0 ? 1 : 0.7 }}
                    >
                        <td title={p.param}>
                            {name}
                        </td>
                        <td title={value}>
                            {value}
                        </td>
                        <td>{p.occurrence}</td>
                        <td>{paramStatistics.get(p.param)}</td>
                        <td
                            title='Remove all classifiers with that parameter value'
                            onClick={() => this.props.filterOnParam(p.param, p.value, true)}
                            style={{ cursor: 'pointer' }}
                        >
                            <FontAwesomeIcon icon={faMinus} />
                        </td>
                        <td
                            title='Add all classifiers with that parameter value'
                            onClick={() => this.props.filterOnParam(p.param, p.value, false)}
                            style={{ cursor: 'pointer' }}
                        >
                            <FontAwesomeIcon icon={faPlus} />
                        </td>
                    </tr>
                );
            });

        return (
            <div className='ClassifierStatistic'>
                <h4 className='title'>
                    Parameters
                </h4>

                <Checkbox
                    onChange={() => this.setState({ aggregate: !this.state.aggregate })}
                    defaultChecked={this.state.aggregate}
                >
                    Group by parameter
                </Checkbox>
                <Checkbox
                    onChange={() => this.setState({ hideSingleValues: !this.state.hideSingleValues })}
                    defaultChecked={this.state.hideSingleValues}
                >
                    Hide parameters where all values are equal
                </Checkbox>

                <label>
                    Minimum occurrence
                <input
                        type='number'
                        defaultValue={this.state.minOccurrence}
                        step='1'
                        min='0'
                        max='100'
                        onChange={(e) => this.setState({ minOccurrence: e.target.value })}
                    />
                </label>

                <div>
                    Occurrence of parameter values
                    <table>
                        <tbody>
                            <tr>
                                <th>Parameter</th>
                                <th>Value</th>
                                <th>Occurr.</th>
                                <th>Total</th>
                                <th></th>
                                <th></th>
                            </tr>
                            {occurrenceValueTable}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}
