'use strict';
/*
* @module bu-node
* @author plundell
* @license MIT
* @description Helper and utility functions for NodeJS
* @exports A function to be called with an object of dependencies. It returns an object.
*
* This module should only be required in NodeJS. It has requires certain files which only
* make sense as node-helpers, (eg. node native classes)
*
* 2018-12-18: For now we'll name props the way we've named helper files in the past, that way we can just
*			  swap this out for all requires in existing files...
*/


module.exports=function exportBetterUtil(dep){

	const cX=require('./bu-common.js')(dep);
	 //After ^ we know v exists
	const BetterEvents = dep.BetterEvents
    const BetterLog = dep.BetterLog

    //The log created in cX is called BetterUtil, but since it's only a part of the node/backend version
    //of BetterUtil we want to rename it cX
    cX._log.changeName('cX');




    //Some node-version functions moved from cX
    cX.timerStart=function timerStart(){
        return process.hrtime();
    }

    cX.timerStop=function timerStop(start,format){
        var durr=process.hrtime(start)
        	,nano=(durr[0]*1000000000)+durr[1]
        ;
        return cX.formatNano(nano,format);
    }





	const sX=require('./node/stream.util.js')({cX});
	const cpX=require('./node/child_process.util.js')({BetterLog,cX,sX});
	const fsX=require('./node/filesystem.util.js')({BetterLog,cpX,cX});
	
	const netX=require('./node/network.util.js')({BetterEvents,BetterLog,cX,cpX,fsX});

	/*
	* Polyfil for external package https://www.npmjs.com/package/pump
	*/
	const pump =dep.pump || require('./node/pump.polyfill.js');
	const httpX=require('./node/http.util.js')({BetterLog,cX,fsX,pump,netX});
	

	return {cX,sX,cpX,fsX,httpX,netX};
}







