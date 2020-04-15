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

	const cX=require('./util.common.js')(dep);
	 //After ^ we know v exists
	const BetterEvents = dep.BetterEvents
    const BetterLog = dep.BetterLog

	const sX=require('./node/stream.util.js')({cX});
	const cpX=require('./node/child_process.util.js')({BetterLog,cX,sX});
	const fsX=require('./node/filesystem.util.js')({BetterLog,cpX,cX});
	
	/*
	* Polyfil for external package https://www.npmjs.com/package/pump
	*/
	const pump =dep.pump || require('./node/pump.polyfill.js');
	const httpX=require('./node/http.util.js')({BetterLog,cX,fsX,pump});
	
	const os=require('os');
	const netX=require('./node/network.util.js')({BetterEvents,BetterLog,cX,cpX,fsX,os});

	return {cX,sX,cpX,fsX,httpX,netX,os};
}






