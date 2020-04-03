/**
 * @module libbetter
 * @sub-module BetterLog
 * @sub-module BetterEvents
 * @sub-module BetterUtil.browser
 * @description This file can be built with webpack to create a file that can be loaded directly
 *				by the browser in a <script>. It will make the sub-modules available on window
 *
 * @author plundell
 * @license MIT
 */
'use strict';

window.BetterLog=require("./log");
window.BetterEvents=require("./events");

//This will set .BetterUtil on the window as well
require("./util/bu-browser.js")(window);