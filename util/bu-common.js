'use strict';
/**
* @module bu-common
* @author plundell
* @description General purpose javascript utilities and helpers
* @license MIT
*
* This file is meant to be 'required'. It in turn requires all util files in the 'common' folder 
* and re-exports them as one object.
*
* This module is required by bu-node and bu-browser which are probably the entry points you'll
* want to use. 
*/

module.exports=function exportBetterUtilCommon(dep){
	
	//The passed in object should contain all the dependencies.
	function missingDependency(which){throw new Error("BetterUtil is missing a dependency: "+which);}
	const BetterLog = dep.BetterLog || missingDependency('BetterLog');
	const BetterEvents = dep.BetterEvents || missingDependency('BetterEvents');

	//Also make sure it contains two function we need	
	var {varType,logVar}=BetterLog;
	if(typeof varType!='function'||typeof logVar!='function'){
		console.error({
			varType:[typeof varType,varType]
			,logVar:[typeof logVar,logVar]
			,BetterLog:[typeof BetterLog,BetterLog]
		});
		throw new Error("BUGBUG: The BetterLog constructor didn't have prop-funcs varType and logVar");
	}

	const _log=new BetterLog('BetterUtil');



	const vX=require('./common/vars.util.js')({varType,logVar,_log});
	const aX=require('./common/arr.util.js')({vX,_log});
	const fX=require('./common/functions.util.js')({vX,_log,aX});
	const oX=require('./common/obj.util.js')({vX,_log});
	const pX=require('./common/promise.util.js')({vX,_log});
	const stX=require('./common/string.util.js')({vX,_log});
	const mX=require('./common/misc.util.js')({vX,_log, stX});
	const tX=require('./common/time.util.js')({vX,_log});
	const netmask=require('./common/netmask.polyfill.js');
	const validate=require('./common/validate.util.js')({netmask});
	const Timer=require('./common/timer.class.js')({BetterLog,BetterEvents});

	const cX=Object.assign(
		{
			validate
			,_log
			,netmask
			,Timer
		}
		,vX,aX,fX,oX,pX,stX,mX,tX
	)

	return cX;
}


