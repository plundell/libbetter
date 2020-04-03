//simpleSourceMap=/my_modules/util/browser/rest.util.js
//simpleSourceMap2=/lib/util/browser/rest.util.js
/*
* @module bu-browser-rest
* @author plundell
* @license MIT
* @description Helper functions related to RESTful api calls
*
* This module is required by bu-browser
*/
;'use strict';
module.exports=function export_restX({cX}){


	const _log=cX._log

	//Methods to export
	var _exports={
		'POST':POST
		// ,'queryStrToObj':queryStrToObj
		// ,'objToQueryStr':objToQueryStr
	}
		


	/*
	* Post an object and get a response
	*
	* Details and examples can be found here:
	* https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
	*
	* @param string target 					Where to send the data, usually a file on the server
	* @param primitive|object|array data 	The data to send. It will be json stringified
	* @param @opt <BetterLog> log 			The log to use
	*
	* @return Promise(mixed,err) 			A promise that resolves when a successfull response arrives, 
	*										or rejects in all other cases with one of these codes:
	*											TypeError 		- The passed in args where bad
	*											clienterror  	- request never left this computer
	*											servererror 	- Server responded with a negative response 
	*																(see err.msg + err.status)
	*											abort 			- The request was aborted before full response
	*											timeout 		- The request timed out
	*											BUGBUG 			- Should not happen. Some error with this code
	* @logged
	*/
	function POST(target,data,log){
		
		//Use the passed in log or the util log
		if(!_log._isLog(log))
			log=_log
		
		if(typeof target!='string')
			return log.rejectType('arg#1 to be string target, eg. api.php',target);
		
		//Create promise we'll return
		var {promise,resolve,reject,inspect}=xxx.util.exposedPromise();

		try{
			var xhr = new XMLHttpRequest();

			//First set event listeners
		//2020-02-20: Is this v correct? Because 'loadend' loads after error AND when load is complete, so maybe 'error'
		//				happens even on bad responses??
			// xhr.addEventListener('error',function POST_error(err){
			// 	reject(log.makeError('Failed to make request (ie. nothing left this computer)',err).setCode('clienterror').exec());
			// })
			xhr.addEventListener('abort',function POST_abort(err){
				reject(log.makeError('Request aborted.',err).setCode('abort').exec());
			})
			xhr.addEventListener('timeout',function POST_timeout(err){
				//don't know if error is also fired
				reject(log.makeError('Request timed out.',err).setCode('timeout').exec());
			})
			xhr.addEventListener('loadend',function POST_load(){
				if(this.status>=200 && this.status<300){
					log.info(`Got successfull ${this.status} response from ${target}:`,this.response);
					resolve(this.response);
				}else if(inspect.status=='pending'){
					var err=log.makeError(target)
						.setCode(this.status)
						.somewhere(this.response)
					;
					reject(err);		
				}
			})

			//Then make the request
			log.info(`About to POST to ${target}:`,data);
			let payload=JSON.stringify(data);
			xhr.open("POST", target, true); //true==async
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.send(payload); //ProTip: Chrome will console.error this by default. You can turn it off in DevTools 3-dots

		}catch(err){
			reject(log.makeError(err).setCode('BUGBUG').exec());
		}

		return promise;
	}

	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=

