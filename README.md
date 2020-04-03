# libbetter
Yet another collection of JavaScript utility and helper modules for NodeJS and the browser. 

### Aim:
 - no outside dependencies (NOTE: a few small packages were polyfilled in BetterUtil)
 - lightweight

### Contents:
<pre>
- <b>log</b>       (sub-module, standalone) Logging for browser and terminal.
- <b>events</b>    (sub-module, standalone) Advanced event emitter.
- <b>util</b>
   - bu-common.js      General utility functions for objects, arrays, promises etc. Depends on <i>BetterLog</i>.
   - bu-node.js        Wrappers around native NodeJS modules. Extends bu-common. Depends on <i>BetterEvents</i>.
   - bu-browser.js     Helpers for common browser tasks and element manipulation. Extends <i>bu-common</i>.
</pre>


