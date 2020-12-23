import './Palette.css';
import React from 'react';
import { keyName } from 'w3c-keyname';
import PropTypes from 'prop-types';

export class Palette extends React.PureComponent {
  static propTypes = {
    onDismiss: PropTypes.func.isRequired,
    onPressEnter: PropTypes.func.isRequired,
    children: PropTypes.object.isRequired,
    updateCounter: PropTypes.func.isRequired,
    updateQuery: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
    counter: PropTypes.number.isRequired,
  };

  /**
   * Calculate the currently active item
   * @param {*} counter The currently active counter passed to you by this component
   * @param {*} size The total number of elements displayed after applying query
   */
  static getActiveIndex(counter, size) {
    const r = counter % size;
    return r < 0 ? r + size : r;
  }

  handleOnInputPromptChange = (e) => {
    this.props.updateQuery(e.target.value);
  };

  updateCounter = (dir) => {
    this.props.updateCounter((this.props.counter || 0) + dir);
  };

  onPressEnter = () => {
    const { query, counter } = this.props;

    this.props.onPressEnter({ query, counter });
  };

  render() {
    return (
      <PaletteElement
        query={this.props.query}
        handleOnInputPromptChange={this.handleOnInputPromptChange}
        onPressEnter={this.onPressEnter}
        counter={this.props.counter}
        onDismiss={this.props.onDismiss}
        updateCounter={this.updateCounter}
      >
        {this.props.children}
      </PaletteElement>
    );
  }
}

class PaletteElement extends React.PureComponent {
  static propTypes = {
    query: PropTypes.string.isRequired,
    handleOnInputPromptChange: PropTypes.func.isRequired,
    onPressEnter: PropTypes.func.isRequired,
    counter: PropTypes.number.isRequired,
    onDismiss: PropTypes.func.isRequired,
    updateCounter: PropTypes.func.isRequired,
    children: PropTypes.object.isRequired,
  };

  domRef = React.createRef();
  textInput = React.createRef();

  onInputPressKey = (event) => {
    const key = keyName(event);
    if (key === 'Escape') {
      this.props.onDismiss();
      event.preventDefault();
      return;
    }

    if (key === 'Enter') {
      this.props.onPressEnter();

      event.preventDefault();
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      this.props.updateCounter(key === 'ArrowUp' ? -1 : 1);
      event.preventDefault();
      return;
    }
  };

  watchClickOutside = () => {
    if (this.destroyWatchClickOutside) {
      return;
    }

    const onClickOutside = (e) => {
      if (!this.domRef.current) {
        return;
      }
      if (this.domRef.current.contains(e.target)) {
        this.textInput.current.focus();
        return;
      }
      this.props.onDismiss();
      this.destroyWatchClickOutside();
      return;
    };
    document.addEventListener('click', onClickOutside);
    this.destroyWatchClickOutside = () => {
      if (this.destroyWatchClickOutside) {
        document.removeEventListener('click', onClickOutside);
        this.destroyWatchClickOutside = null;
      }
    };
  };

  componentDidMount() {
    this.textInput.current.focus();
    this.watchClickOutside();
  }

  componentWillUnmount() {
    if (this.destroyWatchClickOutside) {
      this.destroyWatchClickOutside();
    }
  }

  render() {
    return (
      <div
        className="bangle-palette z-30 p-2 shadow-md border flex flex-col"
        ref={this.domRef}
      >
        <div className="flex mb-2 sticky top-0">
          <input
            type="text"
            ref={this.textInput}
            className="flex-grow px-2"
            value={this.props.query}
            onChange={this.props.handleOnInputPromptChange}
            onKeyDown={this.onInputPressKey}
          />
        </div>
        {this.props.children}
      </div>
    );
  }
}
