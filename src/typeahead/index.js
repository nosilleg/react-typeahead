var Accessor = require('../accessor');
var React = require('react');
var TypeaheadSelector = require('./selector');
var KeyEvent = require('../keyevent');
var fuzzy = require('fuzzy');
var classNames = require('classnames');

/**
 * A "typeahead", an auto-completing text input
 *
 * Renders an text input that shows options nearby that you can use the
 * keyboard or mouse to select.  Requires CSS for MASSIVE DAMAGE.
 */
var Typeahead = React.createClass({
  propTypes: {
    name: React.PropTypes.string,
    customClasses: React.PropTypes.object,
    maxVisible: React.PropTypes.number,
    options: React.PropTypes.array,
    allowCustomValues: React.PropTypes.number,
    defaultValue: React.PropTypes.string,
    value: React.PropTypes.string,
    textarea: React.PropTypes.bool,
    inputProps: React.PropTypes.object,
    onOptionSelected: React.PropTypes.func,
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
    defaultClassNames: React.PropTypes.bool,
    customListComponent: React.PropTypes.oneOfType([
      React.PropTypes.element,
      React.PropTypes.func
    ]),
    showOptionsWhenEmpty: React.PropTypes.bool,
    // Deprecated props in version 2.0
    disabled: React.PropTypes.bool,
    onBlur: React.PropTypes.func,
    onFocus: React.PropTypes.func,
    onKeyPress: React.PropTypes.func,
    onKeyUp: React.PropTypes.func,
    placeholder: React.PropTypes.string,

    onChange: React.PropTypes.func,
    onKeyDown: React.PropTypes.func
  },

  getDefaultProps: function() {
    return {
      options: [],
      customClasses: {},
      allowCustomValues: 0,
      defaultValue: "",
      value: null,
      textarea: false,
      inputProps: {},
      onOptionSelected: function(option) {},
      filterOption: null,
      defaultClassNames: true,
      customListComponent: TypeaheadSelector,
      showOptionsWhenEmpty: false,
      // Deprecated props in version 2.0
      disabled: false,
      onBlur: function(event) {},
      onFocus: function(event) {},
      onKeyPress: function(event) {},
      onKeyUp: function(event) {},
      placeholder: "",

      onChange: function(event) {},
      onKeyDown: function(event) {}
    };
  },

  getInitialState: function() {
    return {
      // The currently visible set of options
      visible: this.getOptionsForValue(this.props.defaultValue, this.props.options),

      // This should be called something else, "entryValue"
      entryValue: this.props.value || this.props.defaultValue,

      // A valid typeahead value
      selection: this.props.value,

      // Index of the selection
      selectionIndex: null
    };
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState({
      visible: this.getOptionsForValue(nextProps.value, nextProps.options),
      entryValue: nextProps.value
    });
  },

  /*
   * Expose Component Functions
   */

   setEntryText: function(value) {
     this.refs.entry.value = value;
     this._onTextEntryUpdated();
   },

   focus: function(){
     this.refs.entry.focus()
   },

   getOptionsForValue: function(value, options) {
     if (this._shouldSkipSearch(value)) { return []; }

     var filterOptions = this._generateFilterFunction();
     var result = filterOptions(value, options);
     if (this.props.maxVisible) {
       result = result.slice(0, this.props.maxVisible);
     }
     return result;
   },

   getSelection: function() {
     var index = this.state.selectionIndex;
     if (this._hasCustomValue()) {
       if (index === 0) {
         return this.state.entryValue;
       } else {
         index--;
       }
     }
     return this.state.visible[index];
   },

   eventMap: function(event) {
     var events = {};

     events[KeyEvent.DOM_VK_UP] = this.navUp;
     events[KeyEvent.DOM_VK_DOWN] = this.navDown;
     events[KeyEvent.DOM_VK_RETURN] = events[KeyEvent.DOM_VK_ENTER] = this._onEnter;
     events[KeyEvent.DOM_VK_ESCAPE] = this._onEscape;
     events[KeyEvent.DOM_VK_TAB] = this._onTab;

     return events;
   },

   navDown: function() {
     this._nav(1);
   },

   navUp: function() {
     this._nav(-1);
   },

  _shouldSkipSearch: function(input) {
    var emptyValue = !input || input.trim().length == 0;
    return !this.props.showOptionsWhenEmpty && emptyValue;
  },

  _hasCustomValue: function() {
    if (this.props.allowCustomValues > 0 &&
      this.state.entryValue.length >= this.props.allowCustomValues &&
      this.state.visible.indexOf(this.state.entryValue) === -1) {
      return true;
    }
    return false;
  },

  _getCustomValue: function() {
    if (this._hasCustomValue()) {
      return this.state.entryValue;
    }
    return null;
  },

  _renderIncrementalSearchResults: function() {
    // Nothing has been entered into the textbox
    if (this._shouldSkipSearch(this.state.entryValue)) {
      return "";
    }

    // Something was just selected
    if (this.state.selection) {
      return "";
    }

    return (
      <this.props.customListComponent
        ref="sel" options={this.state.visible}
        onOptionSelected={this._onOptionSelected}
        allowCustomValues={this.props.allowCustomValues}
        customValue={this._getCustomValue()}
        customClasses={this.props.customClasses}
        selectionIndex={this.state.selectionIndex}
        defaultClassNames={this.props.defaultClassNames}
        displayOption={Accessor.generateOptionToStringFor(this.props.displayOption)} />
    );
  },

  _onOptionSelected: function(option, event) {
    var nEntry = this.refs.entry;
    nEntry.focus();

    var displayOption = Accessor.generateOptionToStringFor(this.props.displayOption);
    var optionString = displayOption(option, 0);

    var formInputOption = Accessor.generateOptionToStringFor(this.props.formInputOption || displayOption);
    var formInputOptionString = formInputOption(option);

    nEntry.value = optionString;
    this.setState({
      visible: this.getOptionsForValue(optionString, this.props.options),
      selection: formInputOptionString,
      entryValue: optionString
    });
    return this.props.onOptionSelected(option, event);
  },

  _onTextEntryUpdated: function() {
    var value = this.refs.entry.value;
    this.setState({
      visible: this.getOptionsForValue(value, this.props.options),
      selection: null,
      entryValue: value
    });
  },

  _onEnter: function(event) {
    var selection = this.getSelection();
    if (!selection) {
      return this.props.onKeyDown(event);
    }
    return this._onOptionSelected(selection, event);
  },

  _onEscape: function() {
    this.setState({
      selectionIndex: null
    });
  },

  _onTab: function(event) {
    var selection = this.getSelection();
    var option = selection ?
      selection : (this.state.visible.length > 0 ? this.state.visible[0] : null);

    if (option === null) {
      option = this._getCustomValue();
    }

    if (option !== null) {
      return this._onOptionSelected(option, event);
    }
  },

  _nav: function(delta) {
    if (!this._hasHint()) {
      return;
    }
    var newIndex = this.state.selectionIndex === null ? (delta == 1 ? 0 : delta) : this.state.selectionIndex + delta;
    var length = this.state.visible.length;
    if (this._hasCustomValue()) {
      length += 1;
    }

    if (newIndex < 0) {
      newIndex += length;
    } else if (newIndex >= length) {
      newIndex -= length;
    }

    this.setState({
      selectionIndex: newIndex
    });
  },

  _onChange: function(event) {
    if (this.props.onChange) {
      this.props.onChange(event);
    }

    this._onTextEntryUpdated();
  },

  _onKeyDown: function(event) {
    // If there are no visible elements, don't perform selector navigation.
    // Just pass this up to the upstream onKeydown handler.
    // Also skip if the user is pressing the shift key, since none of our handlers are looking for shift
    if (!this._hasHint() || event.shiftKey) {
      return this.props.onKeyDown(event);
    }

    var handler = this.eventMap()[event.keyCode];

    if (handler) {
      handler(event);
    } else {
      return this.props.onKeyDown(event);
    }
    // Don't propagate the keystroke back to the DOM/browser
    event.preventDefault();
  },

  _renderHiddenInput: function() {
    if (!this.props.name) {
      return null;
    }

    return (
      <input
        type="hidden"
        name={ this.props.name }
        value={ this.state.selection }
      />
    );
  },

  _generateFilterFunction: function() {
    var filterOptionProp = this.props.filterOption;
    if (typeof filterOptionProp === 'function') {
      return function(value, options) {
        return options.filter(function(o) { return filterOptionProp(value, o); });
      };
    } else {
      var mapper;
      if (typeof filterOptionProp === 'string') {
        mapper = Accessor.generateAccessor(filterOptionProp);
      } else {
        mapper = Accessor.IDENTITY_FN;
      }
      return function(value, options) {
        return fuzzy
          .filter(value, options, {extract: mapper})
          .map(function(res) { return options[res.index]; });
      };
    }
  },

  _hasHint: function() {
    return this.state.visible.length > 0 || this._hasCustomValue();
  },

  render: function() {
    var inputClasses = {};
    inputClasses[this.props.customClasses.input] = !!this.props.customClasses.input;
    var inputClassList = classNames(inputClasses);

    var classes = {
      typeahead: this.props.defaultClassNames
    };
    classes[this.props.className] = !!this.props.className;
    var classList = classNames(classes);

    var InputElement = this.props.textarea ? 'textarea' : 'input';

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
      this.props.inputProps
    );

    return (
      <div className={classList}>
        { this._renderHiddenInput() }
        <InputElement ref="entry" type="text"
          {...inputProps}
          className={inputClassList}
          defaultValue={this.props.defaultValue}
          onChange={this._onChange}
          onKeyDown={this._onKeyDown}
        />
        { this._renderIncrementalSearchResults() }
      </div>
    );
  }
});

module.exports = Typeahead;
