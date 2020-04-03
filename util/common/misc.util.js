//simpleSourceMap=/my_modules/util/common/misc.util.js
//simpleSourceMap2=/lib/util/common/misc.util.js
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
module.exports=function export_mX({_log,stX,vX}){

	//Methods to export
	var _exports={

		'round':round

		,'getRandomInt':getRandomInt

		,'eventTimeout':eventTimeout

		,'mapping':{
			'prepare':prepareMap
			,'apply':applyMap
		}

		,range
	};


	/*
	* Round to specific number of decimal places
	* 	http://www.jacklmoore.com/notes/rounding-in-javascript/
	*
	* @param number value 		Any value to round
	* @param number decimals 	Integer number of decimals
	*
	* @return number
	*/
	function round(value, decimals=0) {
	  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
	}




	function getRandomInt(max=1000000) {
	  	return Math.floor(Math.random() * Math.floor(max));
	}





	/*
	* Listen for an event once, calling callback if it's not fired within a given period
	*
	* @param <EventEmitter> emitter 	Just needs to have method 'once'
	* @param string 		eventName
	* @param number 		timeoutMs
	* @param function 		timeoutCallback
	* @param mixed 			callbackArg
	*
	* @return number 	The timeout id so it can be cleared
	*/
	function eventTimeout(emitter,eventName,timeoutMs,timeoutCallback,callbackArg){
		var triggered=false;
		emitter.once(eventName,()=>triggered=true);
		return setTimeout(()=>{
			if(triggered==false)
				timeoutCallback(callbackArg)
		},timeoutMs)
	}









	/*
	* This function transforms a @map and @returns an object where parameter keys can be thought of
	* as 'aliases'(many) and parameter values are the (few) names they map to.
	* 
	* @param object map				Keys are the desired props, values are single aliases, 
	*								  or arrays of aliases. Example: 
	*										{'Name':'n','Age':['a','years']}
	* @param @opt boolean addSelf 	Default true. If true, add entry to map that maps the desired prop 
	*								 to itself (makes it easy to just lookup once)
	* @param @opt boolean addLower 	Default true. If true, the lower case of each desired prop will be 
	*								  included
	* 
	* @throw TypeError 		If $map is poorly formated
	*
	* @return: An object where each parameter name corresponds to a string the case and spelling of which
	*		  is the desired output when applying the prapared map. Example:
	*		  {
	*		 	 'Name': 'Name' 	<-- included if @addSelf = true
	*		 	 ,'name': 'Name'	<-- included if @addLower = true
	*			 ,'n':'Name' 
	*		 	 ,'Age':'Age', 		<-- included if @addSelf = true
	*		 	 ,'age':'Age', 		<-- included if @addLower = true
	*		 	 ,'a':'Age', 
	*		 	 ,'years':'Age', 
	*		  }
	*/
	function prepareMap(map, addSelf=true, addLower=true){

		var MAP = {}, real, alias;
		try{
			for(real in map){
				var aliases=map[real];
				if(!Array.isArray(aliases)){
					aliases=[aliases];
				}

				//First add the aliases
				for(alias in aliases){ //eg. n=>Name
					MAP[alias]=real;
				
					//Optionally add lower case version of alias
					if(typeof alias=='string' && addLower){
						MAP[alias.toLowerCase()]=real;
					}
				}

				//Then optionally add lower case version of real
				if(typeof real=='string' && addLower){
					MAP[real]=real
				}

				//Then optionally add self
				if(addSelf){
					MAP[real]=real
				}
			}

			//Finally, set secret prop so we can know it's already been prepared (to allow
			//both prepared and unprepared maps to be passed to apply)
			Object.defineProperty(MAP,'_hasBeenPrepared',{value:true});
			return MAP
		} catch(e) {
			_log.throwType('Unsupported formated map passed to prepareMap():', map, e)
		}
		
	}

	/*
	* Map props on an object 
	*
	* @param object data 	
	* @param object map 					The object returned from prepareMap(), or an array that can 
	*											be passed to it
	* @param boolean onlyReturnMatches 		If true, only props with a map-entry will be returned
	* 	
	* @return object 						
	*/
	function applyMap(data, map, onlyReturnMatches=false){
		vX.checkTypes(['object','object'],[data,map]);

		var MAP=(!map._hasBeenPrepared ? prepareMap(map) : map)
			,mData={}
			,key
		;

		if(onlyReturnMatches){
			for(key in data){
				if(MAP[key]){
					mData[MAP[key]]=data[key]
				}
			}
		}else{
			for(key in data){
				mData[MAP[key]]=data[key]
			}
		}

		return mData
	}



	/*
	* Get a range of numbers
	*
	* @param number from
	* @param number to
	*
	* @return array
	*/
	function range(from,to){
		vX.checkTypes(['number','number'],arguments);
		return [...Array(to+1).keys()].slice(from);
	}










	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=