import React, { Component } from 'react';
import '../../style/common/ScoreBar.css';

export default class ScoreBar extends Component {

    render() {
        return (
            <div className='ScoreBar'>
                <div
                    className='bar'
                    style={{ width: `${this.props.ratio * 100}%` }}
                />
            </div>
        );
    }
}
