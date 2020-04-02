# libbetter
Yet another collection of JavaScript utility and helper modules for NodeJS and the browser. 

### Aim:
libbetter has no outside dependencies and is lightweight.

### Contents:
<pre>libbetter consists of:
 - <b>BetterLog</b>   Logging for browser and terminal. Standalone.
 - **BetterEvents**   Advanced event emitter. Standalone.
 - **BetterUtil**
   - bu-common.js        General utility functions for objects, arrays, promises etc. Depends on BetterLog.
   - bu-node.js          Wrappers around native NodeJS modules. Extends bu-common. Depends on BetterEvents.
   - bu-browser.js       Helpers for common browser tasks and element manipulation. Extends bu-common.
</pre>

