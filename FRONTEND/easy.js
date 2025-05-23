// (c) 2007-2018 easychair.org
// (c) 2018-2025 EasyChair Ltd

/**
 * Variable representing the global state
 * It is the hash storing the following values passed by the server-side script:
 *
 *  proxy       : same if $PROXY
 *  role        : same as $COOL{'role'}
 *  track       : same as $TID
 *  demo        : same as $DEMO
 *  chair       : same as $CHAIR
 *  inc         : same as $COOL{'code'}
 *  superchair  : same as $SUPER
 *  hasTracks   : same as $HAS_TRACKS
 *  pid         : same as $PID
 *  browser     : computed by this script (client-side)
 *  
*/

var EC = {};

var cool = {};
// any false value for the debugging info
window.debug = 0;

function doNothing() {}

// machine-independent analogues of addEventListener, stopPropagation,
// and preventDefault
if (document.addEventListener) { // DOM 2.0
  addEventHandler = function(element,event,handler) {
    element.addEventListener(event,handler,false);
  }
  removeEventHandler = function(element,event,handler) {
    element.removeEventListener(event,handler);
  }
  cancelPropagation = function(event) {
    event.stopPropagation();
  }
  cancelDefault = function(event) {
    event.preventDefault();
  }
}
else if (document.attachEvent) { // IE
  addEventHandler = function(element,event,handler) {
    element.attachEvent('on'+event,handler);
  }
  removeEventHandler = function(element,event,handler) {
    element.detachEvent('on'+event,handler);
  }
  cancelPropagation = function(event) {
    event = event || window.event;
    event.cancelBubble = true;
  }
  cancelDefault = function(event) {
    event = event || window.event;
    event.returnValue = false;
  }
}
else { // ancient DOM
  // adding events to browsers not supporting addEventListener or attachEvent
  var MyHandler = {
    all : [],
    add : function (element,event,handler)
    {
      for (var e = MyHandler.all.length-1;e >= 0;e--) {
        var eh = MyHandler.all[e];
        if (eh[0] == element) { // there were previous handlers for this element
          var handlers = eh[1];
          var hlist = handlers[event];
          if (hlist) { // there are already handlers for this event and element
            // check if this handler is already on the list
            for (var j = hlist.length-1;j >= 0;j--) {
              if (hlist[j] == handler) {
                return;
              }
            }
            hlist.push(handler);
            return;
          }
          // there are no handlers for this event and element added by MyHandler
          hlist = element[event] ? [element[event],handler] : [handler];
          handlers[event] = hlist;
          element[event] = function(ev) {MyHandler.iterate(ev,hlist);};
          return;
        }
      }
      var hlist = element[event] ? [element[event],handler] : [handler];
      MyHandler.all.push([element,{event:hlist}]);
      element[event] = function(ev) {MyHandler.iterate(ev,hlist);};
    },

    // the "onevent" function, applies all event handlers from the list attached to this element until one of them returns true
    iterate : function(event,hlist)
    {
      for (var i = 0;i < hlist.length;i++) {
        if (hlist[i](event)) return true;
      }
      return false;
    }
  }; // MyHandler
  addEventHandler = function(element,event,handler) {
    MyHandler.add(element,'on'+event,handler);
  }
  cancelPropagation = function() {}
  cancelDefault = function() {}
}

// Global error handler for processing of JS errors during the runtime.
// window.onerror = function(msg, url, lineNo, columnNo, error) {
//   try {
//     if (ignoreError(error, url, msg)) {
//       return false;
//     }
// 
//     const data = {
//       msg: msg,
//       url: url,
//       lineNo: lineNo,
//       columnNo: columnNo
//     };
//     logError(error, 'window.onerror', data);
//   } catch (e) {
//     console.error('Error during sending the error message', e);
//     console.error(error);
//   }
//   return false;
// }

// True if the error should be ignored (normally causes by a
// browser extension that can be ignored)
function ignoreError(error, url, msg) {
  try {
    // tampermonkey and Selenium IDE extensions
    if (url && url.match(/mooikfkahbdckldjjndioackbalphokd|dhdgffkkebhmkfjojejmpbldmpobfkfo/)) {
      return true;
    }
    // bots errors
    if (error && error.stack.match(/ReferenceError: Slide is not defined/)
      && window.navigator.userAgent.match(/Linespider|Yeti/)) {
      return true;
    }
    // Null error when Safari catchs an error from external script.
    if (error === null && msg === 'Script error.') {
      return true;
    }
  } catch (e) {
    console.error(e);
  }

  return false;
} // ignoreError

// ******* adding window.onload functions ********

function addOnLoad(f) {
  addEventHandler(window, 'load', f);
}
function addOnBeforeUnload(f) {
  addEventHandler(window, 'beforeunload', f);
}

// get the browser
function getBrowser() {
  if (cool.browser) {
    return cool.browser;
  }
  var info = navigator.userAgent;
  if (info.indexOf('MSIE ') != -1) {
    cool.browser = 'IE';
  }
  if (info.indexOf('Chrome') != -1) {
    cool.browser = 'Chrome';
  }
  else if (info.indexOf('Firefox/') != -1) {
    cool.browser = 'Firefox';
  }
  else if (info.indexOf('Safari/') != -1) {
    cool.browser = 'Safari';
  }
  else if (info.indexOf('Opera/') != -1) {
    cool.browser = 'Opera';
  }
  else {
    cool.browser = 'unknown';
  }
  return cool.browser;
} // getBrowser

// true if str is a whitespace-only string
function whiteSpace (str) {
  return str.search(/\S/) == -1;
} // whiteSpace

// trim string from spaces on both sides
function trim (str) {
  if (str == undefined) {
    return str;
  }
  str = str.replace(/^\s*/,'');
  str = str.replace(/\s*$/,'');
  return str;
} // trim

// true if x is a member of xs
function member (x,xs) {
  for (var i = xs.length-1;i >= 0;i--) {
    if (xs[i] == x) {
      return true;
    }
  }
  return false;
} // member

// validEmailAddress($address)
//   very simple check on the validity of email $address: it should be
//   of the form __@__.__, where @ occurs only once and whatever
//   follows '.' has at least two alphanumeric characters
function validEmailAddress (address)
{
  address = trim(address);
  if (address.match(/@.*@/)) { // two '@' 
    return false;
  }
  if (address.match(/\.\./)) { // contains '..'
    return false;
  }
  if (address.match(/@\./)) { // contains '@.'
    return false;
  }
  if (address.match(/\s/)) { // contains a space
    return false;
  }
  if (address.match(/\,/)) { // contains ','
    return false;
  }
  if (address.match(/\</)) { // contains '<'
    return false;
  }
  if (address.match(/\>/)) { // contains '>'
    return false;
  }
  if (address.match(/\;/)) { // contains ';'
    return false;
  }
  var m = address.match(/^(.+)@(.+)\.([^\.]+)$/);
  if (m == null) {
    return false;
  }
  var domain = m[3];
  // all non-white, at least two characters
  if (! domain.match(/^\S\S+$/)) {
    return false;
  }
  return true;
} // validEmailAddress

// true if the NodeList lst has at least one checked element
function hasChecked (lst) {
  for (var n=0;n < lst.length;n++) {
    if (lst[n].checked) {
      return true;
    }
  }
  return false;
} // hasChecked

// constructor of errors
function Err() {
  this.errors = [];
} // Err

Err.prototype = {
  add : function (msg) {
    this.errors.push(msg);
  },

  addFirst : function (msg) {
    this.errors.unshift(msg);
  },

  // add a list of errors
  addList : function (lst) {
    for (var i = 0;i < lst.length;i++) {
      this.errors.push(lst[i]);
    }
  },

  reset : function () {
    this.errors = [];
  },

  hasErrors : function () {
    return (this.errors.length > 0);
  },

  // If the email address is incorrect, add a corresponding error.
  // If mandatory is true, the address is mandatory
  // return true if no error
  checkEmail : function (address,mandatory,what)
  {
    address = trim(address);
    if (address == '') {
      if (mandatory) {
        what = what || 'email address';
        this.add(what + ' must be specified');
        return false;
      }
      return true;
    }
    if (!validEmailAddress(address)) {
      this.add(address + ' is not a valid email address');
      return false;
    }
    return true;
  }, // Err.checkEmail

  // checkDate(dateString)
  //   parse dateString of the form 2006-14-05.
  //   If any error is encountered, save it and return false. Otherwise
  // return the Date object corresponding to the date. If there is no
  // date but the date is optional return true
  checkDate : function(dateString,field,optional)
  {
    dateString = trim(dateString);
    if (dateString == '') {
      if (optional) {
        return true;
      }
      this.add(field + ' must be specified');
      return false;
    }

    var parse = dateString.match(/^\s*(\d\d\d\d)-(\d\d)-(\d\d)\s*$/);
    if (! parse) {
      this.add(field + ': ' + dateString + ' is not a correct date');
      return false;
    }

    var year = Number(parse[1]);
    var month = Number(parse[2]);
    var day = Number(parse[3]);
    var errFound;
    if (year < 2000 || year > 2100) {
      this.add(field + ': year out of range');
      errFound = true;
    }

    if (month < 1 || month > 12) {
      this.add(field + ': month out of range');
      errFound = true;
    }

    if (day < 1 || day > 31) {
      this.add(field + ': month out of range');
      errFound = true;
    }

    if (errFound) {
      return false;
    }

    month--;
    var date = new Date(year,month,day);
    if (date.getFullYear() != year ||
        date.getMonth() != month ||
        date.getDate() != day) {
      this.add(field + ': invalid date');
      return false;
    }
    return date;
  }, // checkDate

  // If the value is empty, add a corresponding error about the field
  mandatory : function (val,field) {
    if (! val || trim(val) == '') {
      this.add(field + ' must be specified');
      return false;
    }
    return true;
  }, // Err.mandatory

  // input is a select element. Add an error if nothing
  // is selected. illegal is an optional set of value whose
  // selection is also regarded as an error
  selected : function (input,field,illegal) {
    if (input.selectedIndex == -1 ||
        (illegal &&
         illegal[input.options[input.selectedIndex].value])) {
      this.add(field + ' must be specified');
      return false;
    }
    return true;
  }, // Err.selected

  // If the value is not a true money value xxxx.xx
  // add a corresponding error about the field
  money : function (val,field)
  {
    val = trim(val);
    if (val.match(/^\-?\d+\.\d\d$/) == null) {
      this.add(field + ' has a wrong format');
      return false;
    }
    return true;
  }, // Err.money

  checkURL : function(val,field)
  {
    val = trim(val);
    if (val.match(/https?:\/\/..+\...+/)) {
      return true;
    }
    var msg = field + ' "' + val + '" does not seem to be a valid URL';
    if (! val.match(/https?/)) {
      msg += '\nDo you mean http://' + val + '?';
    }
    this.add(msg);
    return false;
  }, // Err.checkURL

  // If the value is not a positive integer
  // add a corresponding error about the field
  positiveInteger : function (val,field)
  {
    val = trim(val);
    if (val.match(/^[1-9]\d*$/) == null) {
      this.add(field + ' must be a positive integer');
      return false;
    }
    return true;
  }, // Err.positiveInteger

  // check if there is any error in the list errors and alert if any errors
  // are found. Return true if no errors
  checkAndAlert : function()
  {
    var errors = this.errors;

    if (errors.length == 1) {
      var msg =
        "The following error has been found.\n" +
        "______________________________________________\n\n" +
        this.errors[0] + "\n" +
        "______________________________________________\n\n" +
        "Please fix this error and try again.\n";
      document.body.style.cursor = 'default';
      alert2(msg);
      return false;
    }
    if (errors.length == 0) {
      return true;
    }

    var msg = "The following errors have been found.\n" +
              "______________________________________________\n\n";
    for (var n = 0;n < errors.length;n++) {
      msg += '' + (n + 1) + ". " + errors[n] + "\n";
    }
    msg += "______________________________________________\n\n" +
           "Please fix these errors and try again.\n";
    document.body.style.cursor = 'default';
    alert2(msg);
    return false;
  } // Err.CheckAndAlert
};

// Corresponds to XLink::state in Perl code
function computeState()
{
  // coolState may be set by a server-side script
  var state = window.coolState || {};
  if (cool.inc) {
    state.a = cool.inc;
  }
  if (cool.proxy) {
    state.y = cool.proxy;
  }
  if (cool.demo) {
    state.d = cool.demo;
  }
  for (var key in cool) {
    if (key.startsWith('0Q')) {
      state[key] = cool[key];
    }
  }
  if (cool.role == 'editor' && cool.pid) {
    state.p = cool.pid;
  }
  
  return state;
} // computeState

// corresponds to XLink::href()
function href(page,params,anchor)
{
  if (! params) {
    params = {};
  }
  var state = computeState();
  for (var key in params) {
    if (key == 'anchor' || key == '#anchor') {
      anchor = params[key];
    }
    else if (!params[key]) {
      delete state[key];
    }
    else {
      state[key] = params[key];
    }
  }
  if (cool.track && cool.role == 'author' && !state.track) {
    state.track = cool.track;
  }

  if (state.a) {
    var values = page.match(/^(?:\/(.*?)\/)?.*?(\.cgi)?$/); 
    var dir = values[1];
    var ext = values[2];
    var norole = {'publications'  : true,
                  'smart-program' : true,
                  'smart-slide'   : true};
    if ((!dir && !ext) || norole[dir]) {
      delete state.a;
    }
  }

  // my %norole = map {$_ => 1} ('publications','smart-program','smart-slide');
  // if ($state->{'a'}) {
  // my ($dir) = $page =~ /^\/(.*?)\//;
  // if ($norole{$dir} || (!$dir && $page !~ /\.cgi$/)) {
  //   delete $state->{'a'};
  // }

  var parNumber = 0; // parameter number
  for (var par in state) {
    var val = state[par];
    if (typeof(val) == 'object' && (val instanceof Array)) { // array
      for (var l = 0;l < val.length;l++) {
        var v = val[l];
        page += (parNumber ? '&' : '') + encodeURIComponent(par) + '=' +
                encodeURIComponent(v);
        parNumber++;
      }
    }
    else {
      page += (parNumber ? '&' : '?') + encodeURIComponent(par) + '=' +
              encodeURIComponent(val);
      parNumber++;
    }
  }
  if (anchor) {
    page += '#' + anchor;
  }
  return page;
} // href

// corresponds to XLink::hrefHome()
function hrefHome(page,params,anchor)
{
  return '/' + href(page,params,anchor);
} // hrefHome

// return the position of the browser window within the document
function getWindowPos () {
  if (window.pageYOffset){
    return {y : window.pageYOffset,
            x : window.pageXOffset};
  }
  if (document.documentElement && document.documentElement.scrollTop) {
    return {y : document.documentElement.scrollTop,
            x : document.documentElement.scrollLeft};
  }
  if (document.body) {
    return {y : document.body.scrollTop,
            x : document.body.scrollLeft};
  }

  return {y : 0, x : 0};
} // getWindowPos

// The browser window size
// Does not includes the width of the vertical scroll bar, if one is present
function getWindowSize () {
  return {
    x: document.documentElement.clientWidth,
    y: document.documentElement.clientHeight
  };
} // getWindowSize

// center elem in the browser window
// this function ignores window scroll
function absolutCenterInWindow(elem) {
  var size = getWindowSize();
  var elemBox = elem.getBoundingClientRect();

  var x = Math.round(size.x / 2 - elemBox.width / 2);
  var y = Math.round(size.y / 2 - elemBox.height / 2);

  if (x < 0) x = 0;
  if (y < 0) y = 0;

  elem.style.left = x + 'px';
  elem.style.top = y + 'px';
} // absolutCenterInWindow

// center elem in the browser window
function centerInWindow (elem) {
  var size = getWindowSize();
  var windowPos = getWindowPos();
  
  var x = Math.round(size.x/2 - elem.offsetWidth/2) + windowPos.x;
  var y = Math.round(size.y/2 - elem.offsetHeight/2) + windowPos.y;
  if (y < 0) {
    y = 0;
  }
  elem.style.left = x + 'px';
  elem.style.top = y + 'px';
}

/**
 * Load JS file from the server and add it to the HTML head.
 * @param {string} url - Url of JS file.
 * @param {function} onLoad - onLoad handler.
 * @param {boolean?} async - Files will be load asynchronously if true.
 */
function loadJS(url, onLoad, async) {
  try {
    const script = document.createElement('script');
    script.src = url;
    script.async = async;
    document.head.appendChild(script);

    // success event
    if (typeof onLoad === 'function') {
      script.addEventListener('load', () => {
        try {
          onLoad();
        } catch (err) {
          logError(err, 'loadJS.onLoad');
        }
      });
    }
    // error event
    script.addEventListener('error', ev => {
      logError(ev.error, 'loadJS');
    });
  } catch (err) {
    logError(err, 'loadJS');
  }
} // loadJS

/**
 * Load CSS file from the server and add it to the HTML head.
 * @param {string} url - Url of the file.
 */
function loadCSS(url) {
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;

    document.head.appendChild(link);
  } catch (err) {
    logError(err, 'loadCSS');
  }
}

// variable to store the last response handled by loadObject
var lastLoadObjectResponse = '000';
function loadObject(script, handler, params, onSpecial) {
  params = params || {};
  var extra = EC.extra;
  if (extra) {
    for (var par in extra) {
      params[par] = extra[par];
    }
  }
  var confirmText = params['#confirm'];
  if (confirmText) {
    if (!confirm(confirmText)) {
      return;
    }
    delete params['#confirm'];
  }
  const large = params['#large'];
  if (large) {
    delete params['#large'];
  }
  const spinner = params['#spinner'];
  if (spinner != null) { // check for null and undefined
    startWaiting(spinner);
    delete params['#spinner'];
  }

  const url = href(script);
  const request = new XMLHttpRequest();
  request.open('POST', url);
  request.onreadystatechange = function () {
    if (request.readyState !== 4) {
      return;
    }
    if (request.status === 200) {
      // this check is not described in textbooks but this happens
      // when a connection is slow that when request.readyState == 4
      // the request itself is still empty
      const response = request.responseText;
      lastLoadObjectResponse = response;
      if (response !== '') {
        if (spinner != null) { // check for null or undefined
          stopWaiting();
        }
        // second argument for the call to the handler is added for
        // debugging
        const obj = decode(response);
        if (EC.special(obj)) {
          if (onSpecial) {
            onSpecial();
          }
          return;
        }
        if (handler) {
          handler(obj,response);
        }
      }
    } else if (request.status === 408) {
      EC.error408Notification();
    } else if (request.status === 500) {
      EC.error500Notification();
    }
  };
  request.addEventListener('error', () => {
    EC.showError('Error',
      'There was an error during sending the request to the server.');
  }, false);
  request.addEventListener('abort', () => {
    EC.showError('Error',
      'Sending the request has been cancelled by the user or the browser dropped the connection.');
  }, false);

  const data = new FormData();
  let fileFound = false;
  for (let par in params) {
    const val = params[par];
    if (val instanceof Array) {
      if (large) {
        data.append(par, val.join(','));
      } else {
        for (let l = 0; l < val.length; l++) {
          data.append(par, val[l]);
        }
      }
    } else if (val != null) {
      data.append(par, val);
    }

    fileFound = fileFound || val instanceof File;
  }

  if (script.endsWith('_z') || script.endsWith('_z.cgi')) {
    data.append('x', '1');
  }

  const setProgress = value => {
    try {
      if (params.button) {
        const percent = $('percent.' + params.button);
        const bar = $('bar.' + params.button);

        if (percent && bar) {
          percent.innerHTML = value;
          bar.style.width = value;
        }
      }
    } catch (err) {
      logError(err, 'loadObject.setProgress');
    }
  };
  const progress = params.button && $('progressrow.' + params.button);
  if (progress) {
    // just in case there was something previously uploaded, we hide the bar
    progress.style.display = 'none';
  }
  if (progress && request.upload && fileFound) {
    progress.style.display = progress.tagName === 'DIV' ? 'block' : 'table-row';
    setProgress('0%');

    request.upload.addEventListener('progress', event => {
      try {
        setProgress(
          Math.round(event.loaded * 100 / event.total).toString() + '%');
      } catch (err) {
        logError(err, 'loadObject.progress');
      }
    }, false);
  }

  if (data.entries().next().done) { // formdata is empty
    // we have to deal with this case separately, apache does not like empty post
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.send();
  } else {
    request.send(data);
  }
} // loadObject

// special(obj)
//   if obj is an object encoding a special response, perform a
//   function corresponding to this response and return true.
//   Otherwise, return false
EC.special = function(response)
{
  try {
    if (typeof response != "object" || response == null) {
      return false;
    }
    var what = response.special;
    if (! what) {
      return false;
    }
    if (what == 'nothing') { // do nothing
      return true;
    }
    if (what == 'login_required') {
      location.href = '/account/signin';
      return true;
    }
    if (what == 'rewrite') {
      var content = $('content');
      removeChildren(content);
      var summary = $_('div', {className: 'summary'}, false, content);
      $_('div', {className: 'pagetitle'}, response.title, summary);
      var subcontent = $_('div', {className: 'subcontent'}, false, content);
      var text = $_('p', false, response.text, subcontent);
      if (response['class']) {
        text.className = response['class'];
      }
      return true;
    }
    if (what == 'overlay') {
      if (!window.Overlay) {
        throw new Error("overlay.js not loaded");
      }
      Overlay.display(response);
      return true;
    }
    if (what == 'notification') {
      showNotification(response)
      return true;
    }

    var errors = response.errors;
    if (errors) {
      stopWaiting();
      var err = new Err();
      for (var i = 0;i < errors.length;i++) {
        err.add(errors[i]);
      }
      err.checkAndAlert();
    }
    else if (response.error) {
      stopWaiting();
      var err = new Err();
      err.add(response.error);
      err.checkAndAlert();
    }
    else if (response.alert) {
      stopWaiting();
      alert2(response.alert);
    }
    else if (response.report) {
      report(response.report,response.time);
    }
    else if (response.died) {
      stopWaiting();
      alert2('The following system error has occurred:\n' +
             '---------------------------------------\n' +
             response.died + '\n' +
             '---------------------------------------\n' +
             'System errors are logged and checked on a\n' +
             'regular basis so you do not have to do\n' +
             'anything. However, if you believe you are\n' +
             'in an emergency situation, please contact\n' +
             'EasyChair developers using the "Help" menu tab.');
    }
    else if (what == 'attack') {
      stopWaiting();
      alert2('An error: probably an access violation');
    }
    else if (response.jserror) {
      stopWaiting();
      alert2('The following JavaScript error has occurred:\n' +
             '---------------------------------------\n' +
             response.jserror + '\n' +
             '---------------------------------------\n' +
             'EasyChair logs such errors and we try to\n' +
             'fix the problem as soon as we can, so you\n' + 
             'do not have to do anything. However, if\n' +
             'you believe you are in an emergency situation,\n' +
             'please contact EasyChair developers using\n' +
             'the "Help" menu tab.');
    }

    if (response.load) {
      location.href = href(response.load,response.params);
    }
    else if (response.reload) {
      location.replace(href(response.reload,response.params));
    }
    else if (response.sequence) {
      return executeSequence(response.sequence);
    }
    else if (response.open) {
      window.open(href(response.open,response.params), '_blank');
    }
    return true;
  }
  catch (err) {
    logError(err,'EC.special');
  }
} // EC.special

function executeSequence(sequence)
{
  try {
    for (var s = 0;s < sequence.length;s++) {
      addDebug('sequence',s);
      var action = sequence[s];
      switch (action.action) {
      case 'report':
        report(action.text, action.time);
        break;
      case 'clear_report':
        clearReport();
        break;
      case 'alert':
        alert2(action.text);
        break;
      case 'checkbox':
      case 'radio':
        $(action.id).checked = action.check ? true : false;
        break;
      case 'radio_group':
        var radios = document.getElementsByName(action.name);
        for (var i = radios.length-1;i >= 0;i--) {
          if (radios[i].value == action.value) {
            radios[i].checked = action.check ? true : false;
            break;
          }
        }
        break;
      case 'value':
        $(action.id).value = action.value;
        break;
      case 'append':
        $(action.id).value += action.value;
        break;
      case 'set':
        window[action.v] = action.value;
        break;
      case 'html':
        $(action.id).innerHTML = action.html;
        break;
      case 'select':
        EC.setSelection($(action.id),action.val);
        break;
      case 'file':
        location.href = action.url;
        break;
      case 'load':
        location.href = action.script;
        return true;
      case 'reload':
        return location.replace(action.script);
      case 'popup':
        Effects.openPopup(action.id);
        break;
      case 'focus':
        $(action.id).focus();
        break;
      case 'scroll':
        $(action.id).scrollIntoView();
        break;
      case 'inplace':
        Inplace.get(action.id).showText(action.val);
        break;
      case 'err':
        stopWaiting();
        var err = new Err();
        err.add(action.error);
        err.checkAndAlert();
        break;
      case 'theme':
        var tableRow = $(action.row);
        removeClass(tableRow,'green');
        removeClass(tableRow,'red');
        removeClass(tableRow,'blue');
        removeClass(tableRow,'magenta');
        removeClass(tableRow,'cyan');
        removeClass(tableRow,'yellow');
        removeClass(tableRow,'grey');
        removeClass(tableRow,'stategray');
        removeClass(tableRow,'cobalt');
        removeClass(tableRow,'violet');
        removeClass(tableRow,'wheat');
        removeClass(tableRow,'burlywood');
        removeClass(tableRow,'powderblue');
        removeClass(tableRow,'lime');
        removeClass(tableRow,'salmon');
        addClass(tableRow,action.theme);
        break;
      case 'class':
        var elem = $(action.id);
        if (!elem) {
          if (action.ignore == '') {
            break;
          }
          throw new Error('No element with id ' + action.id);
        }
        elem.className = action.cls;
        break;
      case 'attribute':
        var elem = $(action.id);
        if (!elem) {
          if (action.ignore == '') {
            break;
          }
          throw new Error('No element with id ' + action.id);
        }
        elem[action.attribute] = action.val;
        break;
      case 'style':
        var elem = $(action.id);
        if (!elem) {
          if (action.ignore == '') {
            break;
          }
          throw new Error('No element with id ' + action.id);
        }
        elem.style[action.par] = action.val;
        break;
      case 'add_class':
        addClass($(action.id),action.cls);
        break;
      case 'remove_class':
        removeClass($(action.id),action.cls);
        break;
      case 'cursor':
        document.body.style.cursor = action.val;
        break;
      case 'form_button':
        if (!window.FormHandler) {
          throw new Error('FormHandler not loaded');
        }
        FormHandler.releaseForClicks(action.val);
        break;
      case 'stop_waiting':
        stopWaiting();
        break;
      case 'hide_overlay':
        Overlay.close(action.id);
        break;
      case 'release_upload':
        if (window.Upload) {
          Upload.releaseButton(action.button);
        }
        break;
      case 'false':
        return false;
      case 'html_edit':
        CKEDITOR.instances[action.id].setData(action.val);
        break;
      default:
        throw new Error('Unknown action: ' + action.action);
      }
    }
    return true;
  }
  catch (err) {
    logError(err,'executeSequence');
  }
} // executeSequence

// the indexOf, map and filter function do not exist in early IE
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf =
    function (member,fromIndex) {
      var length = this.length;
      fromIndex = fromIndex || 0;
      if (fromIndex < 0) {
        fromIndex = Math.max(0,length + fromIndex);
      }
      while (fromIndex < length) {
        if (this[fromIndex] === member) {
          return fromIndex;
        }
        fromIndex++;
      }
      return -1; // value was not found, return -1
    };
}
if (!Array.prototype.map) {
  Array.prototype.map = function(mapper, that) {
    var result = new Array(this.length);
    var n = this.length;
    for (var i = 0; i < n; i++) {
      if (i in this) {
        result[i] = mapper.call(that, this[i], i, this);
      }
    }
    return result;
  };
}
if (!Array.prototype.filter) {
  Array.prototype.filter = function(filter, that)
  {
    var result = [];
    var n = this.length;
    for (var i = 0; i < n; i++) {
      if (i in this && filter.call(that, this[i], i, this)) {
        result.push(this[i]);
      }
    }
    return result;
  };
}

// the grep (exists) function
Array.prototype.grep = function(fun) {
  for (var i = 0;i < this.length;i++) {
    if (fun(this[i])) {
        return true;
    }
  }
  return false;
} // Array.grep

Array.prototype.iterator = function(reverse) {
    return new Array.Iterator(this,reverse);
} // Array.iterator

function id (x) {return x;}
function $(x) { return document.getElementById(x); }
function $F(x) { return document.getElementById(x).value ; }

// start the waiting image with the given text under it
function startWaiting (text) {
  try {
    text = text || '';
    var spinnerDiv = $('easy-spinner');
    if (!spinnerDiv) {
      spinnerDiv = $_('div', {
          id: 'easy-spinner',
          className: 'easy-spinner',
        }, false, document.body);
      $_('img', {src: '/images/waiting.gif'}, false, spinnerDiv);
      $_('p', {id: 'spinner-text'}, false, spinnerDiv);
    }
    var txt = $('spinner-text');
    removeChildren(txt);
    $T(text, txt);
    addClass($('page'), 'blurring');
  } catch(err) {
    logError(err, 'StartWaiting');
  }
} // startWaiting

// terminate the waiting element
function stopWaiting () {
  try {
    var spinnerDiv = $('easy-spinner');
    if (spinnerDiv) {
      removeClass($('page'), 'blurring');
      removeElement(spinnerDiv);
    }
  } catch (err) {
    logError(err, 'stopWaiting');
  }
} // stopWaiting

// return a new element possibly with some attributes and possible
// html (e.g., text) inside and append it to appendTo. Add style
// values from the object style.
function $_(tag,attributes,html,appendTo,style)
{
  var elem = document.createElement(tag);
  if (attributes) {
    for (var att in attributes) {
      elem[att] = attributes[att];
    }
  }
  if (html) {
    elem.innerHTML = html;
  }
  if (style) {
    var stl = elem.style;
    for (var key in style) {
      stl[key] = style[key];
    }
  }
  if (appendTo) {
    appendTo.appendChild(elem);
  }
  return elem;
} // $_

// $T(text,[parent])
//   create a text node and append it to parent (if any)
function $T(text,parent)
{
  var node = document.createTextNode(text);
  if (parent) {
    parent.appendChild(node);
  }
  return node;
} // $T

// insert an element after a node
function insertAfter(node,elem)
{
  var parent = node.parentNode;
  var next = node.nextSibling;
  if (next) {
    parent.insertBefore(elem,next);
  }
  else {
    parent.appendChild(elem);
  }
  return elem;
} // insertAfter

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// convert the time in Epoch Seconds to a string like Aug 18 2007 14:05
function time2DateTime2 (time) {
  var date = new Date();
  date.setTime(time*1000); // JavaScript uses milliseconds while Perl seconds

  var hours = date.getHours();
  var minutes = date.getMinutes();
  if (hours < 10) {
    hours = '0' + hours;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  return months[date.getMonth()] + ' ' +
    date.getDate() + ' ' + date.getFullYear() + ' ' +
    hours + ':' + minutes;
} // time2DateTime2


// return the number of lines in string str
function countLines (str)
{
  var lastIndex = -1;
  var lines = 1;
  for (;;) {
    lastIndex = str.indexOf('\n',lastIndex) + 1;
    if (lastIndex == 0) {
      return lines;
    }
    lines++;
  }
} // countLines

// compute the list of keys, similar to the Perl keys function for hashes
function keys(obj)
{
  var result = [];
  for (var key in obj) {
    result.push(key);
  }
  return result;
} // keys

// compute the list of values, similar to the Perl keys function for hashes
function values(obj)
{
  var result = [];
  for (var key in obj) {
    result.push(obj[key]);
  }
  return result;
} // values

// for debugging, shows the state of an object. 
// Depth is the depth to which sub-object states are to be 
// followed.
function showObjectState (obj,depth)
{
  depth = depth || 0;
  var lines = [];
  if (typeof(obj) == 'object' && obj.constructor == [].constructor) {
    lines.push('[array]');
    showObjectState2(obj,depth,lines,'  ');
  }
  else {
    showObjectState1(obj,depth,lines,'');
  }
  alert2(lines.join('\n'));
} // showObjectState

// an auxiliary function for showObjectState
function showObjectState1(obj,depth,lines,prefix)
{
  var ks = keys(obj).sort();
  for (var i = 0;i < ks.length;i++) {
    var key = ks[i];
    var value = obj[key];
    var val = value;
    var tp = typeof(value);
    if (tp == 'function') {
      val = '[function]';
    }
    else if (tp == 'object' && value != null) {
      var arr = [];
      if (arr.constructor == value.constructor) { // array
        val = '[array]';
      }
      else {
        val = '[object]';
      }
    }
    lines.push(prefix + key + '=' + val);
    if (depth > 0) {
      var newPrefix = '  ' + prefix + key + '.';
      if (val == '[array]') { // array
        showObjectState2(value,depth-1,lines,newPrefix);
      }
      else if (val == '[object]') {
        showObjectState1(value,depth-1,lines,newPrefix);
      }
    }
  }
} // showObjectState1

// an auxiliary function for showObjectState
function showObjectState2(arr,depth,lines,prefix)
{
  for (var i = 0;i < arr.length;i++) {
    var newPrefix = prefix + '[' + i + ']';
    var value = arr[i];
    var val = value;
    var tp = typeof(value);
    if (tp == 'function') {
      val = '[function]';
    }
    else if (tp == 'object' && value != null) {
      if (arr.constructor == value.constructor) { // array
        val = '[array]';
      }
      else {
        val = '[object]';
      }
    }
    lines.push(newPrefix + '=' + val);
    if (depth) {
      if (val == '[array]') { // array
        showObjectState2(value,depth-1,lines,'  ' + newPrefix);
      }
      else if (val == '[object]') {
        showObjectState1(value,depth-1,lines,'  ' + newPrefix);
      }
    }
  }
} // showObjectState2

// encode(value)
//   encode the value to a string. Inverse to the Perl function decode
//   defined in the Exchange module
function encode (value)
{
  var result = [];
  encode1(value,result);

  return result.join('');
} // encode

function encode1 (value,result)
{
  // string, object, number, undefined
  if (value == undefined) { // includes null
    result.push('Z1');
    return;
  }
  if (value === true) {
    result.push('1');
    return;
  }
  if (value === false) {
    result.push('0');
    return;
  }
  var tp = typeof(value);
  if (tp == 'string') {
    if (value == '') {
      result.push('Z2');
      return;
    }
    result.push(value.replace(/Z/g,'Z0'));
    return;
  }

  if (tp == 'number') {
    result.push(value);
    return;
  }

  if (tp == 'function') {
    result.push('[function]');
    return;
  }

  if (tp != 'object') {
    throw new Error('unrecognized type in function encode1');
  }

  var arr = [];
  if (value.constructor == arr.constructor) { // array
    result.push('Z[');
    var length = value.length;
    for (var i = 0;i < length;i++) {
      encode1(value[i],result);
      result.push('Z,');
    }
    result.push('Z]');
    return;
  }

  result.push('Z{');
  for (var key in value) {
    var val = value[key];
    result.push(key.replace(/Z/g,'Z0'), 'Z:');
    encode1(val,result);
    result.push('Z,');
  }
  result.push('Z}');
} // encode

// return the difference between two dates start and end in milliseconds
// can be used for benchmarking
function timeDiff (end,start)
{
  return (1000*end.getUTCSeconds() + end.getUTCMilliseconds()) -
         (1000*start.getUTCSeconds() + start.getUTCMilliseconds());
}

// decode(string)
//   decode the string to a value. Inverse to the Perl function encode
//   defined in the Exchange module.
function decode(strng)
{
  if (!strng.startsWith('Z')) {
    try {
      return JSON.parse(strng);
    } catch (error) {
      logError(error, 'decode.JSON.parse');
    }
  }

  var stack = [];
  var b = strng.match(/^([^Z]+)(Z.*)/);
  if (b) {
    stack.push(b[1]);
    strng = b[2];
  }
  if (strng.match(/^([^Z]*)$/)) {
    return(strng);
  }
  var reg = new RegExp("(Z.)([^Z]*)","g");

  var objects = [];
  var types = [];   // stack of types: 0:array, 1:object
  var keys = [];    // stack of keys
  var str = [];     // parts of the current string
  var obj = null;   // current container
  var tp = 2;       // type of current container 0:array,1:object,2:anything
  var key = null;   // the value of the last key

  var reserve = null;
  var token;
  for (;;) {
    if (reserve != null) {
      token = reserve;
      reserve = null;
    }
    else {
      var m = reg.exec(strng);
      if (! m) {
        if (obj != null) {
          logError(err,'decode',
                   {string : strng});
          throw new Error('non-terminating string');
        }
        return str.join('');
      }
      token = m[1];
      if (m[2] != '') {
        reserve = m[2];
      }
    }
    switch (token) {
    case 'Z{':
      {
        var newObj = {};
        switch (tp) {
        case 2: // nothing
          tp = 1;
          obj = newObj;
          break;
        case 1: // object
          obj[key] = newObj;
          key = null;
          objects.push(obj);
          types.push(1);
          keys.push(key);
          obj = newObj;
          break;
        case 0: // array
          obj.push(newObj);
          objects.push(obj);
          types.push(0);
          keys.push(key);
          tp = 1;
          obj = newObj;
          break;
        }
      }
      break;

    case 'Z}':
      if (objects.length == 0) {
        return obj;
      }
      obj = objects.pop();
      tp = types.pop();
      key = keys.pop();
      break;

    case 'Z[':
      {
        var newObj = [];
        switch (tp) {
        case 2: // nothing
          tp = 0;
          obj = newObj;
          break;
        case 1: // object
          obj[key] = newObj;
          key = null;
          objects.push(obj);
          types.push(1);
          keys.push(key);
          obj = newObj;
          tp = 0;
          break;
        case 0: // array
          obj.push(newObj);
          objects.push(obj);
          types.push(0);
          keys.push(key);
          obj = newObj;
          break;
        }
      }
      break;

    case 'Z]':
      if (objects.length == 0) {
        return obj;
      }
      obj = objects.pop();
      tp = types.pop();
      key = keys.pop();
      break;

    case 'Z,':
      if (tp) { // object
        if (str.length) {
          obj[key] = str.join('');
          key = null;
          str = [];
        }
        break;
      }
      // array
      if (str.length) {
        obj.push(str.join(''));
        str = [];
      }
      break;

    case 'Z:':
      key = str.join('');
      str = [];
      break;

    case 'Z1': // undefined
      switch (tp) {
      case 2: // nothing
        return undefined;
      case 1: // object
        obj[key] = undefined;
        key = null;
        break;
      case 0: // array
        obj.push(undefined);
        break;
      }
      break;

    case 'Z0':
      str.push('Z');
      break;
    case 'Z2':
      str.push('');
      break;
    case 'Z3':
      str.push('"');
      break;
    case 'Z4':
      str.push('\n');
      break;
    case 'Z5':
      str.push('\\');
      break;
    default:
      str.push(token);
      break;
    }
  }
} // decode

// return a value obtain by truncating the value to a certain depth
function truncate(value,depth)
{
  if (typeof(value) != 'object' || value == null) {
    return value;
  }

  var arr = [];
  var isArray = (arr.constructor == value.constructor);

  if (! depth) {
    return isArray ? '[array]' : '[object]';
  }

  if (isArray) { // array
    var length = value.length;
    var result = new Array(length);
    for (var i = length-1;i >= 0;i--) {
      result[i] = truncate(value[i],depth-1);
    }
    return result;
  }

  var result = {};
  for (var key in value) {
    result[key] = truncate(value[key],depth-1);
  }
  return result;
} // truncate

function skypePlugin()
{
  var pageContent = document.documentElement.innerHTML;
  if (pageContent.indexOf('/document_iterator.js') == -1) {
    return false;
  }
  alert2('There was a JavaScript error caused by a Skype add-on '+
         'for your browser. Unfortunately, this add-on interferes '+
         'with other scripts and sometimes causes them to break. '+
         'If using this page is essential for you and it does '+
         'work you should either change to another browser or uninstall '+
         'the Skype add-on.');
  return true;
} // skypePlugin

// extra is the optional hash of extra parameters to be passed
// if extra.noalert is set to a true value, then the error will
// be recorded but the user will be uninterrupted by an error alert
function logError(err,func,extra)
{
  if (location.hostname.match(/localhost|easychair\.my/)) {
    console.log(err);
  }

  // save only the deepest error
  if (logError.saved) {
    return;
  }
  logError.saved = true;
  extra = extra || {};
  extra.func = func;
  try {
    for (var key in extra) {
      extra[key] = encode(extra[key]);
    }

    extra.err = encode(err);

    if (err !== null) {
      // Safari can throw the NULL error with description 'script error' in the
      // case when the script was load from another site.
      // And in this case, it will throw the error that it cannot take
      // the message from null.
      extra.message = err.message;
      var errorStack = err.stack || err.stacktrace;
      if (errorStack) {
        extra.stack = errorStack;
      }
    }

    extra.cool = encode(cool);
    if (window.debug) {
      extra.debug = encode(window.debug);
    }
    extra.page = encode(document.documentElement.innerHTML);
    extra.response = lastLoadObjectResponse;
    extra.responseString = encode(lastLoadObjectResponse);
    extra.menu = encode(window.Menu);
  }
  catch (err) {
    if (logError.tried) {
      return;
    }
    logError.tried = true;
    extra["ERROR"] = err;
  }

  loadObject('/utils/javascript_error_x.cgi',
             doNothing,
             extra);
} // logError

// true if the value is an integer
function isInteger (value)
{
  return ! isNaN(Number(value)) &&
         Number(value) == parseInt(value);
} // isInteger

// function to find the absolute position of an HTML element in the 
// document
function absPosition (elem)
{
  var left = 0;
  var top = 0;
  for (var out = elem; out; out=out.offsetParent) {
    left += out.offsetLeft; 
    top += out.offsetTop; 
  }
  return {left : left,
         right : left + elem.offsetWidth,
           top : top,
        bottom : top + elem.offsetHeight}
} // absPosition

// return the size of the browser window
function windowGeometry()
{
  var geo = {};
  // position of the browser on the desktop
  if (window.screenX !== undefined) {
    geo.screenX = window.screenX;
    geo.screenY = window.screenY;
  }
  else if (window.screenLeft !== undefined) {
    geo.screenX = window.screenLeft;
    geo.screenY = window.screenTop;
  }
  // dimensions of the HTML (may be smaller than the visible
  // part of the window)
  if (window.innerWidth !== undefined) {
    geo.innerWidth = window.innerWidth;
    geo.innerHeight = window.innerHeight;
    geo.pageXOffset = window.pageXOffset;
    geo.pageYOffset = window.pageYOffset;
  }
  else if (document.documentElement.clientWidth !== undefined) {
    geo.innerWidth = document.documentElement.clientWidth;
    geo.innerHeight = document.documentElement.clientHeight;
    geo.pageXOffset = document.documentElement.scrollLeft;
    geo.pageYOffset = document.documentElement.scrollTop;
  }
  else if (document.body.clientWidth !== undefined) {
    geo.innerWidth = document.body.clientWidth;
    geo.innerHeight = document.body.clientHeight;
    geo.pageXOffset = document.body.scrollLeft;
    geo.pageYOffset = document.body.scrollTop;
  }
  return geo;
} // windowGeometry

// true if elem fits in the current window
function fitsInWindow (elem)
{
  var pos = absPosition(elem);
  var win = windowGeometry();
  return pos.left >= win.pageXOffset &&
         pos.right <= win.innerWidth &&
         pos.top >= win.pageYOffset &&
         pos.bottom <= win.innerHeight;
} // fitsInWindow

// true if elem fits in the current window vertically
function fitsVertically (elem)
{
  var pos = absPosition(elem);
  var win = windowGeometry();
  return pos.top >= win.pageYOffset &&
         pos.bottom <= win.innerHeight;
} // fitsVertically

// given lines, split them into a list of lines of length of length of
// at most 60 characters, same as Common.splitLongLines in Perl
function splitLongLines (lines)
{
  var result = [];
  for (var i = 0;i < lines.length;i++) {
    var line = lines[i];
    while (line.length > 60) {
      var first = line.substring(0,60);
      var m = first.match(/^(.*)\s(\S*)$/);
      if (m) {
        result.push(m[1]);
        line = m[2] + line.substring(60);
      }
      else {
        result.push(first);
        line = line.substring(60);
      }
    }
    result.push(line);
  }
  return result;
} // splitLongLines

// return the source (HTML element) of the event
// If attrib is defined and the found element does not have this attribute
// then search among predecessors of this event
function eventSource(event,attrib)
{
  event = event || window.event;
  if (! event) {
    return false;
  }
  // target is standard, scrElement is proprietary for old browsers
  var source = event.target || event.srcElement;
  if (! attrib) {
    return source;
  }
  while (source && !source[attrib] &&
         (!source.getAttribute || !source.getAttribute(attrib))) {
    source = source.parentNode;
  }
  return source;
} // eventSource

// IE does not define the standard window.getComputedStyle
if (! window.getComputedStyle) {
  window.getComputedStyle = function(elem)
    {
      return elem.currentStyle;
    };
}

// remove element from the document
function removeElement(element)
{
  element.parentNode.removeChild(element);
} // removeElement

// remove all children of element
function removeChildren(element)
{
  try {
    var children = element.childNodes;
    if (!children || !children.length) {
      return;
    }
    for (var i = children.length-1;i >= 0;i--) {
      element.removeChild(children[i]);
    }
  }
  catch (err) {
    logError(err,'easy.removeChildren');
  }
} // removeChildren

var clearReportTimeout;
/**
 * Display the text in a popup window.
 * @param {string} text - Report message.
 * @param {number} [timeout=2500] - After the timeout time (default=2500)
 * in milliseconds the window will disappear.
 */
function report(text, timeout) {
  "use strict";
  try {
    clearReport();
    var reportElement = $_('div', { id: 'reportPopup', className: 'report_popup' },
                           undefined, document.body);
    $_('span', { className: 'report_popup_text' }, text, reportElement);
    var closeDiv = $_('div', { className: 'report_popup_close' },
                      undefined, reportElement);
    closeDiv.addEventListener('click', clearReport);
    clearReportTimeout = setTimeout(clearReport, timeout || 4000);
  } catch (err) {
    logError(err, 'easy.report');
  }
} // report

// hide the report window
function clearReport() {
  try {
    var report = $('reportPopup');
    if (!report) {
      return;
    }

    removeElement(report);
    clearTimeout(clearReportTimeout);
  } catch (err) {
    logError(err, 'easy.clearReport');
  }
} // clearReport

// changing the style of an HTML Element
function addStyle(element,obj)
{
  var style = element.style;
  for (var key in obj) {
    style[key] = obj[key];
  }
} // addStyle()

// add attributes of an element
function addAttributes(element,obj)
{
  for (var key in obj) {
    element.setAttribute(key,obj[key]);
  }
} // addAttributes

// return a random string of the given length
function randomString(length)
{
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var result = '';
  var n = chars.length;
  for (var i=length; i > 0; i--) {
    var rnum = Math.floor(Math.random() * n);
    result += chars.substring(rnum,rnum+1);
  }
  return result;
} // randomString

// add a row with given attributes and style (both optional)
// as the last row in the table
EC.appendRow = function(table,attributes,style)
{
  var row = table.insertRow(table.rows.length);
  if (attributes) {
    for (var att in attributes) {
      row[att] = attributes[att];
    }
  }
  if (style) {
    var stl = row.style;
    for (var par in style) {
      stl[par] = style[par];
    }
  }
  return row;
} // appendRow

// add a cell with given attributes (optional) and text (optional)
// as the last cell in the row
EC.appendCell = function(row,attributes,text,style)
{
  var cell = row.insertCell(row.cells.length);
  if (attributes) {
    for (var att in attributes) {
      cell[att] = attributes[att];
    }
  }
  if (text) {
    $T(text,cell);
  }
  if (style) {
    var stl = cell.style;
    for (var par in style) {
      stl[par] = style[par];
    }
  }
  return cell;
} // appendCell

// collects all text inside an HTML element. If the element contains <br> tags, 
// they are replaced by new the line symbols
function elementText(element)
{
  var text = [];
  var nodes = [element];
  while (nodes.length > 0) {
    var node = nodes.shift();
    if (node.nodeType == 3) { // text node
      text.push(node.data);
    }
    else if (node.tagName == 'BR') {
      text.push('\n');
    }
    else {
      for (var i = node.childNodes.length-1; i>=0; i--) {
        nodes.unshift(node.childNodes[i]);
      }
    }
  }
  return text.join('');
} // elementText

function isEmpty(obj)
{
  var empty = true;
  for (var v in obj) {
    empty = false;
    break;
  }
  return empty;
}

// base name of a file
function basename(file)
{
  var pos = file.lastIndexOf('/');
  if (pos == -1) {
    pos = file.lastIndexOf('\\');
  }
  if (pos == -1) {
    return file;
  }
  return file.substr(pos+1);
}

// file extension
function extension(file)
{
  var pos = file.lastIndexOf('.');
  if (pos == -1) {
    return '';
  }
  return file.substr(pos+1);
}

// save and erase the content (everything inside the content div) in an element and
// return this element. If newContent is true, then replace it by the new content
function saveContent(newContent)
{
  var oldContent= document.createDocumentFragment();
  var contentDiv = $('content');
  while (contentDiv.hasChildNodes()) {
    oldContent.appendChild(contentDiv.firstChild);
  }
  if (newContent) {
    contentDiv.appendChild(newContent);
  }
  return oldContent;
}

// sel must be a selection element
// return the current selection and null if no selection
EC.getSelection = function(sel)
{
  var selectedIndex = sel.selectedIndex;
  if (!isInteger(selectedIndex) || selectedIndex < 0) {
    return null;
  }
  var selectedOption = sel.options[selectedIndex];
  return selectedOption.value;
} // EC.getSelection

// sel must be a selection element
// selects the option having the value val
EC.setSelection = function(sel,val)
{
  var opts = sel.options;
  for (var oindex = opts.length-1;oindex >= 0;oindex--) {
    if (opts[oindex].value == val) {
      sel.selectedIndex = oindex;
      return;
    }
  }
  sel.selectedIndex = -1;
} // EC.setSelection

Array.Iterator = function(array,reverse)
{
  this.array = array;
  this.reverse = reverse;
  this.nextIndex = reverse ? array.length-1 : 0;
  this.more = array.length;
}

Array.Iterator.prototype.hasNext = function()
{
  return this.more;
}

Array.Iterator.prototype.next = function()
{
  if (this.more <= 0) {
    throw new Error("Iterator");
  }
  this.more--;
  var nextElem = this.array[this.nextIndex];
  this.nextIndex += this.reverse ? -1 : 1;
  return nextElem;
}

var tick = '\u2714';
var nbsp = '\u00A0';

function addDebug(key,val)
{
  if (!window.debug) {
    window.debug = {};
  }
  window.debug[key] = val;
}

function deleteDebug(key)
{
  if (window.debug) {
    delete window.debug[key];
  }
}

// erase all debugging information
function eraseDebug()
{
  window.debug = 0;
}

function appendToDebug(key,val)
{
  if (!window.debug) {
    window.debug = {};
  }
  window.debug[key] += val;
} // appendToDebug

// make a summary of the value val
// if val is an object, then its attribute-value pairs will be
// enumerated and returned as an object
function valueSummary(val)
{
  if (typeof val != 'object') {
    return val;
  }
  var summary = {};
  // val is an object
  try {
    for (var key in val) {
      summary[key] = '<access denied>';
      try {
        var v = val[key];
        if (typeof v == 'object') {
          summary[key] = v.toString();
        }
        else {
          summary[key] = v;
        }
      }
      catch (err) {
      }
    }
    return summary;
  }
  catch (err) {
    return "<access to the object properties denied>";
  }
} // valueSummary

// true if the element has this class
function hasClass(element,className)
{
  return element.className.split(' ').grep(function (elem) {return elem == className});
} // hasClass

// remove a class from an element
function removeClass(element,className)
{
  "use strict";
  var classes = element.className.split(' ').filter(function (elem) {return elem != className});
  element.className = classes.join(' ');
} // removeClass

// add a class to the element
function addClass(element,className)
{
  "use strict";
  if (element.className == '') {
    element.className = className;
    return;
  }
  if (!hasClass(element,className)) {
    element.className += ' ' + className;
  }
} // addClass

// if the element has this class, remove it, otherwise add it
function toggleClass(element,className)
{
  if (hasClass(element,className)) {
    removeClass(element,className);
  }
  else {
    addClass(element,className);
  }
} // toggleClass

// Check if the session storage is available. 
EC.noSessionStorage = function()
{
  try {
    return !window.sessionStorage;
  }
  catch (err) { // security error
    return true;
  }
} // EC.noSessionStorage

// Save object to the session storage. Return true if successful, false if
// not. The function can fail if the browser does not support session storage,
// or if a security exception is raised (browser bugs)
function saveObject(key,obj)
{
  "use strict";
  try {
    if (EC.noSessionStorage()) {
      return false;
    }
    var value = JSON.stringify(obj);
    try {
      sessionStorage.setItem(key,value);
    }
    catch (err) { // security error, user does not allow to save an item
      return null;
    }
    return true;
  }
  catch (err) {
    logError(err,'saveObject');
    return false;
  }
} // saveObject

// Retrieve object from the session storage. If retrieval fails (see saveObject
// for details), then return null
function getObject(key)
{
  "use strict";
  try {
    if (EC.noSessionStorage()) {
      return null;
    }
    var value;
    try {
      value = sessionStorage.getItem(key);
    }
    catch (err) { // security error, user does not allow to get an item
      return null;
    }
    if (value == null) {
      return null;
    }
    addDebug('getObject',key);
    return JSON.parse(value);
  }
  catch (err) {
    logError(err,'getObject');
    return false;
  }
} // getObject

// Delete a record from the session storage and ignore browser errors. Return
// false if failed.
function deleteObject(key)
{
  "use strict";
  try {
    if (EC.noSessionStorage()) {
      return false;
    }
    sessionStorage.removeItem(key);
    return true;
  }
  catch (err) {
    logError(err,'deleteObject');
    return false;
  }
} // deleteObject

// Introduced since browsers raise an exception when the user suppresses further alerts
// It tries to alert, and if interrupted, uses report() instead
function alert2(alertText)
{
  "use strict";
  try {
    alert(alertText);
  }
  catch (err) {
    report(alertText,5000);
  }
} // alert2

// dealing with location.hash
EC.pageHash = function()
{
  "use strict";
  try {
    var browserHash = location.hash;
    if (!browserHash) {
      return {};
    }
    var match = browserHash.match(/\{(.*)\}/);
    if (!match) {
      return {};
    }
    var content = match[1];
    var all = content.split(',').iterator();
    var result = {};
    while (all.hasNext()) {
      var string = all.next();
      var pair = string.split(':');
      if (pair.length > 1) {
        var param = pair.shift();
        result[param] = pair.join(':');
      }
    }
    return result;
  }
  catch (err) {
    logError(err,'EC.pageHash');
    return false;
  }
} // EC.pageHash

// dealing with location.hash
EC.setPageHash = function(hash)
{
  "use strict";
  try {
    var params = [];
    for (var param in hash) {
      params.push(param+':'+hash[param]);
    }
    var newHash;
    if (params.length == 0) {
      newHash = '#';
    }
    else {
      newHash = '#{' + params.join(',') + '}';
    }
    
    if (window.history && history.replaceState) {
      history.replaceState(undefined,undefined,newHash);
      return;
    }

    // we cannot modify the history
    try { // paranoid browsers may cause security errors
      location.hash = newHash;
    }
    catch (err) {
      return;
    }
  }
  catch (err) {
    logError(err,'EC.setPageHash');
    return false;
  }
} // EC.setPageHash

function supportES6() {
  try {
    new Function("(a = 0) => a");
    return true;
  }
  catch (err) {
    return false;
  }
} // supportES6

EC.fillLoginForm = function()
{
  "use strict";
  var width = screen.width;
  var height = screen.height;
  if (!width || !height) {
    return;
  }
  var widthInput = $('ec:width');
  var heightInput = $('ec:height');
  if (widthInput && heightInput) {
    widthInput.value = width;
    heightInput.value = height;
  }

  var noEs6Input = $('ec:noEs6');
  if (noEs6Input && !supportES6()) {
    noEs6Input.value = 1;
  }
} // fillLoginForm

// find maximum ZIndex of page elements
EC.maxZIndex = function()
{
  try {
    var maxZ = 0;
    if (document.createNodeIterator) {
      var nodeIterator = document.createNodeIterator(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        function(node) {
          return node.style.zIndex ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
        false // 4th argument added since IE has a non-standard createNodeIterator
      );
      var currentNode;
      while (currentNode = nodeIterator.nextNode()) {
        if (currentNode.style.zIndex > maxZ) {
          maxZ = currentNode.style.zIndex;
        }
      }
    }
    else {
      // for old browsers we scroll through all elements
      var nodes = document.getElementsByTagName("*");
      for (var i = nodes.length - 1;i >= 0; i--) {
        var z = nodes[i].style.zIndex;
        if (z && z > maxZ) {
          maxZ = z;
        }
      }
    }
    return maxZ;
  }
  catch (err) {
    logError(err,'EC.maxZIndex');
    return false;
  }
} // EC.maxZindex

EC.countryState = function(countryFieldId, stateFieldId) {
  try {
    const country = $(countryFieldId);
    const state = $(stateFieldId);
    country.addEventListener('change', ev => {
      try {
        state.style.display = ev.target.value === 'us' ? null : 'none';
      } catch (err) {
        logError(err, 'countryState.change');
      }
    });
  } catch (err) {
    logError(err, 'countryState');
  }
}

// this part corresponds to the Jargon module
var $PC_ = 'PC';
var $Program_Committee_ = 'Program Committee';
var $Program_committee_ = 'Program committee';
var $program_committee_ = 'program committee';
var $PC_Member_ = 'PC Member';
var $PC_member_ = 'PC member';
var $pc_member_ = 'PC member';
var $PC_Members_ = 'PC Members';
var $PC_members_ = 'PC members';
var $pc_members_ = 'PC members';
var $Topic_ = 'Topic';
var $Topics_ = 'Topics';
var $topic_ = 'topic';
var $topics_ = 'topics';

/**
 * ECNotification class.
 * @param {ECNotificationData} data - Object with data for showing notification.
 */
function ECNotification(data) {
  try {
    const title = data.title;
    const duration = data.duration;
    let description = data.description || [];
    if (typeof description === 'string') {
      description = [description];
    }
    const theme = data.theme;

    this.element = $_('div', {
      className: 'ec_notification' + (theme ? (' ' + theme) : '')
    }, undefined, document.body);
    $_('div', { className: 'ec_notification_line' }, undefined, this.element);
    $_('div', { className: 'ec_notification_icon' }, undefined, this.element);
    const textDiv
      = $_('div', { className: 'ec_notification_text' }, undefined, this.element);
    $_('div', { className: 'ec_notification_title' }, title, textDiv);
    description.forEach(function (line) {
      $_('div', {}, line, textDiv);
    });
    const closeDiv
      = $_('div', { className: 'ec_notification_close' }, undefined, this.element);

    closeDiv.addEventListener('click', this.remove.bind(this));
    if (duration) {
      this.timeoutId = setTimeout(this.remove.bind(this), duration);
    }
  } catch (err) {
    logError(err, 'ECNotification');
  }
} // Notification

ECNotification.prototype.remove = function() {
  try {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    removeElement(this.element);
    NotificationManager.current = null;
  } catch (err) {
    logError(err, 'ECNotification.remove');
  }
} // ECNotification.remove

/**
 * Notification manager.
 */
var NotificationManager = {
  /**
   * Current notification that is showing right now.
   * @type {ECNotification}
  */
  current: null,

  /**
   * Show notification. It will remove the current one if it is existing.
   * @param {ECNotificationData} data - Notification data
   */
  showNotification: function(data) {
    try {
      if (NotificationManager.current) {
        NotificationManager.current.remove();
      }
      NotificationManager.current = new ECNotification(data);
    } catch (err) {
      logError(err, 'NotificationManager.showNotification');
    }
  }
} // NotificationManager

/**
 * @typedef {'default' | 'info' | 'success' | 'warning' | 'error'} NotificationTheme
 */

/**
 * @typedef {Object} ECNotificationData
 * @property {string} title - Notification title.
 * @property {string | string[]} description - String with description or array
 *    with paragraphs with the notification description.
 * @property {number} [duration] - The duration time in ms when notification
 *    will close. If the duration is 0 or undefined then the notification
 *    will not close by itself.
 * @property {NotificationTheme} [theme='default'] - The theme of
 *    the notification.
 */

/**
 * Show notification.
 * @param {ECNotificationData} data - Object with data.
 */
function showNotification(data) {
  try {
    NotificationManager.showNotification(data);
  } catch (err) {
    logError(err, 'showNotification');
  }
} // showNotification

/**
 * @param {string | undefined} title
 * @param {string | string[] | undefined} description
 */
EC.showNotification = function(title, description) {
  showNotification({ title, description, duration: 4000 });
} // showNotification

/**
 * @param {string | undefined} title
 * @param {string | string[] | undefined} description
 */
EC.showInfo = function(title, description) {
  showNotification({ theme: 'info', title, description, duration: 4000 });
} // showInfo

/**
 * @param {string | undefined} title
 * @param {string | string[] | undefined} description
 */
EC.showSuccess = function(title, description) {
  showNotification({ theme: 'success', title, description, duration: 4000 });
} // showSuccess

/**
 * @param {string | undefined} title
 * @param {string | string[] | undefined} description
 */
EC.showWarning = function(title, description) {
  showNotification({ theme: 'warning', title, description, duration: 5000 });
} // showWarning

/**
 * @param {string | undefined} title
 * @param {string | string[] | undefined} description
 */
EC.showError = function(title, description) {
  showNotification({ theme: 'error', title, description });
} // showError

EC.error408Notification = function() {
  showNotification({
    title: 'Error',
    theme: 'error',
    description: [
      'There has been a networking timeout during data transfer.',
      'Please check your internet connection and try again.'
    ]
  });
} // error408Notification

EC.error500Notification = function() {
  showNotification({
    title: 'Error',
    theme: 'error',
    description: [
      'There has been no response from the server. This can happen for a number of reasons, including slow internet connection and networking errors.',
      'Please check your internet connection and try again.'
    ]
  });
} // error500Notification
