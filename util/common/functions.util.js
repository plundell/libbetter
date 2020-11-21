//simpleSourceMap=/my_modules/util/common/functions.util.js
//simpleSourceMap2=/lib/util/common/functions.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module exports an selfect with functions on it. If a global object is passed in, the 'util' 
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
		,runInSequence

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
	* @return $fn
	*/
	function renameFunction(fn,name){
		var args=Array.from(arguments);
		fn=aX.getFirstOfTypeOrThrow(args,'function');
		name=aX.getFirstOfTypeOrThrow(args,'string');
		Object.defineProperty(fn,'name',{value:name,writable:false, configurable:true})
		return fn;
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

	
// backend
// 	koa 
// 	graph ql
// 	typescript

// frontend
// 	react
// 	t3




	/*
	* Create an object which allows timeouts to be set, cleared, postponed etc.
	*
	* @param function  callback    
	* @param number    delay       
	*
	* @return object 	An object with methods that allow for manipulation of timeouts
	* 	@prop function  callback 	The passed in $callback
	* 	@prop number    delay 	    The current delay (getter+setter)	
	*   @prop any       result 	    Results from last run of $callback
	*   @prop object    count       Number of successfull runs, fails and ignored calls
	*   @prop arguments args        The args that will passed to callback on expiration
	* 	@method timeLeft            How long until the timer expires	
	* 	@method trigger(...args)	call $callback after a timeout, ignoring repeated calls during wait
	*   @method buffer(...args)     will add ...args to a buffer which will be passed to callback after timeout
	* 	@method block(...args)		call $callback first, then ignore repeated calls during wait
	*	@method clear()				clear any pending timeout (regardless if .timeout() or .block() set it)
	*   @method debounce(...args) 	Shorthand for clear().trigger(), ie. delays execution (similar to .postpone except nothing needs to be pending)
	* 	@method throttle(...args) 	Like block(), but the last missed call is run after the timeout
	* 	@method postpone			If a timeout exists, change it's expiration, else do nothing
	* 	@method expire 				If a timeout exists, clear it + run $callback now, else do nothing
	*
	*/
	function betterTimeout(){

		var log=aX.getFirstOfType(arguments,'<BetterLog>')||_log;
		var delay=aX.getFirstOfType(arguments,'number')||log.throwType('number',undefined);
		var callback=aX.getFirstOfType(arguments,'function')||log.throwType('function',undefined);

		//Define private props
		var timerId, started, result, callAs, args, runs=0, ignored=0, fails=0,onError;
		
		//Allow it to work with or without 'new'
		var self=this instanceof betterTimeout ? this : {};

		Object.defineProperties(self,{
			callback:{enumerable:true,set:(cb)=>{if(typeof cb=='function')callback=cb},get:()=>callback}
			,delay:{enumerable:true,get:()=>delay, set:(val)=>{if(typeof val=='number')delay=val}}
			,result:{get:()=>result}
			,count:{get:()=>{return {runs,fails,ignored};}}
			,onError:{enumerable:true,set:(cb)=>{if(typeof cb=='function')onError=cb},get:()=>onError}
		})
		self.clear=clear;
		self.trigger=self.runLater=trigger;//alias
		self.buffer=buffer;
		self.runFirstOnly=self.block=block; //alias
		self.runLastOnly=self.debounce=debounce; //alias
		self.runFirstAndLast=self.throttle=throttle; //alias
		self.postpone=self.postpone;
		self.expire=self.expire;


		/*
		* Call $callback now, store results, delete stored args. 
		*
		* @opt object 				overrideCallAs
		* @opt array|<arguments> 	overrideArgs
		*
		* @return <self>
		* @private
		*/
		function execute(overrideCallAs,overrideArgs){		
			try{
				callAs=overrideCallAs||callAs;
				args=overrideArgs||args;
				result=callback.apply(callAs,args);
				runs++;
			}catch(err){
				if(onError)
					onError(err);
				else
					_log.makeError(err,{callAs,args}).addHandling("Error in betterTimeout callback").exec();
				result=undefined;
				fails++;
			}
			args=undefined;
			return self;
		}

		/*
		* Set the timeout and when it started
		* @param function cb    
		* @return void
		*/
		function timeout(cb){
			timerId=setTimeout(()=>{
				timerId=undefined;
				started=undefined;
				cb();
			},delay);
			started=Date.now();
		}
		/*
		* Remove the timeout and clear the id and start time
		*/
		function timein(){
			clearTimeout(timerId);
			timerId=undefined;
			started=undefined;
		}

		/*
		* @return number  How long until the timer ends
		*/
		self.timeLeft=function(){
			if(started){
				return (started+delay)-Date.now();
			}
			return 0;
		}

		/*
		* Prevent any pending timeout and remove any stored args
		*
		* @return boolean 	True if there was a timer running, else false
		* @public
		*/
		function clear(){
			if(timerId){
				timein()
				if(args){
					ignored++; //since it was going to run, this turned into an ignored instance
					args=undefined;
				}
				return true;
			}
			return false;
		}


		/*
		* Trigger a timeout with the callback at the end, ignoring new calls during that time
		*
		* @return boolean 	True if this call triggered the callback, false if it will be ignored
		* @public
		*/
		function trigger(){
			//Only run if no other timer is currently running
			if(!timerId){
				//Store...
				args=arguments;
				callAs=this;
				
				//Set delay
				timeout(execute);

				return true;
			}else{
				ignored++;
				return false;
			}
		}


		/*
		* All calls get stored until end when callback is called with array
		*
		* @return number   The number of items in the buffer
		* @public
		*/
		function buffer(){
			//Make sure we have an array which holds all args until the timer times out
			if(!args){
				if(timerId){
					log.warn("A blocking timeout existed when buffer() was called, clearing it now");
					clear();
				} 
				args=[arguments];
			}else if(!Array.isArray(args)) 
				//Implies we're already waiting for execution which wasn't called with .buffer()... no matter, it is now
				args=[arguments,args];
			else
				args.unshift(arguments);
			
			//If not already triggered... trigger
			if(!timerId){
				callAs=this;
				timeout(execute);
			}
			
			return args.length;
		}

		/*
		* Only first call runs
		*
		* @return boolean 	True if this call triggered the callback, false if it will be ignored
		* @public
		*/
		function block(){
			if(!timerId){
				//Set a blocking timeout then execute right away
				timeout(clear)
				execute(this,arguments);
				return true;
			}else{
				ignored++;
				return false;
			}
		}
	
		/*
		* Only last call runs
		*
		* @return boolean 	True if it replaced something, else false.
		*/
		function debounce(){
			var cleared=clear(); //if we actually cleared anything it will be counted as ignored
			trigger.apply(this,arguments);
			return cleared;
		}

		/*
		* First and last calls run
		*
		* @return void
		*/
		function throttle(){
			if(!timerId){
				//Set a timeout that checks if args have been stored while it's been running
				timeout(()=>{
					if(args){
						ignored--; //we counted it as ignored vv, but it's no longer ignored
						execute();
					}
				});

				//Also execute right now
				execute(this,arguments);
				  //^this also undefines 'args'
			}else{
				ignored++; //count all as ignored until ^ runs and takes it back

				//Store all missed calls so they get run by ^
				callAs=this;
				args=arguments
			}

			return;
		}

		/*
		* Move current timeout into the future. This works for any method
		*
		* @return boolean 	True if a timeout existed and was moved, else false
		*/
		function postpone(){
			//If a timer was running...
			if(timerId){
				//...remove it...
				timein();
				
				//...and set a new one that does what the existing one was doing
				if(args)
					trigger.apply(callAs,args);
				else
					timeout(clear);

				return true;
			}
			return false;
		}
	

		/*
		* Run pending call now. This works after any method
		* 
		* @return string|boolean 	'executed' or 'cleared' if a timeout existed, else false
		*/
		function expire(){
			//If a timer is running...
			if(timerId){
				//...remove it...
				timein();

				//...and if an execution was pending run it now
				if(args){
					execute();
					return 'executed';
				}

				return 'cleared';
			}
			return false;
		}
		

		return self;
	}




	/*
	* Limit the number of times a callback can be called within a period, either ignoring or calling a 
	* different callback after the timeout
	*
	* NOTE: The period window is "moving", eg: (foo,2,1000,bar) then call at times:
	* 	t=0   --> foo()
	*   t=800 --> foo()  with this call we reach the limit...
	*   t=900 --> bar()  ...which is why this runs
	*   t=1100--> foo()  we are again under the limit
	*   t=1200--> bar()  here we are again over the limit since >=2 have run in the last 1000, @ 800 && 1100...
	*   t=1801--> foo()  ...not until now are we free to run another foo
	*
	*
	* @param function callback 			
	* @param number   callsPerPeriod 	Default 1 time/period. 
	* @param number   periodLength 		Default 1 second
	* @opt function   onRateLimit 		Secondary callback which gets called when rate limit is reached
	*
	* @return function 		A proxy function with the limit in place
	*/
	function rateLimit(callback,callsPerPeriod=1,periodLength=1000, onRateLimit=null){
		vX.checkTypes(['function','number','number',['function','undefined']]
			,[callback,callsPerPeriod,periodLength,onRateLimit]);
		
		var counter=0;

		function rateLimitedCallback(){
		    if(counter>=callsPerSecond){
		    	//These calls are usually ignored, unless we want a secondary callback to eg. altert something...
		    	if(onRateLimit)
		    		onRateLimit.apply(this,arguments);
		    }else{
		    	//First increment the counter and set a timeout to de-increment it (since the callback may
		    	//run for a long time we do this first)...
		        counter++
		        setTimeout(()=>counter--,periodLength);

		        //...then run the callback
		        callback.apply(this,arguments);
		    }

		}

		if(callback.name)
			renameFunction(rateLimitedCallback,callback.name+'_ratelimit');

		return rateLimitedCallback;
	}



	/*
	* Run functions in seqence, passing the return from one to the next like a promise chain. If any return promises
	* then this whole function will return a promise, else it will return the value returned by the last function
	*
	* NOTE: Any error thrown will in a func will prevent any other funcs from running
	*
	* @param array funcs
	*
	* @return any|Promise
	*/
	function runInSequence(funcs){
		vX.checkTypedArray(funcs,'function');
		var result;
		for(let func of funcs){
			if(vX.varType(result)=='promise')
				result=result.then(func); //the first time this happens $result will turn into, and remain, a promise
			else
				result=func(result);
		}
		return result;
	}


	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=