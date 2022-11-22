/**
 * @module libbetter
 * @sub-module BetterLog
 * @sub-module BetterEvents
 * @sub-module BetterUtil.browser
 * @description This file can be built with webpack to create a file that can be loaded directly
 *              by the browser in a <script>. It will make the sub-modules available on window
 *
 * @author plundell
 * @license MIT
 */
;'use strict';
(function libbetter(){
    if(typeof window == 'undefined')
        throw new Error(`This script should be built for the browser by running eg. 'npx webpack ${__filename}'`);

    const msg=" already defined on window, not replacing with version from this file.";

    if(window.BetterLog){
        console.warn("BetterLog"+msg)
    }else{
        require("./log"); //This will set window.BetterLog
        window.BetterLog._env='browser';
    }

    if(window.BetterEvents){
        console.warn("BetterEvents"+msg);
    }else{
        require("./events");//This will set window.BetterEvents
    }

    if(window.BetterUtil){
        console.warn("BetterUtil")
    }else{
        window.BetterUtil=require("./util/bu-browser.js")(window);//window now contains the dependencies BetterLog and BetterEvents, 
    }
})()