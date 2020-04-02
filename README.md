# libbetter
Yet another collection of JavaScript utility and helper modules for NodeJS and the browser. 

### Aim:
libbetter has no outside dependencies and is lightweight.

### Contents:
libbetter consists of:
 - **BetterLog**<pre>       Logging for browser and terminal. Standalone.</pre>
 - **BetterEvents**<pre>    Advanced event emitter. Standalone.</pre>
 - **BetterUtil**
   - bu-common.js<pre>      General utility functions for objects, arrays, promises etc. Depends on BetterLog.</pre>
   - bu-node.js<pre>        Wrappers around native NodeJS modules. Extends bu-common. Depends on BetterEvents.</pre>
   - bu-browser.js<pre>     Helpers for common browser tasks and element manipulation. Extends bu-common.</pre>


