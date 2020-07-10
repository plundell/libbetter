#!/usr/local/bin/node
'use strict'; 
/*
	Extended HTTP functions

	Author: palun
	Date: July 2018

	This module builds upon built-in http classes to provide some convenient functions for interacting
	with webpages

*/
module.exports=function export_httpX({BetterLog,cX,fsX,netX,pump,...dep}){
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
	* @var object   dns    The native dns class, made available on the exported object
	* @access public
	*/
	const dns = dep.dns||require("dns");
	
	/**
	* @var object cp 	Native child_process. Used as backup request with wget
	*/
	// const cp = dep.cp||require("child_process");

	const codes={
		100:'Continue'
	    ,101:'Switching Protocols'
	    ,102:'Processing'
	    ,103:'Checkpoint'
	    ,200:'OK'
	    ,201:'Created'
	    ,202:'Accepted'
	    ,203:'Non-Authoritative Information'
	    ,204:'No Content'
	    ,205:'Reset Content'
	    ,206:'Partial Content'
	    ,207:'Multi-Status'
	    ,300:'Multiple Choices'
	    ,301:'Moved Permanently'
	    ,302:'Found'
	    ,303:'See Other'
	    ,304:'Not Modified'
	    ,305:'Use Proxy'
	    ,306:'Switch Proxy'
	    ,307:'Temporary Redirect'
	    ,400:'Bad Request'
	    ,401:'Unauthorized'
	    ,402:'Payment Required'
	    ,403:'Forbidden'
	    ,404:'Not Found'
	    ,405:'Method Not Allowed'
	    ,406:'Not Acceptable'
	    ,407:'Proxy Authentication Required'
	    ,408:'Request Timeout'
	    ,409:'Conflict'
	    ,410:'Gone'
	    ,411:'Length Required'
	    ,412:'Precondition Failed'
	    ,413:'Request Entity Too Large'
	    ,414:'Request-URI Too Long'
	    ,415:'Unsupported Media Type'
	    ,416:'Requested Range Not Satisfiable'
	    ,417:'Expectation Failed'
	    ,418:'I\'m a teapot'
	    ,422:'Unprocessable Entity'
	    ,423:'Locked'
	    ,424:'Failed Dependency'
	    ,425:'Unordered Collection'
	    ,426:'Upgrade Required'
	    ,449:'Retry With'
	    ,450:'Blocked by Windows Parental Controls'
	    ,500:'Internal Server Error'
	    ,501:'Not Implemented'
	    ,502:'Bad Gateway'
	    ,503:'Service Unavailable'
	    ,504:'Gateway Timeout'
	    ,505:'HTTP Version Not Supported'
	    ,506:'Variant Also Negotiates'
	    ,507:'Insufficient Storage'
	    ,509:'Bandwidth Limit Exceeded'
	    ,510:'Not Extended'
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

	const defaultPorts={
		"ftp":21
		,"gopher":70
		,"http":80
		,"https":443
		,"ws":80
		,"wss":443
	}

	/*
	* Parse a url, but throw if it doesn't at least contain a valid host
	*
	* @param mixed url 		@see native 'url.parse'
	* @opt string mode 		The following options are available
	*							'full'   - a <URL> object, @see native 'url.parse'
	*							'slim'   - an object with props protocol,host,port,path 
	*							'string' - a string url like: https://www.example.com:80/path/to/file.ext
	*
	* @throw EFAULT 		If we couldn't at least get a host
	*
	* @return string|object @see $mode				
	*/
	function makeUrlObj(url,mode='full'){
		if(cX.checkType(['string','object'],url)=='string'){
			var obj=u.parse(url);//...the parsed url
		}else{
			obj=url;
		}

		//Make sure the url is good
		if(!obj.host && !obj.hostname)
			log.throwCode('EFAULT',`No host found in the url (original, parsed):`,url,obj);

		switch(mode){
			case 'slim':
				return cX.subObj(obj,['protocol','hostname','port','path'],'hasOwnNonNullProperty');
			case 'string':
			case 'href':
				return obj.href;
			case 'full':
				break;
			default: //don't throw on faulty mode
				log.warn(`Invalid mode '${mode}', defaulting to 'full'`);
		}
		
		return obj;

	}


	/*
	* @param array|object  opts  	Array of seperate arguments, or object options
	*
	* @return object 		Object with options accepted by http.request or https.request
	*/
	function parseOptions(opts){
		if(Array.isArray(opts)){
			var port=cX.getFirstOfType(opts,'number','extract')
				,path=cX.getFirstOfType(opts,'string','extract')
				,options=cX.getFirstOfType(opts,'object','extract')
			;
		}else if(opts && typeof opts=='object'){
			options=opts;
		}

		if(options)
			var parsed=cX.subObj(options,[
				'agent','auth','createConnection','defaultPort','family','headers','host',
				'hostname','insecureHTTPParser','localAddress','lookup','maxHeaderSize',
				'method','path','port','protocol','setHost','socketPath','timeout'
			],'hasOwnDefinedProperty')
		else
			parsed={};


		//Explicitly specified values take presidence (But remember, in request() the url takes even further precidence)
		if(port)
			parsed.port=port;
		if(path)
			parsed.path=path;


		//TODO 2020-06-15: Add further checks that no options are contradictory

		return parsed;
	}


	/*
	* Check if a given hostname and 
	*
	* @param string|object hostname 	@see makeUrlObj()
	* @opt object options 				@see native dns.lookup
	*
	* @return Promise(string|array,err) If no $options are given the first IPv4 address.
	* @reject TypeError
	* @reject ENOTFOUND
	*/
	function resolveHostname(hostname,options){
		var url=makeUrlObj(hostname); //TypeError
		var {promise,callback}=cX.exposedPromise()
		dns.lookup(url.hostname,options,callback);
		return promise.catch(function resolveHostname_failed(err){
			return log.makeError(err).reject(); //ENOTFOUND
			//NOTE: it uses same err code for everything it seems, even filesystem stuff like not finding a file descriptor
		});

	}



	/*
	* Check if a webserver is running and a certain resource exists
	*
	* @param string|object url 	@see makeUrlObj()
	*
	* @return Promise(object,err)
	* @reject TypeError  
	* @reject EFAULT     Could not parse url to get a host
	* @reject ENOTFOUND  The url didn't resolve to an ip
	* @reject ESRCH      Could not reach server running at ip:port
	* reject number 	 Any HTML error
	*
	* @public
	*/
	async function webResourceExists(url){
		var checks={
			validUrl:false
			,connected:false
			,resolvesToIp:false
			,reachable:false
			,pageExists:false
		};
		try{
			var urlObj=makeUrlObj(url) //TypeError, EFAULT
				href=urlObj.href
			;
			checks.validUrl=true;
			log.trace(`${href} - valid url`)

			if(!(await netX.ping('8.8.8.8')))
				log.throwCode('ENETDOWN','Cannot reach internet (cannot ping Google DNS @ 8.8.8.8)')
			checks.connected=true;
			log.trace(`${href} - connected to internet`);

			let ip=await resolveHostname(urlObj); //ENOTFOUND
			checks.resolvesToIp=true;
			log.trace(`${href} - resolved to ${ip}`);

			let port=urlObj.port||defaultPorts[urlObj.protocol]||80;
			checks.reachable=await netX.checkPortOpen(ip,port);
			if(!checks.serverRunning)
				log.throwCode('ESRCH',`Could not reach a server running at ${ip}:${port}`); //ESRCH
			else
				log.trace(`${href} - reached server at port ${port}`)

			await head; //Could throw any HTML error
			checks.pageExists=true;
			log.trace(`${href} - page seems to exist and returns headers`);

			return checks;
		}catch(err){
			return log.makeError(err).addExtra(checks).reject();
		}
	}

	/*
	* @param string method
	* @param array opts
	* @return object 		The options object ready to be passed to request()
	*/
	function shorthandOptions(method,opts){
		return Object.assign(
			{'_followRedirects':1}
			,parseOptions(opts)
			,{method:method,_onlyContents:true}
		);
	}

	/*
	* Shorthand for request() with .method=='head' and ._onlyContents=true
	*
	* @param string url
	* @opt object options
	*
	* @return Promise(headers,err) 	Resolves with the headers, rejects with err
	* @public
	* @async
	*/
	function head(url,...opts){
		return request(url,shorthandOptions('HEAD',opts));
	//2020-06-15: Do we need to do any further parsing of the head?
	}


	/*
	* Shorthand for request() with .method=='get' and ._onlyContents=true
	*
	* @param string url
	* @opt object options
	*
	* @return Promise(data,err) 	Resolves with the data (parsed if possible), rejects with err
	* @async
	*/
	function get(url,...opts){
		return request(url,shorthandOptions('GET',opts));
	}



	/*
	* @function request     Wrapper around http(s).request() methods.
	*
	* @var string url
	* @var object options 	Options passed along to request. 
	*							@see https://nodejs.org/api/http.html#http_http_request_url_options_callback
	*						  NOTE: 'timeout' option is ms until connection is made, not for entire transfer!
	*						Also, extra local options available:
	*							_followRedirects
	*							_alwaysResolve 	
	*							_onlyContents 	resolve with data, reject with error
	* @param any payload 	The data to send in case of POST requests. Will be converted to a JSON string if not a primitive
	*
	*
	* @return Promise(object|string,object|err)  	Resolves AND rejects with same object {type, code, err, data} 
	*													-or- 
	*												If $options._onlyContents==true, then .data and .err values. 
	* @reject TypeError
	* @reject EFAULT 	$url couldn't be processed into a valid url
	* @reject ENOTFOUND couldn't resolve host ..........??? not sure if this is actually thrown... maybe we have to check dns ourselves...
	* @reject number 	Any HTML err code
	* 
	* NOTE: .data will be a string unless the content type was specified and parsing was able to take place, in which case it 
	*       could be anything
	*
	* @async
	* @public
	*/
	async function request(url,options={},payload){
		try{
			//Init object we'll be resolve/rejecting
			var x={code:null,err:null,data:null};

			//Get the secret INTERNAL USE ONLY arg. Do if before anything that can fail since we'll
			//want to include it in errors...
			var redirects=Array.isArray(arguments[3]) ? arguments[3] : [];

			//Parse and combine the url and other options into a single "request" object
			x.request=Object.assign({},options,makeUrlObj(url,'slim'));
				//^For more details: https://nodejs.org/api/http.html#http_http_request_options_callback

			cX.checkType(['primitive','object','array','undefined'],payload);

			//Decide if it's https or http, then initiate the request. 
			//Remember: unlike get(), with request() you have to call .end() to tell the remote server that 
			//  "yup, that was the whole request, please give me an answer now!"
			// log.makeEntry('info',"Requesting: ",x.request).addFrom().exec();
			log.debug("Requesting: ",x.request);
			let httpX=(x.request.protocol=='https:' ? https : http);
			let request=httpX.request(x.request);

			//Well use an exposed promise to wait for the response or any error...
			let timeout=options.timeout ? options.timeout+1000 : undefined
			var {promise, resolve,reject}=cX.exposedPromise(timeout);
			request.on('response', resolve);
			request.on('error', reject);

			//If no timeout was set, at least warn that the fetch is slow
			if(!timeout)
				cX.addTimeoutCallback(promise,10000,()=>log.warn("The request has been running for >10 sec...",x.request))

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
					log.debug("Redirecting...")
					return request(redirect,options,payload,redirects); //Make recursive call
				}
			}
			

			//If we're still running, fetch the response body, and parse it
			x.data=await fetchAndParseMessageData(x.response);

			//If we didn't get a successfull code, set it as an error
			if(x.code<200 ||x.code>299){
				//Build a message using code and body
				x.err=log.makeError(codes[x.code]+'. Response: '+cX.logVar(x.data)).setCode(x.code);
			}


		}catch(err){
			let method=(x.request.method||'get').toUpperCase();
			x.err=log.makeError(err).prepend(method+' request failed. ');
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
		data=cX.trim(data);
		switch(mimeLookup[message.headers['content-type']]){
			case 'json':
				return cX.tryJsonParse(data,true);
			case 'urlencoded':
    			//return cX.queryStrToObj(data);
    			return querystring.parse(data)
			default:
				log.debug("Not parsing content-type: "+message.headers['content-type']);
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
		,dns
		,'codes':codes
		,'mime':mime
		,'mimeLookup':mimeLookup
		,webResourceExists
		,makeUrlObj
		,'get':get
		,head
		,'request':request
		,'fetchIncomingMessage':fetchIncomingMessage
		,'parseMessageData':parseMessageData
		,'fetchAndParseMessageData':fetchAndParseMessageData
		,'getMessageParams':getMessageParams
		// ,wget
	}
}