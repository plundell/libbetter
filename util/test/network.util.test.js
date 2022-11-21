/*
* @test netX
*
* @depends utilCommon
* @depends cpX
* @depends fsX
* @depends BetterLog
* @depends BetterEvents
*/



if(require.main === module)
    testNetX();
else
	module.exports=testNetX;


async function testNetX(dep){
	try{
		console.log('----------- TESTING: netX ----------');

		//First thing we do is load the module under test, this will show any syntax errors right away
		const loader=require('../node/network.util.js');
		if(typeof loader!='function'){
			console.error(loader);
			throw new TypeError("network.util.js should return a loader function, got ^^")
		}

		dep=dep||{};

		console.debug("netX depends on the following: cX, cpX, fsX, BetterEvents, BetterLog");

		//Next we make sure we have an instance of a logger
		var log;
		if(dep.hasOwnProperty('log')){
			console.debug("++ Using passed-in instance of log:",dep.log);
			log=dep.log;
		}else{
			if(!dep.hasOwnProperty('BetterLog')){
				console.log("++ BetterLog not passed in, requiring...");
				dep.BetterLog=require('../../log/better_log.js');
			}
			var root=__dirname.split('/');
			root.pop();
			root=root.join('/')+'/';
			dep.BetterLog.defaultOptions={
				autoPrintLvl:2
				,removeRoot:root
				,printId:true
			}; 
			console.debug("++ Creating instance of BetterLog...");
			log=new dep.BetterLog('TEST_netX');
			// log=dep.BetterLog.syslog;
			console.log(log)
		} 

		if(!dep.hasOwnProperty('BetterEvents')){
			console.log("++ BetterEvents not passed in, requiring...")
			dep.BetterEvents=require('../../events/better_events.js');
		}

		if(!dep.hasOwnProperty('cX')||!dep.hasOwnProperty('cpX')||!dep.hasOwnProperty('fsX')){
			if(!dep.hasOwnProperty('BetterUtil')){
				console.log("++ BetterUtil not passed in, requiring...")
				dep.BetterUtil=require('../bu-node.js')(dep);
			}
			dep.cX=dep.BetterUtil.cX
			dep.cpX=dep.BetterUtil.cpX
			dep.fsX=dep.BetterUtil.fsX
		}




		//Instantiate
		log.note('----------- STARTING TEST ----------')


		log.debug("Running netX loader function with dependencies:",dep);
		var netX=loader(dep);
		if(typeof netX!='object'){
			console.error(netX);
			throw new TypeError("network.util.js's loader function should return a an object of functions, got ^^")
		}



		{
			let ifaces;
			try{
				ifaces=netX.getIpAddresses();
				if(dep.cX.varType(ifaces)!='object'){
					throw "it didn't return an object at all";
				}else if(!Object.keys(ifaces).length){
					throw "it returned an empty object which would only be accurate if no network ifaces existed";
				}else if(Object.values(ifaces).some(listOfBlocks=>!Array.isArray(listOfBlocks))){
					throw "at least one of the values wasn't an array";
				}else if(Object.values(ifaces).some(arr=>arr.some(block=>dep.cX.varType(block)!='object'))){
					throw "at least one of the arrays contained a non-object item"
				}else{
					log.info("getIpAddresses() correctly returned an object-of-arrays-of-objects:",ifaces);	
				}
			}catch(err){
				let msg="getIpAddresses() should have returned an object where keys are interface names and values are "+
					"arrays-of-objects where each child object is an IP configured on that interface";
				msg+=(typeof err=='string' ? ", but" : ".")
				throw log.makeError(msg,err,ifaces);
			}
			try{
				ifaces=netX.getIpAddresses('!lo')
				if(netX.getIpAddresses('!lo').hasOwnProperty('lo')){
					throw "Interface 'lo' was not excluded"; 
				}else{
					log.info("getIpAddresses('!lo') correctly excluded the 'lo' interface",ifaces);
				}
			}catch(err){
				throw log.makeError("getIpAddresses('!lo') failed.",err,ifaces);
			}
			try{
				ifaces=netX.getIpAddresses('cidr');
				if(Object.values(ifaces).some(arr=>arr.some(block=>typeof block!='string'))){
					throw "Expected an object-of-arrays-of-strings, but we got:"; 
				}else{
					log.info("getIpAddresses('cidr') correctly returned an object-of-arrays-of-strings:",ifaces);
				}
			}catch(err){
				throw log.makeError("getIpAddresses('cidr') failed.",err,ifaces);
			}
		}






			
		{
			let ifaces=netX.getInterfaces();
			if(dep.cX.varType(ifaces)!='object'){
				throw log.makeError("getInterfaces() did not return an object:",ifaces);
			}
			let iface=Object.keys(ifaces)[0];
			log.debug('Checking state of iface '+iface+"...");
			let state=await netX.getIfaceState(iface);
			log.info(`netX.getIfaceState('${iface}'): `,state);
			
			
			log.debug("Creating monitor on iface '"+iface+"'...");
			let monitor=new netX.monitor(netX._log,'dynamicNoiseFilter');
			monitor.setIface(iface); //this should set a couple of things...
			if(monitor.iface!=iface
				|| monitor.up!=state.up
				|| monitor.link!=state.link
			){
				throw log.makeError("monitor.setIface() didn't set initial values correctly (compare to state^ and IPs^^):"
					,Object.assign({},monitor));
			}else{
				log.info("monitor.setIface() correctly setup initial values on monitor:",Object.assign({},monitor));
			}


			// await (new Promise(res=>{setTimeout(res,1000)}));
			// log.info(`(new monitor()).start('${iface}') after 1 second:\n`,monitor);
		}






		log.info("rfkillList():",netX.iw_rfkillList());
		


		await netX.iw_listWifiSignals()
			.then(arr=>{
				if(!Array.isArray(arr) || !arr.length)
					log.makeError("Expected non-empty array of network signals, got:",arr).throw('TypeError');
				if(!arr[0] instanceof Object|| !arr[0].bssid || !arr[0].ssid)
					log.makeError("Expected array to contain objects with signal data, first one:",arr[0]).throw('TypeError');

				log.info("iw.listWifiSignals():",arr)
			})
			.catch(err=>log.error("iw.listWifiSignals():",err))
		;
		


		console.log('----------- TEST COMPLETE ----------')
	}catch(err){
		console.error('------------ TEST FAILED ----------')
		if(netX && log){
			debugger;
			// console.log(typeof err)
			log.error(err);
		}else{
			console.error(err);
		}
	}
}