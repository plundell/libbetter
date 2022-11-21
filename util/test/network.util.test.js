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





		var ifaces=netX.getIpAddresses('!lo');
		netX._log.info('interfaces (except lo):'); 
		console.log(ifaces);

		console.log('only cidrs',netX.getIpAddresses('cidr'))

		var iface=Object.keys(ifaces)[0];
		netX._log.debug('Checking state of iface',iface);
		await netX.getIfaceState(iface)
			.then(state=>netX._log.info('state of '+iface,state))
		;


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