# libbetter
Yet another collection of JavaScript utility and helper modules for NodeJS and the browser. 

### Aim:
 - no outside dependencies
 - lightweigh

### Contents:<pre>
libbetter consists of 3 sub-modules (which can all be loaded independently):
- <b>BetterLog</b>       Logging for browser and terminal. Standalone.
- <b>BetterEvents</b>    Advanced event emitter. Standalone.
- <b>BetterUtil</b>
   - bu-common.js      General utility functions for objects, arrays, promises etc. Depends on <i>BetterLog</i>.
   - bu-node.js        Wrappers around native NodeJS modules. Extends bu-common. Depends on <i>BetterEvents</i>.
   - bu-browser.js     Helpers for common browser tasks and element manipulation. Extends <i>bu-common</i>.
</pre>


