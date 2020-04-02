# libbetter
Yet another collection of JavaScript utility and helper modules for NodeJS and the browser. 

libbetter has no outside dependencies and is lightweight.

libbetter consists of:
 - BetterLog      Logging for browser and terminal. Standalone.
 - BetterEvents   Advanced event emitter. Standalone.
 - BetterUtil
  -- bu-common    General utility functions for objects, arrays, promises etc. Depends on BetterLog.
  -- bu-node      Wrappers around native NodeJS modules. Extends bu-common. Depends on BetterEvents.
  -- bu-browser   Helpers for common browser tasks and element manipulation. Extends bu-common.


