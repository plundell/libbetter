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
const BetterUtil=require("./util")({BetterLog,BetterEvents}); //this gets the node-version of utils

module.exports={BetterLog,BetterEvents,BetterUtil};