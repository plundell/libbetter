//simpleSourceMap=/my_modules/util/common/vars.util.js
//simpleSourceMap2=/lib/util/common/vars.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module exports an object with functions on it. If a global object is passed in, the 'util' 
* property on it will be amended with the ones in this file.
*
* @param object globalObj 		Either window if in broswer (see bottom), or 'this', ie whatever scope
* 								this script is executed in
*/
;'use strict';

module.exports=function export_vX({varType,logVar,_log}){
    
	//Sourced from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
	const builtins=[
		Infinity,NaN,undefined,globalThis
		,eval,/*uneval,*/isFinite,isNaN,parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent
		,Object,Function,Boolean,Symbol
		,Error,/*AggregateError ,*/EvalError,/*InternalError ,*/RangeError,ReferenceError,SyntaxError,TypeError,URIError
		,Number,BigInt,Math,Date
		,String,RegExp
		,Array,Int8Array,Uint8Array,/*Uint8ClampedArray,*/Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array
		,Map,Set,WeakMap,WeakSet
		,ArrayBuffer,/*SharedArrayBuffer ,*/Atomics ,DataView,JSON
		,Promise//,Generator,GeneratorFunction,AsyncFunction
		,Reflect,Proxy
		//,Intl,Intl.Collator,Intl.DateTimeFormat,Intl.ListFormat,Intl.NumberFormat,Intl.PluralRules,Intl.RelativeTimeFormat,Intl.Locale
		//,WebAssembly,WebAssembly.Module,WebAssembly.Instance,WebAssembly.Memory,WebAssembly.Table,WebAssembly.CompileError,WebAssembly.LinkError,WebAssembly.RuntimeError
	];
	if(typeof uneval!='undefined'){builtins.push(uneval)}
	if(typeof AggregateError!='undefined'){builtins.push(AggregateError)}
	if(typeof InternalError!='undefined'){builtins.push(InternalError)}
	if(typeof Uint8ClampedArray!='undefined'){builtins.push(Uint8ClampedArray)}
	if(typeof SharedArrayBuffer!='undefined'){builtins.push(SharedArrayBuffer)}
	if(typeof Generator!='undefined'){builtins.push(Generator)}
	if(typeof GeneratorFunction!='undefined'){builtins.push(GeneratorFunction)}
	if(typeof AsyncFunction!='undefined'){builtins.push(AsyncFunction)}
	if(typeof Intl!='undefined'){builtins.push(Intl,Intl.Collator,Intl.DateTimeFormat,Intl.ListFormat,Intl.NumberFormat,Intl.PluralRules,Intl.RelativeTimeFormat,Intl.Locale)}
	if(typeof WebAssembly!='undefined'){builtins.push(WebAssembly,WebAssembly.Module,WebAssembly.Instance,WebAssembly.Memory,WebAssembly.Table,WebAssembly.CompileError
		,WebAssembly.LinkError,WebAssembly.RuntimeError)}


	Object.freeze(builtins)



	const _exports={
		varType
		,logVar
		,checkType
		,useIfType
		,checkTypes
		,checkProps
		,checkTypedArray
		,isEmpty
		,isNotEmpty
		,sameValue
		,compare
		,getCompareFunc
		,isPrimitive
		,allPrimitive
		,stringToPrimitive
		,stringToNumber
		,forceType
		,jsonParse
		,tryJsonParse
		,tryJsonStringify
		,stringifySafe
		,copy
		,deepCopy
		,getPrototypeChain
		,instanceOf
		,stripFullLineComments
		,builtins
	};



	/**
	* Check Throw a TypeError with a well formated message
	*
	* @param string|array|object expected 	  String vartype or an object of the expected class, or an array of them to allow
	* 										   more than one type. A few special cases exist:
	* 												'<Foo>'    --> object of class Foo
	* 												'string*'  --> a string or undefined (note null!=undefined)
	* 												'string!'  --> non-empty string (non-zero number, non-empty array etc, see isEmpty())
	* @param any got 				          The actual variable that was the wrong type
	* @opt string onerror 	                  @see _parseTypeErrorHandling($onerror)
	*
	* @throw <ble BUGBUG>                     If this function was called with the wrong args
	* @throw <ble TypeError> 		          If the type was bad (unless @see $onerror)
	*
	* @return string|bool 			          String if arg#3===true (@see helper.varType($got)) or false if arg#3==false && type is bad
	*/
	var lookup={
		'bool':'boolean'
		,'arr':'array'
		,'obj':'object'
		,'str':'string'
		,'nr':'number'
		,'*':'any'
		,'mixed':'any'
		,'falsey':'falsy'
		,'false':'falsy'
		,'true':'truthy'
	}
	// var primitiveObject={
	// 	'string':String
	// 	,'number':Number
	// 	,'boolean':Boolean
	// }
	function checkType(expectedType, got,falseOrCaller=false){
		//First do a very quick check so we don't waste time in non-complicated situations
		if(typeof got==expectedType){
			//One scenario here is that we expected 'object' but got 'array' or 'null' which shows up as 'object'
			if(expectedType=='object'){
				if(got && got.constructor.name=='Object'){
					return expectedType;		
				}
			}else{
				return expectedType;
			}
		}
		if(arguments.length<2)
			_log.throw(`BUGBUG: checkType() expected at least 2 args, got ${arguments.length}:`,arguments);
		
		var errStr=(typeof falseOrCaller=='string' ? falseOrCaller+'() e' : 'E') +"xpected ";
		var typeOfExpType=(varType(expectedType));
		switch(typeOfExpType){
			case 'string':
				if(expectedType.endsWith('*')){
					if(got==undefined)
						return 'undefined';
					else
						expectedType=expectedType.slice(0,-1)
				}
				if(expectedType.endsWith('!')){
					expectedType=expectedType.slice(0,-1)
					if(isEmpty(got)){
						expectedType='non-empty '+expectedType;
						break;
					}
				}

				expectedType=lookup[expectedType] || expectedType;
				let gotType=varType(got);
				if(gotType == expectedType || expectedType=='any'){
					// console.log("SAMESAMESAME - returning");
					return gotType;
				}else if(expectedType=='primitive'){ //shortcut to check if primitive
					if(isPrimitive(got)){
						// console.log('PRIMITIVE success');
						return gotType;
					}
					// console.log('PRIMITIVE but failed',gotType,typeof gotType);
				}else if(expectedType=='falsy'){
					if(got)
						break; //truthy, fail at bottom
					return gotType;
				}else if(expectedType=='truthy'){
					if(!got)
						break; //falsy, fail at bottom
					return gotType;
				
				}else if(expectedType.substring(0,1)=='<'){
					if(gotType=='object'){
						var name=expectedType.substring(1,expectedType.length-1);

						//Check all the constructors along the proto chain
						var self=got,selves=[];
						while(true){
							if(self.constructor.name==name)
								return expectedType; //NOTE: returns the passed in string WITH '<', ie. <ClsName>
							selves.push(self);
							self=self.__proto__;
							if(!self.__proto__ || self.constructor==self.__proto__.constructor)
								break;
						}
					}
				} 
				//Ok, we did not get what we wanted, jump to bottom
				break;

			//DevNote: DO NOT allow String object when checking for 'string' since many native functions 
			//          will fail if given String() when expecting string
				
			case 'array':
				var goodType=expectedType.find(t=>checkType(t,got,true))
				if(goodType)
					return goodType;
				break;
			case 'object':
			case 'function':
				try{
					if(got instanceof expectedType)
						return expectedType.constructor.name;
					break;
				}catch(err){
					_log.error(err);
					//2019-11-28: It seems BetterLog instances fail here
				}
			default:
				_log.throw("BUGBUG: checkType() expected arg#1 to be string/array/object/function, got: "+logVar(expectedType));
		}

		if(falseOrCaller===true)
			return false;
		else{
			let entry=_log.makeTypeError(expectedType,got)
				.setOptions({printFunc:true})
				.changeWhere(1)//1==remove this line from the stack
			entry.func=falseOrCaller;
			entry.throw();
		}
	}



	function checkTypes(expArr,gotArr, falseOrCaller){
		if(varType(expArr)!='array')
			_log.throw("BUGBUG: checkTypes() expected arg#1 to be an array, got: "+logVar(expArr));

		switch(varType(gotArr)){
			case 'object':
				gotArr=Object.values(gotArr); //so we can pass 'arguments'. NOTE: that it only contains explicitly passed
											  //args, not default values or omitted
				break;
			case 'array':
			case 'arguments':
				//It's important we don't alter the array, in case it's used again
				gotArr=Array.from(gotArr);
				break;
			default:
				_log.throw("BUGBUG: checkTypes() expected arg#2 to be an array, got: "+logVar(gotArr));
		}

		//Make sure we have the same number in each array
		var diff=expArr.length-gotArr.length
		if(diff>0){
			//Fill second array with undefined (needed when passing 'arguments' where some where omitted. NOTE: default values
			//are not included in arguments object)
			gotArr.push.apply(gotArr,new Array(diff));
		}else if(diff<0){
			//slice second array, ie. we only check as far as we've been told
			gotArr=gotArr.slice(0,expArr.length);

		}

		try{
			var i, gotTypes=[];
			for(i=0;i<expArr.length;i++){
				gotTypes.push(checkType(expArr[i],gotArr[i],false)); //false==throw
			}
			return gotTypes;

		}catch(err){
			if(falseOrCaller===true)
				return false;
			else{
				try{
					//FutureDev: Don't make this one long chain of calls, since we want to log BLE vv if smth goes wrong
					var BLE=_log.makeError(err);
					BLE.prepend((typeof falseOrCaller=='string' ? falseOrCaller+'() a' : 'A')+'rg #'+(i+1)+': ');
					BLE.changeWhere(1);
					
				}catch(e){
					console.error("BUGBUG checkTypes(): something was wrong with <BetterLogEntry>:",e,typeof BLE,BLE);
					console.error(err);
					throw err;
				}
				//FutureDev: Obviously we have to throw OUTSIDE the above block, else the catch will trigger, duhdoojj
				BLE.throw();

			}
		}
	}

	/*
	* @param object obj 	Any object
	* @param object types 	Keys are same as obj, values are expected types (string or array of strings)
	* @opt bool|string falseOrCaller
	*
	* @throws <ble TypeError> 	If args passed to this func is wrong (incl. if arg#1 isn't an object), @see checkType
	* @throws <ble EINVAL> 		If any of the props are the wrong type 	
	* @throws <ble EMISSING> 	If any of the props are missing
	*
	* @return object|false
	*/
	function checkProps(obj,types,falseOrCaller){
		if(!checkType('object',types,true)) 
			_log.makeError("checkProps() expects arg#2 to be an object, got:",types).throw("BUGBUG");

		if(!checkType('object',obj,true)) 
			_log.makeError(`Expected an object with certain props, but didn't even get an object, got a ${varType(obj)}:`,obj).throw('TypeError');

		
		try{
			var key, gotTypes={};
			for(key in types){
				try{
					gotTypes[key]=checkType(types[key],obj[key],false); //false==>throw or return type
				}catch(err){
					if(falseOrCaller===true){
						return false;
					}
					
					//If we're here we're going to throw...
					var msg=` prop '${key}'.`
						,code;
					if(obj.hasOwnProperty(key)){
						msg='Bad'+msg;
						code='EINVAL';
					}else{
						msg='Missing'+msg;
						code='EMISSING';
						err=undefined;
					}
					if(falseOrCaller){
						msg=falseOrCaller+'(): '+msg;
					}
					_log.throwCode(code,msg,obj,err);
				}

			}
			return gotTypes;
		}catch(ble){
			ble.changeWhere(1).throw();
		}
	}

	/*
	* Check that all items in an array are a given type/types
	* @param array arr
	* @param string|array[string...] expectedType @see checkType
	* @opt bool|string falseOrCaller
	*/
	function checkTypedArray(arr,expectedType,falseOrCaller){
		if(!checkType('array',arr,true))
			_log.makeError("BUGBUG: checkTypedArray expects arg#1 to be an array of values, got:",arr).throw("TypeError");
		if(!checkType(['string','array'],expectedType,true)) 
			_log.makeError("BUGBUG: checkTypedArray expects arg#2 to be a string or array of strings, got:",expectedType).throw("TypeError");

		try{
			var types=[];
			for(let i in arr){
				try{
					types[i]=checkType(expectedType,arr[i],false); //false==>throw or return type
				}catch(ble){
					if(falseOrCaller===true)
						return false;
					else if(falseOrCaller)
						ble.prepend(falseOrCaller+'(): ');						
					ble.append(`at item #${i}`).throw(); //caught again vv
				}

			}
			return types;
		}catch(ble){
			ble.changeWhere(1).throw();
		}
	}

	/*
	* Check if a variable contains information, ie. everything except: undefined, null, empty string,
	* empty object, empty array
	*
	* @param any v
	*
	* @flags ...considerEmpty 	Several things can be considered empty or not. By default none
	*							of them are, but you can change this by passing one or more of 
	*							them as args, or pass '*' to consider them all empty. Available
	*							items are:
	*									0, null, false
	*											
	* Note: String that match /^\s*$/ are also considered empty
	*
	* @return boolean
	*/
	function isEmpty(v,...considerEmpty){
		
		let t= varType(v);
		switch(t){
		  //Objects and arrays are considered empty if they don't have any items
			case 'nodelist':
			case 'array':
				return (v.length ? false : true);

			case 'object':
				return (Object.keys(v).length ? false : true);

		  //Undefined has no informational value and is by definition not anything
			case 'undefined':
				return true;

		  //Strings with only whitespace characters are considered empty
		  	case 'string':
		  		return (!v || v.match(/^\s*$/) ? true : false);

		  //Here we have an option, by default zero, null and false are NOT considered empty...
		  	case 'boolean':
		  	case 'number':
		  	case 'null':
		  		if(v)
		  			return false;
		  		if(considerEmpty.includes('*')||considerEmpty.includes(v))
		  			return true;
		  		else
		  			return false;

			default:
				return (v ? false : true)
		}
	}

	function isNotEmpty(){
		return !isEmpty.apply(null,arguments);
	}

		
	function sameValue(a,b){
	// _log.traceFunc(arguments,'sameValue');
		if(typeof a!=typeof b)
			return false;
		
		if(a===b)
			return true;

		if(a===null || b===null)
			return false; //if both were null, they'd return true ^^, now only one is, which means !=
		
		switch(varType(a)){
			case 'number':
			case 'string':
			case 'boolean':
			case 'node':
			case 'function':
			case 'undefined':
				return false; //since we tried ^^, we know they're not the same

			case 'array'://Order and values are important
				if(a.length!=b.length)
					return false;
				return stringifySafe(a)==stringifySafe(b); 
			
			case 'object'://Order could have changed, without properties having changed... still same value
				//As a fast first check, just like with array ^^, check that we have the same number of keys
				var aKeys=Object.keys(a), bKeys=Object.keys(b);
				if(aKeys.length!=bKeys.length)
					return false;

				//Then check that the keys are the same (sorting first since order doesn't matter here)
				aKeys.sort();
				bKeys.sort();
				if(!sameValue(aKeys,bKeys))
					return false;

				//Finally compare every value
				return aKeys.every(key=>a[key]===b[key])
			

			case 'nodelist':
				if(a.length!=b.length)
					return false;
				for(let i=a.length-1; i>=0;i--){
					if(a[i]!=b[i])
						return false;
				}
				return true;
		}
	}

	/*
	* @return bool
	*/
	function compare(a,operator,b,c){
		return getCompareFunc(operator)(a,b,c);
	}
	compare.operators=['===','==','!=','!','!==','<','>','<=','>=','in','between','startsWith','endsWith','contains','regexp']
	compare.isOperator=(operator)=>compare.operators.includes(operator);
	compare.startsWithOperator=(string)=>{
		if(typeof string!='string'){
			return undefined;
		}
		return compare.operators.find(op=>string.indexOf(op)==0);
	}
	/*
	* @return [operator,rest of string turned into real value]
	*/
	compare.splitOnOperator=(string)=>{
		let op=compare.startsWithOperator(string)
		if(op)
			return [op,stringToPrimitive(string.substr(op.length))]
		else
			return [undefined,string];
	}
	function getCompareFunc(operator='==='){
		checkType('string',operator);
		switch(operator){
			case '===' : return (a,b)=>a===b;
			case '==' : return (a,b)=>a==b;
			case '!=' :
			case '!' : return (a,b)=>a!=b;
			case '!==' : return (a,b)=>a!==b;
			case '<' : return (a,b)=>a<b;
			case '>' : return (a,b)=>a>b;
			case '<=' : return (a,b)=>a<=b;
			case '>=' : return (a,b)=>a>=b;
			case 'in' : return (a,b)=>(Array.isArray(b) ? b : [b]).includes(a);
			case 'between' : return (a,b,c)=>typeof a=='number' && a>=b && a<=c;
			case 'startsWith' : return (a,b)=>typeof a=='string' && a.startsWith(b);
			case 'endsWith' :return (a,b)=>typeof a=='string' && a.endsWith(b);
			case 'contains' : return (a,b)=>typeof a=='string' && a.indexOf(b)>-1;
			case 'regexp' : return (a,b)=>typeof a=='string' && a.search(b)>-1;
			default:
				_log.throwCode('EINVAL',"Unknown operator: "+operator);
		}
	}




	/*
	* Check if a var is primitive or not
	*
	* NOTE: null is an object in javascript, but we're including it as a primitive as it can be considered 'not complex' 
	* 		and can easily be written to a log, file or stream without formating/encoding. 
	*
	* @param any x
	*
	* @return boolean
	*/
	function isPrimitive(x){
		if(x===null)
			return true
		switch(typeof x){
			case 'string':
			case 'number':
			case 'boolean':
			case 'bigint':
				return true;
		}
		return false;
	}


	/*
	* Check if all values inside an array or object are primitives
	*
	* @param any x
	*
	* @return boolean
	*/
	function allPrimitive(x){
		if(isPrimitive(x))
			return true;

		switch(varType(x)){
			case 'object':
				x=Object.values(x);
			case 'array':
				return x.every(isPrimitive);
			default:
				return false;
		}
	}


	/*
	* Check if a string is a representation of a native javascript value, eg. true/false
	*
	* @param primitive str 		A primitive or a string representing a primitive
	* 
	* @throw <ble TypeError>
	*
	* @return primitive|undefined
	*/
	function stringToPrimitive(str){ 
		if(typeof str!='string'){
			if(str==undefined)
				return undefined;

			if(!isPrimitive(str))
				_log.makeTypeError('string or primitive',str).throw();
			return str;
		}

		switch(str){
			case 'true':return true;
			case 'false':return false;
			case 'null':return null;
			case 'undefined':return undefined;
			case '':return '';
		}

		let i = stringToNumber(str,true); //true==no throw, we're just testing

		return (i===undefined ? str : i);
	}

	/*
	* Turn a string number with sign into an actual number, eg. '+1'=>1 '-3'=>-3, optionally
	* using it to increment a current number
	*
	* @param string 	change
	* @param boolean 	noThrow 	If true, return undefined if not a number
	*
	* @throw Error 					If not a number. Or @see $noThrow
	* @return number 				Or @see $noThrow
	*/
	function stringToNumber(str,noThrow=false){
		switch(typeof str){
	        case 'number':
	            return str;
	        case 'string':
				let number=Number(str);
				if(typeof number=='number' && !isNaN(number))
					return number;

	            //don't break here, let it fall through to bad value vv
	        default:
	        	if(noThrow)
	        		return undefined
	        	else
	            	throw new Error("Bad value, expected a numerical string with an optional sign, got: "+ vX.logVar(str));
	    }
	}

	/*
	* Force a specific type, eg. turn "1" into 1
	*
	* @param string 	expectedType
	* @param mixed 		value
	*
	* @throw TypeError
	* @return mixed
	*/
	function forceType(expectedType,value){
		if(checkType(['string','array'],expectedType)=='array'){
			var value2;
			if(expectedType.find(type=>{try{value2=forceType(type,value);return true;}catch(err){return false;}})){
				return value2;
			}
		}else{

			var gotType=varType(value);
			switch(expectedType){
				case gotType:
					return value;
				case 'undefined':
				case 'null':
					//If we got the string 'undefined', return undefined etc
					if(typeof value=='string' && value==expectedType)
						return value=='null' ? null : undefined;

					//If we got any empty value, return undefined etc
					if(isEmpty(value))
						return expectedType=='null' ? null : undefined;

					break;
				case 'boolean':
					switch(value){
						case 'true':
						case 'TRUE':
							return true;
						case 'false':
						case 'FALSE':
							return false;
						default:
							return value ? true : false;
					}
				case 'number':
					var num=Number(value); //this will convert booleans and strings, but not null, undefined etc...
					if(!isNaN(num))
						return num;
					//If we didn't make a number, throw at bottom...
					break;
				case 'string':
					if(gotType=='array'||gotType=='object')
						return JSON.stringify(value);
					else
						return String(value);
				case 'promise':
					return Promise.resolve(value);
				case 'error':
					return new Error(String(value));
				case 'function':
					_log.throwCode("EINVAL","Cannon force to type 'function'.");
									
				case 'array':
					//turn objects with numerical keys into arrays... 
					if(gotType=='object'){
						if(Object.keys(value).every(Number.isInteger))
							return Object.values(value);
						else
							break; //any other type of object is bad
					}
					//don't break so we can try for json vv
				case 'object':
				// console.log('expected type:',expectedType,'         got type:',gotType)
					if(gotType=='string')
						return jsonParse(value,'object');
					break;
				default:
					_log.throwCode("BUGBUG","BetterUtil.forceType() expected arg #1 to be a return value of BetterUtil.varType(), got:",expectedType);
			}
		}
		//If we're still running, throw a TypeError
		_log.makeTypeError(expectedType,value).changeWhere(1).throw();
	}


	/*
	* This function attempts to parse a JSON string
	*
	* @param string|object|array 	The string is parsed, the object/array just returned 
	*
	* @throws <ble EEMPTY>    	Got an empty string
	* @throws <ble EINVAL>    	Got a string that isn't close to JSON
	* @throws <ble EFORMAT>   	Got a string that is probably badly formated JSON
	* @throws <ble TypeError>   Arg #1 wasn't a string (or already the expected type)
	* @throws <ble EMISMATCH>   Successfully parsed x as JSON but it produced a value of a non-expected type
	*
	* @return object|array
	*/ 
	function jsonParse(x,expectedType){
		let exp="Expected a JSON string"

		if(typeof x=='string'){
			let trimmed=x.trim();
			if(!trimmed)
				_log.throwCode("EEMPTY",exp+", empty string.");

			try{
				var parsed=JSON.parse(trimmed);
				
				//If a specific type was requested...
				if(expectedType)
					try{checkType(expectedType,parsed)
					}catch(err){
						err.msg=err.msg.replace(', got:',', but json string parsed into');
						err.throw('EMISMATCH');
					}

				return parsed;

			}catch(jsonErr){
				let recursErr=false,note,err;
				try{
					//Try removing comments, and if something changes take that as a sign and run this
					//function again
					var stripped=stripFullLineComments(trimmed);
					if(stripped!=trimmed){
						if(stripped==''){
							note="Was the whole string a comment? Because BetterUtil.stripFullLineComments() thought it was.";
						}else{
							_log.debug("Removed comments from string and trying again");
							try{return jsonParse(stripped)}catch(e){recursErr=e;throw e}
						}
					}
					let wrapper=trimmed.substr(0,1)+trimmed.substr(-1); //NOTE substring() and substr() don't work the same!
					if(wrapper=='{}'||wrapper=='[]'){
						err=_log.makeError(`${exp}, which this probably is, but poorly formated:\n`,jsonErr.message)
							.setCode("EFORMAT");
						
						//See if we can find where the issue occured...
						let errStr=String(jsonErr)
							,pos=Number(errStr.substr(errStr.lastIndexOf(' ')));
						if(!isNaN(pos)){
							err.highlightBadCode(x,pos);
						}else{
							err.addExtra(logVar(x,300,'noType'));
						}

					}else{
						err=_log.makeError(`Not a JSON string. ${jsonErr.message}:`).addExtra(logVar(x,300,'noType'))
							.setCode("EINVAL");
					}
					if(note){
						err.addHandling(note);
					}

				}catch(e){
					if(e==recursErr){
						throw e;
					}else{
						throw _log.makeError(e).setBubble(jsonErr).setCode('BUGBUG').exec();
					}
					
				}
				err.throw();
			}
		}else{
			if(x==undefined || x==null){
				_log.throwCode("EEMPTY",exp+", got: "+x);
			}

			_log.throwType('JSON string',x);		
		}
	}


	/*
	* This function attempts to parse a JSON string without throwing errors
	*
	* @param any x 
	* @opt bool|string expectedType  If truthy this will return undefined if jsonParse fails. If a specific vartype it
	*                                will check the resulting value against that else return undefined. If omitted 
	*                                $x will be returned if jsonParse fails
	*
	* @return any|object|undefined   Returns undefined if parse failed or gave the wrong type UNLESS we don't care about
	*                                the type in which case $x is returned
	* @no-throw
	*/ 
	function tryJsonParse(x, expectedType=undefined){
		try{
			//If we already have what we want...
			if(expectedType && checkType(expectedType,x,true))
				return x;
			//2020-10-01: WEIRD: First ^ didn't work but vv did... now they both work?!
			// if(expectedType){
			// 	let alreadyRightType=checkType(expectedType,x,true);
			// 	if(alreadyRightType)
			// 		return x
			// } 

			//If this doesn't throw than we got exactly what we wanted
			return jsonParse(x,expectedType);

		}catch(err){
			//If we didn't care at all, just wanted to test, don't log anything just return the original value
			if(!expectedType)
				return x;

			//If we did care but didn't get it, log something then return undefined
			switch(err.code){
				case 'EFORMAT': //bad json string, probably want the oppertunity to correct that
				case 'EMISMATCH': //parse succeeded but gave us something unexpected
					err.setLvl('warn').exec(); break;
				
				case 'TypeError': //Not a string at all
				case 'EINVAL': //not a json string at all
					err.setLvl('debug').exec();
			}
			return undefined;
		}
	}


	/*
	* This function attempts to stringify any value, checking first if it is already stringified.
	* @param any x
	* @return string 	A string that can be passed to JSON.parse() (possibly an empty string)
	*/

							 
	function tryJsonStringify(x){	
		try{
			JSON.parse(x)
			return x; //x is already a JSON string
		} catch(e){
			try{
				return JSON.stringify(x)||''
			}catch(e){
				return ''
			}
		}
	}



	/*
	* Turn object into JSON-like string, ie. not valid JSON just something that looks good to log
	*/
	function stringifySafe(obj){
		try{		
			//Attempt just to use JSON. This can fail eg. if any circular refs exist (usually true in browser)
			return JSON.stringify(obj);
		}catch(err){
			if(err.message.indexOf('circular structure')>-1){
				//In case of circ struct, just attempt to get a little bit of info about the first level
				//structure... so we have something to log
				try{
					var x='';
					Object.entries(obj).forEach(([key,value])=>{
						x+=key+':';
						switch(varType(value)){
							case 'number':
							case 'string':
								x+=value;
								break;
							default:
								x+=Object.prototype.toString.call(value);
						}
						x+=','
					})
					if(varType(obj)=='array')
						x='['+x+']';
					else
						x='{'+x+'}';

					throw 'Failed to stringify (circular structure):'+x
				}catch(e){
					err=e;
				}
			}
			_log.error(err);
			return `<err:${err.message}>`
		}
	}



	/*
	* Copy any value, decoupling it from the original 
	*
	* NOTE: Primitives and functions are just returned as is
	*
	* @param any x
	*
	* @return any 	@see $x
	*/
	function copy(x){
		let t=varType(x);
		switch(t){
			case 'arguments':
				x=Array.from(x);
			case 'object':
			case 'array':
				try{
					return JSON.parse(JSON.stringify(x));
				}catch(e){
					if(e.message.startsWith('Converting circular structure to JSON')){
						e=_log.makeError(e).addExtra(x);
					}
					throw e;
				}
			case 'node':
				return x.cloneNode(true);
			case 'nodelist':
				return Array.from(x,node=>node.cloneNode(true));
			case 'promise':
				return new Promise((resolve,reject)=>{x.then(resolve,reject)});
			default:	
				return x;
		}
	}


	/*
	* Like @see copy(), but objects and functions are copied resursively so prototype chains are
	* also decoupled
	*
	* @param any x
	* @throw <ble> 	If we fail to perform the copy
	* @return any 	@see $x
	*/
	function deepCopy(x){
		// console.log('Calling deepCopy() on:',logVar(x));

		//To maintain all internal refs, once something has been copied that copy should be used every time, so 
		//we create a map to hold them
		var refs=new Map();

		//To prevent infinite loop we keep track of recursions...
		var depth=0;

		//The most fundamental of all prototypes is that of the Object constructor, which means we may need it once or twice, so
		//let's get it once
		var objectPrototype=Object.getPrototypeOf({});

		function copyPrototypeChain(x){
			// console.log('Calling copyPrototypeChain() on:',logVar(x));
			//First get all the objects along the chain...
			var chain=getPrototypeChain(x);
			

			//If no chain was found, or just contains the Object prototype, then just return the Object prototype
			if(!chain.length || (chain.length==1 && chain[0]==objectPrototype)){
				return objectPrototype;
			}

			//...then start from the end and deepCopy them all, returning the last one
			// console.log(`the prototype chain was ${chain.length} items deep:`,chain);
			var obj,i=0;
			while(chain.length){
				let link=chain.pop();
				if(link==objectPrototype){
					// console.log(`chain link ${++i}: <prototype:Object>`);
					obj=objectPrototype
				}else{
					// console.log(`chain link ${++i}, deep copying:`,link);
					obj=_deepCopy(link); //to save one call we first check if this is the object prototype
				}
			}
			return obj;
		}

		function _deepCopy(x,_key,parent){

			//If we've gone too deep, throw to prevent long loop that exceeds stack...
			if(depth>30){
				if(x)
					console.error(x)
				_log.throw(new RangeError('Maximum call stack size may be exceeded due to infinite loop, aborting!'));
			}

			//Anything we've already copied (impling something is referenced more than once, eg a constructor being set on it's own prototype)
			//we return that copy/ref (see top of func^)
			if(refs.has(x)){
				// console.log('_deepCopy() already has a ref for:',logVar(x));
				return refs.get(x);
			}

			// console.log('Calling _deepCopy() on:',logVar(x),_key);

			let isArray=false;
			switch(varType(x)){
				case 'arguments':
					x=Array.from(x);
				case 'array':
					isArray=true;
				case 'object':

					//Prototypes of builtin functions we just return...
					try{
						let builtinsIndex;
						if(!isArray && x.constructor && (builtinsIndex=builtins.indexOf(x.constructor))>-1 && builtins[builtinsIndex].prototype==x){
							// console.log('ignoring prototype of builtin constructor',builtins[builtinsIndex])
							refs.set(x,x); //so we're quicker next time
							return x;
						}
					}catch(err){
						_log.throw("Problem trying to determine if arg was prototype of builtin.",err);
					}

					//Start by creating a new empty object with the same prototype chain...
					depth++;
					var y=Object.create(copyPrototypeChain(x));
					depth--;
					//...then store this new object so it's used every time x might come up further down the structure...
					refs.set(x,y);
					refs.set(y,y);

					//...then loop through all the own properties and set them on this new object, calling this method 
					//recursively (ie. if we find any nested objects or functions)
					let name=x.constructor.name;
					for(let [key,desc] of Object.entries(Object.getOwnPropertyDescriptors(x))){
						let _desc={configurable:desc.configurable};
						try{
							depth++;
							if(desc.hasOwnProperty('value')){
								_desc.writable=desc.writable;
								_desc.value=_deepCopy(desc.value,key,x);
							}else{
								if(desc.set)_desc.set=_deepCopy(desc.set,key,x)
								if(desc.get)_desc.get=_deepCopy(desc.get,key,x)
							}
							depth--;
							Object.defineProperty(y,key,_desc)
						}catch(err){
							_log.throw(`Failed to deepCopy() key '${key}'`,err);
						}
					}
					return y;

				case 'function':
					//Builtin functions we just return...
					if(builtins.includes(x)){
						// console.log('ignoring builtin constructor',x)
						return x;
					}

					var funcStr=String(x);
					//Don't copy native functions. Yes, this leaves their prototypes open change.... not sure if we want to change that
					if(funcStr.endsWith('{ [native code] }')){
						// console.log(`ignoring native function '${x.name}' on`,parent)
						refs.set(x,x);
						return x;
					}

					//If the function has already been copied we wanted the if clause ^ to have caught it... apparently it didn't...
					if(funcStr=='function(){/*deep copied function*/return x.apply(this,arguments);}'){
						_log.warn(`BUGBUG: _deepCopy() was called with an already copied function '${x.name}', but somehow it never got stored in the "refs" map`,refs
							,"This might mean that you've called deepCopy() again with the returned value of a previous call...");
						refs.set(x,x);
						return x;
					}

					//Wrap in another function but make sure to retain the name
					let tmp={};
					tmp[x.name]=function(){/*deep copied function*/return x.apply(this,arguments);}
					let fn=tmp[x.name];
					Object.defineProperty(fn,'name',{value:x.name,writable:true,configurable:true}); //not sure if this is necessary
					
					//store for future use, do this BEFORE copying the prototype chain since there may be circular refs down it...
					// console.log('storing function',x.name,funcStr)
					refs.set(x,fn); 
					refs.set(fn,fn);
					
					//Decouple prototype chain and set the new function as the constructor on said chain (also storing ref)
					depth++;
					if(!refs.has(x.prototype)){
						let chain=copyPrototypeChain(x);
						refs.set(x.prototype,chain);
						refs.set(chain,chain);
					}
					depth--;
					fn.prototype=refs.get(x.prototype);

					try{
						Object.defineProperty(fn.prototype,'constructor',{value:fn,configurable:true})
					}catch(err){
						_log.makeError(err).append(':').addExtra(fn.prototype,proto).throw();
					}

					return fn;

				case 'node':
				case 'nodelist':
				case 'promise':
				case 'error': //TODO: other handling??
				default:	
					let c=copy(x);
					refs.set(x,c);
					refs.set(c,c);
					return c;
			}
		}
		try{
			return _deepCopy(x);
		}catch(err){
			_log.throw(`Failed to deepCopy ${logVar(x)}`,err);
			// return copy(x);
		}
	}


	/*
	* Get the prototype chain
	*
	* @param object|function
	* @return array
	*/
	function getPrototypeChain(x){
		let t=typeof x;
		switch(typeof x){
			case 'object':
				var proto=Object.getPrototypeOf(x); break;
			case 'function':
				proto=x.prototype; break;
			default:
				_log.throwType('function or instance',x);
		}

		//Loop ever deeper and fetch all the prototypes in order
		var chain=[],i=0;
		while(proto && typeof proto=='object'){
			chain.push(proto);
		    proto=Object.getPrototypeOf(proto)
		    i++;
		    if(i>20) //arbitrary number
		    	throw new Error('Too many prototypes in chain');
		}

		return chain;
	}




	function instanceOf(expected,gotObj,returnFalse){
		try{checkType(['function','object'],expected);}
		catch(err){
			throw new TypeError("BUGBUG instanceOf() expected arg #1 to be a constructor or object, got: "+logVar(expected));
		}

		checkType('object',gotObj);
		
		if(gotObj instanceof expected)
			return gotObj.constructor;
		else if(returnFalse)
			return false;
		else{
			var who=typeof expected=='function' ? expected.name : expected.constructor.name;
			throw new TypeError("Expected instance of "+who+", got: "+gotObj.constructor.name);
		}
	}



	var stripper=new RegExp(/^\s*\/\/.*$/mg)
	var remover=new RegExp(/^\s*\/\/.*$/m)
	function stripFullLineComments(str){
		checkType('string',str);

		//For logging only, we first match ALL occurences...
		let m=str.match(stripper);
		if(m){
			m=Object.values(m);
			let entry=_log.makeEntry(`Found ${m.length} comments in:`,logVar(str,50));
			m.forEach(comment=>{
				entry.addHandling("Removing comment:",comment)
				//...but then we use the other regexp to remove one at a time. Slow but logs good!
				str=str.replace(remover,'');
			})

			str=str.trim(); 
				//^We don't trim outside this if-block so $str doesn't change if there are no comments, see tryJsonParse() and
				//try to figure our why ;)
		}else{
			_log.trace("No comments in:",logVar(str,50));
		}
		return str;
	}




	//Methods to export
	return _exports 


}
//simpleSourceMap=
//simpleSourceMap2=