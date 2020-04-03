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
	    ,'arrayDiff':arrayDiff
	    ,'sameArrayContents':sameArrayContents
	    ,'anyArrayOverlap':anyArrayOverlap
	    ,'pushToNestedArray':pushToNestedArray
	    ,'filterSplit':filterSplit
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
	* @return array 		An array of the items that existed (ie. could be an empty array)
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
				.map(item=>extractCommon(arr,item))
				.filter(item=>typeof item!='undefined');
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
				_log.throwType("arg #1 to be an array-like object",arr);
			else
				arr=Array.from(arr);
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
		for(x of B){
			if(A.indexOf(x)==-1)
				onlyB.push(x);
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
	* @param array arr
	* @param function func
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


	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=