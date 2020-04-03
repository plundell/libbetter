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

		//First thing we do is load the module under test, this will show any syntax errors right away
		console.log('----------- TESTING: netX ----------');
		const loader=require('./network.util.js');
		if(typeof loader!='function'){
			console.error(loader);
			throw new TypeError("network.util.js should return a loader function, got ^^")
		}

		dep=dep||{};

		//Next we make sure we have an instance of a logger
		if(!dep.hasOwnProperty('BetterLog')){
			console.log("++ Loading real BetterLog and setting syslog to print all...");
			dep.BetterLog=require('../../better_log.js');
			var root=__dirname.split('/');
			root.pop();
			root=root.join('/')+'/';
			dep.BetterLog.defaultOptions.set({
				autoPrintLvl:1
				,removeRoot:root
				,printId:true
			}); 
		}else{
			console.warn("++ NOTE: Using passed-in BetterLog:",dep.BetterLog);
		}


		//Instantiate
		console.log('----------- STARTING TEST ----------')
		var netX=loader(dep);
		if(typeof netX!='object'){
			console.error(netX);
			throw new TypeError("network.util.js's loader function should return a an object of functions, got ^^")
		}


		//Test...
		netX._log.info("Log on netX works");

		if(netX.nm.running()){
			netX._log.info(`NetworkManager IS running, not running tests for iw and ws`);

			netX._log.info("netX.nm.listDevices():",await netX.nm.listDevices());
			
			netX._log.info("netX.nm.listActiveConnections():",await netX.nm.listActiveConnections());
			
			var savedConnections=await netX.nm.listSavedConnections()
			netX._log.info("netX.nm.listSavedConnections():",savedConnections);
			
			var uuid=Object.keys(savedConnections)[0];
			netX._log.info(`netX.nm.getConnectionDetails(${uuid}):`,await netX.nm.getConnectionDetails(uuid));
			
			netX._log.info("netX.nm.listWifiSignals():",await netX.nm.listWifiSignals());

			netX._log.info("netX.nm.listWifiNetworks():",await netX.nm.listWifiNetworks());
			
			netX._log.info("netX.nm.listAllWifiNetworks():",await netX.nm.listAllWifiNetworks());
			// netX.nm.createConnection()
			// netX.nm.editConnection()
			// netX.nm.deleteConnection()
			// netX.nm.connect()
			// netX.nm.autoconnect()
			// netX.nm.disconnect()
			// netX.nm.createHotspot()
			// netX.nm.listHotspotClients()
		}else{
			netX._log.info(`NetworkManager is NOT running, skipping tests for it`);	
			
			netX._log.info("rfkillList():",netX.iw.rfkillList());

			await netX.iw.listWifiSignals()
				.then(arr=>{
					if(!Array.isArray(arr) || !arr.length)
						netX._log.makeError("Expected non-empty array of network signals, got:",arr).throw('TypeError');
					if(!arr[0] instanceof Object|| !arr[0].bssid || !arr[0].ssid)
						netX._log.makeError("Expected array to contain objects with signal data, first one:",arr[0]).throw('TypeError');

					netX._log.info("iw.listWifiSignals():",arr)
				})
				.catch(err=>netX._log.error("iw.listWifiSignals():",err))

		}
		


		console.log('----------- TEST COMPLETE ----------')
	}catch(err){
		console.error('------------ TEST FAILED ----------')
		if(netX && netX._log){
			debugger;
			// console.log(typeof err)
			netX._log.error(err);
		}else{
			console.error(err);
		}
	}
}