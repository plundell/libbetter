/**
 * @module libbetter
 * @sub-module BetterLog
 * @sub-module BetterEvents
 * @sub-module BetterUtil.browser
 * @description This file should be included by another file when you don't want to expose
 *              the sub-modules on the global window
 *
 * @author plundell
 * @license MIT
 */
'use strict';

import BetterLog from "./log";
BetterLog._env='browser';

import BetterEvents from "./events";
Object.defineProperty(BetterEvents.prototype,'_defaultEmitErrorHandler',{value:BetterLog._syslog.error});

import bu_exporter from "./util/bu-browser.js"; //browser version of utils...
const BetterUtil=bu_exporter({BetterLog,BetterEvents}); 

export default {BetterLog,BetterEvents,BetterUtil};