#!/usr/local/bin/node
'use strict'; 
/*
* @module netX
* @export object 	Object with helper functions
*
* Author: palun
* Date: Aug 2019
*
* This module helps do networking tasks
*/

module.exports=function exportnmX(dep){

	dep=dep||{}
	const BetterLog=dep.BetterLog || require('../../better_log');

	const cX=dep.cX || require('../util.common.js');
	const cpX=dep.cpX || require('./child_process.util.js');
	

	const log=typeof BetterLog=='function' ? new BetterLog('nmX') :BetterLog;

	//This object is returned at bottom
	const nm={
		'running':nm_running
		,'listDevices':listDevices
		,'listActiveConnections':listActiveConnections
		,'listSavedConnections':listSavedConnections
		,'getConnectionDetails':getConnectionDetails
		,'listWifiSignals':nm_listWifiSignals
		,'listWifiNetworks':nm_listWifiNetworks
		,'listAllWifiNetworks':listAllWifiNetworks
		,'createConnection':nm_createConnection
		,'editConnection':editConnection
		,'deleteConnection':deleteConnection
		,'connect':connect
		,'autoconnect':autoconnect
		,'disconnect':disconnect
		,'createHotspot':createHotspot
		,'listHotspotClients':listHotspotClients
	}
	




	/************************ NetworkManager *************************************/

	/*
	* @return boolean
	* @sync
	*/
	function nm_running(){
		try{
			var stdout=cpX.native.execFileSync('ps',['aux']).toString();
			return stdout.match(/bin\/NetworkManager/) ? true : false
		}catch(err){
			try{
				var stdout=cpX.native.execFileSync('systemctl').toString();
				var nm=stdout.split('\n').filter(line=>line.match(/NetworkManager\.service/))[0];
				return (nm && nm.match(/loaded active running/)) ? true:false;
			}catch(err2){
				log.makeError("Unable to determine if NetworkManager was running:")
					.addHandling(err)
					.addHandling(err2)
					.exec()
					.throw()
				;
			}
		}
	}


	/*
	* List physical network devices attached to this computer
	*
	* @param string type   		Only list devices of specific kind, available: ethernet, wifi, loopback
	* @param bool deviceOnly 	Return array of strings (device names)
	*
	* @return Promise(object, err) 	Resolves with object where key is device name and value is child object
	*								with info about device
	* @async
	*/
	function listDevices(type=null, deviceOnly=false){
		log.traceFunc(arguments);
		try{
			cX.checkTypes([['string','null'],'bool'],[type,deviceOnly]);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to list devices'));
		}

		return cpX.execFileInPromise('nmcli',['device','status'])
			.then(obj=>{
				var arr=cX.linuxTableToObjects(obj,true); //true=>headers to lower case
				if(type)
					arr=arr.filter(d=>d.type==type);

				if(deviceOnly)
					return arr.map(d=>d.device);
				
				obj={};
				arr.forEach(d=>{
					if(d.connection=='--')
						d.connected=false;
					else
						d.connected=d.connection;
					delete d.connection;

					obj[d.device]=d; 
					// delete obj[d.device].device
				});
				return obj;
			})
	}



	// function getDeviceStatus(iface){
	// 	iw wlan0 station dump
	// }



	/*
	* List all active connections on all devices and their addresses
	*
	* @param string type   		Only list devices of specific kind, available: ethernet, wifi
	*
	* @return Promise(obj, err) Lookup object, keys are interfaces, values are connection names or false
	* @async
	*/
	function listActiveConnections(type=null){
		log.traceFunc(arguments);
		try{
			cX.checkType(['string','null'],type);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to list active connections'));
		}

		return cpX.execFileInPromise('nmcli',['device','status'])
			.then(obj=>{
				var arr=cX.linuxTableToObjects(obj,true); //true=>headers to lower case
				
				//filter if opted
				if(type){
					switch(type.toLowerCase()){
						case 'wifi':
						case 'wireless':
						case 'wlan':
							arr=arr.filter(c=>c.type.indexOf('wireless')>-1);
							break;
						case 'wired':
						case 'ethernet':
						case 'eth':
							arr=arr.filter(c=>c.type.indexOf('ethernet')>-1);
							break;
					}
				}

				//create ret obj
				var ret={}
				arr.forEach(c=>{
					if(c.type=='loopback')
						return;
					if(c.connection=='--')
						c.connection=false;

					ret[c.device]=c.connection
				})
				

				return ret;
			})
		;
	}




	// listDevices('wifi').then(console.log)
	// listActiveConnections({type:'wifi',family:4}).then(console.log)
	// listActiveConnections().then(console.log)



	/*
	* Get list of all saved connections (a "connection" is a configured wifi/ethernet connection 
	* with IP configuration, saved password etc.)
	*
	* @param string type   			Only list networks of specific kind, available: ethernet, wifi
	* @param bool namesOnly 		Return array of strings instead
	*
	* return Promise(obj|arr,err) 	Object of child objects or array of strings (@see @namesOnly)
	*										{
	*											<UUID> : {
	*												type : 'wifi'|'ethernet'
	*												,name : <string>
	*												,ssid : <string> (empty string if ^ethernet)
	*												,connected : <IFACE>|<false>
	*												,autoconnect : <bool>
	*												,last_connected : <unixtime>
	*											}
	*											,<UUID2>:{}...
	*										}
	* @async	
	*/
	function listSavedConnections(type=null,namesOnly=false){
		log.traceFunc(arguments);
		try{
			cX.checkTypes([['string','null'],'bool'],[type,namesOnly]);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to list saved connections'));
		}

		var allPromises=[],arr;
		return cpX.execFileInPromise('nmcli',[
				'-f','name,uuid,type,timestamp,autoconnect,autoconnect-priority,device'
				,'connection'
			])
			.then(function _listSavedConnections(obj){

				arr=cX.linuxTableToObjects(obj,true,true)

				arr=arr.filter(n=>{

					//Clear up the type and filter if it's not the right one
					if(n.type.indexOf('wireless')>-1){
						n.type='wifi'
					}else if(n.type.indexOf('ethernet')>-1){
						n.type='ethernet';
						n.ssid='';
					}				
					if(type && n.type!=type)
						return false;				

					if(namesOnly)
						return true; //return early and then below we return only the names

					if(n.type=='wifi'){
						//By Default Network Manager names all wifi connections "Auto SSID"...
						n.ssid=n.name.replace(/^Auto /,'');
						
						if(n.ssid==n.name){
							//... but if we've changed the name of the connection we have to find the actual SSID from 
							//the details of the connection
							let p=getConnectionDetails(n.name)
								.then(info=>n.ssid=info.wireless.ssid)
								.catch(err=>{
									log.makeError(err).addHandling('Failed to get SSID for connection:',n.name).exec();
									n.ssid='';
								})
							allPromises.push(p)
						}
					}

	//2019-09-03: Technically device will show up while connecting... we should really look at state=='activated'
					//Rename some fields (and change what they contain a little bit)
					n.connected=n.device=='--' ? false : n.device;
					delete n.device

					n.last_connected=Number(n.timestamp+'000');
					delete n.timestamp;

					n.priority=n['autoconnect-priority'];
					delete n['autoconnect-priority'];

					return true; //because of the filter ^^

					
				});
				// console.log("WE ARE NOW FINISHED GETTING THE FAST STUFF, just waiting for the async details");
				return;

			}).then(()=>Promise.all(allPromises)) //Since we're triggering a few async fetches ^^, we have to wait for them
												   //to finish before we proceed... (async + await doesn't seem to work)
			.then(()=>{
				if(namesOnly)
					return arr.map(n=>n.name);
				else{
					var obj={}, key;
					arr.forEach(n=>{
						obj[n.uuid]=n;
					})
					return obj;
				}
			})
		;
	}

	/*
	* @async
	*/
	const knownDetails={};
	function getConnectionDetails(nameOrUuid){
		log.traceFunc(arguments);
		try{
			cX.checkType('string',nameOrUuid);
		}catch(err){
			return err.reject();
		}

		//So we don't have to re-run this command multiple times when asked about the same connection in short
		//succession, we save the data vv for 3 seconds...
		if(knownDetails.hasOwnProperty(nameOrUuid))
			return Promise.resolve(knownDetails[nameOrUuid]);

		return cpX.execFileInPromise('nmcli',['--show-secrets','connection','show',nameOrUuid])
			.then(function _getConnectionDetails(obj){
				var data={};
				var lines=obj.stdout.split('\n');
				var i,ll=lines.length;
				for(i=0;i<ll;i++){
					//Split the line into key and value
					var found=lines[i].match(/^(.*?)(?=:):\s+(.*)$/);
					if(found){
						//Split the key into its nested parts (seperated by .) and create nested objects on data
						var key=found[1].split('.').filter(k=>k.length);			
						var k,i,d=data;
						while((k=key.shift()) && key.length){ //do for each but the last key
							k=k.replace('802-11-','').replace('wireless-security','wifi-sec');
							if(!d.hasOwnProperty(k)){
								d[k]={};
							}
							d=d[k];
						}

						//Now we're ready to set the actual property...
						d[k]=found[2];
					}
				}

				data.connected=(data.hasOwnProperty('GENERAL') && data.GENERAL.STATE=='activated')?data.GENERAL.DEVICES : false;
				
				let sec=data['wifi-sec'];
				if(sec){
					var x=''
					switch(sec['key-mgmt']){
						case 'ieee8021x':
							x='-DYN'
						case 'none':
							switch(sec['auth-alg']){
								case 'shared':data.security='WEP'+x;break;
								case 'leap':data.security='WEP-LEAP';break;
								case 'open':
								default:
									data.security=false;break;
							}
							break;
						case 'wpa-none':
							data.security='WPA-ADHOC';break;
						case 'wpa-psk':
						case 'wpa-eap':
						case 'sae':
						default:
							data.security=sec['key-mgmt'].toUpperCase();
					}
				}




				//Save details for 3 seconds, see ^^
				knownDetails[data.connection.id]=data;
				knownDetails[data.connection.uuid]=data;
				setTimeout(()=>{
					delete knownDetails[data.connection.id];
					delete knownDetails[data.connection.uuid];
				},3000);

				return data;
			}
		);
	}


	var freqToChan={2412:1,2417:2,2422:3,2427:4,2432:5,2437:6,2442:7,2447:8,2452:9,2457:10,2462:11,2467:12,2472:13
		,2484:14,5160:32,5170:34,5180:36,5190:38,5200:40,5210:42,5220:44,5230:46,5240:48,5250:50,5260:52,5270:54
		,5280:56,5290:58,5300:60,5310:62,5320:64,5340:68,5480:96,5500:100,5510:102,5520:104,5530:106,5540:108,5550:110
		,5560:112,5570:114,5580:116,5590:118,5600:120,5610:122,5620:124,5630:126,5640:128,5660:132,5670:134,5680:136
		,5690:138,5700:140,5710:142,5720:144,5745:149,5755:151,5765:153,5775:155,5785:157,5795:159,5805:161,5825:165
	};


	/*
	* Get list of all currently visible wifi signals (ie. a single wifi network may be hosted by
	* several APs in range, this will list them all)
	*
	* @param array ssidFilter 		If given, only return signals that match these SSIDs
	*
	* @return Promise(array,err)
	* @async
	*/
	function nm_listWifiSignals(ssidFilter){
		log.traceFunc(arguments);
		try{
			var t=cX.checkType(['array','undefined'],ssidFilter);

			//Make sure we have an array of SSIDs. 
			//Turn array of SSIDs into lookup obj
			if(t=='array')
			var lookup={},uuid;
			for(uuid in ssidFilter){
				lookup[ssidFilter[uuid].ssid]=true; //NOTE: that multiple saved configs may have this ssid, but as long
											   //as 1 does then we call it known...		
			}

		}catch(err){
			return log.makeError(err).addHandling('Failed to list wifi signals').exec().reject();
		}


		return cpX.execFileInPromise('nmcli',[
				'-c','no'
				,'-f', 'ssid,bssid,chan,rate,signal,security,freq,active,device'
				,'device'
				,'wifi'
				,'list'
			])
			.then(function _listWifiSignals(list){

				var arr=cX.linuxTableToObjects(list,true,true)

				//Filter away any we don't want
				if(ssidFilter)
					arr=arr.filter(w=>lookup.hasOwnProperty(w.ssid))


				arr=arr.filter(w=>{
					
					w.band = Number(w.freq.replace('MHz',''))>4000 ? 5 : 2.4
					delete w.freq;

					if(w.rate.match('Mbit/s'))
						w.rate=Number(w.rate.replace('Mbit/s',''));
					else if(w.rate.match('Gbit/s'))
						w.rate=Number(w.rate.replace('Gbit/s',''))*1000;
					else
						w.rate=Number(w.rate);

					w.signal=Number(w.signal);

					if(w.security=='--')
						w.security=''
					else
						w.security=w.security.replace(' ',',')

					w.connected=w.active=='yes' ? w.device : false;
					delete w.active;

					return true; //since we're filtering ^^
				})

				return arr;
			}
		);
	}

	/*
	* @async
	*/
	function getSignalStrength(ssid){
		return cpX.execFileInPromise('nmcli',[
				'-c','no'
				,'-f', 'ssid,signal,active'
				,'device'
				,'wifi'
				,'list'
			])
			.then(list=>{
				var arr=cX.linuxTableToObjects(list,true,true)

				//Filter away all but a specific ssid or the active signal
				if(ssid)
					return arr.filter(w=>w.ssid==ssid).reduce((max,curr)=>{Math.max(max,curr)},0)
				else{
					var w=arr.find(w=>w.active=='yes')
					return (w ? w.signal : 0);
				}
			})
		;
	}






	/*
	* Get a list of all visible wifi networks (ie. signals from APs grouped by SSID), using NetworkManager to
	* scan for the wifi signals
	*
	* @return object 	@see groupSignalsBySSID
	*/
	function nm_listWifiNetworks(){
		return nm_listWifiSignals()
			.then(groupSignalsBySSID)
		;
	}


	/*
		KNOWN:
		{
			<UUID> : {
				type : 'wifi'|'ethernet'
				,name : <string>
				,ssid : <string> (empty string if ^ethernet)
				,connected : <IFACE>|<false>
				,autoconnect : <bool>
				,last_connected : <unixtime>
			}
			,<UUID2>:{}...
		}

		AVAILABLE:
		{
			<SSID> : {
				ssid : <SSID>
				,connected : <IFACE>|<false>
				,signal : <number>
				,security : <string>
				,ap : [
					{bssid, chan, band,rate, signal,connected}
					,{}...
				]
			}
			,<SSID2>:{}...
		}
	* @return Promise(object)
	*/
	function listAllWifiNetworks(){
		return cX.groupPromises([
			nm_listWifiNetworks()
			,listSavedConnections('wifi')
		],log).promise.then(({resolved:[available, saved]})=>{
			var combined={visible:[],outofrange:[],connected:[]};

			//First we loop through the available networks...
			var ssid,uuid;
			for(ssid in available){
				let info=available[ssid];

				//First we find any saved connections for this ssid
				let list=[]
				for(uuid in saved){
					if(saved[uuid].ssid==ssid){
						//Delete from list of known, since we'll be using the remaining (known but not seen) vv
						let c=cX.extract(saved,uuid);

						list.push(c);
					}
				}
				//If no saved connections exist...
				if(!list.length){
					list.push({ssid:ssid, connected:false})
				}

				//Now for all items in the list, add info about the visible network, then add to our return
				//object either as visible or connected. NOTE: the 'connected' status is based on the value from 
				//listActiveConnections(), not listWifiNetworks(); the reason is that the former tells us which 
				//connection profile is used, while the later only tells us that some profile which uses that
				//network is active
				let n=cX.subObj(info, ['signal','security']);
				list.forEach(l=>{
					Object.assign(l,n);

					if(l.connected)
						combined.connected.push(l);
					else
						combined.visible.push(l);
				})
			}

			//...then we loop through the known but not available ones (we removed available ones ^^)
			for(uuid in saved){
				let n=saved[uuid];
				combined.outofrange.push(n);

			}

			//Now we have everything, but before we return let's do some sorting and further combining
			combined.visible.sort((a,b)=>a.signal==b.signal ? 0 : a.signal>b.signal ? -1 : 1);
			combined.all=combined.connected.concat(combined.visible,combined.outofrange);


			combined.all.forEach(c=>{
				delete c.type;
				
				//We don't care about the name as a means to connect here, we only want it to be informative
				if(c.name){
					c.name=c.name.replace(/^Auto /,'').trim();
				
					if(c.name!=c.ssid)
						c.description=c.name;	

					delete c.name;
				}


			})

			return combined;

		})

	}





	function nm_createConnection(args){
		log.traceFunc(arguments);
		try{
			cX.checkType('object',args);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to create connection'));
		}

		return new Promise(async function _nm_createConnection(resolve,reject){try{
			log.trace('Creating connection: ',args);
			//Start by resolving any aliases
			args=resolveAliases(args); 

			//First we create the connection, which requires a few basic args (nmcli requires args in a specific order
			//it seems... whatever, we'll just extract them accordingly...)
			var c=cX.extract(args,['type','ifname','con-name','ssid']);

			if(!c.type)
				return reject(log.makeError('Missing required arg "type", got:',args).exec());

			c['con-name']=c['con-name']||c.ssid;
			if(!c['con-name'])
				return reject(log.makeError('Missing required arg "con-name", got:',args).exec());	
			delete c.name	
			if((await listSavedConnections(c.type, true)).includes(c['con-name'])) //true=>array of connection names only
				return reject(log.makeError(`Connection '${c['con-name']}' already exists:'`
					,await getConnectionDetails(c['con-name'])).exec());	

			c.ssid=c.ssid||c['con-name'];

			//If no interface is specified, use the first listed one of that type
			if(!c.ifname){
				c.ifname=(await listDevices(c.type,true))[0];
				if(!c.ifname){
					let devs=cX.replaceAll(cX.rowsToString(cX.nestedObjToArr(await listDevices(),'ifname')),'\n','\n '); 
					log.note('Available network devices:\n',devs);
					return reject(
						log.makeError(`Cannot create connection of type '${c.type}', no such network device. (see ^^)`)
							.exec()
					);
				}else
					log.debug(`No 'ifname' specified, using first listed ${c.type} interface: ${c.ifname}`);
			}

			//aaaaand create!
			await cpX.execFileInPromise('nmcli',['connection','add'].concat(cX.argObjToArr(c)))
				.catch(obj=>{
					return Promise.reject(obj.error+'\n\t'+obj.stderr)
				})


			//If there are any remaining args, we modify our new connection, else we just resolve now...
			var p;
			if(Object.keys(args).length){
				var arr=cX.argObjToArr(args);

			//TODO 2019-09-12: deal with other types of security
				//If we're setting password, make sure the key management is specified
				if(args['wifi-sec.psk'] && !args['wifi-sec.key-mgmt'])
					arr.unshift('wifi-sec.key-mgmt','wpa-psk')

				p = cpX.execFileInPromise('nmcli',['connection','modify',name].concat(args))
					.catch(err=>{
						//If not all args are good, throw a fit and delete everything!
						err=log.makeError(err).addHandling(`Deleting failed connection '${c['con-name']}' due to bad args`);
						return deleteConnection(c['con-name'])
							.catch(err2=>err.addHandling("Failed to delete failed connection:",err2))
							.then(()=>reject(err.addHandling('Failed to create connection').exec()))
						;
					})
				;
			}else
				p=Promise.resolve();
			
			p.then(()=>log.info(`Successfully created connection '${c['con-name']}'`));
			return resolve(p);

		}catch(err){
			return reject(log.makeError(err).addHandling('Failed to create connection').exec());
		}})



	}


	function editConnection(name,args){
		log.traceFunc(arguments);
		try{
			cX.checkType('string',name);
			
			//Turn args into array and apply any aliases
			args=resolveAliases(args);

		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to modify connection'));
		}

		return cpX.execFileInPromise('nmcli',['connection','modify',name].concat(cX.argObjToArr(args)))
			.catch(err=>log.reject('Failed to modify connection ',name,args,err))
		;
	}



	function deleteConnection(name){
		log.traceFunc(arguments);
		try{
			cX.checkType('string',name);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed todelete connection'));
		}
		return cpX.execFileInPromise('nmcli',['connection','delete',name]);
	}

	var aliases={
		'name':'con-name'
		,'pass':'wifi-sec.psk'
		,'password':'wifi-sec.psk'
		,'security':'wifi-sec.key-mgmt'
		,'iface':'ifname'
	}

	function resolveAliases(args){

		if(cX.checkType(['object','array'],args)=='array'){
			if(args.length%2)
				log.throw("Arg array must contain even number of elements, ie. each key must have a value, got:",args);
			
			//Replace any args with aliases
			var i,l=args.length;
			for(i=0;i<l;i+=2){
				if(aliases[args[i]])
					args.splice(i, 1, aliases[args[i]]);
			}
		}else{
			//Replace any args with aliases
			Object.keys(args).forEach(key=>{
				if(aliases[key]){
					args[aliases[key]]=args[key]
					delete args[key];
				}
			})		
		}

		return args;
	}

	/*
	* Connect to a configured connection
	*
	* @param string name 			Name of saved connection (ie. not SSID or name of interface)
	*
	* @return Promise(object,BLE) 	All details of connection, configured+active+dhcp etc
	*/
	function connect(name){
		log.traceFunc(arguments);
		try{
			cX.checkType('string',conOrIface);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to connect to preconfigured connection'));
		}
		return listSavedConnections(null,true)
		.then(list=>{
			if(!list.includes(name))
				return log.reject('Cannot connect, no such connection: ',name,list);

			return getConnectionDetails(name)
				.then(info=>{
					if(info.connected){
						log.info(`Already connected to '${name}' on ${info.connected}`);
						return info;
						//TODO 2019-09-03: The state may be activating, in which case we're already trying to connect
						// 					and we should somehow wait for that to finish... we can use 'nmcli con monitor' 
						//					together with cpX.native.spawn > child.stdout.once('data'...)
					}else
						return cpX.execFileInPromise('nmcli',['connection','up',name])
							.then(()=>{
								log.info(`Connected to ${name}`);
								return getConnectionDetails(name);
							})
				})
			;
		})
	}


	/*
	* @return Promise
	*/
	function autoconnect(iface){
		log.traceFunc(arguments);
		try{
			cX.checkType('string',iface);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to autoconnect'));
		}

		return listDevices()
		.then(devices=>{
			if(!devices.hasOwnProperty(iface))
				return log.reject("No such interface:",iface,devices);
			else if(devices[iface].connected){
				log.note(`Will disconnect from '${devices[iface].connected}' on ${iface} to autoconnect a-new...`);
			}

			return cpX.execFileInPromise('nmcli',['device','connect',iface])
				.then(obj=>{
					var match=obj.stdout.match(/Device 'wlp2s0' successfully activated with '([0-9a-f\-]+)'/);
					if(match){
						return getConnectionDetails(match[1]);
					}else{
						log.warn('STDOUT:',obj.stdout);
						log.warn('STDERR:',obj.stderr);
						return log.reject("Unknown error. Unable to connect to any device.");
					}
				})
				.then(info=>{
					log.info(`Connected to '${info.GENERAL.NAME}' on ${info.GENERAL.DEVICES}`);
					return info;
				})
		})
	}

	/*
	* Disconnect from a specific connection or iface. NOTE: this will turn off autoconnection
	*
	* @param string conOrIface 			Name of saved connection or interface
	*
	* @return Promise(bool,BLE) 		True false if a disconnect happened, BLE if something went wrong
	*/
	function disconnect(conOrIface){
		log.traceFunc(arguments);
		try{
			cX.checkType('string',conOrIface);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to disconnect'));
		}

		//Regardless what the arg is, if we're not connected to/on it, then nothing happens.
		//Get a list of devices...
		return listDevices()
			.then(devices=>{
				var iface;
				for(iface in devices){
					//...then check if the passed in name refers to the device or the connection on 
					//that device...
					if(iface==conOrIface || devices[iface].connected==conOrIface)
						//...in which case disconnect the device (not the individual connection which would not 
						//disable autoconnect)
						return cpX.execFileInPromise('nmcli',['device','disconnect',iface])
							.then(obj=>{
								log.info(`Disconnected interface ${iface}`+(iface==conOrIface ? '' : ` from '${conOrIface}'`))
								return true;
							})
							.catch(obj=>log.reject('Failed to disconnect from:',iface, obj.error+obj.stderr))
						;
				}
				log.debug("Cannot disconnect because not connected to/on",conOrIface,devices);
				return false;
			})
	}




	function createHotspot(name,password=null){
		log.traceFunc(arguments);
		try{
			cX.checkTypes(['string',['string','undefined']],[name,password]);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to create hotspot'));
		}

		var options={
			type:'wifi'
			,ssid:name
			,'802-11-wireless.mode': 'ap' 
			// ,'802-11-wireless.band': 'bg' 
			,'ipv4.method':'shared' 
			,'ipv6.method':'ignore'
			,'connection.autoconnect':'no'
		}

		if(password){
			if(password.length<8)
				return log.reject("Passwords need to be at least 8 characters");

			options['wifi-sec.key-mgmt']='wpa-psk';
			options['wifi-sec.psk']=password;
		}

		return netX.nm.createConnection(options);
	}




	function listHotspotClients(name){
		try{
			cX.checkType('string',name);
		}catch(BLE){
			return log.reject(BLE.addHandling('Failed to list hotspot clients'));
		}

		var iface;
		return getConnectionDetails(name)
			.then(info=>{
				if(!info.connected)
					return log.reject(`Connection ${name} is not active.`,info);
				else if(info.wireless.mode!='ap')
					return log.reject(`Connection ${name} is not in AP mode:`,info);
				
				iface=info.GENERAL.DEVICES;
				return arpCache();
			})
			.then(arr=>{
				return arr
					.filter(x=>x.iface==iface)
					.map(x=>x.address)
				;
			})
	}



	return nm;


}