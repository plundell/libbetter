//simpleSourceMap=/my_modules/util/browser/domevents.util.js
//simpleSourceMap2=/lib/util/browser/domevents.util.js
;'use strict';
/*
* @module bu-browser-events
* @author plundell
* @license MIT
* @description Helper functions related to DOM events
*
* This module is required by bu-browser
*/
module.exports=function export_mobX({cX,_log}){

	

	//Methods to export
	var _exports={
		markInputting
		,throttleInput
		,redispatchChildEvents
		,redispatchEvent
	}
		
	/*
	* Monitor 'input' events on <body>, setting .inputting=function and attribute flag 'inputting' on target elem WHILE 
	* these events are firing in rapid succession
	*
	* @param number timeout 	How long to apply the 'inputting' flag after the last 'input' has been fired
	*
	* @return function 			Callback which removes this functionality
	*/
	var unmark;
	function markInputting(timeout=100){
		//If this was previously called, just remove the listener and add it again
		if(unmark){
			_log.note("You were already marking inputs. Removing that and running again. Check that you want"
				+" to be calling it this many times.");
			unmark();
			unmark=null;
		}

		var lastInput
			,callback=function(event){
				let target=event.target;
				//On the 'input' from a new target, just get ready for additional ones. By not setting anything this time we avoid
				//doing anything when eg. a <select> changed once
				if(event.target!=lastInput){
					//Before loosing reference to it, timeout the old input
					if(lastInput && lastInput.inputting){
						lastInput.inputting.expire();
					}
					lastInput=event.target;

					//Now prepare the new input...
					event.target.inputting=cX.betterTimeout(function(){
						event.target.removeAttribute('inputting');
						delete event.target.inputting;
					},timeout)

					//...then set the flag
					event.target.setAttribute('inputting','');
					
				}else if(event.target.inputting){
					//Push the timeout to the future
					event.target.inputting.postpone();
				}
				//If it's already expired then do nothing...
			}
			,options={capture:true, passive:true}; //capture:true so we are the first to run and can effectively intercept the event
		;
		
		//Now add the listener...
		document.body.addEventListener('input',callback,options)

		//...then return another function that can be used once to remove it (additional calls will just be ignored)
		unmark=cX.once(function unmarkInputting(){document.body.removeEventListener('input',callback,options);});
		return unmark;
	}


	/*
	* Throttle an input so it only emits 'input' events so often
	*
	* @param <HTMLElement> elem
	* @param number delay 			How often to emit 'input' at most
	*
	* @return function 				A function to remove the throttle
	*/
	function throttleInput(elem,delay=100){
		cX.checkType(['node','number'],arguments);
		
		var timeout=cX.betterTimeout(delay,elem,elem.dispatchEvent);
		
		function throttledInput(event){
			if(!event.throttled){
				event.stopImmediatePropagation();
				event.throttled=true;
				timeout.throttle(event);
			}
		}
		
		let options={capture:true};
		elem.addEventListener('input',throttledInput,options)

		return function unthrottleInput(){elem.removeEventListener('input',throttledInput,options)};
	}


	/*
	* Handler function that will re-dispatch an event from the element its set on (ie. whatever 'this' is set to)
	* @param <event> event
	* @return void
	*/
	function redispatchEvent(event){
		if(event.target!=this){
			event.stopImmediatePropagation();
			setTimeout(()=>this.dispatchEvent(evt))
			 //^a timeout is required, else "DOMException: The event is already being dispatched.""
		}
	}

	/*
	* Intercept events on a $target coming from its child elements and dispatch them from the $target itself, ie. changing 'this'
	* in the event
	*
	* @param <HTMLElement> target 	The element to intercept at and re-dispatch from
	* @params string ...events 		Names of the events to intercept
	*
	* @return <HTMLElement> $target
	*/
	function redispatchChildEvents(target,...events){
		events.forEach(evt=>{
			target.addEventListener(evt,redispatchEvent,{capture:true})
		})
		return target;
	}





	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=