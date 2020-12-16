# libbetter
Yet another collection of JavaScript utility and helper modules for NodeJS and the browser. 

### Aim:
 - no outside dependencies (NOTE: a few small packages were polyfilled in <i>util</i>)
 - lightweight

### Contents:
<pre>
- <b>log</b>       Logging for browser and terminal. (Exists as standalone module too: evenbetterlog)
- <b>events</b>    Advanced event emitter. (Exists as standalone module too: evenbetterevents)
- <b>util</b>
   - bu-common.js      General utility functions for objects, arrays, promises etc. Depends on <i>BetterLog</i>.
   - bu-node.js        Wrappers around native NodeJS modules. Extends bu-common. Depends on <i>BetterEvents</i>.
   - bu-browser.js     Helpers for common browser tasks and element manipulation. Extends <i>bu-common</i>.
</pre>


