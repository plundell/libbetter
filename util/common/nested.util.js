/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module exports a function to be called with dependencies, which returns an object of functions.
*/
'use strict';
module.exports=function export_nX({_log,vX,oX}){

	//Functions to export
	var _exports={
		nestedGet
		,nestedHas
		,dynamicDelete
		,buildNestedPath
		,dynamicSet
		,nestedAssign
		,nestedFillOut
		,getNestedProps
	};




	/*
	* Get a nested prop
	* 
	* @param object|array target
	* @param array keys             Will NOT be altered
	*
	* @throws <ble TypeError>
	* @throws <ble EMISMATCH>
	*
	* @return any
	*/
	function nestedGet(target,keys){
		try{
			var address=[];
			for(let key of keys){
				if(typeof target!='object'){
					_log.throwCode('EMISMATCH',`Cannot get nested value, non-object @ ${address.join('.')}:`,target);
				}
				address.push(key);
				if(target.hasOwnProperty(key)){
					target=target[key]
				}else{
					target=undefined;
					break;
				}
			}
			return target;
		}catch(err){
			if(err.code=='EMISMATCH')
				throw err;

			if(err.code=='TypeError')
				vX.checkTypes([['object','array'],'array'],arguments); //throws

			//Don't throw on bugs
			_log.makeError("Unexpected error.",arguments,err).setCode("BUGBUG").exec();
			return undefined;
		}
	}

	/*
	* Check if a nested prop exists on an object
	*
	* @param object|array target
	* @param array keys             Will NOT be altered
	*
	* @throws <ble TypeError>
	*
	* @return boolean
	*/
	function nestedHas(target,keys){
		try{
			return typeof nestedGet(target,keys)!='undefined'
		}catch(err){
			switch(err.code){
				case 'TypeError':
					throw err;
				case 'EMISMATCH':
					return false;
				default:
					_log.makeError('nestedGet() threw an unexpected error:',err).setCode("BUGBUG").exec();
					return false;
			}
		}
	}




	/*
	* Ensure that a path to a nested position exists and that everything along the way is the correct object type
	*
	* @param object|array  target  
	* @param array         keys     Will NOT be altered
	*
	* @throws <ble EMISMATCH>       If something along the $keys path is not the correct type
	*
	* @return object|array          The passed in $target och a child object thereof
	*/
	function buildNestedPath(target,keys){
		var address=[];
		for(let key of keys){
			address.push(key);
			let constructor=isNaN(Number(key))?Object:Array
			if(target.hasOwnProperty(key)){
				if(!target[key] instanceof constructor)
					_log.throwCode('EMISMATCH',`Expected ${constructor.name} @ '${address.join('.')}', found:`,target[key]);
			}else{
				target[key]=new constructor();
				//DevNote: Errors can only happen before we start creating, so no need to catch anything
			}
			target=target[key]
		}
		return target;	
	}

	/*
	* Set on a (possibly nested) object, optionally splicing onto arrays
	*
	* @param object|array        target
	* @param array|string|number key      Will NOT be altered
	* @param any                 value
	* @opt boolean               insert
	*
	* @return void
	* @static
	*/
	function dynamicSet(target,key,value,insert=false){
		try{
			//If the key is nested, build our way down to the real target...
			if(Array.isArray(key)){
				//Nested values
				target=buildNestedPath(target,key.slice(0,-1));
				key=key[key.length-1];
			}

			//Handle depending on if we're inserting into an array or just setting/changing a prop
			if(insert && target && typeof target=='object' && typeof target.splice=='function'){
				target.splice(key,0,value);
			}else{
				target[key]=value;
			}
		}catch(err){
			if(err instanceof TypeError)
				vX.checkTypes([['object','array'],['array','string','number']],arguments);
			throw _log.makeError(err);
		}
	}


	/*
	* Delete from a (possibly nested) object, splicing from arrays
	*
	* @param obj array|object
	* @param keys array 		Array of keys, each pointing to one level deeper. Will NOT be altered
	*
	* @throws TypeError 		If $keys is not an array
	* @throws EMISMATCH 		Somewhere along the path is a non-object
	*
	* @return any 				The old value
	*/
	function dynamicDelete(target,keys){
		
		if(Array.isArray(keys)){
			//Get the last object... and if that doesn't exist then no problems, the thing we're trying to delete is already gone
			target=nestedGet(target,keys.slice(0,-1)); //TypeError, EMISMATCH
			if(target==undefined)
				return undefined;
			var key=keys.slice(-1)[0]
		}else{
			key=keys;
		}

		var old=target[key];
		
		if(Array.isArray(target))
			target.splice(key,1)
		else
			delete target[key];

		return old;
	}


	/*
	* Assign to nested objects without overwriting non-mentioned props
	*
	* @param object target 	The object that gets changed
	* @param object obj 	The object with new data to be assigned to $target
	* @opt number depth     @see flattenObject(). How far down to nest
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
	function nestedAssign(target,data,depth){
		for(let [arr,value] of oX.flattenObject(data,'entries',depth)){
			dynamicSet(target,arr,value,'create');
		}
		return target;
	}
	

	/*
	* Fill out an object with nested keys/values from another, not overwriting anything
	*
	* @param object|array	target 		The object we'll be making changes to. NOTE: The passed in object will be altered
	* @param object|array   filler 		An object with values to use when $target doesn't have any
	*
	* @return object|array	$target 	NOTE: While $target is the same object, any sub-objects may have been re-created
	*/
	function nestedFillOut(target,filler,depth){
		vX.checkType(['object','array'],target); //$filler gets checked in nestedAssign

		//First create an un-mutable copy of the target
		var orig=nestedAssign({},target,depth);

		//...then assign the filler over the target...
		nestedAssign(target,filler,depth);

		//...and finally assign the original over that
		nestedAssign(target,orig,depth);
	}




	/*
	* Get prop from each nested child object in an object
	*
	* @param object|array         obj
	* @param string|number|array  prop
	* @opt any                    groupOnMissingProp   If passed, any key that doesn't have $prop will have this value set. If omitted such keys will be excluded
	*
	* NOTE: If a child HAS $prop but child[$prop]==undefined then undefined WILL BE USED, not groupOnMissingProp
	*
	* @return object|array   Match type of $obj
	*/
	function getNestedProps(obj,prop,groupOnMissingProp){
		var types=vX.checkTypes([['object','array'],['string','array']],[obj,prop])
			,ret=(types[0]='object'?{}:[])
		;
		
		
		if(types[1]=='string'){
			//...getting prop on the base object
			Object.entries(obj).forEach(([key,child])=>{
				if(child && typeof child=='object' && child.hasOwnProperty(prop)) //ignore non-object children
					ret[key]=child[prop]
				else if(arguments.length==3) //this allows anything to be passed, even undefined... but if the argument is omitted, missing keys are too
					ret[key]=groupOnMissingProp
			})
		}else{
			//Get nested prop
			Object.entries(obj).forEach(([key,child])=>{
				try{
					if(nestedHas(child,prop))
						var val=nestedGet(child,prop);
					else
						throw 'a'
				}catch(err){
					if(arguments.length==3)
						val=groupOnMissingProp;
					else
						return; //continue loop
				}
				ret[key]=val
			})
		}
		return ret;
	}









	return _exports;
}