//simpleSourceMap=/my_modules/util/common/validate.util.js
//simpleSourceMap2=/lib/util/common/validate.util.js
/*
* This module should only be required in NodeJS. If using in browser, please bundle with eg. Browserify
*
* This module contains helper/util functions related to validating various data, like emails etc
*/
'use strict';


module.exports=function export_validate({netmask,vX}){

	//Methods to export
	const _exports={
		'email':validateEmail
		,'ip':validateIP
	};



	function validateEmail(str){
		var regexp=/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
		return str.match(regexp);
	}


	function validateIP(str,...flags){
		if(typeof str !=='string'){
			vX._log.makeError("Expected a IP string, got:",this.log.logVar(str)).throw('TypeError');
		}
		
		try{	
			try{
				netmask.ip2long(str)
			}catch(err){
				vX._log.makeError(`Not valid IP: ${str}`).throw();
			}
				
			if(str.includes('/')){
				if(!flags.includes('allowSubnet') && !flags.includes('requireSubnet')){
					vX._log.makeError(`Got subnet, wanted regular IP: ${str}`).throw();
				}
			}else if(flags.includes('requireSubnet')){
				vX._log.makeError(`Got regular IP, wanted subnet: ${str}`).throw();
			}

		}catch(err){
			if(flags.includes('throw'))
				vX._log.makeError(err).throw();
			else
				return false;
		}

		return true;
	}





	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=

