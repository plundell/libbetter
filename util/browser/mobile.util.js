//simpleSourceMap=/my_modules/util/browser/mobile.util.js
//simpleSourceMap2=/lib/util/browser/mobile.util.js
/*
* @module bu-browser-styling
* @author plundell
* @license MIT
* @description Helper functions related to mobile devices, like touch etc
*
* This module is required by bu-browser
*/
;'use strict';
module.exports=function export_mobX(bu){

	

	//Methods to export
	var _exports={
		'detectSwipe':detectSwipe
		,'getZoom':getZoom
	}
		

	/*
	 2020-03-16: 
	 There is something called 'passive events', supported by some browsers, not others. In supported 
	 browsers addEventListener()'s 3rd arg is an options object, while in the rest it is just checked for
	 truthy to determine if the event should bubble or not. Therefore we need to know if the current 
	 browser supports it so we can act accordingly when eg detecting swipes.
		 https://developers.google.com/web/tools/lighthouse/audits/passive-event-listeners
		 https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection
		 https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
	*/
	// Test via a getter in the options object to see if the passive property is accessed
	var supportsPassive = false;
	try {
		var opts = Object.defineProperty({}, 'passive', {
			get: function() {
				supportsPassive = true;
			}
		});
		window.addEventListener("testPassive", null, opts);
		window.removeEventListener("testPassive", null, opts);
	} catch (e) {}




	/* 
	* Call a func on left/right/up/down swipes
	* Based on this answer by 'Ulysse BN': 
	* 	https://stackoverflow.com/questions/15084675/how-to-implement-swipe-gestures-for-mobile-devices/58719294#58719294
	*
	* NOTE: params can be passed in any order
	*
	* @opt string|node elem 	@see getLiveElement(). Defaults to the window element
	* @param function cb 		Function called on swipe with single string 'up','down','right' or 'left'
	* @param number deltaMin 	Swipe distance required to trigger. Near 0 it will almost always trigger, with a big value 
	*							it can never trigger.
	* @param bool preventScroll Default false.
	*/
	function detectSwipe(...args) {
		//First get the args
		var cb=bu.getFirstOfType(args,'function')||bu._log.makeError('No callback function given').setCode('EINVAL').throw();
		var elem=bu.getLiveElement(bu.getFirstOfType(args,'node')||bu.getFirstOfType(args,'string')||window); //should not throw...
		var deltaMin=bu.getFirstOfType(args,'number')||90;
		var preventScroll=bu.getFirstOfType(args,'boolean')||false;


		//2020-03-16: See above
		var passiveOrBubble=(supportsPassive ? {passive:true,capture:false} : false);
		
		//Define vars that will store where touches start and end
		var startX=0,startY=0,endX=0,endY=0;

		//Now listen for the start and end events...

		elem.addEventListener('touchstart', function ontouchstart(e) {
			//Set start AND end positions to the same thing... so if we don't move at all it won't look like we have...
			endX=startX=e.touches[0].screenX
			endY=startY=e.touches[0].screenY
			// console.log('start','x:',startX,'y:',startY)

			//If we're preventing scroll, we only have to call preventDefault() once on the first move event
			if(preventScroll){
				//'once' listener that works in all situations
				var preventScroll=function(e){e.preventDefault();elem.removeEventListener('touchmove',preventScroll)}
				elem.addEventListener('touchmove',preventScroll)
			}
		}, passiveOrBubble)


		elem.addEventListener('touchend', function ontouchend(e) {
			//Now record the end positions
			endX = e.changedTouches[0].screenX
			endY = e.changedTouches[0].screenY
				//unlike touchstart, here 'touches' is an empty array...

			//Get the traveled distance along each axis and determine what to call the callback with (if the swipe is 
			//diaganol it may very well be called twice)
			let deltaX=endX-startX, deltaY=endY-startY;
			// console.log('end','x:',endX,'y:',endY)

			var swipe=false;
			if(Math.abs(deltaX)>deltaMin){
				swipe=true;
				let d= deltaX > 0 ? 'right' : 'left';
				bu._log.debug("detected swipe "+d,{deltaX,deltaMin});
				cb(d);
			}

			if(Math.abs(deltaY)>deltaMin){
				swipe=true;
				let d= deltaY > 0 ? 'up' : 'down';
				bu._log.debug("detected swipe "+d,{deltaY,deltaMin});
				cb(d);
			}

			//If no swipe happened, but we DID move our finger... just say so...
			if(!swipe && (deltaY || deltaX)){
				bu._log.trace("no swipe, too short...",{deltaX,deltaY,deltaMin});
			}
		}, passiveOrBubble)
	}


	/*
	* Get the current zoom level 
	*
	* @return number  Decimal number of zoom, 1 == 100%
	*/
	function getZoom(){
			return document.documentElement.clientWidth/window.innerWidth
	}


	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=