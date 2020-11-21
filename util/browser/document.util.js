//simpleSourceMap=/my_modules/util/browser/domevents.util.js
//simpleSourceMap2=/lib/util/browser/domevents.util.js
;'use strict';
/*
* @module bu-document
* @author plundell
* @license MIT
* @description Helper functions related to the document, the browser itself, the window etc...
*
* This module is required by bu-browser
*/
module.exports=function export_docX(bu){

	//Methods to export
	var _exports={
		getHashKey
		,setHashKey
	}

	/*
	* From the current url hash, extract a specific key
	*
	* @param string|number key
	*
	* @return mixed 			Whatever value was set on the hash, parsed to include object, array and undefined
	*/
	function getHashKey(key){
		return bu.queryStrToObj(window.location.hash)[key];
	}

	/*
	* Set a key=value on the current url hash, taking care not to change anything else
	*
	* @param string|number key
	* @param mixed|undefined value	Any value you want to set. Setting undefined will delete the key
	*
	* @return mixed|undefined		The previously set value for that key
	*/
	function setHashKey(key,value){
		//Parse the current hash 
		var hashArr=bu.queryStrToKeyValuePairs(window.location.hash);

		//Change the requested key without re-ordering the keys
		var i=hashArr.findIndex(pair=>pair[0]==key),oldValue;
		if(i>-1){
			oldValue=hashArr[i][1];
			if(value==undefined){
				hashArr.splice(i,1); //remove existing
			}else{
				hashArr[i][1]=value; //change existing
			}
		}else{
			if(value!=undefined){
				hashArr.push([key,value]); //add new
			}
		}

		//Set the hash back...
		var hashStr=bu.keyValuePairsToQueryStr(hashArr);
		hashStr=hashStr?"#"+hashStr:hashStr; //not needed for setting, but needed for comparison here vv
		if(window.location.hash!=hashStr){
			// ...if it's changed
			bu._log.trace(`Updating uri hash: ${window.location.hash} => ${hashStr}`)
			window.location.hash=hashStr;
		}

		return oldValue
	}

	return _exports;
}