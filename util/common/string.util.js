//simpleSourceMap=/my_modules/util/common/string.util.js
//simpleSourceMap2=/lib/util/common/string.util.js
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
module.exports=function export_stX({_log,vX}){

	//Methods to export
	var _exports={
		formatString
		,firstToUpper
		,firstToLower
		,toLower
		,trim
		,substring
		,'substr':substring //alias
		,replaceAll
		,escapeRegExp
		,regexpAll
		,toCamelCase
		,'dashToCamel':toCamelCase
		,limitString
		,split
	    ,splitAt
	    ,indexWords
	    ,linuxTableToObjects
	    ,progressBar
	    ,queryStrToKeyValuePairs
		,keyValuePairsToQueryStr
	    ,queryStrToObj
	    ,objToQueryStr
		,randomString
		,getUniqueString
		,safeReplace
		,getBashColor
		,wrapInBashColor
		,wrapSubstrInBashColor
	};





	/*
	* Format a string
	*
	* @param string format
	* @param string str
	*
	* @throw TypeError
	* @throw EINVAL        Not a recognized format
	*
	* @return string 	   The formated $str. 
	*/
	function formatString(format,str){
		vX.checkTypes(['string','string'],arguments);

		switch(format.toLowerCase()){
			case 'firsttoupper':
			case 'firstbig':
			case 'capitalize':
				return firstToUpper(str);
			case 'firsttolower':
			case 'firstsmall':
				return firstToLower(str);
			case 'tolowercase':
			case 'tolower':
			case 'lower':
			case 'low':
			case 'small':
				return str.toLowerCase();
			case 'touppercase':
			case 'toupper':
			case 'upper':
			case 'up':
			case 'big':
			case 'large':
			case 'capitals':
				return str.toUpperCase();
			default:
				log.throwCode('EINVAL',"Not a recognized format:",format);
		}
	}


	/*
	* Capitalize first letter of string
	*
	* @param string str
	*
	* @return string
	*/
	function firstToUpper(str){
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/*
	* Un-capitalize first letter of string
	*
	* @param string str
	*
	* @return string
	*/
	function firstToLower(str){
		return str.charAt(0).toLowerCase() + str.slice(1);
	}

	/*
	* Check if string, in which case make lowercaser, else return arg#2
	*
	* @param string 	str
	* @param any 		deflt
	*
	* @return string|@deflt
	*/
	function toLower(str,deflt=undefined){
		return typeof str=='string' ? str.toLowerCase() : deflt;
	}


	/*
	* More capable substring function, able to start and stop based on end of string
	*/
	function substring(str,startIndex,length){
		vX.checkTypes(['string','number',['number','undefined']],arguments);
		//If it starts after the string ends, then return nothing
		if(startIndex>str.length)
			return '';
		
		//A negative start means start from the end
		if(startIndex<0){
			startIndex=str.length+startIndex; 
		}


		if(length>0){
			var endIndex=Math.min(startIndex+length, str.length); //end index
		
		//Count from end of string
		}else if(length<0){
			endIndex=str.length+length
			
			//If ending before we start... empty string
			if(endIndex<startIndex)
				return ''
		}else{
			//The default is to grab the rest of the string
			endIndex=str.length; //end index
		}
	
		
		return str.substring(startIndex,endIndex)
	}



	/*
	* Trim quotes, spaces and newlines from the start/end of a string
	*
	* @var string str 			Any string
	* @var bool   checkEmpty	Default false. If true an error is throw if not non-empty string
	*
	* @throw TypeError 			If @str is not a string
	* @throw Error 				See @checkEmpty
	*
	* @return string  			The trimmed string
	*/
	function trim(str,checkEmpty=false){
		if(typeof str!='string')
			_log.throwType('string',str);


		function replace(s){
			return s
				.trim()
				.replace(/^["'\n]+/,"")
				.replace(/["'\n]+$/,"")
				.trim()
			;
		}

		//Call the above function repeatedly until the string stops changing
		var s,i=0;
		while(str!=(s=replace(str))){
			str=s;
			if(++i>10){
				_log.warn("Exceeded 10 loops when trying to trim string...")
				break;
			}
		}
		
		if(checkEmpty && str=='')
			throw new Error("String was empty");
		else
			return str;
	}







	/*
	* Replace all occurences of a substring. 
	*
	* @param string target 			The string to operate on
	* @param string search 			The substring to remove
	* @param string replacement 	A substring to insert in replacement of @search
	*
	* @return string
	*/
	function replaceAll(target,search,replacement){
		vX.checkTypes(['string','string','string'],arguments)
		if(target.length<40){
			//This is slower than using RegExp, but it does not rely on the search string being properly escaped, 
			//and for a shorter string it may be quicker not to have to escape the search string
			return target.split(search).join(replacement);
		}else{
			//This will be faster, but we have to make sure the search string is escaped first, which only makes
			//it worth it for slightly longer strings
			search=escapeRegExp(search);
			return target.replace(new RegExp(search, 'g'), replacement);
		}


	}

	/*
	* Escape any regexp characters in a string so it can be used for exact matches in an actual RegExp
	*
	* Example: 	'hello.world'=>'hello\.world'
	*
	* @return string
	*/
	function escapeRegExp(str) {
		vX.checkType('string',str)
	 	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
	}



	/*
	* Get all matches for a regexp on a string, ie. run regexp.exec until it returns nothing
	*
	* NOTE: this only works if the 'g' flag is set, else RegExp.exec won't remember the position of the 
	*       last match and you'll have an infinite loop on your hands... So if 'g' is not set, we do it for you
	*
	* @param <RegExp> regexp
	* @param string str
	* @param number maxMatches  Break loop if it matches more than this number. Default 0=infinite
	* 
	* @return array[array,...] 	Each item is a match, ie. a child array. See 
	*			https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#Description
		
		Example. 
			regexp -->	/(\w+)ball/   
			str    -->	'football is better than basketball'
			return -->	[[football,foot],[basketball, basket]]
	*/
	function regexpAll(regexp, str,maxMatches=0){
		// vX.instanceOf(RegExp,regexp);
		vX.checkTypes(['<RegExp>','string'],[regexp,str]);

		//Make sure we have the g flag
		if(regexp.flags.indexOf('g')==-1){
			_log.debug("Adding 'g' flag to regexp else we cannot get all matches. "+regexp);
			regexp=new RegExp(regexp.toString()+'g');
		}

		var matches=[],match,i=0;
		while((match=regexp.exec(str))!==null){
			i++;
			if(maxMatches && maxMatches<i){
				_log.warn(`Exceeded max matches (${maxMatches}), breaking early.`);
				break;
			}
			matches.push(match);
		}

		// _log.trace('The regexp ('+String(regexp)+') matched '+matches.length+' times');
		return matches;
	}



	/*
	* Convert "hello-world" => "helloWorld"
	*
	* @param string str
	* @return string
	*/
	function toCamelCase(str,delim='-'){
		vX.checkTypes(['string','string'],[str,delim]);
		return str.replace(new RegExp(`\\${delim}([a-z])`, 'g'), (match,capture)=>capture.toUpperCase())
	}





	/*
	* Make sure a string isn't too long by removing the middle of it
	*
	* @param string
	* @param number
	*
	* @return string
	*/
	function limitString(str,limit){
		vX.checkType('string',str);
		let len=str.length;
		if(len>limit){
			var half=Math.round(limit/2);
			return str.substring(0,half)+' ...'+(len-limit)+'... '+str.substring(len-half);
		}else
			return str;

	}



	/*
	* return array
	*/
	function split(str,delimit,lastDelimit){
		try{
			vX.checkType('string',str);
			var arr=str.split(delimit);
			vX.checkType(['array'],arr); //throw on fail
			if(lastDelimit){
				var last=arr.pop();
				if(vX.checkType(['string'],last,true))
					arr.concat(last.split(lastDelimit))
			}
			return arr;
		} catch(err){
			_log.throw(err);
		}	

	}

	/*
	* Split a string at multiple locations
	*
	* @param string str 			String to split
	* @param array[number] splitArr Array of numbers where to split the string
	*
	* @return array
	*/
	function splitAt(str,splitArr){
		vX.checkTypes(['string','array'],arguments);
		var arr=[],i;
		for(i=0;i<splitArr.length;i++){
			arr.push(str.substring(splitArr[i],splitArr[i+1]).trim());
		}
		return arr;
	}


	/*
	* From a string, get an object where keys are the starting index of each word and values are the word.
	*
	* @param string line 	
	*
	* @return obj 	
	*/
	function indexWords(line){
		var obj={},i=0;
		line.match(/[^\s]+(\s+|$)/g).forEach(m=>{ //matches non-whitespace followed by whitespace (capture 
												  //group not used for capturing, only regex syntax)
			obj[i]=m.trim(); //m is the full match (word+white), but we trim the white
			i+=m.length;//move index total length of match (word+white)
			//Now i is the starting index of the next word
		})
		return obj;
	}


	/*
	* Turn the output from a linux command into an array of object (ie. one object per line)
	*
	* @param string|array stdout
	* @param @opt boolean headersToLowerCase
	* @param @opt boolean outputIsTerese 		Default false. Set true if lines have spaces in columns 
	*											 other than the before last one, eg:
	* 												name age hobby                weight
	*  	 											Bob  33 To go to the movies      70
	*
	* @return object
	*/
	function linuxTableToObjects(stdout, headersToLowerCase=false, outputIsTerese=false){
		//Make sure we have a string
		if(typeof stdout=='object' && stdout.hasOwnProperty('stdout'))
			stdout=stdout.stdout

		//Turn string into arr
		var arr;
		if(Array.isArray(stdout))
			arr=stdout
		else{
			if(typeof stdout!='string')
				stdout=stdout.toString('utf8').trim();

			if(typeof stdout!='string')
				_log.throwType('string',stdout);

			arr=stdout.split('\n')
		}

		//Make sure arr contains some non-empty lines
		var arr=arr.map(line=>line.trim()).filter(line=>line);
		if(!arr.length)
			return [];

		//extract the headers row and turn into array
		try{
			var headers=arr.splice(0,1)[0];

			//If output is terese, use special function to split...
			if(outputIsTerese){
				let obj=indexWords(headers);
				outputIsTerese=Object.keys(obj);
				headers=Object.values(obj);
			}else{
				headers=headers.split(/\s+/)
			}

			if(headersToLowerCase)
				headers=headers.map(header=>header.toLowerCase());
			// console.log('GOT HEADERS:',headers);
		}catch(err){
			_log.makeError('Failed to convert linux columns to array of objects.',err).throw();
		}

		//Now turn each row into an object, using the header for for prop names
		return arr.map(line=>{
			var values;
			if(outputIsTerese){
				values=splitAt(line,outputIsTerese);
			}else{
				values=line.split(/\s+/);							//BUG: this split combined with.... vv
				// log.info('GOT VALUES:',values);

				//Assume that only the last column has spaces... may NOT be the case...
				if(values.length>headers.length){
					//eg. 	name 		description 	=> ['name','description']
					//		Bob 		Likes to ski 	=> ['Bob','Likes','to','ski']
					let lastCol=values.splice(headers.length-1).join(' ');
					values.push(lastCol);
					//now we have: ['Bob', 'Likes to ski']
				}
			}

			if(values.length!=headers.length){
				_log.throw("Problem converting columns to array of objects. There are "
					+`${headers.length} headers and ${values.length} values`,log.logVar(headers,1000), log.logVar(values,1000))
			}

			var obj={};
			for(let i in headers){
				obj[headers[i]]=values[i];
			}
			return obj;
		})
	}


	/*
	* @param number progress      Can be 0-1 or 2-100. >100 treated as 1 (but warns) (ie. you should use 0-1)
	* @param number totalLength   
	* @param string|number color  Defaults to black
	* @param string fill          The character to use for the part of the progress bar that has passed
	* @param string empty         The character to use for the part of the progress bar remains
	*
	* @throws <ble TypeError>     on $progress
	*
	* @return string
	*/
	function progressBar(progress,totalLength=10,color=null,fill='x',empty='.'){
		vX.checkType('number',progress);
		
		if(progress>1&&progress<100)
			progress=progress/100
		else if(progress>100){
			_log.warn("Progress should be between 0-1, defaulting to 1. Got: "+progress);
			progress=1;
		}

		if(typeof totalLength!='number')
			totalLength=10;

		var prog=Math.round(progress*totalLength),rest=totalLength-prog
		
		fill=fill.repeat(prog);
		
		if(color)
			fill=wrapInBashColor(fill,color); //no throw, defaults to black
		
		return '['+String(fill)+String(empty).repeat(rest)+']';

	}


	/*
	* Turn a hash or search string into an array of key/value pairs
	*
	* @param string str 	A query string like "hello=bob&foo[]=bar,car", with or without leading # or ?
	*
	* @see keyValueParisToQueryStr()
	*
	* @throw <ble.TypeError>
	* @return object 		Eg. [ ["hello","bob"], ["foo",["bar","car"]] ]
	*/
	function queryStrToKeyValuePairs(str){
		vX.checkType('string',str);

		//Remove leading ? or #
		if(str.substring(0,1)=='#'||str.substring(0,1)=='?')
			str=str.substring(1);

		return str.split('&').map(pair=>{			
	    	try{
		        var [key,value]=pair.split('=');

		        //Empty values are allowed (the key becomes a flag), but not missing keys
		        if(key){
		        	//First turn obvious stuff into their real vartype, like numbers, null, undefined etc.
		        	var value=vX.stringToPrimitive(value);
		        	// if it's still a string, decode it...
		        	if(value && typeof value=='string'){
		        		value=decodeURIComponent(value);
		        	}
		        	//The key could indicate that we have an array...
			        if(key.substring(key.length-2)=='[]'){
			        	key=key.substring(0,key.length-2);
			        	if(vX.isEmpty(value)){ //null, undefined, empty string... but not false or 0
			        		value=[]
			        	}else if(typeof value=='string'){
			        		value=value.split(',').map(vX.stringToPrimitive);
			        	}else{
			        	 	value=[value]; //could be '0' or 'false'
			        	}

			        //Or the value could indicate that it's a json
			        }else if(value[0]=='{' || value[0]=='['){
			        	value=vX.tryJsonParse(value) //will return parsed object or the same string on fail
			        }
			        return [key,value];
		        }
	    	}catch(err){
	    		_log.warn("Bad pair in uri string:",pair,str,err);
	    	}
	    	return false;
		}).filter(pair=>pair);
	    
	}


	/*
	* Turn an array of key/value pairs into a legal query string
	*
	* @param array arr 	Eg. [ ["hello","bob"], ["foo",["bar","car"]] ]
	*
	* @see queryStrToKeyValuePairs()
	*
	* @throw <ble.TypeError>
	* @return string 		Eg. "hello=bob&foo[]=bar,car". NOTE: no leading '?' or '#'
	*/
	function keyValuePairsToQueryStr(arr){
		vX.checkType('array',arr);
		return arr.map(([key,value])=>{
			//For all-primitive, arrays we use the special syntax: key[]=item1,item2
			if(Array.isArray(value) && vX.allPrimitive(value)){
				key+='[]'
				value=value.join(',');
			}

			if(typeof value=='object'){
				value=JSON.stringify(value);
			}

			//Empty string, null and undefined all get turned into empty string
			if(vX.isEmpty(value,null)){ //null is normally considered non-empty
				value=''
			}
			return key+'='+encodeURIComponent(value);
		}).join('&');
	}




	/*
	* Turn a hash or search string into an object
	*
	* @param string str 	A query string like "hello=bob&foo[]=bar,car", with or without leading # or ?
	*
	* @see objToQueryStr()
	*
	* @throw <ble.TypeError>
	* @return object 		Eg. {hello:"bob",foo:["bar","car"]}
	*/
	function queryStrToObj(str){
		var obj={};
		queryStrToKeyValuePairs(str).forEach(([key,value])=>obj[key]=value);
		return obj;
	}

	/*
	* Turn an object into a legal query string
	*
	* @param object obj 	Eg. {hello:"bob",foo:["bar","car"]}
	*
	* @see queryStrToObj()
	*
	* @throw <ble.TypeError>
	* @return string 		Eg. "hello=bob&foo[]=bar,car". NOTE: no leading '?' or '#'
	*/
	function objToQueryStr(obj){
		vX.checkType('object',obj);
		return keyValuePairsToQueryStr(Object.entries(obj));
	}



	function randomString(length=32, chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
	    var result = '';
	    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
	    return result;
	}


	function getUniqueString(str, existing){
		vX.checkTypes(['string','array'],arguments);

		if(!existing.includes(str))
			return str;

		//First try appending a number from 2 to 999
		var i;
		for(i=2;i<1000;i++){
			let str2=str+'_'+String(i);
			if(!existing.includes(str2))
				return str2;		
		}

		//Then try 10 times to append a random string
		i=10;
		while(i--){
			let str2=str+'_'+randomString(10);
			if(!existing.includes(str2))
				return str2;			
		}

		//This is veeeeeeeeeeery unlikely...
		_log.throw("Could not find unique string",arguments);
	}

	/*
	* Safer version of $source.replace($remove,$add) 
	*
	* @param string source 	The text body which we want to alter
	* @param string remove 	The part we want to remove
	* @param string add 	The bit we want to insert in $remove's stead
	*
	* @return string 		The new altered string
	*/
	function safeReplace(source,remove,add){
		vX.checkTypes(['string','string','string'],arguments);
		let start=source.indexOf(remove)
		    ,end=start+remove.length
		; 
		return source.substr(0,start)+add+source.substr(end);
	}




	const bashColors={
		'black':30      
		,'red':31      
		,'green':32      
		,'yellow':33      
		,'blue':34      
		,'magenta':35      
		,'cyan':36      
		,'white':37  
	}    
		
	/*
	* @param string|number
	* @return number
	* @no-throw          Defaults to the color black
	*/
	function getBashColor(color){
		try{
			if(vX.checkType(['string','number'],color)=='number'){
				// Just assume it's right
				return color;
			}else{
				color=color.toLowerCase();

				//First make sure we have a color
				var base=Object.keys(bashColors).find(c=>color.includes(c));
				if(!base)
					_log.throwCode('EINVAL',"This color doesn't exist: "+color);
				base=bashColors[base];

				//Then check if it's a background
				if(color.includes('background'))
					base+=10

				//Then check if it's bright
				if(color.includes('bright'))
					base+=60

				return base;
			}
		}catch(err){
			_log.warn('Bad color, defaulting to black.',err);
		}
		return bashColors['black'];
	}

	/*
	* Wrap string in bash color codes
	*
	* @param string str                 Any value will be turned into string
	* @params string|number ...colors   Bad colors will default to black
	*
	* @return string
	* @no-throw             
	*/
	function wrapInBashColor(str,...colors){
		return colors.map(c=>'\x1b['+getBashColor(c)+'m').join('')+String(str)+'\x1b[0m';
	}

	/*
	* Wrap substring in bash color codes
	* @return string
	*/
	function wrapSubstrInBashColor(str,start,stop,...colors){
		return str.substr(0,start)+wrapInBashColor(str.substr(start,stop-start),...colors)+str.substr(stop);
	}





	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=