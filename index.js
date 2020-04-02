/**
 * @module libbetter
 * @sub-module BetterLog
 * @sub-module BetterEvents
 * @sub-module BetterUtil.bu-node
 *
 * @author x7dude
 * @license MIT
 */
'use strict';

const BetterLog=require("./log");
const BetterEvents=require("./events");
const BetterUtil=require("./util")({BetterLog,BetterEvents});

module.exports={BetterLog,BetterEvents,BetterUtil};