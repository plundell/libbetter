/**
 * @module libbetter
 * @sub-module BetterLog
 * @sub-module BetterEvents
 * @sub-module BetterUtil.bu-node
 * @description This file should be required for backend use 
 *
 * @author plundell
 * @license MIT
 */
'use strict';

const BetterLog=require("./log");
BetterLog._env='terminal';

const BetterEvents=require("./events");
Object.defineProperty(BetterEvents.prototype,'_defaultEmitErrorHandler',{value:BetterLog._syslog.error});

const BetterUtil=require("./util/bu-node")({BetterLog,BetterEvents}); //this gets the node-version of utils

module.exports={BetterLog,BetterEvents,BetterUtil};