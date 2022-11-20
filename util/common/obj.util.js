//simpleSourceMap=/my_modules/util/common/promise.util.js
//simpleSourceMap2=/lib/util/common/promise.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module contains helper/util functions related to OBJECTS
*/
'use strict';
module.exports=function export_oX({_log,vX,aX}){

	//Methods to export
	const _exports={
		objCreateFill
		,combineKeysValues
		,recombineKeysValues
		,addUniqueItemToNestedArr
		,combineUniqueNestedArrays
		,splitArrayItemsToObject
		,indentStringToObject
		,objectToLines
		,linesToObj
		,flattenObject
		,hasOwnProperties
		,keysToLower
		,subObj
		,subObjInverse
		,extract
		,emptyObject
		,removeEmptyKeys
		,getFirstMatchingProp
		,groupChildrenByProp
		,groupKeysByValue
		,argObjToArr
		,nestedObjToArr
		,nestValues
		,forEachNestedPrimitive
		,fillOut
		,fillWith
	};





	function objCreateFill(keys,value,copyValue=false){
		vX.checkType('array',keys);

		var obj={};
		for(let key of keys){
			obj[key]=copyValue ? vX.copy(value) : value;
		}

		return obj;
	}

	function combineKeysValues(keys,values,formatKeys=null,formatValues=null){
		vX.checkTypes(['array','array'],[keys,values]);
		if(keys.length!=values.length)
			throw new Error("Expected both arrays to be same length, they were "+keys.length+" and "+values.length);

		if(typeof formatKeys!='function')
			formatKeys=x=>x
		if(typeof formatValues!='function')
			formatValues=x=>x

		var obj={};
		for(let i in keys){
			obj[formatKeys(keys[i])]=formatValues(values[i]);
		}

		return obj;
	}

	function recombineKeysValues(obj,formatKeys,formatValues){
		vX.checkType('object',obj);
		return combineKeysValues(Object.keys(obj),Object.values(obj),formatKeys,formatValues);
	}


	function addUniqueItemToNestedArr(obj,key,value){
		if(!obj.hasOwnProperty(key))
			obj[key]=[value]
		else if(!Array.isArray(obj[key]))
			throw new TypeError("Expected prop ("+key+") to be array, was:" +typeof obj[key])
		else if(!obj[key].includes(value))
			obj[key].push(value);

		return;
	}

	/*
	* Two objects both with nested arrays. Append unique items from source to target.
	*
	* @param array source 	Eg. {a:[1,2],b[2,3,4]}
	* @param array target 	Eg. {a:[1,6],c:[5]} 	NOTE: This array gets altered
	*
	* 	@target after: 	{a:[1,2,6],b[2,3,4],c:[5]}
	*
	* @return void
	*/
	function combineUniqueNestedArrays(source,target){
		for(let key of Object.keys(source)){
			let arr=typeof source[key]=='array' ? source[key] : [source[key]];
			if(!target.hasOwnProperty(key))
				target[key]=arr;
			else if(Array.isArray(target[key]))
					_log.throwType(`nested key ${key} to be array`,target[key]);
			else
				arr.forEach(item=>{
					if(!target[key].includes(item))
						target[key].push(item);
				})
		}
		return;
	}

	/*
	* @param array[string,...] arr 	Array of key/value pairs, eg: 
	*									['key1=value1', 'key2=value2',...]
	* @param string delimiter 		The character used in every item of @arr to split key/value, eg:
	*									 '='
	*
	* @return object 				From above example: 
	*									{key1:'value1', key2:'value2'}
	*/
	function splitArrayItemsToObject(arr,delimiter){
		//Check types, throwing on fail
		if(vX.checkTypes(['array',['string','object']],[arr,delimiter])[1]=='object')
			vX.instanceOf(RegExp, delimiter);

		var obj={};
		var firstErr=true;
		arr.forEach((line,i)=>{
			try{
				vX.checkType('string',line);

				//Split on first delimiter (glueing rest together if needed)
				var [key, ...value]=line.split(delimiter);
				obj[key]=value.join(delimiter);
			}catch(err){
				if(firstErr){
					firstErr=false;
					_log.warn("Error parsing array for key-value pairs");
				}
				_log.warn("   item "+i+": "+err.message);
			}
		})
		return obj;
		
	}


	/*
	* @param string str 	Example:
	*							"wlan0
	*								addr 0.0.0.0
	*								hwaddr aa:aa:aa:aa:aa:aa
	*								details
	*									type wifi
	*							eth0
	*								addr 192.168.1.2
	*								hwaddr bb:bb:bb:bb:bb:bb
	*							"
	* @return object 		From above example:
	*							{
	*								'wlan0':{
	*									'addr 0.0.0.0':{}
	*									,'hwaddr aa:aa:aa:aa:aa:aa':{}
	*									,'details':{
	*										'type wifi'
	*									}
	*								}
	*								,'eth0':{
	*									'addr 192.168.1.2':{}
	*									,'hwaddr bb:bb:bb:bb:bb:bb':{}
	*								}
	*							}
	*/
	function indentStringToObject(str){

		var data={},len=0, curr=[data],last=data;
		str.split('\n').forEach(line=>{
			let m=line.match(/^(\s*)(.+)$/);
			if(!m) return; //skip empty lines
			
			//Determine by the length of the indentation if we work our way up or down
			//the object structure
			let l=m[1].length;
			if(l>len){
				//more indent, move down by adding the last created object to the current position array
				curr.unshift(last); 
			}else if(l<len){
				//less indent, move up by removing the last added object to the current position array
				curr.shift();
			}
			len=l; //save for next round

			//create new object and set it on the current position 
			last={};
			curr[0][m[2].trim()]=last;

		})
		return data;
	}


	/*
	* Turn object into a string, eg:
	* 		{key1:value1,key2:value2} => key1=value1\nkey2=value2
	*
	* @param object obj
	* @param string delimiter 	Delimiter to use between key and value, eg '='
	* @param bool even          Make all the keys the same width by padding with whitespace, that way the delimiters
	*							will appear in a perfect column
	*
	* @return string
	*/
	function objectToLines(obj,delimiter='=',standardizeKeyWidth=false){
		vX.checkTypes([['array','object'],'string'],[obj,delimiter])
		var pad=0;
		if(standardizeKeyWidth){
			pad=Object.keys(obj).map(key=>key.length).reduce((a,b)=>Math.max(a,b),0);
		}
		return Object.entries(obj).map(([key,value])=>key.padEnd(pad,' ')+delimiter+value).join('\n');
	}


	/*
	* Turn a delimited string into an object, eg:
	* 		key1=value1\nkey2=value2 => {key1:value1,key2:value2}
	*
	* @param string str 		A string output by objectToLines
	* @param string delimiter 	Delimiter to use between key and value, eg '='
	*
	* @return object
	*/
	function linesToObj(str,delimiter='='){
		vX.checkTypes(['string','string'],[str,delimiter]);
		var obj={};
		str.split('\n').forEach(line=>{line=line.split('=');obj[line[0]]=line[1]});
		return obj
	}



	/*
	* @param object|array from    {type:{shape:'round',color:'red'},weight:4}
	* @opt string delim           If 'array' or 'entries' is passed then an array is returned, see vv
	* @opt number|function depth  How many levels down to flatten (anything below is left as is). Default 30 => to prevent circle ref. 
	*							   If a function is passed it'll be called with (address,object) and should return truthy if we continue 
	*							   further down...
	*
	* @throws <ble TypeError>
	* @return object|array 		To 		{'type.shape':'round','type.color':'red',weight:4}
	*                             or    [ [['type','shape'],'round'] , [['type','color'],'red'] , ['weight',4] ]
	*/
	function flattenObject(from,delim='.',depth=30){
		var [,,t]=vX.checkTypes([['object','array'],'string',['number','function']],[from,delim,depth]);
		try{
			if(t=='number')

			var continueDown=t=='number'?(address)=>{address.length<depth}:depth
				,returnEntries=(delim=='array'||delim=='entries')
				,flat=returnEntries?[]:{}
				,address=[]
				,flattenObject_loop=(self)=>{
					for(let [key,value] of Object.entries(self)){
						address.push(key); //make address one longer...
						if(value && typeof value=='object' && continueDown(address,value)){ //...check if we're going down one more level...
							flattenObject_loop(value);
						}else{
							if(returnEntries){
								flat.push([address.slice(0),value]); //copy address so it doesn't change
							}else{
								flat[address.join(delim)]=value;
							}
						} 
						address.pop(); //...make address shorter again
					}
				}
			;
			flattenObject_loop(from);
			return flat;
			
		}catch(err){
			_log.makeError(err).throw();
		}

	}




	/*
	* Check if an object has ANY of a list of properties
	*
	* @param object obj
	* @param array arr
	* @param string mode 	Accepted values are:
	*							'any' - first item in $keys that exists on $obj will be returned, else null
	*							'all' - first item in $keys that does NOT exist on $obj will be returned, else null
	*                           'noother' - first key on $obj that does NOT exist in $keys will be returned, else null
	*                           'exact' - if the keys on $obj doesn't match those listed in $arr exactly one will be returned, else null
	*
	* @return mixed|null 	The first offending/matching key, or null (@see mode)
	*/
	function hasOwnProperties(obj,keys,mode='any'){
		vX.checkTypes(['object','array','string'],[obj,keys,mode]);
		
		switch(mode){
			case 'any': //object contains at least one of the keys
				for(let key of keys){
					if(obj.hasOwnProperty(key))
						return key; //this "accepted key" was set on $obj
				}
				return null;

			case 'all': //object contains all the keys, but optionally others as well
				for(let key of keys){
					if(!obj.hasOwnProperty(key))
						return key; //this "required key" wasn't set on $obj
				}
				return null;

			case 'noother': //object does not contain any other keys, but it may contain none
				for(let key of Object.keys(obj)){
					if(!keys.includes(key))
						return key; //this key isn't included in the "approved $keys array"
				}
				return null
			case 'exact':
				return hasOwnProperties(obj,keys,'noother') && hasOwnProperties(obj,keys,'all');

			default:
				throw new Error("Unrecognized mode: "+mode);

		}
	}

	/*
	* Make sure all keys in an object are lower case (non-recursive)
	*
	* @param object obj
	* 
	* @return object
	*/
	function keysToLower(obj){
		return recombineKeysValues(obj,key=>key.toLowerCase()); 
	}


	/*
	* Get specific keys from an object, returning a new object
	*
	* @param object obj
	* @param mixed filter 		A single key, an array of keys, or a function to validate keys
	* @opt string mode 			Available options are (see function for legacy equivilents): 
	*			'includeAll'            *default* - Include all requested keys (even if their value is undefined or comes from prototype chain)
	*			'isDefined'                       - Include requested keys from anywhere along the prototype chain IF they are defined
	*			'isNotNull'						  - Like ^ but must also !=null
	*			'hasOwnProperty'                  - Include requested keys if they're set on $obj
	*			'hasOwnDefinedProperty'           - Include requested keys if they're set on $obj AND are defined
	*			'hasOwnNotNullProperty'           - Like ^ but must also !=null
	*			'isUndefined'					  - Opposite of 'isDefined', only include those keys NOT present in filter
	*
	* 
	* @throws TypeError
	* @return object
	*/
	function subObj(obj,filter, mode='includeAll',onUndefined=undefined){
		var types=vX.checkTypes([['array','object'],['string','number','array','function','object']],[obj,filter])

		switch(types[1]){
			case 'function':
				var keys=Object.entries(obj).filter(keyvalue=>filter(keyvalue[0],keyvalue[1])).map(keyvalue=>keyvalue[0]);
				mode='includeAll'; //Since the function is filtering, everything it keeps we include...
				break;
			case 'number':
			case 'string':
				return obj[filter];
			case 'object':
				keys=Object.keys(filter);
				break;
			case 'array':
				keys=filter
		}
		
		var rObj=types[0]=='array'?[]:{};
		switch(mode){
			case true: //for legacy
			case 'excludeMissing': //legacy
			case 'hasOwnProperty':
				keys.forEach(key=>{
					if(obj.hasOwnProperty(key)){
						rObj[key]=obj[key] //include keys set on the object (but their values MAY be undefined)
					}
				})
				break;
			case 'hasOwnDefinedProperty':
				keys.forEach(key=>{
					if(obj.hasOwnProperty(key) && obj[key]!=undefined){
						rObj[key]=obj[key] //only include defined keys set directly on the object
					}
				})
				break;
			case 'hasOwnNotNullProperty':
			case 'hasOwnNonNullProperty':
				keys.forEach(key=>{
					if(obj.hasOwnProperty(key) && obj[key]!=undefined && obj[key]!=null){
						rObj[key]=obj[key] //only include defined keys set directly on the object
					}
				})
				break;
			case 'isDefined':
				keys.forEach(key=>{
					if(obj[key]!=undefined){ //this can come from anywhere on the prototype chain
						rObj[key]=obj[key]
					}
				})
				break;
			case 'isUndefined':
				Object.keys(obj).forEach(key=>{
					if(!keys.includes(key)){
						rObj[key]=obj[key]
					}
				})
				break;
			case 'isNotNull':
			case 'isNonNull':
				keys.forEach(key=>{
					if(obj[key]!=undefined && obj[key]!=null){ //this can come from anywhere on the prototype chain
						rObj[key]=obj[key]
					}
				})
				break;
			case 'includeAll':
			case 'default':
			default:
				keys.forEach(key=>rObj[key]=obj[key]) //this can come from anywhere on the prototype chain AND be undefined
		}

		if(onUndefined!==undefined){
			for(let key in rObj){
				if(rObj[key]==undefined)
					rObj[key]=onUndefined
			}
		}
		return rObj;
	}


	function extract(obj,filter, mode){
		var data=subObj(obj,filter,mode);

		if(Array.isArray(filter)||typeof filter=='function')
			Object.keys(data).forEach(key=>delete obj[key]);
		else
			delete obj[filter];

		return data;
	}



	function emptyObject(obj){
		return extract(obj,Object.keys(obj));
	}



	/**
	* Removed "empty" keys from an object
	*
	* @param object obj    Live object to be altered
	* @param array empty   List of values deemed "empty", defaults to only undefined
	*
	* @return object | null     Object with all removed keys/values, or null if non where removed
	*/
	function removeEmptyKeys(obj,empty=[undefined]){
		let removed={};
		for(let key of Object.keys(obj)){
			if(empty.includes(obj[key])){
				removed[key]=obj[key];
				delete obj[key];
			}
		}
		return Object.keys(removed).length ? removed : null 

	}

	/*
	* Find a value within a sub-object that matches a criteria
	*
	* @param object obj 			@see subObj
	* @param array keys 			@see subObj
	* @param @opt function crit 	Defaults to truthy value
	* @param @opt boolean extract 	@see subObj
	*
	* @return any|undefined 	The first matching prop value, or undefined
	*/
	function getFirstMatchingProp(obj,keys,crit=null,_extract=false){
		if(!crit)
			crit=(x)=>x?true:false //returns first non-empty
		else
			vX.checkType(['function','null'],crit)


		if(_extract)
			obj=extract(obj,keys,'hasOwnProperty')
		else
			obj=subObj(obj,keys,'hasOwnProperty')

		return Object.values(obj).find(crit);
	}




	/*
	* From: 
	*	{											[
	*		Bob:{age:44,gender:'Male'}					0:{age:44,gender:'Male'}
	*		,Steve:{age:82,gender:'Male'}				,1:{age:82,gender:'Male'}
	*		,Sue:{arge:24,gender:'Female'}				,2:{arge:24,gender:'Female'}
	*	}											]
	*
	* To:
	*	{											{
	*		Male:{										Male:[
	*			Bob:{age:44,gender:'Male'}					0:{age:44,gender:'Male'}
	*			,Steve:{age:82,gender:'Male'}				,1:{age:82,gender:'Male'}
	*		}											]
	*		,Female:{									,Female:[
	*			Sue:{age:24,gender:'Female'}				2:{age:24,gender:'Female'}
	*		}											]
	*	}		                                     }              ^NOTE: array passed in, object of arrays returned
	*
	*
	* @param object|array obj             NOTE: Altered if $extractProp is passed, see below
	* @param string|number prop           The property on each child of $obj to look for and group by
	* @opt @any-order ...optional
	*   flag          'alter'        	   Children with $prop will be removed from $obj + child[$prop] will be deleted
	*   flag          'keepIndex'          Grouped items retain their index in $obj, eg. $obj[2][$prop] => @return[$prop][2] instead of @return[$prop][0]
	*   string|number groupOnMissingProp   Group to use if child doesn't have $prop. Default behaviour is to ignore this child
	*
	* @return object	    A new object with								
	*/
	function groupChildrenByProp(obj,prop,...optional){
		vX.checkTypes([['object','array'],['string','number']],[obj,prop])
		
		//Parse optional args
		var groupOnMissingProp,alter=false,keepIndex=false;
		optional.forEach((x,i)=>{
			switch(typeof x){
				case 'string': 
					if(x=='alter'){
						alter=true;
						break;
					}
					else if(x=='keepIndex'){
						keepIndex=true;
						break;
					}else if(!x){
						break; //empty string is nothing
					}


					//fall through...
				case 'number':
					groupOnMissingProp=x; 
				     //^DevNote: keys kan only be string|number
					break;
				default:
					log.makeError(`Arg #${i+2} can be string/number, got:`,x).throw('TypeError');
			}
		})

		var groups={},useArray=Array.isArray(obj);
		Object.entries(obj).reverse().forEach(([key,child])=>{
			
			//First we need a group key...
			if(child.hasOwnProperty(prop)){
				//Grab the value of the prop on the child
				var groupKey=child[prop];

				//If we're altering...
				if(alter){
					//Remove the child from $obj
					if(useArray && !keepIndex)
						obj.splice(key,1)
					else
						delete obj[key];

					//Remove the prop from within the child so it'd only listen in one place: directly on $groups
					delete child[prop];
				} 

			}else if(groupOnMissingProp){
				groupKey=groupOnMissingProp
			}else{
				//ignore this child
				return;
			}
			
			//Then we make sure said key exists on the return object
			if(!groups[groupKey])
				groups[groupKey]=useArray?[]:{};
			

			//Finally we add the child to that group
			if(useArray && !keepIndex){
				groups[groupKey].push(child); //default behaviour is to NOT keep indexes for child arrays (so length shows correct)
			}else{
				groups[groupKey][key]=child;
			}
		})

		return groups;
	}

	/*
	* From:
	*	{
	*		foo:'bar'
	*		,cat:true
	*		,hat:'bar'
	*	}
	*
	*  To:
	*  	{
	*		bar:['foo','hat']
	*		,true:['cat']
	*  	}
	*/
	function groupKeysByValue(obj){
		vX.checkType(['object','array'],obj)
		var grouped={},key;
		for(key in obj){
			if(!grouped.hasOwnProperty(key))
				grouped[key]=[];
			grouped[key].push(obj[key]);
		}
	}



	/*
	* From:
	*	{
	*		foo:'bar'
	*		,cat:true
	*		,hat:'bar'
	*	}
	*
	*  To:
	*  	['foo','bar','cat',true,'hat','bar']
	*/
	function argObjToArr(obj){
		var arr=[], key;

		for(key in obj){
			arr.push(key);
			arr.push(obj[key]);
		}

		return arr;
	}

	/*
	* Turn object of nested objects into array of nested objects, moving the key in the parent object
	* into each child
	*
	* @param object obj
	* @param string propName
	*
	* @return array
	*/
	function nestedObjToArr(obj, propName='id'){
		var key, arr=[];
		for(key in obj){
			let x={};
			x[propName]=key;
			arr.push(Object.assign(x,obj[key]));
		}
		return arr;
	}


	/*
	* Nest every value in an flat object
	* 
	* {a:1,b:2}  =>  {a:{id:1},b:{id:2}}
	*
	* @param object|array obj 	
	* @opt string|number  prop 		Default 'id'. The name of the prop in each new nested object which hold the original value
	* @opt boolean        create 	Default false => alter the passed in $obj, true=>create a new object
	*
	* @return object|array      
	*/
	function nestValues(obj,prop='id',create=false){
		vX.checkTypes([['object','array'],['number','string']],[obj,prop]);
		var ret=create?new obj.constructor():obj;
		for(let key in obj){
			let x={};
			x[prop]=obj[key];
			ret[key]=x
		}
		return ret;
	}


	/*
	* @param object|array obj 
	* @param function callback 	Will be called with the current object and the key
	*
	* @return object|array 		The passed in $obj 		
	*/
	function forEachNestedPrimitive(obj,callback){
		vX.checkType(['object','array'],obj);
		function recurs(obj){
			for(let key in obj){
				if(vX.checkType(['object','array'],obj[key],true))
					recurs(obj[key]);
				else
					callback(obj,key);
			}
		}
		recurs(obj);
		return obj;
	}






	/*
	* Fill out an object with keys/values from another, not overwriting anything
	*
	* @param object|array	target 		The object we'll be making changes to. NOTE: The passed in object will be altered
	* @param object|array  filler  		An object with values to use when $target doesn't have any
	*
	* @return object|array	$target
	*/
	function fillOut(target, filler){
		vX.checkType(['object','array'],target);

		//First grab all the enumerable key/values from the $target...
		var orig=Object.assign({},target);

		//...then assign all the fillers, ending with the original
		return Object.assign(target, filler, orig);
	}




	/*
	* Fill out an object with keys and a single value, not overwriting anything
	*
	* @param object|array 	target 		The object we'll be making changes to. NOTE: The passed in object will be altered
	* @param array          keys 		An array of strings/numbers
	* @param any 			value 		The value to set on all $keys
	* @opt boolean 			copyValue 	true=>copy the value, false=>assign same ref to each key
	*
	* @return object|array	$target
	*/
	function fillWith(target,keys,value,copyValue=true){
		vX.checkTypes([['object','array'],'array'], [target,keys]);
		//FutureDev: cannot be an that you grab keys from objects, since same handling for objects/arrays then doesn't apply

		return fillOut(target,objCreateFill(keys,value,copyValue));
	}












	return _exports;

}
//simpleSourceMap=
//simpleSourceMap2=