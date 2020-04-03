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
		md5hash
		,formatString
		,firstToUpper
		,firstToLower
		,toLower
		,trim
		,substring
		,replaceAll
		,escapeRegExp
		,regexpAll
		,limitString
		,split
	    ,splitAt
	    ,indexWords
	    ,linuxTableToObjects
	    ,wrapInBashColor
	    ,progressBar
	    ,queryStrToObj
		,dashToCamel
		,randomString
		,getUniqueString
	};


	/*
	* Get hexdec encoded md5 sum of string
	*
	* @param string str
	*
	* @return string 	
	*/
	function md5hash(str){
		if(typeof CryptoJS=='undefined')
			throw new Error("Cannot find CryptoJS");
		if(typeof str != 'string')
			throw new TypeError("Can only hash strings")

		var hash = CryptoJS.MD5(str);
		return hash.toString(CryptoJS.enc.hex);
	}


	/*
	* Format a string
	*
	* @param string format
	* @param string str
	*
	* @return string 		The formated $str, or an empty string if no such format exists or
	*						$str wasn't a string
	*/
	function formatString(format,str){
		if(typeof str!='string')
			return '';

		switch(format){
			case 'firstToUpper':
			case 'firstBig':
			case 'capitalize':
				return firstToUpper(str);
			case 'firstToLower':
			case 'firstSmall':
				return firstToLower(str);
			case 'toLowerCase':
			case 'toLower':
			case 'lower':
			case 'low':
			case 'small':
				return str.toLowerCase();
			case 'toUpperCase':
			case 'toUpper':
			case 'upper':
			case 'up':
			case 'big':
			case 'large':
			case 'capitals':
				return str.toUpperCase();
		}

		return '';
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
	* More capable substring function, able to start from end of string
	*/
	function substring(str,start,length){
		vX.checkType('string',str);
		if(start>str.length)
			return '';
		
		if(start<0){
			start=str.length+start;
		}

		var finish=str.length;
		if(typeof length=='number')
			Math.min(start+length, str.length);
		
		return str.substring(start,finish)
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



	var bashColors={
		//Color			Text 	Background
		'black'			:['30'	,'40']
		,'red'			:['31'	,'41']
		,'green'		:['32'	,'42']
		,'yellow'		:['33'	,'43']
		,'blue'			:['34'	,'44']
		,'magenta'		:['35'	,'45']
		,'cyan'			:['36'	,'46']
		,'white'		:['37'	,'47']
		,'brightblack'	:['90'	,'100']
		,'brightred'	:['91'	,'101']
		,'brightgreen'	:['92'	,'102']
		,'brightyellow'	:['93'	,'103']
		,'brightblue'	:['94'	,'104']
		,'brightmagenta':['95'	,'105']
		,'brightcyan'	:['96'	,'106']
		,'brightwhite'	:['97'	,'107']
	}

			


	function wrapInBashColor(str,f,b){
		var c;
		if(typeof f=='string'){
			f=f.toLowerCase().replace(' ','')
			if(bashColors.hasOwnProperty(f)){
				c=bashColors[f][0];
				str='\x1b['+c+'m'+str
			}
		}

		if(typeof b=='string'){
			b=b.toLowerCase().replace(' ','')
			if(bashColors.hasOwnProperty(b)){
				c=bashColors[b][1];
				str='\x1b['+c+'m'+str
			}
		}

		if(c)
			str+='\x1b[0m';

		return str;
	}



	function progressBar(progress,totalLength=10,color=false,fill='x',empty='.'){
		var prog=Math.round(progress*totalLength),rest=totalLength-prog
		fill=fill.repeat(prog);
		if(color)
			fill=wrapInBashColor(fill,color);
		return '['+fill+empty.repeat(rest)+']';

	}


	/*
	* Turn a hash or search string into an object
	*
	* @param string str 	A query string like "hello=bob&foo[]=bar,car", with or without leading # or ?
	*
	* @see obj.util.js:objToQueryStr()
	*
	* @throw <ble.TypeError>
	* @return object 		Eg. {hello:"bob",foo:["bar","car"]}
	*/
	function queryStrToObj(str){
		vX.checkType('string',str);

		//Remove leading ? or #
		if(str.substring(0,1)=='#'||str.substring(0,1)=='?')
			str=str.substring(1);

		var obj={},pairs = str.split('&'),i=pairs.length-1;
	    for (i;i>=0;i--) {
	    	try{
		        var pair = pairs[i].split('='),key=pair[0];
		        //Empty values are allowed (the key becomes a flag), but not missing keys
		        if(key){
		        	//First turn obvious stuff into their real vartype, like numbers, null, undefined etc.
		        	var value=vX.stringToPrimitive(pair[1]);
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
			        obj[key]=value;
		        }
	    	}catch(err){
	    		_log.warn("Bad pair in uri string:",pairs[i],str,err);
	    	}
	    }
	    return obj;
	}

	/*
	* Convert "hello-world" => "helloWorld"
	*
	* @param string str
	* @return string
	*/
	function dashToCamel(str){
		return str.replace(new RegExp('-([a-z])', 'g'), (match,capture)=>capture.toUpperCase())
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



	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=