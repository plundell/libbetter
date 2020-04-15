;'use strict';
/**
* @module bu-browser
* @author plundell
* @license MIT
* @description Helper and utility functions for browsers
*
* This script should be bundled for the web with browserify or webpack
*/

module.exports=function exportBetterUtilBrowser(dep){

    //Pass all deps straight on to cX
    const cX=require('./bu-common.js')(dep);

    //Rename the log
    const _log = cX._log;
    _log.changeName('BetterUtil');

	
	const elemX=require('./browser/elements.util.js')({cX,_log});
	const styleX=require('./browser/styling.util.js')({cX,_log,elemX});
	const mobX=require('./browser/mobile.util.js')({cX,_log,elemX});
	const restX=require('./browser/rest.util.js')({cX,_log});
    const evtX=require('./browser/domevents.util.js')({cX,_log,elemX});
	
    //Combine everything onto the same object
    var bu=Object.assign(cX,elemX,styleX,mobX,restX,evtX);

    //Since this module is exclusivly used in the browser, we also set the exported
    //object on the passed in one, that way if dep==window it will automatically be
    //exposed globally (and if dep is just a temp object then no worries...)
    dep.BetterUtil=bu;

    return bu;

}

