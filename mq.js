/*!
 * mµ
 * 
 * A simple toolkit for handling media queries
 * and breakpoints across SASS/CSS and JavaScript.
 * 
 * @author Fabian Michael <hallo@fabianmichael.de>
 * @license MIT
 */

(function(window, document, undefined) {
  'use strict';

  var pseudoElement = (window.getComputedStyle ? window.getComputedStyle(document.documentElement, ':before') : false);

  if(!pseudoElement) {
    // If the browser doesn't support window.getComputedStyle just return
    return;
  }

  var rawBreakpointData  = pseudoElement.getPropertyValue('content').replace(/(^['"]|['"]$)/g, '').replace(/\\(["'])/g, '$1'),
      breakpointsData    = JSON.parse(rawBreakpointData),
      breakpointNames    = [],
      breakpointMedia    = [],
      breakpointIndices  = {},
      comparators        = {
        // Used by the external API
        '>=' : function(a, b) { return a >= b; },
        '<'  : function(a, b) { return a <  b; },
      },
      defaultCallback    = function() {},
      _currentBreakpoint,
      _lastBreakpoint,
      _useNativeCustomEvent;
  
  
  function extend(out) {
    out = out || {};

    for(var i = 1, l = arguments.length, i < l; i++) {
      if(!arguments[i]) continue;
      for(var key in arguments[i]) {
        if(arguments[i].hasOwnProperty(key)) {
          out[key] = arguments[i][key];
        }
      }
    }

    return out;
  }

  function createMqEvent(query) {
    var event,
        eventType   = 'breakpointChange',
        eventDetail = {
          breakpoint: _currentBreakpoint, 
          initial: (_lastBreakpoint === undefined),
          query: query,
        };

    if(_useNativeCustomEvent !== false) {
      try {
        // Try to use native event. If that fails for the
        // first time, this is skipped for later calls.
        event = new CustomEvent(eventType, { detail: eventDetail });
        _useNativeCustomEvent = true;
        return event;
      } catch(e) {
        // Disable native CutomEvent() constructor for good.
        _useNativeCustomEvent = false;
      }
    }

    // Create event the old-fashioned way for IE <= 11 and Mobile IE <= 11
    event = document.createEvent('CustomEvent');
    event.initCustomEvent(eventType, false, false, eventDetail);
    return event;
  }

  function handleBreakpointChange() {
    for(var i = breakpointMedia.length -1; i >= 0; i--) {
      if(breakpointMedia[i].matches) {
        // After a MediaQueryList triggers a change event,
        // walk through all registred media queries starting
        // from the largest breakpoint. The first matched
        // breakpoint is the current one.
        _currentBreakpoint = breakpointNames[i];
        if(_currentBreakpoint !== _lastBreakpoint) {
          // Fire an event, if breakpoint has changed since
          // the last call of this function.
          window.dispatchEvent(createMqEvent(breakpointMedia[i]));
          _lastBreakpoint = _currentBreakpoint;
        }
        return;
      }
    }
  }

  function compare(breakpoint, operator) {
    return (breakpointIndices[breakpoint] !== undefined) ?
      comparators[operator](breakpointIndices[_currentBreakpoint], breakpointIndices[breakpoint]) :
      undefined;
  }

  // Initialize breakpoint data
  var index = 0;
  for(var i in breakpointsData) {
    if(breakpointsData.hasOwnProperty(i)) {
      var query = breakpointsData[i] = window.matchMedia(breakpointsData[i]);
      query.addListener(handleBreakpointChange);
      breakpointMedia.push(query);
      breakpointNames.push(i);
      breakpointIndices[i] = index;
      index++;
    }
  }
  
  // Fire first event
  handleBreakpointChange();

  // Export API to global mq object
  window.mq = {

    breakpoint: function() {
      return _currentBreakpoint;
    },

    query: function(breakpoint) {
      return breakpointsData[breakpoint !== undefined ? breakpoint : _currentBreakpoint].media;
    },

    is: function(breakpoint) {
      return (breakpoint === _currentBreakpoint);
    },

    above: function(breakpoint) {
      return compare(breakpoint, '>=');
    },

    below: function(breakpoint) {
      return compare(breakpoint, '<');
    },

    bind: function(breakpoint, callback) {
      return breakpointsData[breakpoint].addListener(function(query) {
        return callback(createMqEvent(query), query.matches);
      });
    },

    respond: function(breakpoint, options) {
      options = extend({
        enter     : _fn,
        leave     : _fn,
        immediate : false,
      }, options);
      
      var callback = function(query) {
        // Enter leave
        options[query.matches ? 'enter' : 'leave'](createMqEvent(query), query.matches);
      };

      if(options.immediate) {
        callback(reakpointsData[breakpoint]);
      }

      return breakpointsData[breakpoint].addListener(callback);
    }

  };

})(window, document);
