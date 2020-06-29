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

module.exports=function netX({cX,cpX,fsX,BetterEvents,BetterLog}){


	const os=require('os');
	const log=(typeof BetterLog=='function' ? new BetterLog('netX') :BetterLog);


	//returned at bottom
	var netX={
		

		'iw_listInterfaces':iw_listInterfaces
		,'iw_getIfaceStatus':iw_getIfaceStatus
		,'iw_validateIface':iw_validateIface
		,'iw_rfkillList':iw_rfkillList
		,'iw_listWifiSignals':iw_listWifiSignals
		,'iw_listWifiNetworks':iw_listWifiNetworks
		//TODO 2019-09-19: must add connect for WEP and open networks
		
		,'ws_listSavedNetworks':ws_listSavedNetworks
		,'ws_getNetworkConf':ws_getNetworkConf
		,'ws_getAllNetworkConfs':ws_getAllNetworkConfs
		,'ws_makePassphrase':ws_makePassphrase
		,'ws_addNetwork':ws_addNetwork
		,'ws_makeConfObj':ws_makeConfObj
		,'ws_deleteNetwork':ws_deleteNetwork
		,'ws_editNetwork':ws_editNetwork
		,'ws_listAutoconnectNetworks':ws_listAutoconnectNetworks
		,'ws_createAutoconnectConfig':ws_createAutoconnectConfig
		,'ws_changeAutoconnectOrder':ws_changeAutoconnectOrder
		,'ws_connect':ws_connect
		,'ws_disconnect':ws_disconnect
		,'ws_procs':ws_procs

		,'dh_restart':dh_restart

		,'ap_getConf':ap_getConf
		,'ap_setConf':ap_setConf
		,'ap_status':ap_status
		,'ap_start':ap_start
		,'ap_stop':ap_stop

		,'groupSignalsBySSID':groupSignalsBySSID
		,'getIfaceState':getIfaceState
		,'getIpAddresses':getIpAddresses
		,'isConfigured':isConfigured
		,'monitor':monitor
		,'waitForIP':waitForIP
		,'pingSubnet':pingSubnet
		,'arpingSubnet':arpingSubnet
		,'arpCache':arpCache
		,'arpScan':arpScan
		,'checkPortOpen':checkPortOpen
		,'findHostsWithOpenPort':findHostsWithOpenPort
		,'getSubnetIPs':getSubnetIPs
		,'iwconfig':iwconfig
		,'validateIp':validateIp
		,'listeningPorts':listeningPorts
		,ping

			
	}

	netX.sudo={
		'iw_listWifiSignals':iw_listWifiSignals
		,'iw_listWifiNetworks':iw_listWifiNetworks
		,'ws_getNetworkConf':ws_getNetworkConf
		,'ws_getAllNetworkConfs':ws_getAllNetworkConfs
		
		,'ws_addNetwork':ws_addNetwork
		,'ws_deleteNetwork':ws_deleteNetwork
		,'ws_editNetwork':ws_editNetwork
		
		,'ws_listAutoconnectNetworks':ws_listAutoconnectNetworks
		,'ws_createAutoconnectConfig':ws_createAutoconnectConfig
		,'ws_changeAutoconnectOrder':ws_changeAutoconnectOrder

		,'ws_connect':ws_connect
		,'ws_disconnect':ws_disconnect
		
		,'dh_restart':dh_restart

		,'ap_getConf':ap_getConf
		,'ap_setConf':ap_setConf
		,'ap_status':ap_status
		,'ap_start':ap_start
		,'ap_stop':ap_stop

		,'arpScan':arpScan
	}

	Object.defineProperty(netX,'_log',{value:log});







	const freqToChan={2412:1,2417:2,2422:3,2427:4,2432:5,2437:6,2442:7,2447:8,2452:9,2457:10,2462:11,2467:12,2472:13
		,2484:14,5160:32,5170:34,5180:36,5190:38,5200:40,5210:42,5220:44,5230:46,5240:48,5250:50,5260:52,5270:54
		,5280:56,5290:58,5300:60,5310:62,5320:64,5340:68,5480:96,5500:100,5510:102,5520:104,5530:106,5540:108,5550:110
		,5560:112,5570:114,5580:116,5590:118,5600:120,5610:122,5620:124,5630:126,5640:128,5660:132,5670:134,5680:136
		,5690:138,5700:140,5710:142,5720:144,5745:149,5755:151,5765:153,5775:155,5785:157,5795:159,5805:161,5825:165
	};



	/*************************************** rfkill *****************************/


	













	/**************************** iw **********************************/




	/*
	* @param boolean details. 		Default false/sync. If true this method will return a promise, but more
	*								details for each interfaces
	*
	* @return object|Promise(object,err) 	Keys are device names, values are {mac:string,freq:number}
	* @sync/@async
	*/
	function iw_listInterfaces(details=false){
		try{
			var stdout=cpX.native.execFileSync('iw',['dev']).toString();
		}catch(err){
			var ble=log.makeError('Failed to list wifi interfaces.',err)
				ble.code=ble.code||'SYSCALL_FAILED';
			if(details)
				return ble.reject();
			else
				ble.throw()
		}

		var data={},promises=[];
		stdout.split(/^(?=phy#[0-9]+)$/m).forEach(block=>{
			var m=block.match(/^(phy#[0-9]+)/);
			if(m){
				var info={
					dev:m[1].replace('#','') //because rfkill shows it without, this way we can match
					,connected:(block.match(/\n\t\tchannel [0-9]+\)/) ? true:false)
					,mac:block.match(/\n\t\taddr (.*)\n/)[1]
				}
				let iface=block.match(/\n\tInterface (.*)\n/)[1];

				if(!details){
					data[iface]=info;
				}else if(connected){
					promises.push(iw_getIfaceStatus(iface)
						.then(info=>Object.assign(data[iface],info)))
						.catch(err=>err.prepend(`${iface}: `).reject())
				}
			}
		})
		if(details)
			return cX.groupPromises(promises).promise
				.catch(obj=>{
					var err=log.makeError("Failed to get interface details");
					obj.rejected.forEach(e=>err.addHandling(e));
					return err.reject();
				})
				.then(()=>data)
		else
			return data;
		;
	}





	/*
	* Get wifi status of iface
	*
	* NOTE: This method will show connected==false if we're running an ap. VERY IMPORTANT that it does so
	*		else we will break things like connectTemp()
	*
	* @param string iface
	* @param bool rejectIfDisconnected 	Default false. If true, rejected promise will be returned if not connected
	*
	* @return Promise({iface,up,link,connected,ap,ssid,freq,signal,bitrate}, << or err)
	* @async
	* @not_logged
	*/
	function iw_getIfaceStatus(iface,rejectIfDisconnected=false){
		try{iface=iw_validateIface(iface)}catch(err){return err.reject()}

		var info={iface:iface, connected:false, ap:null,ssid:null,freq:null,signal:null,bitrate:null}
		return getIfaceState(iface)
			.then(async function _iw_getIfaceStatus(state){
				try{
					Object.assign(info,state)
					if(state.up==false)
						return log.makeError(info).reject('NOT_CONNECTED');
					
					var {stdout}=await cpX.execFileInPromise('iw',['dev',iface,'link'])
					var m=stdout.match(/Connected to ([a-f0-9:]{17})/)
					if(m){
						try{
							info.connected=true;
							info.ap=m[1];	
							info.ssid=stdout.match(/\n\tSSID: (.+)\n/)[1]
							info.freq=Number(stdout.match(/\n\tfreq: ([0-9]+)\n/)[1])
							info.signal=Number(stdout.match(/\n\tsignal: (-[0-9]+) dBm\n/)[1])
							info.bitrate=Number(stdout.match(/\n\ttx bitrate: ([0-9\.]+)/)[1])

						}catch(err){
							return log.makeError(`Unexpected output from 'iw dev ${iface} link'.`,err,'\n',stdout)
								.reject('PARSE_ERROR');
						}
					}

					return info;
				}catch(err){
					return Promise.reject(err)
				}
			})
			.catch(err=>{
				err=log.makeError(err);
				if(err.code=='NOT_CONNECTED'){
					log.trace(`Interface ${iface} is not connected to a network`);
					if(rejectIfDisconnected)
						return err.reject();
					else
						return info;
				}else
					return err.reject();
			})

	}



	/*
	* Make sure a wifi interface exists on this system, else get the first available one
	*
	* @return string
	* @sync
	*/
	function iw_validateIface(iface,list){
		try{
			if(!list)
				list=iw_listInterfaces(false)

			if(list instanceof Object)
				list=Object.keys(list);
			else if(Array.isArray(list))
				log.throwType("list of interfaces",list);

			if(typeof iface=='string'){
				if(list.indexOf(iface)==-1){
					log.warn(`Interface '${iface}' doesn't exist. These do:`,list).throw('BAD_INTERFACE');
				}
				return iface;
			}else if(!list.length){
				log.warn(`No wifi interfaces found on this machine.`).throw('NO_INTERFACE');
			}else{
				return list[0];
			}
		}catch(err){
			log.throw(err);
		}
	}


	/*
	* Check if wifi/bluetooth devices are on/off.
	*
	* @return object 	Keys are device names (eg. phy0, hci:0), values are {id, }
	*/
	function iw_rfkillList(){
		try{
			var stdout=cpX.native.execFileSync('rfkill',['list']).toString();
		}catch(err){
			var ble=log.makeError('Failed to list rfkill devices.',err)
				code='SYSCALL_FAILED';
			if(details)
				return ble.reject(code);
			else
				ble.throw(code)
		}

		var data={};
		('\n'+stdout).split(/\n(?=\d+: )/g).forEach(block=>{
			if(block){
				try{
					var m=block.match(/(\d+): ([a-z0-9]+):/)
					data[m[2]]={
						id:m[1]
						,soft:(block.match(/Soft blocked: ([a-z]+)/)[1]=='no'?false:true)
						,hard:(block.match(/Hard blocked: ([a-z]+)/)[1]=='no'?false:true)
					}
				}catch(err){
					log.warn("Failed to parse 'rfkill list' block:",err,block);
				}
			}
		})

		return data
	}




	/*
	* Get list of all currently visible wifi signals (ie. a single wifi network may be hosted by
	* several APs in range, this will list them all)
	*
	* @param string iface 	The iface to get signals on. defaults to first wifi iface.
	* @param number wait 	Default 5000=5sec. If device is busy, wait this long then try again
	*
	* @return Promise(array,err)
	* @root
	*/
	function iw_listWifiSignals(iface,wait=5000){
		if(process.getuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		var list=iw_listInterfaces(); //used in first catch vv
		iface=iw_validateIface(iface,list);

		log.trace(`Scanning for wifi-signals on ${iface}, this might take a while...`)
		//2 usual errors to this command: 240 device busy, 156 network down
		return cpX.execFileInPromise('iw',['dev',iface,'scan'])
			.catch(err=>{
				// console.log('GOT REJECTED VALUE:',err);
				try{
					if(err.code==156){
						var blocked=iw_rfkillList()[list[iface].dev];
						if(blocked.soft)
							return err.reject('DEVICE_SOFTBLOCKED');
						else if(blocked.hard)
							return err.reject('DEVICE_HARDBLOCKED');
						else{
							err.addHandling("rfkill shows device NOT soft blocked");
							return err.reject("NETWORK_DOWN");
						}
					}else if(
						err.code==240 //device busy...
						|| err.code==226 //read-only filesystem... but seems to resolve itself
					){
						// console.error("GOING TO CALL REJECT AGAIN")
						return err.reject("RETRY");  
					}

				}catch(e){
					log.warn("Failed to gracefully handle error from in iw_listWifiSignals()",e);
				}
				return Promise.reject(err);
			})
			.then(obj=>{
				typeof obj=='undefined' 
					&& log.throw('BUGBUG: got undefined, check .catch and execFileInPromise');

				try{
					var arr=obj.stdout.split(/^BSS /m);
					arr.shift();
				}catch(err){
					log.throw("Unexpected output from cmd:",obj,err);
				}
				var i,l=arr.length,data=[];
				for(i=0;i<l;i++){
					var str=arr[i]
					try{
						// console.log(str)
						var info={};
						var match=str.match(/^([0-9a-f:]{17})\(on (.*)\)( -- associated)?/);
						if(!match){
							throw('NO MATCH: '+str.split('\n')[0])
						}
						info.bssid=match[1];
						info.device=match[2];
						info.connected=match[3] ? info.device : false;

						match=str.match(/^\s+SSID: (.+)/m);
						info.ssid=match ? match[1].trim():'';

						
						info.rate=str.match(/^\s+Supported rates: ([\d.* ]+)/m)[1]
							.split(' ').map(r=>Number(r.replace('*',''))).filter(r=>r).pop()
						;
						match=str.match(/^\s+Extended supported rates: ([\d.* ]+)/m)
						if(match){
							let r2=match[1].split(' ').map(r=>Number(r.replace('*',''))).filter(r=>r).pop();
							info.rate=Math.max(info.rate,r2);
						}
						
						info.signal=Number(str.match(/^\s+signal: (.+) dBm/m)[1].trim()); //2019-09-11 TODO: given in dBm, instead of as nmcli
						info.freq=Number(str.match(/^\s+freq: (\d+)/m)[1].trim());
						info.chan=freqToChan[info.freq];

						info.security=[];
						if(str.match(/^\s+WEP:\s+\*/m))
							info.security.push('WEP');
						if(str.match(/^\s+WPA:\s+\*/m))
							info.security.push('WPA');
						if(str.match(/^\s+RSN:\s+\*/m))
							info.security.push('WPA2');
						info.security=info.security.join(',')||false;
						
						info.wps=str.match(/^\s+WPS:\s+\*/m) ? true : false;

					}catch(err){
						console.log(err);
					}

					data.push(info);
				}
				return data; //array
				// .filter(n=>n)
			})
			.catch(err=>{
				if(err=='RETRY' && wait){
					return cX.sleep(wait).then(()=>iw_listWifiSignals(iface,0));
				}
				return log.makeError('Failed to list wifi signals',err).reject();
			})
	}



	/*
	* Get a list of all visible wifi networks (ie. signals from APs grouped by SSID), using iw to
	* scan for the wifi signals
	*
	* @return Promise(object) 	@see groupSignalsBySSID
	* @root (call iw_listWifiSignals)
	*/
	function iw_listWifiNetworks(){
		return iw_listWifiSignals()
			.then(groupSignalsBySSID)
		;
	}


















	/******************** wpa_supplicant & wpa_cli ****************/
	/*
		wpa_supplicant is usually run by dhcpcd, ie. it is not started by systemd or init.d

		The config file usually starts with:
			ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=wheel
		which states the control interface (which wpa_cli uses) and which user group is
		allowed to send commands to it. In this config file we store networks that we want 
		a client to automatically connect to, in the order we wish to try them.

		We have decided to work with wpa_supplicant like this:
		 - Individual networks are configured in /etc/wpa_supplicant/conf.d/
		 - The main conf file ^^ is generated from a template + the networks we want to autoconnect
		 	-- /etc/wpa_supplicant/template.conf

	*/

	const ws_mainCfgPath='/etc/wpa_supplicant/wpa_supplicant.conf';
	const ws_tempCfgPath='/etc/wpa_supplicant/template.conf';
	const ws_netCfgPath='/etc/wpa_supplicant/conf.d/';
	const ws_logfile='/var/log/wpa_supplicant.log';
	const ws_connectOptions=[
		'-D','nl80211,wext'
		,'-g','/var/run/wpa_supplicant'
		,'-G','netdev'
	]



	/*
	* Get list of all networks we have a conf file for
	*
	* @return array[string]
	* @sync
	*/
	function ws_listSavedNetworks(){
		return fsX.ls(ws_netCfgPath).map(file=>file.replace('.conf',''));
	}



	/*
	* Get conf details for a single network
	*
	* @param string ssidOrConfPath 	 	
	*
	* @return Promise(object,BLE) 	Resolves with conf object, rejects with error
	* 
	* @root - read privs in ws_netCfgPath
	* @not_logged
	*/
	function ws_getNetworkConf(ssidOrConfPath){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		try{cX.checkType('string',ssidOrConfPath)}catch(err){return err.reject();}

		var stack=new Error().stack; //use below if needed, else stack wll only contain 

		var path;
		return cX.firstResolved([
			fsX.existsPromise(`${ws_netCfgPath}${ssidOrConfPath}.conf`,'file',true)
			,fsX.existsPromise(ssidOrConfPath,'file',true) //true=>resolve with clean path, reject if not exists
		],false) //false=>don't log rejected, just return them (since at least one WILL fail)
		.catch(err=>log.makeError("Could not find stored network: ",ssidOrConfPath,err).reject("NO_EXIST"))
		.then(_path=>{
			path=_path;
			return fsX.readFilePromise(_path)
		})
		.then(str=>{
			//Look for and grab what's between the network brackets
			let m=str.match(/^network={([\s\S]*)^}/m)
			if(!m)
				return log.makeError("File didn't contain properly formated network conf:",path,str).reject('BAD_SYNTAX')
			str=m[1]

			//Loop through all lines, extracting the the details but ignoring comments 
			var conf=parseConfStr(str)

			//Add path as non-enumerable so ws_confObjToStr() doesn't include it if ever writing back to file
			Object.defineProperty(conf,'path',{value:path}); 
			return details;
		})
	}


	/*
	* @return Promise(object,<BLE>) 	Keys are ssid's, values are child objects with info
	* 
	* @root - read privs in ws_netCfgPath
	* @not_logged
	*/
	function ws_getAllNetworkConfs(){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		var all={};
		var nets=ws_listSavedNetworks();
		return cX.groupPromises(nets.map(ws_getNetworkConf)).promise
			.then(obj=>{
				obj.resolved.forEach(net=>all[net.ssid]=net);
				return all;
			}).catch(obj=>{
				err=log.makeError("Failed to get all network confs:")
				obj.rejected.forEach((err,i)=>err.addHandling(log.makeError(err).prepend(nets[i]+': ')))
				return err.reject();
			})
	}










	/*
	* @return Promise(object,err)
	*/
	function ws_makeConfObj(confOrSsid,pass){
		return new Promise(async function _ws_makeConfObj(resolve,reject){
			try{
				//First handle the first arg which could be an entire conf or an ssid
				var conf;
				if(typeof confOrSsid=='string')
					conf={ssid:confOrSsid}				
				else if(!confOrSsid || typeof confOrSsid!='object' ||!confOrSsid.ssid)
					return reject(log.makeError('Expected conf object or ssid+pass, got:',confOrSsid,pass).reject('EINVAL'));
				else{
					conf=confOrSsid
					if(conf._makeConfObj==true)
						return resolve(conf);
					else
						Object.defineProperty(conf,'_makeConfObj',{value:true}) //so we don't run this method again
				}

				//Then determine if the password was passed seperately or included in the conf...
				pass=(typeof pass=='string'?pass:
					cX.getFirstMatchingProp(conf,['psk','passphrase','password','pass','passwd'],null,true));
				//...and make sure it's not cleartext
				if(typeof pass=='string'){
					if(pass.match(/[0-9a-fA-F]{64}/))
						conf.psk=pass
					else
						conf.psk=await ws_makePassphrase(conf.ssid,pass)

					//if nothing else is set, default to it being a WPA-PSK
					conf.key_mgmt='WPA-PSK'
				}
				
				log.trace('Created network conf:',conf);
				return resolve(conf);

			}catch(err){
				return reject(log.reject('BUGBUG',err));
			}
		})
	}



	/*
	* @return Promise(string,err)
	*/
	function ws_makePassphrase(ssid, password){
		if(!cX.checkTypes(['string','string'],arguments,true))
			return log.makeError("Expected 2 strings, got:",ssid,password).reject('TypeError');

		return cpX.execFileInPromise('wpa_passphrase',[ssid, password])
			.then((obj)=>{
				let m=obj.stdout.match(/psk=([0-9a-f]{64})/);
				if(m)
					return m[1]
				else
				 	log.makeError("Unexpected output from wpa_passphrase: ",[ssid, password]
				 		,cX.stringifySafe(obj)).reject();
			})
	}

	/*
	* @return string 	String ready to be written to file
	* @private
	*/
	function ws_confObjToStr(conf){
		var str="network={",key;
		for(key in conf){
			str+=`\n\t${key}=`;
			let v=conf[key];
			if(!cX.isEmpty(v)){
				if(typeof v=='string' && v.match(/\s/))
					str+=`"${v}"`
				else
					str+=v
			}
		}
		str+='\n}';
		return str;
	}













	/*
	* Create a config file for a single network
	*
	* @param object|string conf 	Object with multiple params, or ssid
	* @param string path 			Optional path to write to. NOTE: this should only be used by connectTemp()
	*
	* @return Promise(obj,err) 	The cleaned up and passphrased conf obj
	* @async
	* @root - write privs in ws_netCfgPath
	*/
	function ws_addNetwork(conf,path=null){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		//Default is not to overwrite existing, since you should use editNetwork() if that's the
		//case. But, a secret function used by editNetwork() is to pass 'overwrite' as path so 
		//we don't have to delete the existing network because that causes the autoconnect file to
		//be re-written twice...
		var overwrite=false;
		if(path=='overwrite'){
			overwrite=true;
			path=null;
		}

		var strConf;
		return ws_makeConfObj(conf)
			.then(_conf=>{
				conf=_conf;
				path=path||`${ws_netCfgPath}${conf.ssid}.conf`;
				strConf=ws_confObjToStr(conf);
				return fsX.prepareWritableFile(path,overwrite,600);
			})
			.then(()=>{
				log.trace((overwrite?'Creating new ':'Editing ')+'network conf file:',path,strConf);
				return fsX.writeFilePromise(path,strConf) 
			})
			.then(()=>conf)
			.catch(err=>log.makeError('Failed to add network.',err).reject())
		;
	}




	/*
	* Delete a network from conf-files and from autoconnect/main conf
	*
	* @param string ssid
	*
	* @return Promise(number|BLE) 	0-didn't exist, 1-deleted from indv. confs only, 2-deleted from autoconnect
	*								only, 3-deleted from both
	*
	* @root - write privs in ws_netCfgPath
	*/
	function ws_deleteNetwork(ssid){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		var path=`/etc/wpa_supplicant/conf.d/${ssid}.conf`;
		var ret=0;
		return fsX.deleteFilePromise(path)
			//Then check if the networks was part 
			.then(_existed=>{
				if(_existed){
					ret=1
					log.info(`Deleted network '${ssid}'`);
				}
				else
					log.debug(`Network '${ssid}' didn't exist, no need to delete.`);
				return ws_listAutoconnectNetworks();
			})
			.then(arr=>{
				var oldPos=arr.indexOf(ssid);
				if(oldPos>-1){
					arr.splice(oldPos,1);
					log.info(`Also removing network '${ssid}' from autoconnect networks.`);
					return ws_createAutoconnectConfig(arr).then(()=>2);
				}else{
					log.trace(`Network '${ssid}' not part of autoconnect networks`);
					return 0;
				}
			})
			.then(
				wasAuto=>{
					return ret + wasAuto;
				}
				,err=>log.makeError(err).reject()
			)
		;			
		
	}




	/*
	* Edit an existing network. 
	*
	* NOTE 1: This will change both individual and autoconnect confs.
	* NOTE 2: This data will be combined with the existing data
	*
	* @param string ssid
	* @param object conf 	
	*
	* @return Promise(obj,BLE) 	Resovles with the combined conf obj
	*
	* @root - needs write perm to ws_netCfgPath
	*/
	function ws_editNetwork(ssid,conf){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		return ws_getNetworkConf(ssid) //get existing details...
			.catch(err=>{log.warn('Failed to read existing conf, ignoring...',err);return {}}) //...but if we can't, just ignore it
			.then(old=>{
				//TODO: check if they are the same, in which case bail
				conf=Object.assign(old,conf); //...and combine with new... 
				return ws_addNetwork(conf,'overwrite') //...which we write to file with secret 'overwrite' param
			})
			.then(()=>ws_listAutoconnectNetworks()) //then get a list of autoconnect networks... 
			.then(autoList=>{
				let i=autoList.indexOf(ssid);//...and check if our network is among them, in which case we have to update autoconnect too 
				if(i>-1){
					//Note, we looked for old ssid^^, but conf could hold a new one... if change in the list
					if(conf.ssid!=ssid)
						autoList.splice(i,1,conf.ssid);

					return ws_createAutoconnectConfig(autoList);
				}else
					return true;
			})
			.then(()=>conf) //conf is not the updated/combined conf
		;
	}


























	/*
	* @return Promise(array[string])
	*
	* @netdev/@root
	*/
	function ws_listAutoconnectNetworks(iface=null){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		if(iface){
			//These are the actual configured networks for a given interface...
			return Promise.resolve(iw_validateIface(iface))
				.then(iface=>{
					log.trace("Getting configured networks for "+iface);
					return cpX.execFileInPromise('wpa_cli',['-i',iface,'list_networks'])
				})
				.then(({stdout})=>stdout.split('\n')
					.map(line=>line.match(/^\d+\t([^\t]+)/))
					.filter(match=>match)
					.map(match=>match[1])
				).catch(err=>log.reject("Failed to list autoconnect networks.",err.error))//;,err.stderr))
			;
		}else{
			//These are the networks in the conf file
			log.trace("Getting networks in "+ws_mainCfgPath);
			return fsX.readFilePromise(ws_mainCfgPath)
				.then(str=>{
					var regex = /^\s*ssid=(.+)$/gm; //get all lines with ssid that aren't commented
					var m, list=[];
					while (m = regex.exec(str)) {
						//TODO: handle comments at end of line, but accept # within quotes... or is that not ssid legal?
					    list.push(m[1]);
					}
					if(!list.length)
						log.warn(`Found no autoconnect networks in ${ws_mainCfgPath}, can that be right?`,str)
					return list
				})
			;
		}

	}


	/*
	* @param array[string] networks 	List of ssids
	*
	* @return Promise(array[string],BLE) Same list as passed in
	*
	* @root - needs write perm to ws_netCfgPath
	* @logged
	*/
	function ws_createAutoconnectConfig(ssidList){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		//Start by making sure all networks exist
		var saved=ws_listSavedNetworks();
		var missing=ssidList.filter(ssid=>saved.includes(ssid)==false);
		if(missing.length)
			return log.reject("Please add the following networks before creating the autoconnect file:",missing);

		var conf;
		return fsX.prepareWritableFile(ws_mainCfgPath,true,600) //overwrite and make readable only to root
			.then(()=>{
				if(fsX.exists(ws_tempCfgPath,'file')){
					return fsX.readFilePromise(ws_tempCfgPath)
						.then(str=>{
							log.debug("Using template file:\n\t",str);
							conf=str
						});
				}else{
					conf="ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev"
					log.debug("No template file found, using default template:\n\t",conf);
					return;
				}
			})
			.then(()=>{
				return cX.groupPromises(
					ssidList.map(ssid=>fsX.readFilePromise(`${ws_netCfgPath}${ssid}.conf`))
					,log
				).promise.then(
					obj=>obj.resolved
					,obj=>log.reject("Failed to read all confs. See previous logs.")
				)
			})
			.then(strArr=>{
				conf+='\n'+strArr.join('\n');
				conf=`# NOTE: Changes made to this file may be overwritten. Instead, make changes to:`+
					`\n#\t${ws_tempCfgPath}\n#\t${ws_netCfgPath}*\n`+conf;
				log.info('Writing new wpa_supplicant config with these networks:',ssidList);
				log.note(conf);
				return fsX.writeFilePromise(ws_mainCfgPath,conf);
			})
			.then(()=>cpX.execFileInPromise('wpa_cli',['-i',iw_validateIface(),'reconfigure']))
			.then((obj)=>{
				//wpa_cli will exit with 0 even on fail, but in that case stdout contains 'FAIL'
				if(obj.stdout.includes('FAIL'))
					return log.reject("Failed to reload wpa conf file:",obj);
				
				return ssidList	
			})
		;
	}

	/*
	* @param string ssid
	* @param number newPos
	* @param @opt string iface 	If omitted, first wifi iface will be used
	*
	* @return Promise(array[string],BLE) 	Resolves with list of ssid's
	*
	* @root - needs write perm to /etc/wpa_supplicant/conf.d/
	*/
	function ws_changeAutoconnectOrder(ssid,newPos){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		return ws_listAutoconnectNetworks()
			.then(list=>{
				cX.checkTypes(['string','number'],[ssid,newPos]);
						
				var oldPos=list.indexOf(ssid);
				if(oldPos==newPos){
					log.trace(`Network with SSID ${ssid} already in pos ${newPos}`);
					return list;
				}else if(oldPos==-1){
					log.trace(`Inserting network with SSID ${ssid} at pos ${newPos}`);
					
					list.splice(newPos,0,ssid);//only insert
				}else{
					log.trace(`Moving network with SSID ${ssid} from pos ${oldPos}-->${newPos}`);
					list.splice(oldPos,1); //remove from old...
					list.splice(newPos,0,ssid);//...and insert at new location
				}

				return ws_createAutoconnectConfig(list);
			})
		;
	}













	/*
	* @param string ssidOrConfPath 		ssid of network that's already been addNetwork(), or path to custom conf file
	*									 (the later is used by eg. connectTemp())
	* @param string iface
	*
	* @return Promise([string],ble) 	Resolves with array of cidr strings, rejects with ble with code set to
	*									to eg. 'NO_CONFIG' which can hopefully be acted upon
	* @root
	*/
	function ws_connect(ssidOrConfPath,iface){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		var conf;
		return ws_getNetworkConf(ssidOrConfPath)
			.catch(err=>{
				log.makeError("No config exists for this network, run ws.addNetwork() first.",err).reject('NO_CONFIG');
			})
			.then(_conf=>{
				conf=_conf;
				return iw_getIfaceStatus(iface); //will reject if iface doesn't exist
			})
			.then(status=>{
				iface=status.iface; //make available vv
				if(!status.up)
					return toggleIface(iface,'up'); //TODO: may want to bring back down after fail if down before
				else if(status.connected)
					return ws_disconnect(iface);
				else
					return;
			})
			.then(()=>{

				//Prepare to tail the logfile
				var tail=new fsX.tail(ws_logfile);
				tail.on('ready',function(){log.highlight("tail emitted READY:",arguments)})

				//Spawn it detached (it will daemonize because of -B flag) and ignore any output (which -f flag sends to log file anyway)...
				log.info(`About to connect to ${conf.ssid} on ${iface}`);
				cpX.native.spawn('wpa_supplicant',[
					'-i',iface
					,'-c',conf.path
					,'-f',ws_logfile
					,'-B' //run ad deamon
				].concat(ws_connectOptions),{detached: true,stdio: 'ignore'});

				// ...then monitor the log file
				return new Promise(function monitorConnectLog(resolve,reject){
					tail.on(line=>{
						log.trace(`${iface}:`,line);
						if(line.includes('CTRL-EVENT-SSID-TEMP-DISABLED')){
							tail.stop();
					//DO WE WANT TO DISCONNECT HERE?? 2019-09-19
							let err=log.makeError(line)
								,m=line.match(/reason=(\S+)/);
							if(m)
								err.code = m[1]
							return reject(err);
						}else if(line.includes('CTRL-EVENT-ASSOC-REJECT') || line.contains('ailed')){
							log.warn(line);
						}else if(line.includes('CTRL-EVENT-CONNECTED')){
							log.info(`Successfully connected to wifi '${conf.ssid}'`);
							tail.stop();
							resolve();
						}else{
							log.debug(line);
						}
					})
					tail.start();
				})
			})
			//Finally we wait for an IP, at most 20 seconds
			.then(()=>waitForIP(iface,20000)) //rejects with 'NO_IP' or any error, resolves with array of cidr strings
			.catch(err=>log.makeError(`Failed to connect to ${conf && conf.ssid ? conf.ssid : 'wifi'}`,err)
				.reject('UNKNOWN',true)
			)
		;
	}


	/*
	* @root
	* @error-logged
	*/
	function ws_disconnect(iface){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		var p
		if(iface){
			p=ws_procs().then(obj=>{
				if(!obj[iface]){
					log.debug(`wpa_supplicant not running for ${iface}`)
					return false;
				}
				return cpX.execFileInPromise('kill',[obj[iface]])
					.then(()=>{log.info(`Disconneted wifi on ${iface}`);return true})
			})
		}else{
			p=cpX.execFileInPromise('pkill',['wpa_supplicant'])
				.then(()=>{log.info("Disconnected from ALL wifi networks");return true})
		}

		return p.catch(err=>{

				if(err.hasOwnProperty('stdout')){ //If the child process failed...
					if(cX.isEmpty(obj.stderr) && cX.isEmpty(obj.stdout)){
						log.trace("No wpa_supplicant was running");
						return false;
					}
				}
				
				return log.reject("Failed to disconnect",err);
			})
			
	}








	/*
	* Get all running wpa_supplicant processes
	*
	* NOTE: This only return processes where iface is specified on commandline... //TODO: get rest+check on actual interface status
	*
	* @return object 	Keys are iface names, values are pid
	*/
	function ws_procs(){
		return cpX.ps()
			.then(arr=>{
				var obj={};
				arr.filter(p=>p.command.match(/wpa-supplicant/))
				   .forEach(p=>{
				   		try{
							let iface=p.command.match(/\s-i([^\s]+))/)[1]
							obj[iface]=p.pid						
						}catch(err){
							log.warn(`Found wpa_supplicant process (${p.pid}) probably started by another process`)
						}
					})
				;
				return obj;
			})
		;
	}


	/*
	* Spawns a temporary wpa_supplicant process that connects to a network. As soon as
	* the resulting child is killed, any previous connection is resumed. This method does
	* not leave any config files lying around
	*
	* @return Promise(function,ble) 		Resolves with a callback that kills the connection and will attempt to 
	*										reconnect to any previous connection. It returns a promiste that resolves
	*										with cidr or false (no prev network)
	* @error_logged
	*/
	async function ws_connectTemp(ssid,pass,iface){
		return Promise(async function _connectTemp(resolve,reject){
			//Prepare function that will be resolved (or used on failure vv)
			var current;
			/*
			* @return Promise(array|false,err) 	Resolves with array of cidr's once old network is up and running,
			*									or false if it's not connecting to anything. 
			*/
			function reconnectToPrevious(){
				if(current.connected){
					log.info("Reconnecting to previous network:",current.ssid);
					return ws_connect(current.ssid,iface)
						.catch(err=>{
							if(err=='NO_CONFIG') //implies a temporary connection
								return false;
							else
								return log.makeError('Failed to reconnect to ',current.ssid,err).reject();
						})
					;
				}else{
					return ws_disconnect(iface)
						.then(()=>{
							if(!current.up)
								return toggleIface(iface,'down').then(()=>false);
							else
								return false
						})
					;
				}
			}

			//Attempt to connect...
			try{
				//Store the current connection
				current=await iw_getIfaceStatus(iface);

				//Bring interface up if it's not
				if(!current.up)
					await toggleIface(iface,'up');

				//Create a temporary config file
				var confPath=await getRandomFileName('/tmp');
				await ws_addNetwork({ssid:ssid,pass:pass},confPath);

				await ws_connect(confPath,iface);

				resolve(reconnectToPrevious);
			}catch(err){
				//On failure, log, reconnect, reject
				err=log.makeError('Failed to temporarily connect to network',err).exec();
				reconnectToPrevious().catch(err=>log.makeError(err).exec());
				reject(err);
			}

			//Regardless what happened ^^, we want to delete the temp conf file
			if(confPath)
				fsX.deleteFilePromise(confPath).catch(log.printOnce);
		});


	}










/**************** dhcpcd *******************/

	//TODO 2019-11-08: dhcpcd has options like 'rebind' which may be better than restarting the entire process

	/*
	* @return Promise 	Resolves when we're connected to network
	* @root
	*/
	function dh_restart(){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		if(arguments.length)
			log.warn("TODO: Cannot autoconnect to single interface yet, reconnecting all!")

		return ws_disconnect()//try to gracefully disconnect.
			.catch(()=>{}) //already logged ^^
			.then(()=>cpX.execFileInPromise('systemctl',['restart','dhcpcd'])) //resolves after ip aquired
			.then(obj=>iw_getIfaceStatus())
			//TODO: on fail, try to log why fail...
		;
	}









/**************** hotspot ******************
	
	A hotspot is implemented with:
		hostapd - access point
		dnsmasq - dhcp server

	Ip configurations are done manually

*/


	const ap_hostapdConf='/etc/hostapd/hostapd.conf'
	const ap_dnsmasqConf='/etc/hostapd/hostapd.conf'

	function ap_getPath(which){
		switch(which){
			case 'hostapd': 
			case 'ap':
				return ap_hostapdConf
			case 'dnsmasq': 
			case 'dhcp':
				return ap_dnsmasqConf
			default: 
				return which;
		}
	}
	/*
	* @sudo
	*/
	function ap_getConf(which){
		var path=ap_getPath(which)
		return fsX.readFilePromise(path)
			.then(str=>{
				var conf=parseConfStr(str)
				log.trace("Read conf "+path,conf);
				return conf;
			})
		;
	}
	/*
	* @sudo
	*/
	function ap_setConf(which,conf){
		var path=ap_getPath(which)
		return fsX.readFilePromise(path) //read
			.then(str=>{
				var key;
				for(key in conf){
					let val=conf[key];
					if(Array.isArray(val)){
						str.replace(val[0],val[1]) //change	
					}else{
						let regex=new RegExp(`^\s*${key}=.*$`,'m')
						str.replace(regex,`${key}=${val}`) //change
					}
				}
				return fsX.writeFilePromise(path,str); //write
			})
		;
	}


	/*
	* @sudo
	*/
	function ap_setIpOptions(iface,cidr){
		var obj={interface:iface};

		var block = new cX.netmask.Netmask(cidr);
		
		obj['option6']=[new RegExp('^(\s*dhcp-option=6,).*$','m'),`$1${block.first}`]

		var r=[cX.netmask.long2ip(cX.netmask.ip2long(block.first)+1)]
		r.push(block.last,block.mask,'1h')
		obj['dhcp-range']=r.join(',')

		return ap_setConf('dnsmasq',obj);
	}



	/*
	* Get status of running hostapd. 
	*
	* @return Promise(obj|true|false,n/a) 	Resolves with conf obj or true if running (depending on if we were able to read which
	*										conf file was being used), else false
	* @sudo
	*/
	function ap_status(){
		return cpX.execFileInPromise('systemctl',['status','hostapd'])
			.then(({stdout})=>{
				//We know it's running, try to get some more info
				let m=stdout.match(/Configuration file: (.*)$/m);
				if(m)
					return ap_getConf(m[1].trim());
				else
					return true
			})
			.catch(()=>false)
		;
	}


	/*
	* Setup a hotspot. This function sets an ip manually, then runs hostapd for access and dnsmasq as dhcp server
	*
	* @param string iface
	* @param string cidr 	Eg. 10.0.0.0/24. The ip config to set. NOTE: this machine will get first IP in subnet, 
	*						even if you pass in 10.0.0.40/24
	*
	* @return Promise
	* @sudo
	*/
	async function ap_start(iface,cidr,ssid,pass){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		if(!cX.checkTypes(['string','string','string','string'],arguments,true))
			return log.error("Expected iface,cidr,ssid and pass, got:",Object.values(arguments)).reject('TypeError');
		
		try{
			log.info("Starting hotspot...",iface,cidr);
			var o={log};

			await cpX.execFileInPromise('systemctl',['stop','dhcpcd'],o) //TODO: for one interface only

			await cpX.execFileInPromise('pkill', ['wpa_supplicant'],o).catch(()=>{}); //TODO: for one interface only
			 
			await cpX.execFileInPromise('ip',['addr','flush','dev',iface],o)

			await cpX.execFileInPromise('ip',['link', 'set', iface, 'up'],o)
			
			await cpX.execFileInPromise('ip',['addr', 'add', cidr, 'dev', iface],o)

			log.debug('Configuring and starting hostapd');
			await ap_setConf('hostapd',{'interface':iface,'ssid':ssid,'wpa_passphrase':pass});
			await cpX.execFileInPromise('systemctl',['start','hostapd']); //TODO: for one interface only

			log.debug('Configuring and starting dnsmasq');
			await ap_setIpOptions(iface,cidr);
			await cpX.execFileInPromise('systemctl',['start','dnsmasq']) //TODO: for one interface only

			log.info("Hotspot setup successfully!")
		}catch(err){
			return log.makeError('Failed to start hotspot',err).reject();
		}
	}

	/*
	* @sudo
	*/
	async function ap_stop(iface){
		if(process.getuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		try{
			log.info("Stopping hotspot...");

			log.debug('Stopping dnsmasq');
			await cpX.execFileInPromise('systemctl',[ 'stop', 'dnsmasq']);

			log.debug('Stopping hostapd which should also kill wpa_supplicant & dhcpcd');
			await cpX.execFileInPromise('systemctl',[ 'stop', 'hostapd']);

			
			log.debug('Flushing all IPs');
			await cpX.execFileInPromise('ip',['addr','flush','dev',iface])

			log.debug('Setting up link');
			await cpX.execFileInPromise('ip',['link', 'set', iface, 'up'])

			log.info("Hotspot stopped successfully!")
		}catch(obj){
			return log.makeError('Failed to stop hotspot',obj.error,obj.stderr).reject(obj.code);
		}
	}
























	/************************** Common ************************************************/

	/*
	* Group wifi signals by their SSID
	*
	* @param array signals 		@see @return listWifiSignals
	*
	* @return Promise(object) 		Keys are SSIDs, values are child objects
	*									{
	*										<SSID> : {
	*											ssid : <SSID>
	*											,connected : <IFACE>|<false>  //TODO 2019-09-04: may be multiple
	*											,signal : <number>
	*											,security : <string>
	*											,ap : [
	*												{bssid, chan, band,rate, signal,connected}
	*												,{}...
	*											]
	*										}
	*										,<SSID2>:{}...
	*									}
	*/
	function groupSignalsBySSID(signals){
		log.traceFunc(arguments);

		var networks={};

		signals.forEach(s=>{
			if(!networks.hasOwnProperty(s.ssid)){
				networks[s.ssid]={ssid:s.ssid, ap:[],connected:false, security:s.security}
			}

			let n=networks[s.ssid];

			//Set info for the signal/AP in question
			n.ap.push({
				bssid:s.bssid
				,chan:s.chan
				,band:s.band
				,rate:s.rate
				,signal:s.signal
				,connected:s.connected
			});

			//If this specific AP is the connected one, use it's info for the entire network
			if(s.connected){
				n.connected=s.connected;
				n.signal=s.signal;
			}
		})

		//For all networks that are not connected, find their best signal 
		var ssid;
		for(ssid in networks){
			let n=networks[ssid];
			if(!n.connected){
				n.signal=n.ap.reduce((acc,curr)=>Math.max(acc,curr.signal),-100); //remember signals are negative
			}
		};

		return networks;
	}































	/******************************** Other **********************************************/


	/*
	* Set an iface as up or down
	*
	* @return 
	* @root
	*/
	function toggleIface(iface,action){
		if(process.geteuid()!=0)
			return log.error("You must be root to toogle iface").reject('PERMISSION_DENIED');

		try{
			cX.checkType('string',iface)

			switch(action){
				case 1:
				case true:
				case 'up':
				case 'u':
					action='up'; break;
				case 0:
				case false:
				case 'd':
				case 'dn':
				case 'down':
					action='down'; break;
				default:
					throw new TypeError("Please explicitly specify if interface should be brought 'up' or 'down'");
			}
		}catch(err){return log.reject(err)};

		return cpX.execFileInPromise('ip',['link','set',iface,action])
			.then(success=>true,err=>log.reject(`Failed to set ${iface} ${action}`,err))
	}


	/*
	* @param string iface
	*
	* @return Promise({up,link})
	*/
	function getIfaceState(iface){
		cX.checkType('string',iface);
		return cpX.execFileInPromise('ip',['link','show',iface])
			.then(obj=>parseIpLinkOutput(obj.stdout))
	}




	/* 
	 Link networking 101:
	  Example output from 'ip link show' (or 'ip monitor link')
		wlp2s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
		wlp2s0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc pfifo_fast state DOWN mode DEFAULT qlen 1000
		wlp2s0: <BROADCAST,MULTICAST> mtu 1500 qdisc pfifo_fast state DOWN qlen 1000
		wlp2s0: <BROADCAST,MULTICAST,UP,LOWER_UP> 
		wlp2s0: <NO-CARRIER,BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state DORMANT group default
	  
	  First understand:
	  	This is the link layer, it has nothing to do with ip addresses or connectivity on the Network layer
	  	of the OSI model

	  There are 4 things of interest in the output above:
	    1. <UP> - This is a setting, not an observed state. This means that we have "told the computer that 
	              the interface can be used", but it does not tell us anything about if it's active or if a
	              wire is connected etc. If it's missing then we've told the computer not to use that interface.
	    2. <NO-CARRIER> - This roughly means that there is no Link Layer connection, ie. that no cable is 
	    				  plugged in or no wifi network has been connected to
	    2. <LOWER_UP> - This means we have a link layer connected, roughly the opposite of ^^
		3. state * - Unlike <UP> this is NOT a setting, it's an observed state. 'state UP' roughly means that both
		             <UP, LOWER_UP> flags are set, else it's usually 'state DOWN'. However, during certain
		             transitions it can show eg. 'UNKNOWN' or 'DORMANT' and we can get seemingly conflicting 
		             flags, like when connecting to a wifi (see last example^^)
	*/
	function parseIpLinkOutput(str){
		var info={up:false,link:false};

		var m=str.match(/<(NO-CARRIER)?[^>]*?(,UP)?,?(LOWER_UP)?>(.*state ([A-Z]+))?/);
		if(m){
			if(m[2]){
				info.up=true; 
				//As long as <UP> flag is present, we're up^, link is a little tricker however since
				//the output doesn't always seem consistent (ie. sometimes there is no output after <>)
				info.link=
					!m[1] //NO-CARRIER cannot be set
					&&m[3] //LOWER_UP must be set
					&&(m[5]=='UP' || !m[5]) //state must be UP or not be shown at all (ie. it can't be eg DORMANT)
			}
		}
		// console.log(str)
		// console.log(m);
		// console.log(info);

		return info;
	}


	/*
	* 
	* @param @opt ...string flag 	One or more flags. The following are available:
	*									- <iface>: one or more interface names to include (don't include <>)
	*									- !<iface>: one or more interface names to exclude (don't include <>)
	*									- One of the prop names: address,netmask,family,mac,internal,cidr, will
	*										return that prop instead of object for each address block
	*									- 4 or 6 to only include that family
	*									- 'firstAddress': only include first address block of each iface
	*									- 'firstIface': Only include first iface. Applied after other filters.
	*									- 'first': equivilent to: !lo, firstAddress, firstIface
	*
	* @return object|array|string 	Depends on flags set^. Without any flags you get this:
	*		{
	*		  lo: [
	*		    {
	*		      address: '127.0.0.1',
	*		      netmask: '255.0.0.0',
	*		      family: 'IPv4',
	*		      mac: '00:00:00:00:00:00',
	*		      internal: true,
	*		      cidr: '127.0.0.1/8'
	*		    },
	*		    {
	*		      address: '::1',
	*		      netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
	*		      family: 'IPv6',
	*		      mac: '00:00:00:00:00:00',
	*		      scopeid: 0,
	*		      internal: true,
	*		      cidr: '::1/128'
	*		    }
	*		  ],
	*		  eth0: [
	*		    {
	*		      address: '192.168.1.108',
	*		      netmask: '255.255.255.0',
	*		      family: 'IPv4',
	*		      mac: '01:02:03:0a:0b:0c',
	*		      internal: false,
	*		      cidr: '192.168.1.108/24'
	*		    },
	*		    {
	*		      address: 'fe80::a00:27ff:fe4e:66a1',
	*		      netmask: 'ffff:ffff:ffff:ffff::',
	*		      family: 'IPv6',
	*		      mac: '01:02:03:0a:0b:0c',
	*		      scopeid: 1,
	*		      internal: false,
	*		      cidr: 'fe80::a00:27ff:fe4e:66a1/64'
	*		    }
	*		  ]
	*		}
	*
	* @sync
	*/
	function getIpAddresses(...flags){
		var interfaces=os.networkInterfaces();
		var iface;

		//Filter on address family
		var family=cX.extractItems(flags,[4,6]).find(f=>f); //first mentioned family is included
		if(family)
			for(iface in interfaces) interfaces[iface]=interfaces[iface].filter(a=>a.family=='IPv'+family);

		//Get only specific prop for each iface
		var prop=cX.extractItems(flags,['address','netmask','family','mac','internal','cidr']); //first mentioned prop 
		if(prop)
			for(iface in interfaces){
				interfaces[iface].forEach((a,i)=>interfaces[iface][i]=a[prop]);
			} 
		

		//shortcut
		if(cX.extractItem(flags,'first'))
			flags.push('!lo', 'firstAddress', 'firstIface')


		//Only keep first address. Replaces array of addresses with single address (which  may be string or object
		//depending on if specific prop has been selected ^)
		if(cX.extractItem(flags,'firstAddress'))
			for(iface in interfaces) interfaces[iface]=interfaces[iface][0];


		//If we specified any iface to exclude, remove them
		var exclude=flags.filter(iface=>iface.substring(0,1)=='!')
		if(exclude)
			exclude.forEach(iface=>delete interfaces[iface.substring(1)]);
		

		
		var firstIface=cX.extractItem(flags,'firstIface');
		//If we specified any iface to include, remove all others
		var include=flags.filter(iface=>iface.substring(0,1)!='!')
		switch(include.length){
			case 0:
				break;
			case 1:
				return interfaces[include[0]]; //single address (which can be array or object/string, see ^^)
			default:
				cX.subObj(interfaces,include);break; //object where keys are interface names
		}

		//Finally, if we just want a single iface...
		if(firstIface){
			return interfaces[Object.keys(interfaces)[0]];
		}else
			return interfaces
	}

	/*
	* Checks if an interface is up and configured 
	*
	* @return number 	The number of interfaces we're connected on
	*/
	function isConfigured(iface){
		var nets=os.networkInterfaces();
		if(iface)
			return nets.hasOwnProperty(iface)
		else{
			delete nets['lo'];
			return Object.keys(nets).length>0
		}

	}





	/*
	* Remove all IPs from an interface
	* @root
	*/
	function flushIPs(iface){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		return cpX.execFileInPromise('ip',['addr','flush','dev',iface])
	}


	/*
	* @root
	*/
	function getMonitor(iface){
		cX.checkType('string',iface);
		var child=cpX.spawnLineEmitter('ip',['monitor','link','address','route','label','dev',iface]) 
		return child;
	}


	/*
	* @constructor monitor 		Monitor an iface for link up/dn and address add/del
	*
	* @opt string iface
	* @opt <ChildProcess> 	@see return from getMonitor()
	* @opt <BetterLog> 		If passed, events will be logged, debug-lvl
	* @opt number delay 		The number of ms after a monitor event to check status, default 100 			
	*
	* @emit connect
	* @emit disconnect
	* @emit exit
	* @emit ipadd
	* @emit ipdel
	* @emit linkup
	* @emit linkdn
	* @emit ifaceup
	* @emit ifacedn
	*
	* @emit status(this,changes,'connect'/'disconnect') The entire object is emitted AFTER other emits
	* @emit iface(new,old) The interface is changed (or set for the first time)
	*
	* @prop string iface
	* @prop array addresses
	* @prop boolean connected
	* @prop boolean up
	* @prop boolean link
	*
	* @return <BetterEvents>
	* @root 		Not if @mon is passed in 
	*/
	function monitor(...args){
		// if(process.geteuid()!=0 && !cpX.isChild(mon))
			// return log.error("You must be root to run this command. Or pass a running child process:",mon).reject('PERMISSION_DENIED');

		//Make sure this function is new'ed
		if(this.constructor!=monitor)
			log.throw("monitor() should be new'ed");

		var self=this;

		//If a log was passed in we'll log stuff... 
		let _log=cX.getFirstOfType(args,'<BetterLog>','extract')
		Object.defineProperty(this,'debug',{value:(_log ? _log.debug:function noLog(){})});

		Object.defineProperty(this,'log',{value:_log||log})

		//Inherit from BetterEvents and set failed emits to log to our log
		var bufferDelay=cX.getFirstOfType(args,'number',true)||100;
		BetterEvents.call(this,{bufferDelay});
		Object.defineProperty(this._betterEvents,'onerror',{value:this.log.error});
		
		
		//Allow changing delay in case there is more noise on the network
		Object.defineProperty(this,'bufferDelay',{
			get:()=>this._betterEvents.options.bufferDelay
			,set:(delay)=>{
				if(typeof delay=='number')
					this._betterEvents.options.bufferDelay=delay 
				return this._betterEvents.options.bufferDelay
			}
		});


		//One thing prevelent to most wifi networks is unstable connections leading to disconnect/connect
		//events to the same network firing within a second of each other. The length of these 'blips'
		//will vary with network and physical location of host, so settings a static bufferDelay may not always
		//be good (enough), therefore we can try to learn the length and adjust accordingly
		if(cX.extractItem(args,'dynamicNoiseFilter')){
			this.log.info("Got flag, using dynamic noise filter...")
			var disconnectAt,lastIP=this.addresses,lastChange=0;
			this.on('disconnect',()=>disconnectAt=Date.now())
			this.on('connect',(addresses)=>{
				if(!disconnectAt)
					return

				//If we don't get the same addresses, we've connected to another network or renegotiated with 
				//the dhcp or something, but regarless it's not the situation we're looking for...
				if(!cX.sameArrayContents(lastIP,addresses)){
					lastIP=addresses;
					return;
				}

				//If we were disconnected for more than 5 seconds there is probably something else happening, 
				//we're guessing, so just stop so we don't mess up the algo
				let delay=Date.now()-disconnectAt;
				if(delay>5000)
					return;

				//Buffered events + however 'ip monitor' works can cause this scenario
				// t=0 	 monitor spits out nonsense, triggering buffer
				// t=60  monitor spits out disconnect, the event of interest
				// t=100 disconnect is emitted and timmer started here ^^
				// t=320 monitor spits out nonsense, triggering buffer
				// t=340 monitor spits out connect, the other event of interest
				// t=420 connect is emitted and delay calulated to 420-100=320 when the real delay was 340-60=280
				//Which means the optimal thing would be to figure out how to disregard the nonense (hard), but 
				//the next best thing is to increase the delay 100=>320, which would cause this next time
				// t=0 	 monitor spits out nonsense, triggering buffer
				// t=50  monitor spits out disconnect, the event of interest
				// t=320 disconnect is emitted and timmer started here ^^
				// t=360 monitor spits out nonsense, triggering buffer
				// t=390 monitor spits out connect, the other event of interest
				// t=680 connect is emitted and delay calulated to 680-320=360 when the real delay was 390-50=340
				//so we adjust 320=>360.
				this.log.note(`dynamicNoiseFilter, increasing delay ${this.bufferDelay} => ${delay} ms`)
				this.bufferDelay=delay; //uses setter ^^
			})
		}

		//Now start the monitor, optionally with a passed in child process
		let _iface=cX.getFirstOfType(args,'string','extract');
		if(_iface){
			this.start(cX.getFirstOfType(args,'<ChildProcess>'),_iface);
		}
	}
	monitor.prototype=Object.create(BetterEvents.prototype);
	Object.defineProperty(monitor.prototype, 'constructor', {value: monitor});


	monitor.prototype.setIface=function(iface){
		//Same iface already set, don't reset any of vv
		if(this.iface==iface){				
			return;
		}
		
		cX.checkType('string',iface);
		if(!this.iface){
			this.debug(`Starting monitor of iface: ${iface}`);
		}else{
			var old=this.iface; //could be undefined
			this.debug(`Changing iface to monitor: ${old} --> ${iface}`);
		}

		this.iface=iface;
		Object.assign(this,getIfaceState(iface)); //assigns this.up and this.link
		this.addresses=getIpAddresses(iface,'cidr');
		if(this.addresses.length){
			this.connected=this.up; //up should always be true if we have addresses, but just in case not
			this.debug(`Initial state of ${iface} is 'connected' with IPs: `,this.addresses);
		}else{
			this.connected=false;
			this.debug(`Initial state of ${iface} is 'disconnected'`);
		}
		this.emit('iface',iface,old);
	}


	monitor.prototype.start=function(...args){
		try{
			this.setIface(cX.getFirstOfType(args,'string','extract'));

			//Used passed process, or create own
			var mon=cX.getFirstOfType(args,'<ChildProcess>');
			if(!mon){
				mon=getMonitor(this.iface);
				mon.on('readable',()=>this.log.debug(`Monitoring ${this.iface}...`))
			}
			
			Object.defineProperty(this,'stop',{configurable:true, value:cpX.killPromise.bind(null,mon)});

			//Error event is emitted when start fails, when kill fails, and when message fails. If the
			//process exits as a result that will trigger 'exit' as well
			mon.on('error',err=>{
				this.log.error(`Error while monitoring ${this.iface}:`,err);
			})


			//Extend the exit event. Don't try to restart it here since we might need more handling or we may
			//at least need to know that it's stopped
			mon.on('exit',(code,signal)=>{
				var err;
				if(signal==null){
					err=this.log.error(`Monitor exited unexpectedly with code ${code}`).setCode(code);
				}else{
					this.debug("Monitor killed by "+signal);
				}
				this.emit('exit',err);
			})


			mon.stdout.on('line',line=>{
				// this.log.trace(line);
				let t=line.substring(1,2);
				switch(t){
					//Route and address don't seem to be trusthworthy... so when we get them we  give it a delay, then
					//we check... ^^
					case 'R': //route
					case 'A': //address
						// this.log.debug("QUEING")
						this.bufferEvent('ip'); //don't store the line, it's easier to getIpAddresses() vv
						break;
					case 'L': //link
						// this.log.trace(line);
						this.bufferEvent('link',line);
						break;
					
					// default:
						// this.log.trace('IGNORE: ',t);

				}
			})


			//Regardless what triggered the buffer ^, check everything
			this.on('_buffer',function onMonitorBuffer(obj){
				try{
					try{
						var cidrs=getIpAddresses('cidr', this.iface)
					}catch(err){
						this.log.warn('Problem getting IP addresses, assuming none are set',err);
					}
					cidrs=cidrs||[];

					//Check for any added or deleted
					cidrs.forEach(cidr=>{
						if(!this.addresses.includes(cidr)){
							this.debug(`${this.iface} ip added:`,cidr);
							this.emit('ipadd',cidr);
						}
					})
					this.addresses.forEach(cidr=>{
						if(!cidrs.includes(cidr)){
							this.debug(`${this.iface} ip deleted:`,cidr);
							this.emit('ipdel',cidr);
						}
					})

					//Replace old for next time we check
					this.addresses=cidrs;


					//We want 'disconnect' to emit before link/up and 'connect' after, so store changes and emit at bottom
					var changes=[];

					//If any link lines have been caught, parse the last one...
					if(obj && obj.link && obj.link[0]){
						var {up,link}=parseIpLinkOutput(obj.link[0]);
						
						if(this.link!=link){
							changes.push([link?'linkup':'linkdn'])
							this.link=link;
						}

						if(this.up!=up){
							if(up)
								changes.unshift(['ifaceup']) //before linkup	
							else
								changes.push(['ifacedn']) //after linkdown
							this.up=up;
						}
					}


					// Being connected we base on interface being up and having at least one ip. It should also be based on link
					// being up, but it seems (especially with wifi) that link goes down temporarily quite regularly so for the
				    // purposes of taking action in a node app we'll consider that noise and ignore it (the link state is still 
				    // stored and the event emitted, so you can check/listen for that manually)
				    var connected=(this.up==true && this.addresses.length>0);
				    if(this.connected!=connected){
				    	this.connected=connected;
				    	if(connected){
				    		connected='connect';
				    		changes.push(['connect',this.addresses]); //emits last
				    	}else{
				    		connected='disconnect'
				    		changes.unshift(['disconnect']); //emits first
				    	}
				    }else{
				    	connected=undefined;
				    }

				    //Now emit the changes
				    changes.forEach(args=>{
				    	this.debug(`${this.iface} ${args.join(',')}`);
				    	this.emit.apply(self,args);
				   	})

				   	//If there are any changes, also emit a 'change' event
				   	if(changes.length)
				   		this.emit(self,changes,connected);

				}catch(err){
					this.log.error(err);
				}
			});//on buffer

		}catch(err){
			this.log.error("Problem starting monitor:",err);
		}
	}





	/*
	* @return Promise(str,str) 	Resolves with CIDR
	*
	*/
	function waitForIP(iface,timeout=60000,mon=null){

		var {promise,resolve,reject}=cX.exposedPromise(timeout);
		var ee;
		promise.catch(err=>{
			var reason;
			if(err=='timeout'){
				log.warn(`No IP within ${Math.floor(timeout/1000)} s`);
				reason='NO_IP_TIMEOUT';
			}else{
				log.error("Failed while waiting for IP:",err);
				reason='UNKNOWN';
			}
			//If we create a monitor here, make sure to stop it
			if(ee && ee!==mon)
				ee.stop().catch(log.warn);

			return Promise.reject(reason);
		})


		try{
			//First off, check if we've already got an ip
			var cidrs=getIpAddresses(4, 'cidr',iface)
			if(cidrs.length)
				resolve(cidrs);

			//Monitor for changes...
			ee=mon || monitor(iface);
			ee.on('ipadd',()=>resolve(mon.addresses));
			ee.on('error',()=>reject('MONITOR_IFACE_FAILED'))
			
		}catch(err){
			reject(err)
		}

		return promise;
	}


	/*
	* @param string  		iface
	* @param string 		cmd
	* @param array[string]	args
	*
	* @return array[string,...] 	Array of IP addresses
	* @private		
	*/
	function common_probeSubnet(iface,cmd, args){
		var cidrs=getIpAddresses(iface||'!lo','firstIface',4,'cidr');
		
		if(!cidrs)
			log.throw(`Cannot ${cmd} subnet. No configured IPv4 network ${(iface ? ' for '+iface : '')}`);

		return cX.groupPromises(cidrs.map(cidr=>cpX.execFileInPromise(cmd,args.concat(cidr))))
			.catch(obj=>obj)
			.then(obj=>{
				//All resolved promises represent a cidr that exists, so use the indexes of resolved promises
				//to get the corresponding cidr
				return Object.keys(obj.resolved).map(i=>cidrs[i])
			})
	}

	/*
	* @return array[string,...] 	Array of IP addresses
	*/
	function pingSubnet(iface){
		return common_probeSubnet(iface,'ping',['-w','1','-c','1']);	
	}

	/*
	* @return array[string,...] 	Array of IP addresses
	*/
	function arpingSubnet(iface){
		return common_probeSubnet(iface,'arping',['-I', iface, '-w','1','-c','1', '-q']);	
	}


	/*
	* Get all entries from arp cache. NOTE: arp cache only contains hosts you've communicated with during
	* the last x seconds, so for it to be complete you have to attempt to ping all hosts first
	*
	* @param bool addressOnly	If true, an array of string ip addresses will be returned
	*
	* @return array[{address,hwtype,hwaddress,flags,mask,iface},...] | @see param
	*/
	function arpCache(addressOnly){
		
		return cpX.execFileInPromise('arp',['-n'])
			.then(obj=>{
				var arr=cX.linuxTableToObjects(obj,true,true); //true=>headers to lower case, true=>outputIsTerese
				arr=arr.filter(x=>x.hwaddress!='(incomplete)')
				if(addressOnly)
					return arr.map(x=>x.address);
				else 
					return arr;
			})
		;
	}


	/*
	* This function requires you have arp-scan installed and you're running as root
	*
	* @root
	*/
	function arpScan(iface){
		if(process.geteuid()!=0)
			return log.error("You must be root to run this command").reject('PERMISSION_DENIED');

		var args=['--localnet','--quiet','--ignoredups'];
		if(iface)
			args.push('--interface='+iface);
		return cpX.execFileInPromise('arp-scan',args)
			.catch(obj=>{
				if(obj.code=='ENOENT')
					return log.reject("arp-scan is not installed");
				else
					return log.reject("Unknown error:",obj.code,obj.stderr);
			})
			.then(obj=>{
				var lines=obj.stdout.split('\n').slice(2); //first two lines are just intro
				var i=0,l=lines.length,data={};
				for(i;i<l;i++){
					let str=lines[i].trim();
					
					//First empty line means we're done
					if(!str)
						return data;

					let m=str.match(/(.*)\s+(.*)/)
					if(m)
						data[m[1]]=m[2]
				}
			})
	}


	function checkPortOpen(host, port, timeout=1){
		try{
			cX.checkTypes(['string','number','number'],[host,port,timeout])
		}catch(err){
			return Promise.reject(log.makeError(err).addHandling('Failed to check port open').exec());
		}
		
		return cpX.execFileInPromise('nc',['-z','-w',timeout,host,port])
			.then(
				function open(){return true}
				,function closed(){return false}
			)
		;
	}

	function findHostsWithOpenPort(iplist,port){
		try{
			cX.checkTypes(['array','number'],[iplist,port])
		}catch(err){
			return Promise.reject(log.makeError(err).addHandling('Failed to find hosts with open port').exec());
		}

		//Wheck each host for the open port, which will produce an array of booleans...
		return cX.groupPromises(iplist.map(ip=>checkPortOpen(ip,port)))
			.then(obj=>obj.resolved,obj=>obj.resolved)
			.then(boollist=>{
				//...but said list doesn't have the ip's, so match them and return a list of ip's where
				//the port is open
				var openlist=[];
				boollist.forEach((bool,i)=>{
					if(bool)
						openlist.push(iplist[i]); //the index corresponds to the ip used to create the promise
				})

				return openlist;
			})
		;
	}

	function renewDhcp(name){

	}


	function getSubnetIPs(ip,mask){

	  var block = new cX.netmask.Netmask(ip,mask);

	  var firstlong = cX.netmask.ip2long(block.first);
	  if (block.size > 2)
	    firstlong -= 1;

	  var r = [];
	  for (var i = 0; i < block.size; i++) {
	    var ip = i + firstlong;
	    r.push(cX.netmask.long2ip(ip));
	  }

	  return r;
	}



	/*
	* @return Promise(object) 	Keys are device names, values are connected ssid or false
	*/
	function iwconfig(details=false){
		return cpX.execFileInPromise('iwconfig')
			.then(({stdout})=>{
				var data={}
				stdout.split(/^\n$/m).forEach(str=>{
					var m=str.match(/ESSID:"(.*)"/);
					let iface=str.match(/^([^\W]+)/)[0];
					let ssid=(m ? m[1] : false);
					if(!details){
						data[iface]=ssid;
					}else{
						var info={ssid:ssid};
						if(ssid){
							info.signal=str.match(/Signal level=(-\d+) dBm/)[1];
							info.ap=str.match(/Access Point: ([a-fA-F0-9:]{17})/)[1];
							info.freq=Number(str.match(/Frequency:([0-9\.]+) GHz/)[1])*1000
						}	
						data[iface]=info				
					}

				})
				return data;
			})
	}



	/*
	* @param string ip
	* @opt bool thrw 		Default false. Only if true will this function throw
	*
	*
	* @throw TypeError 		If not string. NOTE: only if $thrw==true
	* @throw EFAULT 		If invalid ip. NOTE: only if $thrw==true
	*
	* @return boolean 	
	*/
	function validateIp(ip,thrw=false){
		if(typeof ip=='string'){
			var arr=ip.split('.');
			if(arr.length==4)
				return arr.every(block=>Number(block)>=0 && Number(block)<=255)
		}else if(thrw)
			log.makeError('Expected string ip, got: '+log.logVar(ip)).throw('TypeError');
		
		if(thrw)
			log.makeError('Not valid IPv4: '+log.logVar(ip)).throw('EFAULT');
		return false;
	}








	function parseConfStr(str){
		//Loop through all lines, extracting the the details but ignoring comments 
		var conf={};
		str.split('\n').forEach(line=>{
			let m=line
				.replace(/#.*/,'')//remove all comments
				.trim() //remove surrounding whitespace
				.match(/^(\S+?)=(.*)$/)
			; 
			if(m)
				conf[m[1]]=m[2];
		})
		return conf;
	}



	/*
	* @return object
	*	{
	*		tcp:{
	*			80:['0.0.0.0']
	*			544:['0.0.0.0','127.0.0.1']
	*		}
	*		,udp:{...}
	*		,tcp6:{...}
	*		,udp6:{...}
	*	}
	*/
	function listeningPorts(){
		var arr=cpX.execFileSync('netstat',['-lntu']).stdout
			.split('\n')
			.slice(1) //first row is just description
		;
		//Some of the headers have spaces in them, solve that
		arr[0]=arr[0].replace('Local Address','local_address').replace('Foreign Address','foreign_address')

		arr=cX.linuxTableToObjects(arr,true);

		var obj={tcp:{},udp:{},tcp6:{},udp6:{}},i;
		for(i=0;i<arr.length;i++){
			let r=arr[i];
			let m=r['local_address'].match(/^(.*):(\d+)/);
			if(m){
				if(obj[r.proto].hasOwnProperty(m[2]))
					obj[r.proto].push(m[1])
				else
					obj[r.proto]=[m[1]]
			}else{
				log.warn(`Unexpected output from 'netstat -lntu' on line ${i}:`,r);
			}
			
		}

	}



	/*
	* Ping an ip a single time
	*
	* @param string ip
	*
	* @return Promise(true|false, err) 	Resolves with ping success boolean, rejects if $ip is not valid
	* @reject TypeError
	* @reject EFAULT
	*/
	function ping(ip){
		try{validateIp(ip,true)}catch(err){return err.reject()}
		return cX.execFileInPromise('ping',[ip,'-c',1]).then(()=>true,()=>false);
	}



	return netX;
} //end of netX

