import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusSquare } from '@fortawesome/free-solid-svg-icons';
// import '../../style/Help.css';

export default class Blank extends Component {
    render() {
        return (
            <div className='Blank'>
                <FontAwesomeIcon
                    icon={faPlusSquare}
                    style={{ color: 'var(--accentColor)' }}
                />
                You can open a view here by clicking one of the right view buttons in the toolbar.
            </div>
        );
    }
}
