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

const BetterLog=require("./log");
const BetterEvents=require("./events");
const BetterUtil=require("./util/bu-browser.js")({BetterLog,BetterEvents});

module.exports={BetterLog,BetterEvents,BetterUtil};