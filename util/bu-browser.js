;'use strict';
/**
* @module bu-browser
* @author plundell
* @license MIT
* @description Helper and utility functions for browsers
* @depends BetterLog
* @depends BetterEvent
*
* This script should be bundled for the web with browserify or webpack
*/

module.exports=function exportBetterUtilBrowser(dep){

    //Pass all deps straight on to cX
    const bu=require('./bu-common.js')(dep);

    //Unlike on node, here we combine all files onto a single object, so we can pass that object
    //as the single dependency to all of them. The only order we need to worry about is creating
    //the styles AFTER styling.util.js has loaded
    var styles={};
    function handle(name,x){
        if(x._styles)
            styles[name]=x._styles;
        Object.assign(bu,x);
    }

    handle('document',require('./browser/document.util.js')(bu));
	handle('rest',require('./browser/rest.util.js')(bu));
    handle('domevents',require('./browser/domevents.util.js')(bu));
	handle('elements',require('./browser/elements.util.js')(bu));
	handle('styling',require('./browser/styling.util.js')(bu));
	handle('mobile',require('./browser/mobile.util.js')(bu));

  


    //Apply any styles specified in the various modules^ (this runs in the browser)
    delete bu._styles;
    Object.entries(styles).forEach(([name,styles])=>{
        try{
            bu._log.debug("Adding style: "+name);
            Object.entries(styles).forEach(([selector,css])=>bu.createCSSRule(selector,css));
        }catch(err){
            // console.warn(bu);
            bu._log.error(`BUGBUG: failed to apply styles from ${name}.util.js:`,styles,err);
        }
    })


    return bu;

}




