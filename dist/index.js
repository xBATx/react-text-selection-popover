'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var reactDom = require('react-dom');
var PropTypes = _interopDefault(require('prop-types'));
var withContentRect = _interopDefault(require('react-measure/lib/with-content-rect'));
var _debounce = _interopDefault(require('lodash.debounce'));
var windowDimensions = _interopDefault(require('react-window-dimensions'));
var invariant = _interopDefault(require('invariant'));
var EventListener = _interopDefault(require('react-event-listener'));

/*
 * Taken from draft-js/lib/getVisibleSelectionRect
 *
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */
var isChrome = /chrome/gi.test(window.navigator.userAgent);

// In Chrome, the client rects will include the entire bounds of all nodes that
// begin (have a start tag) within the selection, even if the selection does
// not overlap the entire node. To resolve this, we split the range at each
// start tag and join the client rects together.
// https://code.google.com/p/chromium/issues/detail?id=324437
/* eslint-disable consistent-return */
function getRangeClientRectsChrome(range) {
  var tempRange = range.cloneRange();
  var clientRects = [];

  for (var ancestor = range.endContainer; ancestor != null; ancestor = ancestor.parentNode) {
    // If we've climbed up to the common ancestor, we can now use the
    // original start point and stop climbing the tree.
    var atCommonAncestor = ancestor === range.commonAncestorContainer;
    if (atCommonAncestor) {
      tempRange.setStart(range.startContainer, range.startOffset);
    } else {
      tempRange.setStart(tempRange.endContainer, 0);
    }
    var rects = Array.from(tempRange.getClientRects());
    clientRects.push(rects);
    if (atCommonAncestor) {
      var _ref;

      clientRects.reverse();
      return (_ref = []).concat.apply(_ref, clientRects);
    }
    tempRange.setEndBefore(ancestor);
  }

  invariant(false, "Found an unexpected detached subtree when getting range client rects.");
}

/**
 * Like range.getClientRects() but normalizes for browser bugs.
 */
var getRangeClientRects = isChrome ? getRangeClientRectsChrome : function (range) {
  return Array.from(range.getClientRects());
};

/**
 * Like range.getBoundingClientRect() but normalizes for browser bugs.
 */
function getRangeBoundingClientRect(range) {
  // "Return a DOMRect object describing the smallest rectangle that includes
  // the first rectangle in list and all of the remaining rectangles of which
  // the height or width is not zero."
  // http://www.w3.org/TR/cssom-view/#dom-range-getboundingclientrect
  var rects = getRangeClientRects(range);
  var top = 0;
  var right = 0;
  var bottom = 0;
  var left = 0;

  if (rects.length) {
    // If the first rectangle has 0 width, we use the second, this is needed
    // because Chrome renders a 0 width rectangle when the selection contains
    // a line break.
    if (rects.length > 1 && rects[0].width === 0) {
      var _rects$ = rects[1];
      top = _rects$.top;
      right = _rects$.right;
      bottom = _rects$.bottom;
      left = _rects$.left;
    } else {
      var _rects$2 = rects[0];
      top = _rects$2.top;
      right = _rects$2.right;
      bottom = _rects$2.bottom;
      left = _rects$2.left;
    }

    for (var ii = 1; ii < rects.length; ii++) {
      var rect = rects[ii];
      if (rect.height !== 0 && rect.width !== 0) {
        top = Math.min(top, rect.top);
        right = Math.max(right, rect.right);
        bottom = Math.max(bottom, rect.bottom);
        left = Math.min(left, rect.left);
      }
    }
  }

  return {
    top: top,
    right: right,
    bottom: bottom,
    left: left,
    width: right - left,
    height: bottom - top
  };
}

/**
 * Return the bounding ClientRect for the visible DOM selection, if any.
 * In cases where there are no selected ranges or the bounding rect is
 * temporarily invalid, return null.
 */
function getVisibleSelectionRect(global) {
  var selection = global.getSelection();
  if (!selection.rangeCount) {
    return null;
  }

  var range = selection.getRangeAt(0);
  var boundingRect = getRangeBoundingClientRect(range);
  var top = boundingRect.top,
      right = boundingRect.right,
      bottom = boundingRect.bottom,
      left = boundingRect.left;

  // When a re-render leads to a node being removed, the DOM selection will
  // temporarily be placed on an ancestor node, which leads to an invalid
  // bounding rect. Discard this state.

  if (top === 0 && right === 0 && bottom === 0 && left === 0) {
    return null;
  }

  return boundingRect;
}

var centerAboveOrBelow = (function (_ref) {
  var gap = _ref.gap,
      frameWidth = _ref.frameWidth,
      frameLeft = _ref.frameLeft,
      frameTop = _ref.frameTop,
      boxHeight = _ref.boxHeight,
      boxWidth = _ref.boxWidth,
      selectionTop = _ref.selectionTop,
      selectionLeft = _ref.selectionLeft,
      selectionWidth = _ref.selectionWidth,
      selectionHeight = _ref.selectionHeight;

  var style = { position: "fixed" };

  style.left = selectionLeft + selectionWidth / 2 - boxWidth / 2;
  style.top = selectionTop - boxHeight - gap;

  // If the popover is placed beyond the left edge of the screen align
  // with left edge
  if (style.left < frameLeft) {
    style.left = frameLeft;
    // if the popover is placed beyond the right edge align with the
    // right edge of the sceen
  } else if (style.left + boxWidth > frameWidth) {
    style.left = frameWidth - boxWidth;
  }

  // if the popover is placed above the frame, position below selection instead
  if (style.top < frameTop) {
    style.top = selectionTop + selectionHeight + gap;
  }

  return style;
});

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};









var objectWithoutProperties = function (obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Popover = function (_Component) {
  inherits(Popover, _Component);

  function Popover() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Popover);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Popover.__proto__ || Object.getPrototypeOf(Popover)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      isPressed: false,
      selectionPosition: null,
      isTextSelected: false,
      isOpen: false
    }, _this.updatePosition = function () {
      var browserSelection = document.getSelection();
      var _this$props = _this.props,
          onTextSelect = _this$props.onTextSelect,
          onTextUnselect = _this$props.onTextUnselect;

      var selectionRef = _this.props.selectionRef && _this.props.selectionRef.current;
      var selectionPosition = getVisibleSelectionRect(window);

      if (selectionPosition != null && selectionRef != null && browserSelection != null && selectionRef.contains(browserSelection.anchorNode) === true && selectionRef.contains(browserSelection.focusNode) === true) {
        if (browserSelection.isCollapsed === false) {
          onTextSelect && onTextSelect();
          _this.setState({ isTextSelected: true, isOpen: true });
        } else {
          onTextUnselect && onTextUnselect();
          _this.setState({ isTextSelected: false, isOpen: false });
        }

        _this.setState({ selectionPosition: selectionPosition });
      } else if (_this.state.isTextSelected) {
        onTextUnselect && onTextUnselect();
        _this.setState({ isTextSelected: false, isOpen: false });
      }
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(Popover, [{
    key: "render",
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          selectionRef = _props.selectionRef,
          measureRef = _props.measureRef,
          gap = _props.gap,
          scrollRef = _props.scrollRef,
          placementStrategy = _props.placementStrategy,
          contentRect = _props.contentRect,
          windowHeight = _props.windowHeight,
          windowWidth = _props.windowWidth,
          children = _props.children,
          className = _props.className;
      var selectionPosition = this.state.selectionPosition;

      var isOpen = typeof this.props.isOpen === "boolean" ? this.props.isOpen : this.state.isOpen;

      var style = {};

      if (selectionPosition !== null && contentRect.bounds.width != null && contentRect.bounds.width !== 0) {
        /*
         * This style object only contains info for positioinng
         * the popover. It's prop, and these are the arguments passed
         */
        style = placementStrategy({
          gap: gap,
          frameWidth: windowWidth,
          frameHeight: windowHeight,
          frameLeft: 0,
          frameTop: 0,
          boxWidth: contentRect.bounds.width,
          boxHeight: contentRect.bounds.height,
          selectionTop: selectionPosition.top,
          selectionLeft: selectionPosition.left,
          selectionWidth: selectionPosition.width,
          selectionHeight: selectionPosition.height
        });

        style.pointerEvents = this.state.mousePressed === true ? "none" : "auto";
      }

      /*
       * Before you ask, onSelectionChange only works on the document,
       * otherwise I would just use selectionRef instead and we wouldn't need
       * three of those event listeners
       */
      return [React__default.createElement(EventListener, {
        key: "update-position",
        target: document,
        onSelectionChange: this.updatePosition
      }), React__default.createElement(EventListener, {
        key: "on-resize-window",
        target: window,
        onResize: this.updatePosition
      }), React__default.createElement(EventListener, {
        key: "on-scroll",
        target: scrollRef && scrollRef.current ? scrollRef.current : window,
        onScroll: this.updatePosition
      }), React__default.createElement(EventListener, {
        key: "on-mouse-up",
        target: selectionRef && selectionRef.current ? selectionRef.current : document.body,
        onMouseUp: function onMouseUp() {
          return _this2.setState({ mousePressed: false });
        }
      }), React__default.createElement(EventListener, {
        key: "on-mouse-down",
        target: selectionRef && selectionRef.current ? selectionRef.current : document,
        onMouseDown: function onMouseDown() {
          return _this2.setState({ mousePressed: true });
        }
      }), selectionPosition == null || !isOpen || contentRect.bounds.width == 0 ? null : React__default.createElement(
        "div",
        { key: "popup", className: className, style: style, ref: measureRef },
        children
      )];
    }
  }]);
  return Popover;
}(React.Component);

Popover.defaultProps = {
  selectionRef: { current: document.body },
  scrollRef: { current: window },
  placementStrategy: centerAboveOrBelow,
  gap: 5
};


var wrapPortal = function wrapPortal(Comp) {
  return function (_ref2) {
    var children = _ref2.children,
        props = objectWithoutProperties(_ref2, ["children"]);
    return reactDom.createPortal(React__default.createElement(
      Comp,
      props,
      React__default.createElement(
        React.Fragment,
        null,
        children
      )
    ), document.body);
  };
};

Popover.propTypes = {
  measure: PropTypes.func.isRequired,
  selectionRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element)
  }),
  scrollRef: PropTypes.shape({
    current: PropTypes.oneOfType([PropTypes.instanceOf(Element), PropTypes.instanceOf(window.constructor)])
  }),
  children: PropTypes.node.isRequired,
  onTextSelect: PropTypes.func,
  onTextUnselect: PropTypes.func,
  windowWidth: PropTypes.number,
  windowHeight: PropTypes.number,
  className: PropTypes.string,
  placementStrategy: PropTypes.func,
  measureRef: PropTypes.func.isRequired,
  contentRect: PropTypes.object.isRequired,
  gap: PropTypes.number,
  isOpen: PropTypes.bool
};

var index = wrapPortal(withContentRect("bounds", "offset")(windowDimensions({
  take: function take() {
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    };
  },
  debounce: function debounce(onResize) {
    return _debounce(onResize, 120);
  }
})(Popover)));

module.exports = index;
