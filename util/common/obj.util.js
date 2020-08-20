//simpleSourceMap=/my_modules/util/common/promise.util.js
//simpleSourceMap2=/lib/util/common/promise.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module contains helper/util functions related to OBJECTS
*/
'use strict';
module.exports=function export_oX({_log,vX}){

	//Methods to export
	var _exports={
		'objCreateFill':objCreateFill
		,'combineKeysValues':combineKeysValues
		,'recombineKeysValues':recombineKeysValues
		,'addUniqueItemToNestedArr':addUniqueItemToNestedArr
		,'combineUniqueNestedArrays':combineUniqueNestedArrays
		,'splitArrayItemsToObject':splitArrayItemsToObject
		,'indentStringToObject':indentStringToObject
		,'objectToLines':objectToLines
		,linesToObj
		,flattenObject
		,'hasOwnProperties':hasOwnProperties
		,'keysToLower':keysToLower
		,'subObj':subObj
		,'extract':extract
		,'emptyObject':emptyObject
		,'getFirstMatchingProp':getFirstMatchingProp
		,nestedHas
		,'nestedGet':nestedGet
		,'nestedSet':nestedSet
		,nestedAssign
		,'getChildProps':getChildProps
		,'groupChildrenByProp':groupChildrenByProp
		,'groupKeysByValue':groupKeysByValue
		,'argObjToArr':argObjToArr
		,'nestedObjToArr':nestedObjToArr
		,'forEachNestedPrimitive':forEachNestedPrimitive
		,'objToQueryStr':objToQueryStr
		,fillOut
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
	*
	* @return string
	*/
	function objectToLines(obj,delimiter='='){
		vX.checkTypes(['object','string'],[obj,delimiter])
		return Object.entries(obj).map(([key,value])=>key+delimiter+value).join('\n');
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
	* @param object obj 	From    {type:{shape:'round',color:'red'},weight:4}
	* @opt string delim
	*
	* @throws <ble TypeError>
	* @return object 		To 		{'type.shape':'round','type.color':'red',weight:4}
	*/
	function flattenObject(obj,delim='.'){
		vX.checkTypes(['object','string'],[obj,delim]);
		try{
			var flat={};
			var address=[];
			var depth=0;
			var flattenObject_loop=(self)=>{
				if(++depth>30){
					throw 'CircularRef'
				}
				Object.entries(self).forEach(([key,value])=>{
					if(value && typeof value=='object'){
						address.push(key);
						flattenObject_loop(value);
						address.pop();
					}else{
						flat[address.concat(key).join(delim)]=value;
					}
				})
			}
			flattenObject_loop(obj);
			return flat;
			
		}catch(err){
			if(String(err)=='CircularRef')
				_log.makeError("Circular ref loop while flattening object:",obj).throw();
			else
				_log.makeError(err).throw();
		}

	}




	/*
	* Check if an object has ANY of a list of properties
	*
	* @return bool
	*/
	function hasOwnProperties(obj,keys,mode='any'){
		vX.checkTypes(['object','array','string'],[obj,keys,mode]);
		
		switch(mode){
			case 'any': //object contains at least one of the keys
				for(var i=0; i<keys.length;i++){
					if(obj.hasOwnProperty(keys[i]))
						return true;
				}
				return false;

			case 'all': //object contains all the keys, but optionally others as well
				for(var i=0; i<keys.length;i++){
					if(!obj.hasOwnProperty(keys[i]))
						return false;
				}
				return true;

			case 'noother': //object does not contain any other keys, but it may contain none
				return Object.keys(obj).every(key=>keys.includes(key))

			case 'exact':
				return hasOwnProperties(obj,keys,'noother') && hasOwnProperties(obj,keys,'all');

			case 'array':
				var ret=[];
				for(var i=0; i<keys.length;i++){
					if(obj.hasOwnProperty(keys[i]))
						ret.push(keys[i]);
				}
				if(!ret.length)
					return null;
				else
					return ret;

			case 'object':
				var ret={};
				for(var i=0; i<keys.length;i++){
					if(obj.hasOwnProperty(keys[i]))
						ret[keys[i]]=obj[keys[i]];
				}
				if(!Object.keys(ret).length)
					return null;
				else
					return ret;
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
	function subObj(obj,filter, mode='includeAll'){
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
			default:
				keys.forEach(key=>rObj[key]=obj[key]) //this can come from anywhere on the prototype chain AND be undefined
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
	* Check if a nested prop exists on an object
	*
	* NOTE: this will NOT alter $keypath
	*
	* @throws <ble TypeError>
	*
	* @return boolean
	*/
	function nestedHas(obj,keypath){
		try{
			return typeof nestedGet(obj,vX.copy(keypath))!='undefined'
		}catch(err){
			switch(err.code){
				case 'TypeError':
					throw err;
				case 'EFAULT':
				case 'EMISMATCH':
					return false;
				default:
					log.throwCode("BUGBUG",'nestedGet() threw an unexpected error:',err);
			}
		}
	}


	/*
	* Get a nested child from a multi-level object or array
	*
	* NOTE: $keypath will be altered by this function, containing any remaining keys after recursion has happened to the available depth
	*
	* @param array|object obj
	* @param array keypath 					Array of keys, each pointing to one level deeper. 
	* @param bool returnLastObject 			Default false => if a nested property doesn't exist, undefined will be returned. 
	*											true=>the last existing object will be returned and the keypath reflects
	*											the remaining keys

	* @throws <ble TypeError> 		If $keypath is not an array
	* @throws <ble EMISMATCH> 		If there is a non-object along keypath
	*
	* @return mixed|[mixed,false|array]  	The requested value, or @see $returnLastObject
	*/
	function nestedGet(obj,keypath,returnLastObject=false){
		// _log.traceFunc(arguments)
		vX.checkTypes([['object','array'],'array'],[obj,keypath]); //throw typeerror

		var subobj=obj, address=[];
		while(keypath.length){
			//Starting this loop means we're trying to go down one level...
			if(typeof subobj!='object')
				//...having a non-object means that's impossible, so throw an error
				_log.throwCode('EMISMATCH',`Cannot get nested value, non-object @ ${address.join('.')}:`,subobj, obj);

			else if(!subobj.hasOwnProperty(keypath[0])){
				//...having nothing also means that's impossible, but here we offer an option, see arg #3
				if(returnLastObject)
					//To know if this is not the desired position, the caller has to confirm that keypath isn't empty
					return subobj;
				else
					return undefined;
			}

			//We've now confirmed there's one more step available, go there and restart loop
			subobj=subobj[keypath[0]];
			address.push(keypath.shift());
			// _log.debug(address.join('.'),subobj)
		}

		//At this point we've successfully navigated to the desired location, so return the value there
		return subobj;
	}



	/*
	* Set a nested child on a multi-level object or array
	*
	* @param obj array|object
	* @param keys array 		Array of keys, each pointing to one level deeper. NOTE: this array is altered
	* @param mixed value 		
	* @param bool create 		Default false. If true the path will be created (with objects only)
	*
	* @throws TypeError 		If $keys is not an array
	* @throws EINVAL 			If $keys is empty
	* @throws EFAULT 			The nested object doesn't exist, and we're not creating
	* @throws EMISMATCH 		Somewhere along the path is a non-object
	*
	* @return mixed  			The value set
	*/
	function nestedSet(obj,keys,value,create=false){
		// _log.traceFunc(arguments);
		//First check arg#2, and use it to get the object we're setting on
		vX.checkType('array',keys); //throw typeerror
		var key=keys.pop();
		if(!key)
			_log.throwCode("EINVAL","No keys specified, cannot set value on object: ",value,obj);

		//For logging vv, we need an un-altered keys array so we can determine where a nested value was
		var _keys=vX.copy(keys);

		//Get the nested object we'll be setting on (also works if $keys are now empty)
		var subobj=nestedGet(obj,keys,true); //true=>return last existing object so we can create the 
		let address=_keys.splice(-keys.length).join(); //_keys=[1,2,3]  keys=[2,3]  =>  1.2
		if(create){											//      rest here
			//If any keys didn't exist, we create them now
			var k;
			while(k=keys.shift()){
				subobj[k]={}; //create the next level
				subobj=subobj[k]; //move the "pointer", if you will, to that level
			}
			
		}else if(keys.length){
			_log.makeCode('EFAULT',`Entire path didn't exist. Not creating remaining @ '${address}':`,obj).throw();
		}
			

		if(typeof subobj!='object') //array or object works
			_log.throwCode('EMISMATCH',`Halfway down the nested objects we encountered a non-object @ '${address}':`,obj)
		

		//If we're still running here. obj will be the object we're setting on, key the prop we're setting and value 
		//the value, so just get on with it and return
		return subobj[key]=value;
	}

	/*
	* Delete a nested key
	*
	* @param obj array|object
	* @param keys array 		Array of keys, each pointing to one level deeper. NOTE: this array is altered
	*
	* @throws TypeError 		If $keys is not an array
	* @throws EINVAL 			If $keys is empty
	* @throws EMISMATCH 		Somewhere along the path is a non-object
	*
	* @return any 				The old value
	*/
	function nestedDelete(obj,keys){
		vX.checkType('array',keys); //throw typeerror
		var key=keys.pop();
		if(!key)
			_log.throwCode("EINVAL","No keys specified, what exactly do you want to delete from: ",obj);

		//Get the last object... and if that doesn't exist then no problems, the thing we're trying to delete is already gone
		var subobj=nestedGet(obj,keys);
		if(subobj==undefined)
			return undefined;

		//Now get the old value, then delete, then return
		var old=subobj[key];
		delete subobj[key];
		return old;
	}



	/*
	* Assign to nested objects without overwriting non-mentioned props
	*
	* @param object target 	The object that gets changed
	* @param object obj 	The object with new data to be assigned to $target
	*
	* {type:{				{type:{					{type:{
	*	shape:'round'   +     	color:'blue'	=		shape:'round'
	*	,color:'red'}		}}							,color:'blue'}
	* ,weight:4}    								,weight:4}
	*
	* @throws <ble TypeError>
	*
	* @return object 		$target
	*/
	function nestedAssign(target,data){
		vX.checkTypes(['object','object'],arguments);
		var delim='<&@%>'; //any random string that is sure not to exist in a key
		var arr=flattenObject(data,delim);
		Object.entries(arr).forEach(([address,value])=>nestedSet(target,address.split(delim),value,'create'));
		return target;
	}


	/*
	* Get prop from each nested child object in an object
	*/
	function getChildProps(obj,prop,onMissing){
		var ret={}
			,types=vX.checkTypes([['object','array'],['string','array']],[obj,prop])
		;
		
		//So we don't have to check on every prop, do 1 of 2 loops
		if(types[1]=='string'){
			//...getting prop on the base object
			Object.entries(obj).forEach(([key,child])=>{
				if(child.hasOwnProperty(prop))
					ret[key]=child[prop]
				else if(arguments.length==3) //this allows anything to be passed, even undefined... but if the argument is omitted, missing keys are too
					ret[key]=onMissing
			})
		}else{
			//Get nested prop
			Object.entries(obj).forEach(([key,child])=>{
				try{
					var val=nestedGet(child,prop);
				}catch(err){
					val=undefined
				}

				//Loop early if the prop doesn't exist and arg#3 is undef
				if(val==undefined && onMissing==undefined)
					return;
				
				ret[key]=val
			})
		}
		return ret;
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
	*		Male:{										Male:{
	*			Bob:{age:44,gender:'Male'}					0:{age:44,gender:'Male'}
	*			,Steve:{age:82,gender:'Male'}				,1:{age:82,gender:'Male'}
	*		}											}
	*		,Female:{									,Female:{
	*			Sue:{age:24,gender:'Female'}				2:{age:24,gender:'Female'}
	*		}											}
	*	}		
	*
	* @param 									
	*/
	function groupChildrenByProp(obj,prop,...optional){
		vX.checkTypes([['object','array'],'string'],[obj,prop])
		
		var onMissing='undefined',extract=false;
		optional.forEach((x,i)=>{
			switch(typeof x){
				case 'boolean': 
					extract=x; break;
				case 'number':
				case 'string': 
					if(x=='extract')
						extract=true;
					else
						onMissing=x; 
					break;
				default:
					log.makeError(`Arg #${i+2} can be string/number/boolean, got:`,x).throw('TypeError');
			}
		})

		var ret={};
		Object.entries(obj).forEach(([key,child])=>{
			var v=child[prop]||onMissing;
			v=(typeof v=='number'?v:String(v));
			ret[v]=ret[v]||{}
			ret[v][key]=child;
			if(extract) delete child[prop];
		})
		return ret;
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
	* Turn an object into a legal query string
	*
	* @param object obj 	Eg. {hello:"bob",foo:["bar","car"]}
	*
	* @see string.util.js:queryStrToObj()
	*
	* @throw <ble.TypeError>
	* @return string 		Eg. "hello=bob&foo[]=bar,car". NOTE: no leading '?' or '#'
	*/
	function objToQueryStr(obj){
		vX.checkType('object',obj);
		var parts=[],key,value;
		for(key in obj){
			value=obj[key];
			
			//For all-primitive, arrays we use the special syntax: key[]=item1,item2
			if(Array.isArray(value) && vX.allPrimitive(value)){
				key+='[]'
				value=value.join(',');
			}

			if(typeof value=='object'){
				value=JSON.stringify(obj);
			}

			//Empty string, null and undefined all get turned into empty string
			if(vX.isEmpty(value,null)){ //null is normally considered non-empty
				value=''
			}
			parts.push(key+'='+encodeURIComponent(value));
		}
		return parts.join('&');
	}




	/*
	* Fill out an object with keys/values from another, not overwriting anything
	*
	* @param object 		target 		The object we'll be making changes to. NOTE: The passed in object will be altered
	* @param objects|arrays ...fillers  One or more objects containing data to fill out $target with
	*
	* @return object 		$target
	*/
	function fillOut(target, ...fillers){
		//Just like with Object.assign() we allow as many fillers as you like
		vX.checkType('object',target);

		//Grab copies of all fillers that don't include the keys of the target
		var keysToExclude=Object.keys(target);
		for(let i=0;i<fillers.length;i++){
			fillers[i]=subobj(fillers[i],keysToExclude,'isUndefined')
		}

		//Now assign...
		return Object.assign(target,...fillers);
	}












	return _exports;

}
//simpleSourceMap=
//simpleSourceMap2=