//simpleSourceMap=/my_modules/util/common/promise.util.js
//simpleSourceMap2=/lib/util/common/promise.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module contains helper/util functions related to PROMISES
*/
'use strict'; 

module.exports=function export_pX({_log,vX,aX,fX}){


	//Export
	var _exports={
		'sleep':sleep
		,'toPromise':toPromise
		,'createPromiseFunc':createPromiseFunc
		,'promisify':createPromiseFunc //alias
		,promisifyCallback
		,'firstResolved':firstResolved
		,rejectOnUnsettledTimeout
		,runOnUnsettledTimeout
		,'exposedPromise':exposedPromise
		,'groupPromises':groupPromises
		,'thenCallback':thenCallback
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
	* @param function|<Promise>|any x 	NOTE: if function it gets called immediately
	*
	* @return <Promise> 	Depending on what's passed in, this will return:
	*		<Promise> --> same promise
	*		function  --> executes function inside a promise, then returns the promise
	* 		any       --> same variable, wrapped in resolved promise
	*/
	function toPromise(x){
		if(x instanceof Promise){
			return x
		}else if(typeof x =='function'){
			return createPromiseFunc(x).call(this);
		}else{
			return Promise.resolve(x);
		}
	}


	

	/*
	* Wrap a function in another function that ensures the returned value
	* will be a Promise.
	*
	* NOTE: this does NOT call the function, only wraps it for future calls
	*
	* @param function func
	*
	* @return function
	*/
	function createPromiseFunc(func){
		vX.checkType('function',func);
		return fX.renameFunction(func.name||'promisifiedFunc',function(){
			try{
				return Promise.resolve(func.apply(this,arguments))
			}catch(err){
				return Promise.reject(err);
			}
		})
	}



	/*
	* Call an async function which is expecting a callback as last argument, returning a 
	* promise instead
	*
	* @param function func   A function that expects the last arg to be a (err,data) callback function
	* @opt any ...args
	*
	* @return Promise(any,err);
	*/
	function promisifyCallback(func,...args){
		var {callback,promise}=exposedPromise();
		args.push(callback); //add the callback as last arg
		func.apply(this,args)
		return promise;
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
	* Reject a promise after a timeout if it remains unfinished 
	*
	* This is suitable when you intend to STOP WAITING after the $timeout.
	*
	* @param <Promise> promise
	* @param number timeout
	* @opt function abandonHandler   Promise.race would normally abandon $promise if the $timeout expires first, pass this function to 
	*	                             be called with the $promise in that case
	*
	* @return Promise(any, any|'timeout')
	*/
	function rejectOnUnsettledTimeout(promise,timeout,abandonHandler){
		vX.checkTypes(['promise','number','function*'],arguments);

		return Promise.race([
			promise

			//NOTE: if vv runs first and then ^^ fails then ^^ will NOT produce an uncaught error...

			,sleep(timeout).then(function onTimeout(){
				//Pass to optional handler...
				if(abandonHandler)
					abandonHandler(promise);
				return Promise.reject('timeout') 
			})
		]);	
	}



	/*
	* Run a $callback if a $promise remains unfinished (resolved or rejected) after a $timeout WITHOUT affecting the promise
	*
	* This is suitable when you intend to KEEP WAITING after the $timeout, eg. use to show 'still waiting' message.
	*
	* @param @anyorder function callback   NOTE: any error thrown by this will not be caught
	* @param @anyorder number timeout
	* @param @anyorder <Promise> promise   
	*
	* @return number 		The id required to remove the timeout
	*/
	function runOnUnsettledTimeout(...args){
		var callback=aX.getFirstOfType(args,'function')||_log.throwCode("EINVAL","No callback function was passed in.")
			,timeout=aX.getFirstOfType(args,'number')||_log.throwCode("EINVAL","No timeout delay (number) was passed in.")
			,promise=aX.getFirstOfType(args,'promise')||_log.throwCode("EINVAL","No promise to add the timeout to was passed in.")
		;

		//Create a flag that get's undone by the finishing of the promise...
		var finished=false;
		promise.always(()=>finished=true).catch(()=>{})

		//Run a timeout and if the flag hasn't been undone, call the callback
		return setTimeout(()=>{
			if(!finished)
				callback(); //if this throws it will be uncaught... handle with seperate onuncaught...
		},timeout)
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

		//If a timeout is passed in, call reject() after that delay (has no effect if resolve/reject already called)
		if(timeout>0){
			let id=setTimeout(()=>{ret.reject('timeout')},timeout);
			ret.clear=()=>clearTimeout(id);
		}

		ret.callback=function(err,data){return err ? ret.reject(err) : ret.resolve(data)};

		return ret;
	}



	/*
	* Exposes a group of promises, see @return
	*
	* @param array|object promises 	All items will be sent to @see toPromise(). If object the keys will be returned by r.remainingKeys()
	* @opt <BetterLog>              Will log.error(reject) and log.trace(resolve)
	* @opt <Emitter>  	            Any object with 'emit' method. Called with: ('resolve'|'reject'|'finished', value, index)
	* @opt function  	            A callback function that will be called with each promise on completion, args: (rejected,resolved). 
	*                                ProTip: check arguments.length to determine if promise was resolved or rejected 
	*
	* ProTip: if you need to know the index of the callback you can create a "fake emitter" like so: {emit:(evt,value,index)=>{switch(evt){...}}}. Just don't
	*         forget that one of the events is 'finished'
	*
	* @return object 	See top and bottom of function body
	*/
	function groupPromises(promises,...optional){
		
		vX.checkTypes([['array','object']],[promises]); //use typeS so it throws 'arg #1...'
		
		//Grab optional args
		var i=optional.length-1,log,emitter,cb;
		for(i;i>=0;i--){
			let x=optional[i];
			if(x && typeof x=='object'){
				if(x.constructor.name=='BetterLog'){
					if(!log){ //if more than one is passed, just ignore
						log=x;
					}
				}
				else if(typeof x.emit=='function'){
					emitter=x;
				}
				else if(typeof x=='function'){
					cb=x;
				}
			}
		}
		
		//Make sure we have an array/object of promises. This will call any functions, wrap any values etc.
		for(let key of Object.keys(promises)){
			promises[key]=toPromise(promises[key])
		}

		//Prepare the return object 
		var r={
			promises: promises                      //array|object[<Promise>,...]
			,resolved:new promises.constructor()  	//array|object - indexes match $promises (implies holes if array passed in), values are resolved data
			,rejected:new promises.constructor()    //array|object - indexes match $promises (implies holes if array passed in), values are rejected err
			,results:new promises.constructor()     //array|object - indexes match $promises, [[result(true/false), value],...]
			,err:null 		                        //string - 'x of y promises rejected'
		};	
		Object.defineProperties(r,{
			'length':{enumerable:true,get:()=>Object.keys(r.promises).length}
			,'finished':{enumerable:true,get:()=>Object.keys(r.results).length}
			,'executing':{enumerable:true,get:()=>r.length-r.finished}
			,'progress':{enumerable:true,get:()=>Math.round(r.finished/r.length*100)} //0-100
			,'status':{enumerable:true,get:()=>{
				var status=new promises.constructor();
				for(let key of Object.keys(promises)){
					status[key]=(r.results.hasOwnProperty(key)?(r.results[key][0]?'resolved':'rejected'):'running');
				}
				return status;
			}}
		});

		//2019-11-28: NO, do not do this vv. If you do this r.promise never resolves... for some reason
		//Add shortcuts to...
		// r.then=r.promise.then.bind(r.promise)
		// r.catch=r.promise.catch.bind(r.promise)


		//Loop through the promises and handle, ie. creating a new array of promises 
		//that will all resolve AND at the same time populate the arrays of the return obj
		var strKey=(x)=>{let y=Number(x);return (isNaN(y) ? `'${x}'` : `#${y}`)};
		var handledPromises=Object.entries(r.promises).map(([key,promise])=>promise
			.then(
				resolved=>{
					r.resolved[key]=resolved; 
					r.results[key]=[true, resolved]
					
					if(log)
						log.trace(`Promise ${strKey(key)} resolved (${r.executing.length} still running) with:`,resolved);
					if(emitter)
						emitter.emit('resolve',resolved,key)
					if(cb)
						cb(undefined,resolved);
				}
				,rejected=>{
					r.rejected[key]=rejected; 
					r.results[key]=[false, rejected]

					
					if(log)
						log.makeError(rejected).addHandling(`Promise ${strKey(key)} rejected (${r.executing} still running)`).exec();
					if(emitter)
						emitter.emit('reject',rejected,key);
					if(cb)
						cb(rejected);

					var err=`${Object.keys(r.rejected).length} of ${r.promises.length} promises rejected`
					if(r.progress<100)
						err+=`, ${r.executing.length} still running`
					r.err=err;
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

		//Finally, add a promise that resolves/rejects when all promises have finished...
		r.promise=Promise.all(handledPromises).then(()=>{return (r.err?Promise.reject(r):r)}) 

		//...and one that always resolves
		r.always=Promise.all(handledPromises).then(()=>r);

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







	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=