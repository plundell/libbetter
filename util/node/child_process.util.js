#!/usr/local/bin/node
'use strict'; 
/*
	Extended Promise class

	Author: palun
	Date: Sept 2017

	This module builds upon the built-in "child_process" class to create some convenient functions 


	Notes:

	From https://nodejs.org/api/child_process.html#child_process_event_error
		The 'error' event is emitted whenever:

	    The process could not be spawned, or
	    The process could not be killed, or
	    Sending a message to the child process failed.

		The 'exit' event may or may not fire after an error has occurred. When listening to both the 'exit' 
		and 'error' events, guard against accidentally invoking handler functions multiple times.


*/
module.exports=function export_cpX({BetterLog,cX,sX,...dep}){



	const log=new BetterLog('cpX');

	//Defining fsX so we don't accidently in the future try to include it since it is already including us 
	// const fsX={}
	/*
	* @const object h 			Our own general helper class
	*/
	// const cX=require('../util.common.js');
	/*
	* @const object sX 			Local stream util module
	*/
	// const sX=require('./stream.util.js');
	


	/*
	* @const object _path 			The native path class
	*/
	const _path=dep.path||dep._path||dep.p||dep._p||require('path');

	/*
	* @const object cp 			The native child_process class 
	*/
	const cp=dep.cp||require('child_process');




	//Returned at bottom
	const _exports={
		'native':cp
		,onAnyExitSignal
		,execFileInPromise
		,execFileSync
		,isChild
		,childStatus
		,childFilenameAndPid
		,'childProc':childFilenameAndPid //alias for backwards comp
		,pidStatus
		,killPromise
		,resolveOnExit
		,spawnReadable
		,spawnLineEmitter
		,argsToString
		,getId
		,getGroupMap
		,dropPrivs
		,ps

	}



	/*
	* @param string 	cmd 		The command to run
	* @param array 		args 		The args for the command
	* @param object 	options
	*
	* @return object 
	*/
	function _execCommonPrepare(cmd,args=[],options={}){
		cX.checkTypes(['string','array','object'],[cmd,args,options]);



		//Figure out which executable will run. Remember, node will use options.env.PATH if specified, in which
		//case 'which' won't work since 'which' uses process.env.PATH
		if(!options.PATH){
			try{
				cmd=cp.execFileSync('which', [cmd]).toString().trim();
			}catch(err){
				log.throwCode('ENOENT','No such executable found:',cmd,process.env);
			}
		}

		//Build the ret obj
		var obj= {
			//Some options are meant to be used by here, the rest by the native execFile() and execFileSync()
			localOptions:cX.extract(options,['lines','log','noLog'])
			,nativeOptions:options

			//Any failed exec's, in order for the stack to show who called this method, we create one here 
			//(outside the callback), and then we back it up by one vv
			,stack:Error().stack

			,start:Date.now()

			,cmd:[cmd].concat(args).join(' ')

		}

		//Log depending on options
		if(!obj.localOptions.noLog){
			let _log=obj.localOptions.log;
			if(_log && _log._isBetterLog)
				obj.localOptions.log.info("About to run: "+obj.cmd);
			else
				log.trace(obj.cmd); //the log defined at the top of this file
		}

		return obj;

	}





	/**
	* This function wraps an execFile() in a promise that resolves if the child runs to end successfully 
	* else it rejects
	*
	* @params @see _execCommonPrepare
	*
	* @return Promise(obj,<ble>) 		Resolves/reject with {stdout, stderr, duration, signal, code}. On reject this object
	*									is instance of BetterLogEntry
	* @access public
	*/
	function execFileInPromise(cmd,args,options){
		var obj=_execCommonPrepare(cmd,args,options); //NOTE: If command fails, this line will show as 'where'

		//Wrap the whole execution in a promise, which we return once the song has been played
		return new Promise(function _execFileInPromise(resolve, reject){
			var child_process=cp.execFile(cmd, args, obj.nativeOptions, (error, stdout, stderr)=>{					
				try{
					//Add the args we got in this callback to the object created by _execCommonPrepare() then hand
					//execution over to the common callback function
					resolve(_execFileCommonCallback(Object.assign(obj,{error,stdout,stderr})));
				}catch(ble){
					reject(ble); //NOTE: ble has props stdout, stderr, duration, signal
				}
			});
		});
	}


	/**
	* This function wraps around execFileSync() and returns an object
	*
	* @params @see _execCommonPrepare
	*
	* @throw <ble> 			If cmd exits with error. Also has props of @return
	*
	* @return object 		{stdout, stderr, duration, signal, code} 	
	* @access public
	*/
	function execFileSync(cmd, args, options){
		// log.highlight(log.logVar(Object.values(arguments),3000));
		var obj=_execCommonPrepare(cmd,args,options);
		
		//2019-10-22: For now we just pipe everything, which means on success we can't access stderr
		//				Check out more here:
		//		https://github.com/rauschma/stringio/blob/master/ts/src/index.ts
		//		https://2ality.com/2018/05/child-process-streams.html
		if(!obj.nativeOptions.stdio){
			obj.nativeOptions.stdio='pipe'
		}
			
		try{
			//TODO 2019-10-29: on success we loose stderr... And some commands use it to write important stuff
			obj.stdout=cp.execFileSync(cmd, args, obj.nativeOptions)
		}catch(err){
			Object.assign(obj,err);
			obj.error=err.message;
			  //^message is non-enumerable, so Object.assign will ignore it... (so is stack, 
			  // but we're using the one created in execPrepare())
		}
		
		return _execFileCommonCallback(obj); //can throw
	};




	/**
	 * Common internal function for execFileInPromise() and execFileSync()
	 *  
	 * @param object obj    Object created by _execCommonPrepare()
	 * 
	 * @throw Object.assign(<BLE>,@return)      Can be used as error or same as @return
	 * @return object   						{stdout, stderr, duration, signal, code}
	 */
	function _execFileCommonCallback(obj) {
		//Make sure we have strings without surrounding whitespace
		obj.stdout=String((obj.stdout||'')).trim();
		obj.stderr=String((obj.stderr||'')).trim();
		obj.duration=Date.now()-obj.start;

		//Extract the error
		const error=obj.message||obj.error||null;
		delete obj.message;
		delete obj.error;

		//Extract the stack set by _execCommonPrepare() which we'll only use below if there was an error
		const stack=obj.stack;
		delete obj.stack;

		//Make sure we have a signal and code
		obj.signal=obj.killSignal||obj.signal||null;
		obj.code=obj.code||(obj.error?obj.error.code:null)||obj.status||0;


		//If 'lines' options was passed we split the output to lines
		if(obj.localOptions.lines){
			obj.stdout=obj.stdout.split('\n');
			obj.stderr=obj.stderr.split('\n');
		}


		// Now, what to do?
	    if(!error){
			//If there was no error we return the object
	    	return obj;

	    }else{
	    	//If there was an error we throw. Technically we'll throw a <ble> so it works like an error, but we'll assign 
	    	//the same props as $obj so you can use it just the same

	    	//In case the error contains the stderr, remove it so we only have it in one place
	    	var msg=error.toString()
	    		.replace(obj.stderr,'')
	    		.trim()
	    		.replace(/^Error: /,'')
	    	;
	    	if(msg.match(/^Command failed/i))
	    		obj.stderr=obj.stderr.replace(/^Command failed:? ?/i,'');

    		if(obj.stderr.match(/Permission denied/))
    			msg+=` <Permission denied>`



	    	//If we're using a timeout, execFile won't say anything about that in the error, so check manually
	    	if(obj.options.timeout && obj.signal && obj.duration>obj.options.timeout){
	    		let m=`Command timed out (${obj.duration}ms > ${obj.options.timeout}ms)`
	    		let f='Command failed';
	    		if(msg.match(f))
	    			msg=msg.replace(f,m);
	    		else
	    			msg=m+'. '+msg;
	    	}
	    	msg+='.'
    		var ble=log.makeError(msg,obj.stderr).setStack(stack).changeWhere(1);
    		if(obj.code)
    			ble.setCode(obj.code);
    		
    		Object.assign(ble,cX.subObj(obj,['stdout','stderr','duration','signal']))

    		throw ble;
	    }

	}



	/**
	 * Check if an unknown is a <ChildProcess>
	 * 
	 * @param any x
	 * @param bool thrw   If true and $x is not a <ChildProcess> throw a TypeError
	 * 
	 * @throws <BLE TypeError>  @see $thrw
	 * @return <ChildProcess>|undefined
	 */
	function isChild(x,thrw=false){
		if(typeof x == 'object' && x!=null && x instanceof cp.ChildProcess){
			return x;
		}else{
			if(thrw)
				throw log.makeTypeError("an instance of <ChildProcess>",child);
			return;
		}
	}
	
	/**
	 * Get a child process 'basename(pid)'
	 * 
	 * @param <ChildProcess> child
	 * 
	 * @return string
	 */
	function childFilenameAndPid(child){
		isChild(child,'throw if not');
		return `${_path.basename(child.spawnfile)}(${child.pid})`;
	}



	/*
	* @return string 	One of: not_running,suspended,running
	*/
	function childStatus(child){
		isChild(child,'throw if not');

		if(child!=null && isChild(child) && child.exitCode===null){ 
			//NOTE: child.killed only specifies that a signal (including SIGSTOP, ie. pausing it) has been 
			//      issued, not if the child is dead... that's why we don't check it...
			let pid=child.pid;
			let status=pidStatus(pid);

			if(status=='not_running' && !child.killed)
				log.note(`Child object (${pid}) doesn't have exit code or kill signal, but it's not running...`);
			
			return status;
		}else 
			// console.log("LocalPlayer is NOT playing");
			return 'not_running';
	}


	


	
	
	function pidStatus(pid){
		cX.checkType('number',pid);
		try{
			var state=cp.execSync("ps -o s= -p "+pid).toString('utf8').trim();
		}catch(err){
			return 'not_running';
		}

		if(state=='T')
			return 'suspended';
		else
			return 'running';
	}


	/*
	* Get the process/command name of a PID
	*
	* @param number pid
	*
	* @throws TypeError 	If pid is not a number
	* @return string|false 	Name of process, else false
	*/
	function pidCmd(pid){
		cX.checkType('number','pid');
		
		try{
			var name=cp.execSync("ps -o comm= -p "+pid).toString('utf8').trim();
			if(name.length)
				return name;
		}catch(err){
			log.error(err);
		}
		return false;
	}





	/*
	* @return Promise(bool|str, str) 	Rejects if killing failed within the timeout. Resolves with:
	*										false: @child was not a child process (see log)
	*										true: child already dead
	*										string: signal that killed child 
	*/
	function killPromise(child, signal='SIGTERM', timeout=5000, killOnTimeout=false){
		if(!isChild(child)){
			log.debug("Child probably already dead, got: "+cX.logVar(child));
			return Promise.resolve(false);
		}

		var status=childStatus(child);
		if(status=='not_running')
			return Promise.resolve(true);  

		cX.checkTypes(['string','number','boolean'],[signal,timeout,killOnTimeout]);
		
		signal=signal.toUpperCase();

		let pid=child.pid;
		return new Promise((resolve,reject)=>{
			//First setup a listener for the 'exit' event which will resolve the promise
			child.on('exit',(code,sig)=>{
				// log.note(`Exit event for ${pid} emitted NOW with signal ${signal}`);
			//2019-01-21: "sig" is not properly returned (and code varies with process), so just use the last used signal
			//			  to determine what killed the process (see vv when we re-set signal to SIGKILL)
				if(pidStatus(pid)=='not_running'){
					resolve(signal);
				}else{
					log.error(`Process ${pid} still running despite child object exited`);
					//TODO 2018-12-12: may want to add manual kill here...
				}
			});


			//Then send the kill signal
			log.note(`Sending ${signal} to ${pid} NOW`);
			child.kill(signal);

			//If the child is suspened and the signal is SIGTERM then we need to SIGCONT the child for the 
			//signal to be caught and followed (SIGKILL can work through suspension)
			if(status=='suspended' && signal=='SIGTERM'){
				log.note(`Continuing ${pid} so SIGTERM can happen...`)
				child.kill('SIGCONT');
			}

			setTimeout(()=>{
				if(pidStatus(pid)!='not_running'){
					//If child is still running after timeout...
					if(killOnTimeout){
						//...either try to force kill it
						log.warn(`${signal} on pid ${pid} timed out (${timeout} ms), trying SIGKILL...`);
						signal='SIGKILL' //used by on.exit^^
						child.kill(signal);
						
						setTimeout(()=>{
							if(pidStatus(pid)!='not_running')
								reject(`Failed to force kill child within ${timeout*2} ms`);
						},timeout);

					}else
						//...or reject the promise
						reject(`Failed to kill child within ${timeout} ms`);
				}
			},timeout);


		});
	}


	/*
	* @return Promise(number|null|undefined,err) 	Resolves with null if no such process existed when observation 
	*												started, with number if child process was passed, or with undefined
	*												if pid passed. Rejects with TypeError, timeout or 'failure to start 
	*												tracking'
	*/
	function resolveOnExit(childOrPid,timeout=0){
		return new Promise(function(resolve,reject){
			var pid,child;
			if(typeof childOrPid=='number'){
				pid=childOrPid;
			}else if(isChild(childOrPid)){
				pid=childOrPid.pid;
				child=childOrPid;
			}else{
				var err=log.makeError("Expected arg #1 to be pid number or child object, got: "
					,childOrPid).setCode('TypeError');
				return reject(err);
			}

			let status=pidStatus(pid);
			if(status=='not_running'){
				log.debug("No such process (ie. may already be dead)");
				return resolve(null)
			}

			if(status=='suspended')
				log.warn("Process is suspended, it may not exit before being continued");

			//Now we have to wait for the child.

			//If a pid was passed in, we need to create a process that exits when the real 
			//one does so we have something to wait for
			if(!child){
				child=cp.spawn('tail',['--pid='+pid,'-f','/dev/null'])
				child.on('error',err=>{
					err=log.makeError("Failed to track external process state",err);
					reject(err);
				})
				child.on('exit',()=>resolve(undefined))
			}else{
				child.on('exit',(code)=>resolve(code))
			}


			if(typeof timeout=='number' && timeout)
				setTimeout(()=>reject(log.makeError('timeout').setCode('timeout')),timeout);
		})
	}



	/**
	* Spawn a child process which should emit streaming data on stdout, with suitable logging, adding a 
	* few bells and whistles:
	*	- emit 'readable' on child itself when stdout becomes readable (and stays that way for 10ms)
	*   - emit 'nodata' on child itself if stdout ends before producing any data
	*   - emit 'timeout' on child itself if $timeout is passed
	* 	- store stderr lines on child._stderr
	*
	* @param string             path 	 Path to executable
	* @opt array|string|number 	args     Array args or single arg
	* @opt number               timeout  SIGTERM child if it hasn't become readable in this many ms. 0 (default) to disable
	*
	* @throws <ble TypeError>
	*
	* @return <ChildProcess> 	
	*/
	
	function spawnReadable(path,args=[],timeout=0){
		//Create a stack which can be used in various callbacks below
		var stack=(new Error()).stack;

		{
			let types=cX.checkTypes(
				['string',['array','string','number'],'number']
				,[path   ,args                       ,timeout]
			)
			if(types[1]!='array'){
				args=Array(args);
			}
		}

		log.debug(`About to spawn: "${path} ${argsToString(args)}"`);
		var child=cp.spawn(path, args);
		child.who=childFilenameAndPid(child);
		log.debug(`Spawned ${child.who}, expecting stdout to become readable and produce data...`);


		//Turn stderr into a line emitter and store all the lines on the return <ChildProcess> 
		sX.makeLineEmitter(child.stderr)
		Object.defineProperty(child,'_stderr',{value:[]});
		child.stderr.on('line',line=>child._stderr.push(line));


		//We're spawning something that should produce data, so if it doesn't before ending we emit 'nodata'
		//which contains a <BLE warning>
		var wasReadable=false;
		var onEnd=cX.once(function spawnReadable_onEnd(extra=''){
			if(!wasReadable){
				let msg='stdout produced no data';
				if(exitSignals.length)
					msg+=` (before parent process received ${exitSignals.join(',')})`;
				child.emit('nodata',log.makeEntry('warn',`${msg} ${extra}`).setStack(stack));
			}
		});
		child.stdout.on('end',()=>onEnd('and the stream has now ended'));
		child.stdout.on('close',()=>onEnd('and the stream has now closed'));
		child.on('exit',()=>onEnd('before the process exited'));


		//If opted, kill child if not readable within a timeout (and emit 'timeout' event with a <BLE warning>)
		if(timeout>0){
			setTimeout(async function spawnReadable_timeout(){
				try{
					if(!wasReadable){
						let err=log.makeError(`${child.who}: stdout did not become readable within ${timeout} ms`).setStack(stack);
						await child.emit('timeout',err);
						await killPromise(child,'SIGTERM',1000,'SIGKILL');
					}
				}catch(e){
					log.error(e);
				}
			},timeout);
		}


		//In order to check if stdout ever "truly" became readable (ie. there was actual data there) we listen
		//for the native event, wait 10ms, then check for data
		child.stdout.once('readable',()=>{
			setTimeout(function spawnReadable_onReadable(){ //name function for sake of logging vv
				if(child.stdout.readable && child.stdout.readableLength){
					wasReadable=true; 
					log.makeEntry('debug',child.who+': stdout is now readable').setStack(stack).exec();
					child.emit('readable',child.stdout);
				}
			},10) 
		});




		//Finally, create a promise on the child we can use to wait for it to become readable
		var callCommonErrorHandler=function(evt,err){
			if(typeof child.onError=='function'){
				child.onError(log.makeError(`${child.who} failed with '${evt}'`,err).setStack(stack));
			}
		}
		child.on('error',callCommonErrorHandler.bind('error'));
		child.on('timeout',callCommonErrorHandler.bind('timeout'));
		child.on('nodata',callCommonErrorHandler.bind('nodata'));


		return child;
	}




	/*
	* Spawn something and turn both stderr and stdout into line emitters
	*
	* @params @see spawnReadable
	*
	* @return <ChildProcess>
	*/
	function spawnLineEmitter(){
		var child=spawnReadable.apply(this,arguments);

		log.debug(`Turning stdout on ${child.who} into line emitter`);

		sX.makeLineEmitter(child.stdout)

		return child;

	}










	






	function argsToString(arr){
		if(cX.checkType(['array','string'],arr)=='string')
			return arr.trim();

		var str='';
		arr.forEach(arg=>{
			arg=String(arg);
			str+=(arg.match(/\s/)?`'${arg}'`:arg)+' '
		})
		return str.trim();
	}


	/*
	* Pipe data from one process to another
	*
	* @return void
	*/
	function pipeCmds(...procs){
		var i=0,l=procs.length;
		//All but the last proc we pipe to the next
		for(i;i<l-1;i++){
			procs[i].stdout.on('data',data=>{
				procs[i+1].stdin.write(data)
			})
			// procs[i].stderr.on('data',data=>{
			// 	console.err(data.toString())
			// })
		}

		//The caller can now listen to the stdout of the last process
	}


	// function pidControll(pid){

	/* 	2019-01-21: This would have been a nice idea, but only parent processes can use the system call waidpid 
					to monitor a processes state changes... so we'd have to find out how to tap into that when
					making a direct call to linux function 'wait'... or something...
	*/

	// 	//Get command name, so we can make sure process hasn't changed before sending signal
	// 	this.cmd=pidCmd(pid);

	// 	if(!this.cmd)
	// 		throw new Error("No process with pid "+pid);




	// 	this.kill=function(signal='SIGTERM'){
	// 		switch(pidCmd(pid)){
	// 			case this.cmd:
	// 				break;

	// 			case false:
	// 				//Already dead:

	// 			default:
	// 				//A new process has already taken this pid

	// 		}

	// 		process.kill(this.pid, signal)
	// 	}
	// }







	/*
	* Get info about any user on the system
	*
	* @param string|number user
	*
	* @throws TypeError
	* @throws ENOTFOUND
	*
	* @return object {name,uid,group,gid,gids,groups,toString}
	*/
	function getId(user){
		cX.checkType(['string','number'],user)
		try{
			var stdout=execFileSync('id',[user]).stdout;
			var arr=stdout.split(' ');
			var id={
				name:String(cX.regexpCapture(/\(([^)]+)/,arr[0]))
				,uid:Number(cX.regexpCapture(/=(\d+)/,arr[0]))
				,group:String(cX.regexpCapture(/\(([^)]+)/,arr[1]))
				,gid:Number(cX.regexpCapture(/=(\d+)/,arr[1]))
				,gids:[]
				,groups:[]
				,toString:()=>stdout
			}
			arr[2].split(',').forEach(group=>{group=group.substring(-1).split('('); id.groups.push(String(group[1])); id.gids.push(Number(group[0])); });
			return id;
		}catch(err){
			if(err.message.includes('no such user'))
				err.setCode('ENOTFOUND');
			throw err;
		}


	}



	/*
	* Get all groups on the system, or a subset of them
	*
	* @param string|number|array filter
	*
	* @return <Map>  Keys are numeric gids, values are string names
	*/
	function getGroupMap(filter){
		//First get a map of all groups on the system
		var groups=new Map();
		for(let line of execFileSync('cat',['/etc/group']).stdout.split('\n')){
			var parts=line.split(':');
			groups.set(Number(parts[2]),String(parts[0]));
		}

		//Then optionally only keep those in the filter
		if(arguments.length){
			var arr=(cX.checkType(['string','number','array'],filter)=='array' ? filter : [filter]);
			var existing=groups
				,groups=new Map()
				,numbers=Array.from(existing.keys())
				,names=Array.from(existing.values())
				,excluding=[]
			;
			arr.forEach(group=>{
				//Make sure we don't have string numbers
				group=cX.stringToNumber(group,'return undef on fail')||group;
			
				let type=cX.checkType(['string','number'],group,true);
				if(type){
					let list=(type=='string' ? names : numbers), i=list.indexOf(group);
					if(i>-1){
						groups.set(numbers[i],names[i]);
						return 
					} 
				}

				//If we're still running then the group is excluded
				excluding.push(group);

			});

			if(excluding.length)
				log.warn("Excluding invalid groups: ",excluding);
		}

		//Add a couple of helper functions
		groups.gids=function(){return Array.from(this.keys());}
		groups.names=function(){return Array.from(this.values());}

		//Now return the map which either contains all groups or only those in $filter (ie. possibly none) 
		return groups;
	}



	function dropPrivs(user=1000,gids=null){
		//First make sure we're root, because only root can change user
		if(process.geteuid()!=0){
			log.throwCode('EPERM',`Only root can change user, you're effectivly running as euid:${process.geteuid()}`);
		}

		var uid, _uid,_gids,sameUid, sameGroups;
		var checkSame=()=>{
			_uid=process.getuid();
			_gids=process.getgroups(); //list of gids
			sameUid=(user.uid==_uid);
			sameGroups=(gids.length==_gids.length && gids.every(gid=>_gids.includes(gid)));
			return sameUid && sameGroups
		}

		try{

			//Validate the user
			user=getId(user);
			uid=user.uid

			//One or more groups are allowed, make sure we have a list of numbers
			if(gids==null){
				//Since we're getting the list from the system we don't have to verify
				gids=user.gids;
			}else{
				gids=getGroupMap(gids).gids();
				if(!gids.length){
					log.warn(`Got no valid groups, using users primary group: ${user.gid}(${user.group})`);	
					gids.push(user.gid);
				}
			}
			//now $gids is an array of numbers, at least 1 long
			
			if(checkSame()){
				log.info(`Already running with user:${uid}, groups:${gids}`)
				return false;
			}

			log.debug(`Trying to change user:${_uid}=>${uid}  groups:${_gids}=>${gids}`)	

			//Set both gid and groupd, else some of the old will remain... order doesn't matter though...
			process.setgid(gids[0]); 
			process.setgroups(gids);

			//Finally set the user AFTER ^
			process.setuid(uid);
			

			//Now just make sure we have it right
			if(checkSame()){
				log.note(`Dropped privs. Now running as uid:${uid}, groups:${gids}`)
				return true
			}else{
				log.throwCode("BUGBUG","No errors thrown when changing user/groups, but change didn't occur"); //caught vv
			}

		}catch(err){
			checkSame();
			var logstr='';
			if(!sameUid)
				logstr+=`uid:${_uid}=>${uid}`;
			
			if(!sameGroups)
				logstr+=`${sameUid?'':', '} groups:${_gids}=>${gids}`;
			

			log.throw(`Failed to drop privs: ${logstr}`,err);
		}
	}


	function ps(){
		return execFileInPromise('ps',['aux'])
			.then(obj=>cX.linuxTableToObjects(obj.stdout,true,true))
			.catch(err=>log.makeError(err).prepend("Failed to get proclist").throw())
	}


	/*
	* Register a single handler for all process.on events that will make the process exit. This handler
	* will only be called once with the first event to fire
	*
	* @param object proc 		This process or a subprocess
	* @param function handler(signal,code) 	
	*
	* @return function 	A callback that removes the listener again
	*/
	function onAnyExitSignal(proc,handler,once=false){
		//Make sure it can only be called once
		if(once)
			handler=cX.once(handler);

		//Register it on all events and save their listeners
		var events=['SIGTERM','SIGINT','SIGHUP'];
		var listeners=[];
		events.forEach(signal=>{
			let listener=(code)=>handler.call(this,signal,code);
			process.on(signal,listener);
			listeners.push(listener);
		})

		//Return a function that unregisters the handler from all events
		return function(){
			events.forEach((signal,i)=>{
				process.removeListener(signal,listeners[i]);
			})
		}
	}


	return _exports;
}