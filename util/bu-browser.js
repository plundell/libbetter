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






    //Some browser-version functions moved from cX
    cX.timerStart=function timerStart(){
        return window.performance.now()
    }

    cX.timerStop=function timerStop(start,format){
        var nano=(window.performance.now()-start)*1000000;
        return cX.formatNano(nano,format);
    }







    const docX=require('./browser/document.util.js')({cX,_log});

	const restX=require('./browser/rest.util.js')({cX,_log});
    const evtX=require('./browser/domevents.util.js')({cX,_log});

	const elemX=require('./browser/elements.util.js')({cX,_log,evtX});
    
	const styleX=require('./browser/styling.util.js')({cX,_log,elemX});
	const mobX=require('./browser/mobile.util.js')({cX,_log,elemX});


    //Combine everything onto the same object
    var bu=Object.assign(cX,elemX,styleX,mobX,restX,evtX,docX);

    //Apply any styles specified in the various modules^
    delete bu._styles;
    Object.entries(Object.assign({},elemX._styles,styleX._styles,mobX._styles,restX._styles,evtX._styles))
        .forEach(([name,styles])=>{
            try{
                _log.debug("Adding style: "+name);
                Object.entries(styles).forEach(([selector,css])=>bu.createCSSRule(selector,css));
            }catch(err){
                // console.warn(bu);
                _log.error("BUGBUG: failed to apply style",name,styles,err);
            }
        })

    //Since this module is exclusivly used in the browser, we also set the exported
    //object on the passed in one, that way if dep==window it will automatically be
    //exposed globally (and if dep is just a temp object then no worries...)
    dep.BetterUtil=bu;

    return bu;

}



