// var fsX=require('./filesystem.util.js');
var {BetterUtil:bu,BetterLog}=require('../../export-node.js');
BetterLog.defaultOptions={autoPrintLvl:1};
const log=new BetterLog('TEST');
log.trace("Starting test of fsX...");
let files=bu.fsX.ls('/home/buck/Documents/Software/Q/client/src/scripts/*.js',true);
console.log(files);