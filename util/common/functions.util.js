//simpleSourceMap=/my_modules/util/common/functions.util.js
//simpleSourceMap2=/lib/util/common/functions.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module exports an object with functions on it. If a global object is passed in, the 'util' 
* property on it will be amended with the ones in this file.
*
* @param object globalObj 		Either window if in broswer (see bottom), or 'this', ie whatever scope
* 								this script is executed in
*/
'use strict';
module.exports=function export_fX({_log,vX,aX}){

	//Methods to export
	var _exports={
		prettyArgs
		,getArgNames
		,callWithNamedArgs	
		,once	
		,renameFunction
		,betterTimeout

	};





	/*
		This function can be called from within another function and returns
		an object where the parameters and their values are the calling functions
		argument names and the values passed in to them

		@liveArgs*: the 'arguments' array from the calling function

		@throws Error If calling function is native or bound
		@return: An object {callerArg1:passedInValue1, callerArg2:passedInValue2 ...}
	*/
	function prettyArgs(liveArgs){
		retObj = Object()
		var argArray = JSON.parse(JSON.stringify(liveArgs)) // hardcopy
		if(argNames = getArgNames(arguments.callee.caller)){
			for(i in argArray){
				retObj[argNames[i]]=argArray[i]
			}
		} 

		return retObj
	}


	/*
	* This function gets the names of a given functions arguments
	*
	* @param function f
	* @param bool showDefaults 	If truthy, default values will show up
	*
	* @throws Error 	If function was bound or native
	* @return array 	An array of strings (or empty array)
	*/
	function getArgNames(f,showDefaults=false) {
		try{
			var fnStr = f.toString();
			if(fnStr=='function () { [native code] }'){
				if(!f.length)
					return [];
				throw 'Because passed function was native or bound.';
			}
			
			//Grab everything between the first parenthesis
			fnStr=fnStr.slice(fnStr.indexOf('(')+1,fnStr.indexOf(')'));
		  	if(fnStr){
		  		var arr=fnStr.split(',').map(arg=>arg.trim());
		  		if(showDefaults)
		  			return arr;
		  		else
		  			return arr.map(arg=>arg.replace(/(.+)=.+/,'$1').trim()) //remove possible default value and whitespace
		  	}else{
		  		return [];
		  	}
	  	} catch(err){
	  		_log.makeError(err).prepend('Could not get argument names.').throw();
	  	}
	}


	/*
	* Call a func given an object of named args
	*
	* @param function func 		The function to call
	* @param object args 		An object with keys matching the names of the functions args
	* @param @opt object self 	Call the function as
	*
	* @throw TypeError 			If the args expected by this function are wrong
	* @throw any 				Whatever the function you're calling may throw
	* @return any 				Returns whatever the function returns
	*/
	function callWithNamedArgs(func, args, self){
		vX.checkTypes(['function','object',['object','undefined']],[func,args,self]);	
		return func.apply(self,getArgNames(func).map(key=>args[key]));
	}


	/*
	* Change the name of a function. 
	*
	* @param function fn
	* @param string name
	*
	* @return void
	*/
	function renameFunction(fn,name){
		var args=Array.from(arguments);
		fn=aX.getFirstOfTypeOrThrow(args,'function');
		name=aX.getFirstOfTypeOrThrow(args,'string');
		Object.defineProperty(fn,'name',{value:name,writable:false, configurable:true})
	}



	/*
	* Wrap a $callback in another function that prevents the original being called more than once
	*
	* @param function callback
	* @opt function onDupCall 	An error-first callback for subsequent calls to @return. It can choose to return
	*							 or log or throw. If omitted, the initial return value will be returned, or the initial
	*							 error will be thrown again
	* @throw <ble TypeError>
	* @return function 		A new function. Subsequent calls to it will return/throw same as the first call unless $onDupCall
	*/
	function once(callback,onDupCall){
		vX.checkTypes(['function',['function','undefined']],arguments);

		function onceCallback(...args){
			//We're going to store the result on a hidden prop on the returned func so it
			//can be used to check if the function has been called or not...

			//...so start by checking if such a prop exists, else call $callback now!
			if(!onceCallback.hasOwnProperty('_once')){
				try{
					var value=callback(...args);
				}catch(err){
					var error=err;
				}
				Object.defineProperty(onceCallback,'_once',{configurable:true,value:[error,value]})
			
			//If this is a second call, and $onDupCall was passed...
			}else if(onDupCall){
				///...call it now with [error,value,[newArgs]]
				return onDupCall(...onceCallback._once,args);
			}else{
				var [error,value]=onceCallback._once;
			}

			//If we're still running, this is either the first call or subsequent calls aren't a problem
			//and only return the same as the first
			if(error)
				throw error;
			else
				return value;
		}

		if(callback.name)
			renameFunction(onceCallback,callback.name+'_once');

		return onceCallback;
	}



	/*
	* @return object 	An object with methods that allow for manipulation of timeouts
	* 	@prop function callback 	The passed in $callback (using getter, cannot be changed)
	* 	@prop number delay 			The current delay (getter+setter)	
	*	@method execute(this,args) 	Apply the callback immediately. If nothing is passed to it, run possible waiting action
	* 	@method trigger(...args)	$callback after a timeout, ignoring repeated calls during wait
	* 	@method block(...args)		$callback first, then ignore repeated calls during wait
	*	@method clear()				clear any pending timeout (regardless if .timeout() or .block() set it)
	*   @method debounce(...args) 	Clear pending timeout if it exists, start a new one regardless
	* 	@method throttle(...args) 	Like block(), but the last missed call is run after the timeout
	* 	@method postpone			If a timeout exists, change it's expiration, else do nothing
	* 	@method expire 				If a timeout exists, clear it + run $callback, else do nothing
	*
	*/
	function betterTimeout(...args){
		var delay=aX.getFirstOfType(args,'number');
		var callback=aX.getFirstOfType(args,'function');
		var callAsOverride=aX.getFirstOfType(args,'object');

		vX.checkTypes(['function','number'],[callback,delay]);

		//Define private props
		var timerId, result, after;
		
		var obj={};
		Object.defineProperties(obj,{
			callback:{get:()=>callback}
			,delay:{get:()=>delay, set:(val)=>{if(typeof val=='number')delay=val}}
			,result:{get:()=>result}
			,ignored:{get:()=>timerId?after:undefined}
		})


		/*
		* Call $callback and store the results. 
		*
		* NOTE: if args aren't passed in here AND no calls to .timeout() or .block() have been ignored
		*		then this function will do nothing
		*
		* @opt object callAs
		* @opt array args
		*
		* @return <obj>
		*/
		obj.execute=function execute(callAs,args){
			if(!args){
				if(!after)
					return;
				args=after[1];
				callAs=after[0];
			}
			result=callback.apply(callAsOverride||callAs,args);
			after=undefined;
			return obj;
		}


		/*
		* Prevent any upcomming calls 
		*/
		obj.clear=function clear(){
			if(timerId){
				clearTimeout(timerId);
				timerId=undefined;
			}
			return obj;
		}


		/*
		* Trigger a timeout with the callback at the end, ignoring new calls during that time
		*/
		obj.trigger=function trigger(){
			if(!timerId){
				//Store in .after so .expire and .delay can alter the timeout but use the same args
				after=[this,arguments];
				
				timerId=setTimeout(()=>{
					clear().execute(this,arguments);
				}, delay);
			}
			return obj;
		}


		/*
		* Invert the workflow, ie. call first then block during a timeout. 
		*/
		obj.block=function block(){
			if(!timerId){
				//Set a blocking timeout...
				timerId=setTimeout(clear,delay)

				//...then execute
				execute(this,arguments);
			}
			return obj;
		}
	
		/*
		* Discard any existing timeouts, then trigger a new one
		*/
		obj.debounce=function debounce(){
			return clear().trigger.apply(this,arguments);
		}

		/*
		* Same as .block but the last call during the timeout is run directly after. This is good when throttleing inputs
		* so the last/freshest data is received
		*/
		obj.throttle=function throttle(){
			if(!timerId){
				//Set a blocking timeout, but at the end of it we check if anything has been set on .after
				//in which case the callback get's run again...
				timerId=setTimeout(()=>{
					timerId=undefined;
					execute()
				},delay);

				//...but first we run it right away
				apply(this,arguments);
				  //^this also undefines .after
			}else{

				//Store missed calls in .after so the last one can be used by apply() when the timer expires ^
				after=[this,arguments];
			}
			return obj;
		}





		/*
		* Move a current timeout further into the future. This works for any method
		*/
		obj.postpone=function postpone(){
			if(timerId){
				clear();
				if(after){
					//regardless which method set $after, now we want to execute it after a delay
					trigger.apply(after[0],after[1]);
				}
			};
			return obj;
		}
	

		/*
		* Expire a timeout now and run $callback if .after is set. This works after any method
		*/
		obj.expire=function expire(){
			if(timerId){
				clear().execute();
			}
			return obj;
		}
		
	}





	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=