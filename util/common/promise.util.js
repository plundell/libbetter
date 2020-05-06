//simpleSourceMap=/my_modules/util/common/promise.util.js
//simpleSourceMap2=/lib/util/common/promise.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module contains helper/util functions related to PROMISES
*/
'use strict'; 

module.exports=function export_pX({_log,vX}){


	//Export
	var _exports={
		'sleep':sleep
		,'toPromise':toPromise
		,'applyPromise':applyPromise
		,'createPromiseFunc':createPromiseFunc
		,'awaitAllPromises':awaitAllPromises
		,'firstResolved':firstResolved
		,'InspectablePromise':InspectablePromise
		,'promiseTimeout':promiseTimeout
		,'rejectTimeout':rejectTimeout
		,'exposedPromise':exposedPromise
		,'groupPromises':groupPromises
		,'thenCallback':thenCallback
		,'promiseAlways':promiseAlways
		,promisifyCallback
	}


	/*
	* Simulate sleeping by creating a promise that resolves x ms later
	*
	* NOTE: This function should be called with the 'await' prefix from within an 'async' function
	* 
	* @param integer ms 	The number of milliseconds to sleep
	* @param bool 	 log 	If true, a message will be logged to the console before and after sleeping
	*
	* @return Promise  		
	*/
	function sleep(ms,returnValue=undefined,log=null){
		if(log && log instanceof _log)
			log.debug("Going to sleep for "+ms+" ms...");

	    return new Promise(resolve=>{
	        setTimeout(()=>{
	        	if(log && log instanceof _log)
	        		log.debug('...waking up');
	        	
	        	resolve(returnValue);
	        },ms)
	    })
	}


	/*
	* Turn smth into a promise. 
	*
	* @param function|<Promise>|any x 	NOTE: if function, it will be called
	*
	* @return <Promise> 	Depending on what's passed in, this will return:
	*		<Promise> --> same promsie
	*		function --> executes function inside a promise, then returns the promise
	* 		any --> same variable, wrapped in resolved promise
	*/
	function toPromise(x){
		if(x instanceof Promise)
			return x
		else if(typeof x =='function')
			return applyPromise(x)
		else
			return Promise.resolve(x);
	}


	/*
	* Call a function and return a promise that resolves/rejects with result
	*/
	function applyPromise(func,callAs,args){
		try{
			vX.checkType('function',func);
			
			if(vX.varType(args)!='array')
				args=[args];

			if(vX.varType(callAs)!='object')
				callAs=this;

			return new Promise(async function _applyPromise(resolve,reject){
				try{
					var data=await func.apply(callAs,args);
					resolve(data);
				}catch(err){
					reject(err);
				}
			});
		}catch(err){
			return _log.reject('Failed to wrap function in promise.',err);
		}
	}

	/*
	* Wrap a function in another function that ensures the returned value
	* will be a Promise.
	*
	* NOTE: this does NOT call the function, only wraps it for future calls
	*
	* @param function func
	* @param object callAs
	*
	* @return function
	*/
	function createPromiseFunc(func,callAs){
		vX.checkType('function',func);
		return (function(...args){
			try{
				Promise.resolve(func.apply(callAs||this||null,args))
			}catch(err){
				return Promise.reject(err);
			}
		})
	}






	/*
	* Wait for all promises to finish (not like Promise.all that rejects on the first reject)
	*
	* @param array promises 	An array of Promise objects
	* @param array options 		Optional. Array of string option flags. Available are:
	*		'flatten' 		- Un-nest recursive/nested calls to this function
	*		'alwaysResolve' - Even if some @promises reject, resolve with retObj (object)
	*		'onlyResolved' 	- Even if some @promises reject, resolve with retObj.resolved (array)
	*		'logRejected' 	- Log all the rejected promises
	* 		'timeout' 		- This rejects early if timeout reached. Next item in array must be number of ms. 
	*							NOTE: promises will keep executing after timeout fires
	*		'array' 		- Return array of arrays (@see retObj.all)
	*		
	*
	* @return Promise(array|object) 		@see @options. Default: If any @promises are rejected this rejects with an object 
	*										with props 'resolved', 'rejected' (arrays of resulting values with indexes retained 
	*										from @promises) and 'all' (array or arrays [bool, value]). If all @promises resolve
	*										this resolve with an array of those values.
	*/
	function awaitAllPromises(promises,options=[],...opts){

		_log.makeEntry('note',"TODO: replace call to awaitAllPromises() with groupPromises()")
			.changeWhere(1).highlight('blue');

		vX.checkType('array',promises);
		if(!Array.isArray(options)){
			opts.unshift(options);
			options=opts;
		}


		var anyErrors=false;

		//Prepare the return object outside main promise so we can reject with it if option timeout triggers
		var retObj={
			resolved:[]
			,rejected:[]
			,all:[] //array of arrays, [result(true/false), value]
			,remaining:promises.length
			,promises:promises.map(toPromise) //make sure any functions get called and wrapped in promises
			,err:null
			,awaitAllPromises:null
		};

		//Loop through all promises and wrap them so they all...
		var wrappedPromises=retObj.promises.map(p=>
			p.then(
				data=>[true, data]
				,err=>{
					anyErrors=true;
					return [false, err];
				}
			) //...resolve with an array [result, value]
			.then(arr=>{retObj.remaining-=1;return arr}) //...decrease 'remaining' counter (good if timeout used)
		);

		//...^^ array can now be passed to Promise.all without it finishing on the first reject
		retObj.awaitAllPromises=Promise.all(wrappedPromises).then(retArr=>{	//because we handled everything ^^ => nothing here will fail
			try{

				//Before we do anything else, if we want to flatten (usefull if this func is called multiple times)...
				if(options.indexOf('flatten')>-1){
				 	//...check if any of the promises produced a value containing the special flag we set below for 
				 	//this very purpose. NOTE: this resets the indexes so they mean nothing...
					var tmp=[];
					retArr.forEach(([success,val])=>{
						switch(val.__awaitAllPromises__){
							case 'mixed_array':
								tmp=tmp.concat(val);
							case 'object':
								tmp=tmp.concat(val.rejected.map(v=>[false,v]));
								val=val.resolved; // same handling vv, don't break;
							case 'resolved_array':
								tmp=tmp.concat(val.map(v=>[true,v]));
								break;
							case undefined:
							default:
								tmp.push([success,val]); 
						}
					})
					retArr=tmp;
				}

				//Set on return obj
				retObj.all=retArr;
				

				//Split resolved/rejected and set on return obj
				retArr.forEach(([success,val],i)=>{
					if(success==true)
						retObj.resolved[i]=val; 	//NOTE: since keys are not consecutive, console.log will look eg.  
					else			   				// 			[<4 empty items>,'foo',<2 empty items>,'bar']
						retObj.rejected[i]=val;
				});

				//If any ^^ rejected, set an error that says so 
				if(retObj.rejected.length && !retObj.err) //don't overwrite timeout err set vv
					retObj.err=(retObj.rejected.length+' promises rejected, those with index: '+Object.keys(retObj.rejected).join(','));


				//To enable the functionality of 'flatten' option, add a flag on both object and arrays ^^
				Object.defineProperty(retObj.resolved,'__awaitAllPromises__',{value:'resolved_array'});
				Object.defineProperty(retObj,'__awaitAllPromises__',{value:'object'});
				Object.defineProperty(retArr,'__awaitAllPromises__',{value:'mixed_array'});
				// retObj.rejected.prototype.__awaitAllPromises__=true; //not needed because it's never returned...


				//If we want to log all rejected
				if(options.indexOf('logRejected')>-1){
					var l=retObj.promises.length;
					retObj.rejected.forEach((err,i)=>_log.makeError(err)
						.addHandling(`This was promise ${i+1} of ${l} passed to awaitAllPromises().`).exec());
				}

				if(options.indexOf('array')>-1)
					return anyErrors ? Promise.reject(retArr) : Promise.resolve(retArr);

				else if(options.includes('alwaysResolve'))
					return Promise.resolve(retObj);

				else if(options.indexOf('onlyResolved')>-1 || !anyErrors)
					//Grab only the resolved ones as array(retain index)(may be empty array), and resolve
					return Promise.resolve(retObj.resolved);

				else
					return Promise.reject(retObj)

			}catch(err){
				_log.error("BUGBUG awaitAllPromises():",err);
				return Promise.reject(retObj);
			}
		})

		var i=options.indexOf('timeout')
		var timeout=options[i+1];
		if(i>-1 && typeof timeout=='number'){
			return Promise.race([
				retObj.awaitAllPromises
				,sleep(timeout).then(()=>{
					retObj.err='timeout'
				//TODO 2019-09-13: This should instead prompt ^^ to finish in the same way it would have otherwise...
				//					so at least we get the data we have...
					return Promise.reject(retObj);
				})
			]);

		}else
			return retObj.awaitAllPromises;

		
	}



	/*
	* @return Promise(mixed,err)	Resolves with value of first resolved promise, rejects if none resolve
	*/
	function firstResolved(promises,logRejected=false){
		var stack=new Error().stack; //to use in error below vv

		return new Promise(function _firstResolved(resolve,reject){
			vX.checkTypes(['array','boolean'],[promises,logRejected]);

			let l=promises.length, errs=[];
			var e=0,success=false;
			promises.map(p=>toPromise(p) //make sure any functions get called and wrapped in promises
				.then(
					data=>{
						if(!success){
							success=true;
							resolve(data);
						}else if(logRejected){
							log.note("More than one promise resolved:",data);
						}
					}
					,err=>{
						//Log or save error
						if(logRejected)
							log.error(err);
						else if(!success)
							errs.push(err);
						
						//If all promises have finised and we still don't have success, reject
						e++
						if(e>=l && !success){	
							reject(log.makeError(`All ${l} promises rejected.`,
								logRejected?"See previous logs":errs).setStack(stack)
							);
						}
					}
				) 
			)
		})
	}



	/*
	* @constructor
	*/
	function InspectablePromise(promise){
		this.status='pending';
		this.result=undefined;

		var {promsie:promise2,resolve,reject}=exposedPromise();

		var _private={
			resolvedHandler:null
			,rejectHandler:null
		}


		//When the actual promise resolves/rejects, just store the result
		promise.then(
				data=>{
					if(this.status=='pending'){
						this.status='resolved';
						this.result=data;
						if(typeof _private.resolveHandler=='function')
							resolve(_private.resolveHandler(data));
					}
				}
				,err=>{
					if(this.status=='pending'){
						this.status='rejected';
						this.result=err;
						if(typeof _private.rejectHandler=='function')
							resolve(_private.rejectHandler(err));
					}
				}
			)
		;

		//Bring these methods to surface
		this.then=(resolveHandler,rejectHandler)=>{

			switch(this.status){
				case 'pending':
					_private.resolveHandler=resolveHandler;
					_private.rejectHandler=rejectHandler;
					break;
				case 'resolved':
					if(typeof resolveHandler=='function')
						resolve(resolveHandler(this.result));
				case 'timeout':
				case 'rejected':
					if(typeof rejectHandler=='function')
						return resolve(rejectHandler(this.result))
					else 
						return reject(this.result);

			}

			return promise2;
		}

		this.catch=(rejectHandler)=>{
			if(typeof rejectHandler=='function'){
				if(this.status=='rejected')
					resolve(rejectHandler(this.result))
				else 
					_private.rejectHandler=rejectHandler;
			}
				
			return promise2;
		}
	}





	/*
	* Add timeout to a promise or function (func will be called)
	*
	* @return Promise(any, any|Promise)
	*/
	function promiseTimeout(promise,timeout=1,rejectValue='timeout'){
		promise=toPromise(promise);
		return Promise.race([
			promise
			,sleep(timeout).then(()=>{
				if(arguments.length==3){
					//Since we're abandoning it, we can't have it fail async silently...
					promise.catch(_log.error); 
					return Promise.reject(rejectValue)
				}else{
					//rejecting with promise object doesn't wait for it to finish, but the caller
					//can add their own handling to it
					return Promise.reject(promise) 
				}

			})
		]);
		
	}






	/*
	* Add timeout ability given the resolve/reject functions of a Promise. Said timeout can easily be cleared (@see return)
	*
	* @return object{resolve,reject,clear} 	Returns 3 functions, new resolve and reject, and a clear timeout
	*/
	function rejectTimeout(resolve,reject,timeout){
		vX.checkTypes(['function','function','number'],[resolve,reject,timeout]);

		// console.log('setting timeout');
		let id=setTimeout(()=>{
			// console.log('rejected about to time out');
			reject('timeout');
		},timeout);

		var clear=()=>{clearTimeout(id);};
		
		// console.log('creating new resolve');
		var newResolve=function(x){
			// console.log('new resolve called');
			clearTimeout(id);
			resolve(x);
		}

		var newReject=function(x){
			clearTimeout(id);
			reject(x);	
		}
		// console.log('returning new resolve');
		return {resolve:newResolve,reject:newReject,clear:clear};
	}


	/*
	* Create a Promise, breakout resolve and reject, return as object. That way you can return the promise while
	* keeping resolve/reject to use async
	*
	* @return object{promise,resolve,reject,callback[,clear]}
	*/
	function exposedPromise(timeout=null){
		var inspect={status:'pending',result:undefined,done:false}
			,ret={inspect}
			,promise = new Promise((resolve,reject)=>{
				ret.resolve=resolve;
				ret.reject=reject;
			})
		;

		ret.promise=promise.then(
			data=>{ret.inspect.done=true;ret.inspect.status='resolved';ret.inspect.result=data;return data}
			,err=>{ret.inspect.done=true;ret.inspect.status='rejected';ret.inspect.result=err;return Promise.reject(err)}
		);


		if(typeof timeout=='number'){
			Object.assign(ret,rejectTimeout(ret.resolve,ret.reject,timeout));
		}


		ret.callback=function(err,data){return err ? ret.reject(err) : ret.resolve(data)};

		return ret;
	}



	/*
	* Exposes a group of promises, see @return
	*
	* @param array promises 	All items will be sent to @see toPromise()
	* @param @opt <BetterLog>   Will log.error(reject) and log.trace(resolve)
	* @param @opt <Emitter>  	Any object with 'emit' method. Emits 'resolve','reject','finished'
	*
	* @return object 	See top and bottom of function body
	*/
	function groupPromises(promises,...optional){
		
		vX.checkTypes(['array'],[promises]); //use typeS so it throws 'arg #1...'

		//Grab optional args
		var i=optional.length-1,log,emitter;
		for(i;i>=0;i--){
			let x=optional[i];
			if(x && typeof x=='object'){
				if(x.constructor.name=='BetterLog')
					log=x;
				else if(typeof x.emit=='function')
					emitter=x;
			}
		}
		
		//Make sure we have an array of promises. This will call any functions, wrap any values etc.
		promises=promises.map(toPromise)

		//Prepare the return object 
		var r={
			resolved:[]  	//array[any] - indexes match $promises (implies holes), values are resolved data
			,rejected:[]    //array[any] - indexes match $promises (implies holes), values are rejected err
			,all:[] 		//array[any] - indexes match $promises, [[result(true/false), value],...]
			,promises: promises  //array[<Promise>]
			,err:null 		 //string - 'x of y promises rejected, z remaining'
		};	
		Object.defineProperty(r,'remaining',{enumerable:true,get:()=>{return r.promises.length-Object.keys(r.all).length}});

		//2019-11-28: NO, do not do this vv. If you do this r.promise never resolves... for some reason
		//Add shortcuts to...
		// r.then=r.promise.then.bind(r.promise)
		// r.catch=r.promise.catch.bind(r.promise)


		//Loop through the promises and handle, ie. creating a new array of promises 
		//that will all resolve AND at the same time populate the arrays of the return obj
		let l=r.promises.length;
		var handledPromises=r.promises.map((groupedPromise,i)=>groupedPromise
			.then(
				resolved=>{
					r.resolved[i]=resolved; 
					r.all[i]=[true, resolved]
					
					if(log)
						log.trace(`Promise #${i} resolved (${r.remaining} remaining) with:`,resolved);
					if(emitter)
						emitter.emit('resolve',resolved,i)
				}
				,rejected=>{
					r.rejected[i]=rejected; 
					r.all[i]=[false, rejected]

					
					if(log)
						log.makeError(rejected).addHandling(`Promise ${i+1} rejected (${r.remaining} remaining)`).exec();
					if(emitter)
						emitter.emit('reject',rejected,i);

					var msg=`${Object.keys(r.rejected).length} of ${l} promises rejected`
					if(r.remaining)
						msg+=`, ${r.remaining} remaining`
					r.err=msg;
				}
			) 
			.then(function allFinished(){
				if(r.remaining<1&&log){
					log.trace("All grouped promises have finished");
					if(emitter)
						emitter.emit('finished',r);
				}
			})
		);

		//Finally, add a promise that resolves/rejects when all promises have finished
		r.promise=Promise.all(handledPromises).then(()=>(r.err?Promise.reject(r):r)) 


		return r;
	}

		



	/*
	* Call a callback on both success/fail in a promise flow, returning whatever the callback returns
	*
	* @param <Promise>|any promise 
	* @param function(err,data) callback
	*
	* @return Promise  			
	*/
	function thenCallback(promise,callback){
		return Promise.resolve(promise).then(
			data=>callback(null,data)
			,err=>callback(err)
		);
	}


	/*
	* Call a callback on both success/fail in a promise flow, resolveing/rejecting with the same value
	* that was passed in, ie. response from callback will be ignored
	*
	* @param <Promise>|any promise 			
	* @param function(err,data) callback
	*
	* @return Promise  			
	*/
	function promiseAlways(promise,callback){
		return Promise.resolve(promise).then(
			data=>{callback(null,data); return data}
			,err=>{callback(err); return Promise.reject(err)}
		);
	}



	/*
	* Call an async function which is expecting a callback as last argument, returning a 
	* promise instead
	*
	* @param function func
	* @opt any ...args
	*
	* @return Promise(any,err);
	*/
	function promisifyCallback(func,...args){
		var {callback,promise}=exposedPromise();
		args.push(callback);
		func.apply(this,args)
		return promise;
	}


	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=