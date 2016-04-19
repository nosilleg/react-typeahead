var Accessor = require('../accessor');
var React = require('react');
var Token = require('./token');
var KeyEvent = require('../keyevent');
var Typeahead = require('../typeahead');
var classNames = require('classnames');
var update = require('react-addons-update');

function _arraysAreDifferent(array1, array2) {
  if (array1.length != array2.length){
    return true;
  }
  for (var i = array2.length - 1; i >= 0; i--) {
    if (array2[i] !== array1[i]){
      return true;
    }
  }
}

/**
 * A typeahead that, when an option is selected, instead of simply filling
 * the text entry widget, prepends a renderable "token", that may be deleted
 * by pressing backspace on the beginning of the line with the keyboard.
 */
var TypeaheadTokenizer = React.createClass({
  propTypes: {
    name: React.PropTypes.string,
    options: React.PropTypes.array,
    customClasses: React.PropTypes.object,
    allowCustomValues: React.PropTypes.number,
    defaultSelected: React.PropTypes.array,
    defaultValue: React.PropTypes.string,
    inputProps: React.PropTypes.object,
    onTokenRemove: React.PropTypes.func,
    onTokenAdd: React.PropTypes.func,
    filterOption: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.func
    ]),
    displayOption: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.func
    ]),
    formInputOption: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.func
    ]),
    maxVisible: React.PropTypes.number,
    defaultClassNames: React.PropTypes.bool,
    // Deprecated props in version 2.0
    disabled: React.PropTypes.bool,
    onBlur: React.PropTypes.func,
    onFocus: React.PropTypes.func,
    onKeyPress: React.PropTypes.func,
    onKeyUp: React.PropTypes.func,
    placeholder: React.PropTypes.string,
    onKeyDown: React.PropTypes.func
  },

  getInitialState: function() {
    return {
      // We need to copy this to avoid incorrect sharing
      // of state across instances (e.g., via getDefaultProps())
      selected: this.props.defaultSelected.slice(0),
      value: this.props.defaultValue
    };
  },

  getDefaultProps: function() {
    return {
      options: [],
      defaultSelected: [],
      customClasses: {},
      allowCustomValues: 0,
      defaultValue: "",
      inputProps: {},
      defaultClassNames: true,
      filterOption: null,
      formInputOption: null,
      displayOption: function(token){return token },
      onTokenAdd: function() {},
      onTokenRemove: function() {},
      // Deprecated props in version 2.0
      disabled: false,
      onBlur: function(event) {},
      onFocus: function(event) {},
      onKeyPress: function(event) {},
      onKeyUp: function(event) {},
      placeholder: "",

      onKeyDown: function(event) {}
    };
  },

  componentWillReceiveProps: function(nextProps){
    // if we get new defaultProps, update selected
    if (_arraysAreDifferent(this.props.defaultSelected, nextProps.defaultSelected)){
      this.setState({
        selected: nextProps.defaultSelected.slice(0)
      });
    }
  },

  focus: function(){
    this.refs.typeahead.focus();
  },

  getSelectedTokens: function(){
    return this.state.selected;
  },

  // TODO: Support initialized tokens
  //
  _renderTokens: function() {
    var tokenClasses = {};
    tokenClasses[this.props.customClasses.token] = !!this.props.customClasses.token;
    var classList = classNames(tokenClasses);
    var result = this.state.selected.map(function(selected) {
      var displayString = Accessor.valueForOption(this.props.displayOption, selected);
      var value = Accessor.valueForOption(this.props.formInputOption || this.props.displayOption, selected);
      return (
        <Token key={ displayString } className={classList}
          onRemove={ this._removeTokenForValue }
          object={selected}
          value={value}
          name={ this.props.name }>
          { displayString }
        </Token>
      );
    }, this);
    return result;
  },

  _getOptionsForTypeahead: function() {
    // return this.props.options without this.selected
    return this.props.options;
  },

  _onKeyDown: function(event) {
    // We only care about intercepting backspaces
    if (event.keyCode === KeyEvent.DOM_VK_BACK_SPACE) {
      return this._handleBackspace(event);
    }
    this.props.onKeyDown(event); // TODO: deal with inputProps
  },

  _handleBackspace: function(event){
    // No tokens
    if (!this.state.selected.length) {
      return;
    }

    // Remove token ONLY when bksp pressed at beginning of line
    // without a selection
    var entry = this.refs.typeahead.refs.entry;
    if (entry.selectionStart == entry.selectionEnd &&
        entry.selectionStart == 0) {
      this._removeTokenForValue(this.state.selected[this.state.selected.length - 1]);
      event.preventDefault();
    }
  },

  _removeTokenForValue: function(value) {
    var index = this.state.selected.indexOf(value);
    if (index == -1) {
      return;
    }

    this.setState({
      selected: update(this.state.selected, {$splice: [[index, 1]]})
    });
    this.props.onTokenRemove(value);
    return;
  },

  _addTokenForValue: function(value) {
    if (this.state.selected.indexOf(value) !== -1) {
      return;
    }
    this.setState({
      selected: update(this.state.selected, {$push: [value]}),
      value: ""
    });
    this.props.onTokenAdd(value);
  },

  _onChange: function(event) {
    this.setState({
      value: event.target.value
    });
  },

  render: function() {
    var classes = {};
    classes[this.props.customClasses.typeahead] = !!this.props.customClasses.typeahead;
    var classList = classNames(classes);
    var tokenizerClasses = [this.props.defaultClassNames && "typeahead-tokenizer"];
    tokenizerClasses[this.props.className] = !!this.props.className;
    var tokenizerClassList = classNames(tokenizerClasses)

    var inputProps = Object.assign(
      {},
      {
        disabled: this.props.disabled,
        onBlur: this.props.onBlur,
        onFocus: this.props.onFocus,
        onKeyPress: this.props.onKeyPress,
        onKeyUp: this.props.onKeyUp,
        placeholder: this.props.placeholder,
        value: this.props.value
      },
      this.props.inputProps,
      {
        onChange: this._onChange,
        onKeyDown: this._onKeyDown,
        value: this.state.value
      }
    );

    return (
      <div className={tokenizerClassList}>
        { this._renderTokens() }
        <Typeahead ref="typeahead"
          className={classList}
          inputProps={inputProps}
          allowCustomValues={this.props.allowCustomValues}
          customClasses={this.props.customClasses}
          options={this._getOptionsForTypeahead()}
          defaultValue={this.props.defaultValue}
          maxVisible={this.props.maxVisible}
          onOptionSelected={this._addTokenForValue}
          displayOption={this.props.displayOption}
          defaultClassNames={this.props.defaultClassNames}
          filterOption={this.props.filterOption} />
      </div>
    );
  }
});

module.exports = TypeaheadTokenizer;
