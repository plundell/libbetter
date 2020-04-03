#!/usr/local/bin/node
'use strict'; 
/*
	Extended HTTP functions

	Author: palun
	Date: July 2018

	This module builds upon built-in http classes to provide some convenient functions for interacting
	with webpages

*/
module.exports=function export_httpX({BetterLog,cX,fsX,pump,...dep}){
	// const BetterLog=require('../../better_log');
	const log=new BetterLog('httpX');


	//Load 3 other util classes
	// const cX=require('../util.common.js');
	// const sX=require('./stream.util.js');
	// const fsX=require('./filesystem.util.js');


	/**
	* @var object   https    The native https class, made available on the exported object
	* @access public
	*/
	const https = dep.https||require('https');

	/**
	* @var object   http    The native http class, made available on the exported object
	* @access public
	*/
	const http = dep.http||require('http');

	/**
	* @var object   url    The native url class, made available on the exported object
	* @access public
	*/
	const u = dep.u||dep.url||require('url');

	/**
	* @var object   url    The native ZLIB class, made available on the exported object
	* @access public
	*/
	const zlib = dep.zlib||require("zlib");


	/**
	* @var object   querystring    The native querystring class, made available on the exported object
	* @access public
	*/
	const querystring = dep.querystring||require('querystring');
	
	/**
	* @var object cp 	Native child_process. Used as backup request with wget
	*/
	// const cp = dep.cp||require("child_process");

	const codes={
		100:'100 Continue'
	    ,101:'101 Switching Protocols'
	    ,102:'102 Processing'
	    ,103:'103 Checkpoint'
	    ,200:'200 OK'
	    ,201:'201 Created'
	    ,202:'202 Accepted'
	    ,203:'203 Non-Authoritative Information'
	    ,204:'204 No Content'
	    ,205:'205 Reset Content'
	    ,206:'206 Partial Content'
	    ,207:'207 Multi-Status'
	    ,300:'300 Multiple Choices'
	    ,301:'301 Moved Permanently'
	    ,302:'302 Found'
	    ,303:'303 See Other'
	    ,304:'304 Not Modified'
	    ,305:'305 Use Proxy'
	    ,306:'306 Switch Proxy'
	    ,307:'307 Temporary Redirect'
	    ,400:'400 Bad Request'
	    ,401:'401 Unauthorized'
	    ,402:'402 Payment Required'
	    ,403:'403 Forbidden'
	    ,404:'404 Not Found'
	    ,405:'405 Method Not Allowed'
	    ,406:'406 Not Acceptable'
	    ,407:'407 Proxy Authentication Required'
	    ,408:'408 Request Timeout'
	    ,409:'409 Conflict'
	    ,410:'410 Gone'
	    ,411:'411 Length Required'
	    ,412:'412 Precondition Failed'
	    ,413:'413 Request Entity Too Large'
	    ,414:'414 Request-URI Too Long'
	    ,415:'415 Unsupported Media Type'
	    ,416:'416 Requested Range Not Satisfiable'
	    ,417:'417 Expectation Failed'
	    ,418:'418 I\'m a teapot'
	    ,422:'422 Unprocessable Entity'
	    ,423:'423 Locked'
	    ,424:'424 Failed Dependency'
	    ,425:'425 Unordered Collection'
	    ,426:'426 Upgrade Required'
	    ,449:'449 Retry With'
	    ,450:'450 Blocked by Windows Parental Controls'
	    ,500:'500 Internal Server Error'
	    ,501:'501 Not Implemented'
	    ,502:'502 Bad Gateway'
	    ,503:'503 Service Unavailable'
	    ,504:'504 Gateway Timeout'
	    ,505:'505 HTTP Version Not Supported'
	    ,506:'506 Variant Also Negotiates'
	    ,507:'507 Insufficient Storage'
	    ,509:'509 Bandwidth Limit Exceeded'
	    ,510:'510 Not Extended'
	}
	const mime = {
	    html: 'text/html'
	    ,txt: 'text/plain'
	    ,css: 'text/css'
	    ,gif: 'image/gif'
	    ,jpg: 'image/jpeg'
	    ,png: 'image/png'
	    ,svg: 'image/svg+xml'
	    ,js: 'application/javascript'
	    ,json:'application/json'
	    ,urlencoded:'application/x-www-form-urlencoded'
	};

	const mimeLookup = {
	    'text/html':'html'
	    ,'html':'html'
	    ,'text/plain':'txt'
	    ,'text':'txt'
	    ,'text/css':'css'
	    ,'image/gif':'gif'
	    ,'image/jpeg':'jpg'
	    ,'image/png':'png'
	    ,'image/svg+xml':'svg'
	    ,'application/javascript':'js'
	    ,'application/json':'json'
	    ,'json':'json'
	    ,'application/json; charset=utf-8':'json'
	    ,'application/x-www-form-urlencoded':'urlencoded'
	};



	function get(url,options){
		if(typeof options=='object') //If not request() will throw...
			options.method='get';
		//get is the default method, so if no options are specified at all then it'll be 'get'

		return request(url,options);
	}
	/*
	* @function request     Wrapper around http(s).request() methods.
	*
	* @var string url
	* @var object options 	Options passed along to request. 
	*							@see https://nodejs.org/api/http.html#http_http_request_url_options_callback
	*						Also, extra local options available:
	*							_followRedirects
	*							_alwaysResolve 	
	*							_onlyContents 	resolve with data, reject with error
	* @param any payload 	The data to send in case of POST requests. Will be converted to a JSON string if not a primitive
	*
	* @return Promise(<StdObject>)|string  	Resolves AND rejects with same object. Props: type, code, err and data;
	*										or the string contents if $options._onlyContents==true 
	*/
	async function request(url,options={},payload){
		try{
			//Init object we'll be resolve/rejecting
			var x={code:null,err:null,data:null};

			//Get the secret INTERNAL USE ONLY arg. Do if before anything that can fail since we'll
			//want to include it in errors...
			var redirects=Array.isArray(arguments[3]) ? arguments[3] : [];

			//Now check the args that make up the request. We'll be passing a single options object to httpX.request() vv
			//so we essentially combine...
			cX.checkTypes(['string','object',['primitive','object','array','undefined']],[url,options,payload]);
			x.request=Object.assign(
				u.parse(url)//...the parsed url
				,options//...additional options
			); 
			// For more details: https://nodejs.org/api/http.html#http_http_request_options_callback
			

			//Decide if it's https or http, then initiate the request. 
			//Remember: unlike get(), with request() you have to call .end() to tell the remote server that 
			//  "yup, that was the whole request, please give me an answer now!"
			log.info("Requesting "+x.request.href,x.request.headers);
			let httpX=(x.request.protocol=='https:' ? https : http);
			let request=httpX.request(x.request);

			//Well use an exposed promise to wait for the response or any error...
			var {promise, resolve,reject}=cX.exposedPromise();
			request.on('response', resolve);
			request.on('error', reject);

			//...but before waiting we write any payload and end the request
			request.end(cX.tryJsonStringify(payload)); //will send an empty string if no or bad payload was passed
			//^^ THAT TRIGGERED/SENT/WHATEVER THE REQUEST ^^

			x.response=await promise; //errors will throw and caught at bottom


			//Now start working with the response.
			x.code=x.response.statusCode;

			//If we get a redirect response...
			if(x.code>=300 && x.code<400){
				
				//...make sure we have a good location
				var redirect = x.response.headers.location
				if(!l)
					log.makeError("Redirected with '"+codes[x.code]+"' but no 'location' header found").throw();
				redirect=new u(redirect,x.request);

				//2020-03-18: there may have been a reason we did vv, something about he protocol not comming through when using new()
				// if(redirect.substring(0,1)=='/'){
				// 	let _url=u.parse(url);
				// 	redirect=_url.protocol+'//'+_url.host+l;
				// }

				//...then add it to the list...
				redirects.push(redirect.href)

				//...and finally check if that list is too long or if we're following
				if(!options._followRedirects || 
					(typeof options._followRedirects=='number' && options._followRedirects<redirects.length)
				){
					log.makeError(`Too many redirects (limit ${options._followRedirects||0}):`,redirects).throw();
				}else{
					return request(redirect,options,payload,redirects); //Make recursive call
				}
			}
			

			//If we're still running, fetch the response body, and parse it
			x.data=await fetchAndParseMessageData(x.response);

			//If we didn't get a successfull code, set it as an error
			if(x.code<200 ||x.code>299){
				//Build a message using code and body
				x.err=log.makeError(codes[x.code]+'. '+cX.logVar(x.data)).setCode(x.code);
			}


		}catch(err){
			x.err=log.makeError('GET failed.',err);
		}
			
		if(Array.isArray(redirects) && redirects.length){
			x.redirects=redirects;
		}

		if(x.err){
			if(options._alwaysResolve)
				return Promise.resolve(x);
			else if(options._onlyContents)
				return Promise.reject(x.err);
			else
				return Promise.reject(x);
		}else{
			if(options._onlyContents)
				return Promise.resolve(x.data);
			else
				return Promise.resolve(x);
		}

	}
		


	/*
	* Read the body of an incoming message (could be a request or a response). Handles unzipping.
	*
	* @param <http.IncomingMessage> message
	* @param number timeout 				The returned promise will reject if the whole message hasn't been
	*										received within this timeframe
	*
	* @return Promise(str,<ble>) 	Resolves with the cleartext body of the message, rejects if unzipping fails,
	*								timelimit is exceeded or transmission ends abruptly
	*/
	function fetchIncomingMessage(message,timeout=3000){
		var {promise,resolve,reject}=cX.exposedPromise(timeout);
		
		var data=''; 

		//Data will come it chunks, and it may or may not be zipped, so we handle that... 
		if(message.headers['content-encoding']=='gzip'){
			// log.info("Response is gzip encoded, decoding...")
			var gunzip = zlib.createGunzip();            

		//2019-10-01: This is the only place that uses pump... get rid of it!
			// 2019-01-25: Trying 'pump' which makes sure both source and dest are closed on fail
				// resp.pipe(gunzip);

			//Resolve when gunzip finishes, not when message finishes (which comes first and cuts off the 
			//data before it's all been unzipped...)
			pump(message,gunzip,function onFinish(err){
				if(err)
					reject(log.makeError(err));
				else
					resolve();
			})

			gunzip.on('data', chunk=>{data+=chunk;});

		}else{
			message.on('data', chunk=>{data+=chunk;});
			message.on('error',err=>reject(log.makeError(err)));
			message.on('end',()=>resolve());
		}

		return promise.then(()=>{
			if(message.complete)
				return data;
			else
				return log.makeError("The connection was terminated while the message was still being sent").reject();
		});
	}


	



	/*
	* Parse the message data in case the content-type is not 'text'
	*
	* @param <http.IncomingMessage> message
	* @param string data 					The string returned by fetchIncomingMessage()
	*
	* @throw <ble SyntaxError> 	If the data could not be parsed as expected
	* @return any 				The $data parsed into an object or array
	*/
	function parseMessageData(message, data){
		switch(mimeLookup[message.headers['content-type']]){
			case 'json':
				return cX.tryJsonParse(data,true);
			case 'urlencoded':
    			//return cX.queryStrToObj(data);
    			return querystring.parse(data)
			default:
				log.debug("Not parsing "+message.headers['content-type']);
				return data;
		}
	}


	/*
	* Shortcut for calling fetchIncomingMessage() and then parseMessageData()
	*
	* @param <http.IncomingMessage> message
	*
	* @return Promise(any,<ble>) 			
	*/
	function fetchAndParseMessageData(message){
		return fetchIncomingMessage(message).then(data=>parseMessageData(message,data));
	}



	/*
	* Get params passed in a message, either the searchParams or those from the body of the message
	*
	* @param <http.IncomingMessage> message
	*
	* @return Promise(any,<ble>)
	* @async
	*/
	async function getMessageParams(message){
		try{
			if(message.method=='POST'){
				var body=await fetchAndParseMessageData(message)
				if(typeof body=='object'){
                    return body;
                }
	        	return (new u(message.url, `http://${message.headers.host}`)).searchParams;
			}
		}catch(err){
			return log.makeError(err).reject();
		}
	}





	// /*
	// * Call wget for a url
	// * @param string url
	// * @return Promise(string, <ble>) 	The html contents of the page, or an error
	// */
	// function wget(url){
	// 	return new Promise(function p_wget(resolve,reject){
	// 		cp.execFile('wget',['-O-',url],function wgetDone(error, stdout, stderr){
	// 			if(error){
	// 				reject(log.makeError("wget failed.",error,stderr));
	// 			}else{
	// 				resolve(stdout.toString());
	// 			}
	// 		},{maxBuffer:10});
	// 	})
	// }


	return {
		'https':https
		,'http':http
		,'url':u
		,'zlib':zlib
		,'querystring':querystring
		,'codes':codes
		,'mime':mime
		,'mimeLookup':mimeLookup
		,'get':get
		,'request':request
		,'fetchIncomingMessage':fetchIncomingMessage
		,'parseMessageData':parseMessageData
		,'fetchAndParseMessageData':fetchAndParseMessageData
		,'getMessageParams':getMessageParams
		// ,wget
	}
}