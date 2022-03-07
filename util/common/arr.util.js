//simpleSourceMap=/my_modules/util/common/arr.util.js
//simpleSourceMap2=/lib/util/common/arr.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module contains helper/util functions related to ARRAYS
*/
;'use strict';
module.exports=function export_aX({_log,vX}){

	//Methods to export
	var _exports= {
	    'join':join
	    ,'uniqueArrayFilter':uniqueArrayFilter
	    ,'extractItem':extractItem
	    ,'extractItems':extractItems
	    ,'flatten':flatten
	    ,'rowsToString':rowsToString
	    ,'getFirstOfType':getFirstOfType
	    ,getFirstOfTypeOrThrow
	    ,'arrayDiff':arrayDiff
	    ,'sameArrayContents':sameArrayContents
	    ,'anyArrayOverlap':anyArrayOverlap
	    ,'pushToNestedArray':pushToNestedArray
	    ,'filterSplit':filterSplit
	    ,findExtract
	    ,findExtractAll
	    ,makeArray
	    ,sequence
	    ,splitIf
	    ,move
		,manualSort
		,spliceBetween
		,spliceCompareNestedProp
	};








	/*
	* Join an array, optionally setting last delimiter to something else
	* @return string
	*/
	function join(arr, delimit, lastDelimit){
		try{
			vX.checkType('array',arr);
			var last= (typeof lastDelimit=='string' ? lastDelimit+arr.splice(-1,1) : "");
			return arr.join(delimit) + last;
		}catch(err){
			_log.throw(err);
		}
	}



	function uniqueArrayFilter(value, index, arr) { 
		// vX.checkType('array',arr);
	    return arr.indexOf(value) === index;
	}


	function extractItem(arr,item){
		vX.checkType('array',arr);
		return extractCommon(arr,item);
	}

	/*
	* Extract several items from an array
	*
	* @param array arr
	* @param array|function x 	List of items to extract, or a callback which get's passed each item and if it
	*							returns truthy then the item is extracted
	*
	* @return array 		An array of the items that where extracted (ie. could be an empty array if none existed in the first place)
	*/
	function extractItems(arr,x){
		if(vX.checkTypes(['array',['array','function']],Object.values(arguments))[1]=='function'){
			var extracted=[],i;
			for(i=arr.length-1; i>-1;i--){
				if(x(arr[i],i,arr)){
					extracted.unshift(arr.splice(i,1)[0]);
				}
			}
			return extracted;
		}else{
			return x
				.map(item=>extractCommon(arr,item)) //returns the same item, or undefined...
				.filter(item=>typeof item!='undefined'); //...then we get rid of undefined
		}
	}

	/*
	*@private
	*/
	function extractCommon(arr,item){
		let i=arr.indexOf(item);
		return (i>-1 ? arr.splice(i,1)[0] : undefined);
	}




	function flatten(arr){
		var ret=[];
		arr.forEach(child=>{
			if(Array.isArray(child))
				ret=ret.concat(child);
			else
				ret.push(child);
		})
		return ret;
	}

	function rowsToString(arr){
		//So as not to change the original array, we create a duplicate
		var arr2=[];
		//First we're going to find the longest string in each column, which decides the width of that column
		var ll={},c;
		arr.forEach(row=>{
			var row2={};
			for(c in row){
				switch(row[c]){
					case undefined:
						row2[c]='<undef>'; break;
					case null:
						row2[c]='<null>';break;
					default:
						row2[c]=String(row[c]);
				}
				let l=row2[c].length
				if(!ll[c])
					ll[c]=Math.max(String(c).length, l); //longest of column title and this value
				else if(ll[c]<l)
					ll[c]=l
			}
			arr2.push(row2);
		})

		var output=''

		//Add the header row
		for(c in ll){
			output+=String(c).padEnd(ll[c]+2);
		}
		output+='\n'

		//Add all data
		arr2.forEach(row=>{
			for(c in ll){
				let str=row[c]||'<undef>';
				output+=str.padEnd(ll[c]+2);
			}
			output+='\n'
		})
		return output;
	}


	/*
	* Look through an array for the first instance of a given type, returning (possibly extracting) it
	*
	* @param array arr 	 		An array or the arguments obj		
	* @param any type 			@see checkType(arg2)
	* @param extract bool 		Default false. If true the item is removed from arr
	*
	* @return any|undefined		The target item, or undefined
	*/
	function getFirstOfType(arr, type,extract=false){

		if(vX.checkType(['array','object'],arr)=='object'){
			if(typeof arr.length!='number')
				_log.throwType("arg #1 to getFirstOfType() to be an array-like object",arr);
			else if(extract)
				_log.throwCode("EMISMATCH","Cannot extract if you don't pass an array, got:",arr);
		}

		var i=0,l=arr.length;
		for(i;i<l;i++){
			let v=arr[i]
			if(vX.checkType(type,v,true)){
				if(extract)
					arr.splice(i,1);
				return v;
			}
		}
		return undefined;
	}


	/*
	* Like @see getFirstOfType() but will throw if nothing was found
	*/
	function getFirstOfTypeOrThrow(arr, type){
		var val=getFirstOfType.apply(this,arguments);
		if(val==undefined)
			_log.throwType(`args/arr to contain ${String(type)}`,arr);
		return val
	}



	/*
	* Check difference between 2 arrays
	*
	* @param array A
	* @param array B
	*
	* @return [[only in A],[only in B],[in both]] 	Returns array with 3 child arrays
	*/
	function arrayDiff(A,B,...flags){
		if(!flags.includes('noCheck'))
			vX.checkTypes(['array','array'],[A,B]);

		var onlyA=[],onlyB=[],both=[],x;
		for(x of A){
			if(B.indexOf(x)>-1)
				both.push(x);
			else
				onlyA.push(x);
		}
		//If both arrays are the same length, and $both is now also that length then we don't need the next loop
		if(A.length!=B.length || A.length!=both.length){
			for(x of B){
				if(A.indexOf(x)==-1)
					onlyB.push(x);
			}
		}
		return [onlyA,onlyB,both];
	}


	/*
	* Check if 2 arrays contain the same items, even if those items are not in the same order
	*
	* @param array A
	* @param array B
	*
	* @return boolean
	*/
	function sameArrayContents(A,B){
		vX.checkTypes(['array','array'],[A,B]);

		if(A.length!=B.length)
			return false;

		var [onlyA,onlyB,ignore]=arrayDiff(A,B,'noCheck');
		return onlyA.length==0 && onlyB.length==0
	}


	/*
	* Check if 2 arrays have any overlap (but quicker than getting a full arrayDiff
	*
	* @param array A
	* @param array B
	*
	* @return boolean
	*/
	function anyArrayOverlap(A,B){
		var x;
		for(x of A){
			if(B.indexOf(x)>-1)
				return true;
		}
		return false;
	}


	/*
	* @throws TypeError 	If nested prop exists and is not an array
	*/
	function pushToNestedArray(obj,key,value){
		if(!obj.hasOwnProperty(key))
			obj[key]=[];
		obj[key].push(value);
	}



	/*
	* Filter an array into two arrays
	*
	* @param array arr          Not altered
	* @param function func
	* @param bool retainIndex 	If truthy, the items will have the same indexes in their new arrays
	*							as they did in the original. This will create non-sequential arrays
	*
	* @return array 			An array with items that returned truthy. The falsey items
	*							are set on a hidden property .rest
	*/
	function filterSplit(arr,func,retainIndex=false){
		try{
			var i,l=arr.length,a=[],b=[];
			if(retainIndex){
				for(i=arr.length-1;i>=0;i--){
					if(func(arr[i])){
						a[i]=arr[i];
					}else{
						b[i]=arr[i];
					}
				}
			}else{
				for(i=arr.length-1;i>=0;i--){
					if(func(arr[i])){
						a.unshift(arr[i])
					}else{
						b.unshift(arr[i]);
					}
				}
			}
			Object.defineProperty(a,'rest',{value:b,writable:true,configurable:true});
			return a;
		}catch(err){
			cX.checkTypes(['array','function'],arguments);
			cX._log.makeError(err).throw();
		}
	}


	/*
	* Like Array.find() but extracts the matching item
	*
	* @param array arr          Will be altered!
	* @param function func
	* @flag 'reverse' 			If passed $arr will be traversed from reverse
	*
	* @return any|undefined 	The first matching item, or undefined
	*/
	function findExtract(arr,func,reverse){
		vX.checkTypes(['array','function'],[arr,func]);
		if(reverse=='reverse'){
			for(let i=arr.length-1;i>=0;i--){
				if(func(arr[i],i,arr))
					return arr.splice(i,1)[0];
			}
		}else{
			for(let i in arr){
				if(func(arr[i],i,arr))
					return arr.splice(i,1)[0];
			}
		}
		return;
	}

	/*
	* Like Array.findAll() but extracts the matching item
	*
	* @param array arr          Will be altered!
	* @param function func
	* @flag 'retainIndex' 		Indexes will be retained on retruned array (not sequential array)
	*
	* @return array 			An array of matching items, possibly empty
	*/
	function findExtractAll(arr,func,retainIndex){
		vX.checkTypes(['array','function'],[arr,func]);
		var extracted=[]
		for(let i=arr.length-1;i>=0;i--){
			if(func(arr[i],i,arr))
				extracted[i]=arr.splice(i,1)[0];
		}
		if(retainIndex=='retainIndex')
			return extracted;
		else
			return Object.values(extracted);
	}


	/*
	* Wrap any item in an array, or turn into an array, or keep as an array (ie. don't double wrap). If multiple
	* args are passed, they are all concated
	*
	* NOTE: Any undefined passed will be ignored (ie. the resulting array will NOT contain an index with value undefined)
	*
	* @params... any|undefined x 	
	*
	* @return array
	*/
	function makeArray(){
		var array=[];
		Array.from(arguments).forEach(x=>{
			switch(vX.varType(x)){
				case 'nodelist':
					array=array.concat(Array.from(x)); 
					break;
				case 'object':
					let arr=Array.from(x);
					if(!arr.length){
						//If the object can't be turned into an array with stuff, just push the object itself
						array.push(x);
					}else{
						array=array.concat(arr); 
						break;
					}
					break;
				case 'array':
					array=array.concat(x); 
					break;
				case 'undefined': //don't include undefined
					break;
				 //for clarity we list the rest
				case 'string':
				case 'number':
				case 'boolean':
				case 'function':
				case 'null':
				case 'error':
				case 'promise':
				case 'node':
				case 'bigint':
				case 'symbol':
				default:
					array.push(x);
			}
		})
		return array;
	}


	/*
	* Get a sequence of numbers
	*
	* @param number start
	* @param number end
	* @opt number increment 	Default 1
	*
	* @return array[number...]
	*/
	function sequence(start,end,increment=1){
		vX.checkTypes(['number','number','number'],[start,end,increment]);
		var output=[],i=start;
		for(i;i<=end;i+=increment){
			output.push(i);
		}
		return output;
	}

	/*
	* Split a string on a delimiter like normal, but if only a single item is produced return the original string
	*
	* @param string str
	* @param string delim
	* @opt boolean keepEmpty  Default falsey => all empty items produced from the split will be discarded
	*
	* @return array|string
	*/
	function splitIf(str,delim,keepEmpty){
		vX.checkTypes(['string','string'],[str,delim]);
		var arr=str.split(delim);
		if(!keepEmpty)
			arr=arr.filter(s=>s);
		if(arr.length>1)
			return arr;
		else
			return str;
	}


	/*
	* Move an item within an array
	*
	* @param array arr      Gets altered
	* @param number from
	* @param number to
	*
	* @return array          The passed in $arr
	*/
	function move(arr,from,to){
		arr.splice(to,0,arr.splice(from,1)[0]);
		return arr;
	}

	/*
	* Sort a $target array based on the $order in another array (if $target includes those items)
	*
	* @param array target   Gets altered
	* @param array order
	*
	* @return array         The passed in $target
	*/
	function manualSort(target,order){
		var nextIndex=0;
		for(let item of order){ 
			let i=target.indexOf(item);
			if(i>-1){ //if target has the item...
				if(i!=nextIndex){//...and it's not already in the right spot...
					move(target,i,nextIndex)//...move it there
				}
				nextIndex++;
			}
		}
		return target;
	}


	/*
	* Splice an item between each item of an array
	*
	* NOTE: Nothing happens if the array doesn't have at least one item already in it
	*
	* @param array arr  This array will be altered
	* @param any item
	*
	* @throws TypeError
	* @return void
	*/
	function spliceBetween(arr,item){
		vX.checkType('array',arr);
		if(arr.length>1){
			for(let i=arr.length-1;i>0;i--){
				arr.splice(i,0,item);
			}
		}
		return; 
	}

	/*
	* Splice an item by comparing a prop on it to the same prop on every other item
	*
	* NOTE: Checking starts at the end and insert happens AFTER the first encountered item with a smaller prop
	*
	* @param array           arr     The array to be augmented
	* @param object|array    item    The item to insert
	* @param string|number   prop    The name of a property on @item AND every element in @arr
	* @param number|string   deflt   Default insert position. Defaults to 'last'
	*
	* @throws TypeError
	* @return array                  The passed in @arr
	*/
	function spliceCompareNestedProp(arr,item,prop,deflt='last'){
		vX.checkType('array',arr);

		let index=0;
		if(typeof deflt=='number'){
			index=deflt
		}else if(deflt=='last'){
			index=arr.length
		}

		for(let i=arr.length-1;i>-1;i--){
			if(arr[i][prop]<=(item[prop])){
				index=i+1;
				break
			}
		}
		arr.splice(index,0,item);
		return arr;
	}


	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=