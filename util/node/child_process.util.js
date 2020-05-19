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
	var _exports={
		'native':cp
		,'execFileInPromise':execFileInPromise
		,'execFileSync':execFileSync
		,'isChild':isChild
		,'childStatus':childStatus
		,'childProc':childProc
		,'pidStatus':pidStatus
		,'killPromise':killPromise
		,resolveOnExit
		,'spawnReadable':spawnReadable
		,'spawnLineEmitter':spawnLineEmitter
		,'argsToString':argsToString
		,'dropPrivs':dropPrivs
		,'ps':ps
		,onAnyExitSignal
	}

	

	/*
	* @param string 	cmd 		The command to run
	* @param array 		args 		The args for the command
	* @param object 	options
	*
	* @return object 
	*/
	function _execPrepare(cmd,args=[],options={}){
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
			options

			//Any failed exec's, in order for the stack to show who called this method, we create one here 
			//(outside the callback), and then we back it up by one vv
			,stack:Error().stack

			,start:Date.now()

			,cmd:[cmd].concat(args).join(' ')
		}

		//Log depending on options
		if(options.log && options.log._isLog){
			options.log.info("About to run: "+obj.cmd);
			delete options.log;
		}else if(options.noLog){
			delete options.noLog;
		}else{
			log.trace(obj.cmd);
		}

		//A few options are meant for use here, extract them from the options sent to exec
		obj.localOptions=cX.extract(options,['lines'])

		return obj;

	}





	/**
	* This function wraps an execFile() in a promise that resolves if the child runs to end successfully 
	* else it rejects
	*
	* @params @see _execPrepare
	*
	* @return Promise(obj,<ble>) 		Resolves/reject with {stdout, stderr, duration, signal, code}. On reject this object
	*									is instance of BetterLogEntry
	* @access public
	*/
	function execFileInPromise(cmd,args,options){
		var obj=_execPrepare(cmd,args,options); //NOTE: If command fails, this line will show as 'where'

		//Wrap the whole execution in a promise, which we return once the song has been played
		return new Promise(function _execFileInPromise(resolve, reject){
			var child_process=cp.execFile(cmd, args, obj.options, (error, stdout, stderr)=>{
					
				//Build return object
				Object.assign(obj,{error,stdout,stderr})

				try{
					resolve(_execFileCallback(obj));
				}catch(ble){
					reject(ble); //NOTE: ble has props stdout, stderr, duration, signal
				}
			});
		});
	}


	/**
	* This function wraps around execFileSync() and returns an object
	*
	* @params @see _execPrepare
	*
	* @throw <ble> 			Also has props of @return
	* @return object 		{stdout, stderr, duration, signal, code} 	
	* @access public
	*/
	function execFileSync(cmd, args, options){
		// log.highlight(log.logVar(Object.values(arguments),3000));
		var obj=_execPrepare(cmd,args,options);
		
		//2019-10-22: For now we just pipe everything, which means on success we can't access stderr
		//				Check out more here:
		//		https://github.com/rauschma/stringio/blob/master/ts/src/index.ts
		//		https://2ality.com/2018/05/child-process-streams.html
		if(!obj.options.stdio){
			obj.options.stdio='pipe'
		}
			
		try{
			//TODO 2019-10-29: on success we loose stderr... And some commands use it to write important stuff
			obj.stdout=cp.execFileSync(cmd, args, obj.options)
		}catch(err){
			Object.assign(obj,err);
			obj.error=err.message;
			  //^message is non-enumerable, so Object.assign will ignore it... (so is stack, 
			  // but we're using the one created in execPrepare())
		}
		
		return _execFileCallback(obj);
	};




	/*
	* @throw ble
	* @return object
	*/
	function _execFileCallback(obj) {
		// console.log(obj);
		//Make sure we have strings
		obj.stdout=String((obj.stdout||'')).trim();
		obj.stderr=String((obj.stderr||'')).trim();
		obj.duration=Date.now()-obj.start;

		//Extract the error
		var error=obj.message||obj.error||null;
		delete obj.message;
		delete obj.error;

		obj.signal=obj.killSignal||obj.signal||null;
		obj.code=obj.code||(obj.error?obj.error.code:null)||obj.status||null;

		var stack=obj.stack;
		delete obj.stack;


		//If 'lines' options was passed
		if(obj.localOptions.lines)
			obj.stdout=obj.stdout.split('\n');

	    if(!error){
	    	return obj;

	    }else{
	    	//Ok, we're going to throw. We'll create a <ble>, but we'll assign the same props as $obj so
	    	//you can use it just the same

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
    		var ble=log.makeError(msg,obj.stderr).setCode(obj.code).setStack(stack).changeWhere(1);
    		
    		Object.assign(ble,cX.subObj(obj,['stdout','stderr','duration','signal']))

    		throw ble;
	    }

	}


	function isChild(x){
		return (typeof x == 'object' && x!=null && x instanceof cp.ChildProcess);
	}
	

	/*
	* @return string 	One of: not_running,suspended,running
	*/
	function childStatus(child){
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


	
	function childProc(child){
		if(!isChild(child))
			throw new TypeError("Expected child process, got: "+cX.logVar(child));

		return `${_path.basename(child.spawnfile)}(${child.pid})`;
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


	/*
	* Spawn a child process, with suitable logging etc...
	*
	* @param string path 		Path to executable
	* @param array 	args 		Array of strings
	* @param number timeout 	Default none. Kill child if it hasn't become readable in this many ms
	*
	* @return Promise(child,[err,child])
	*/
	
	function spawnReadable(path,args=[],timeout=0){

		try{cX.checkTypes(['string','array','number'],[path,args,timeout])}catch(err){return log.reject(err)}

		var child,who=path;
		return new Promise(function _spawnReadable(resolve,reject){
			
			log.debug(`About to spawn: "${path} ${argsToString(args)}"`);
			child=cp.spawn(path, args);
			who+='('+child.pid+')';
			log.debug(`Spawned ${who}, waiting for stdout to become readable...`);

			//Save everything written to stderr so we have it if something fails
			child._stderr=[];
			child.stderr.on('data',(err)=>{
				let str=err.toString('utf8').trim()
				if(str)
					str.split('\n').forEach(line=>child._stderr.push(line)); //TODO: data chunks and newlines may not coincide...
			});

			child.on('error',reject)
			child.stdout.on('end',function spawnReadable_onEnd(){
				setTimeout(function _spawnReadable_onEnd(){
					reject(" produced no output and stdout has now ended");
				},1); //stdout may end before error has fired ^
			});
			child.on('exit',function spawnReadable_onExit(){reject(" produced no output and has now exited.")});
			
				
			child.stdout.once('readable',()=>{
		//2019-03-16: Sometimes a stream becomes readable only to quickly change back (which seems to happen when
		//			  we move forward a tick...), so check for that
				setTimeout(function spawnReadable_onReadable(){
					if(child.stdout.readable){
						log.info(who+' stdout is now readable');
						resolve(child);
					}else
						reject(" stdout became readable, then quickly became unreadable")
				},10)
			});
			
			if(timeout)
				setTimeout(()=>{
					reject('Timeout. stdout did not become readable within '+timeout+'ms');
				},timeout);
			

			if(childStatus(child)!='running')
				reject("BUGBUG: Child is not running but the 'end' and 'error' events didn't fire");
		})
		.catch(err=>{
			child._stderr.unshift('--- STDERR '+who+' ---');
			// log.warn(child._stderr.join('\n\t')+'\n')
			err=log.makeError(err);
			err.msg=who+err.msg;
			return Promise.reject([err,child]);
		})
	}





	function spawnLineEmitter(bin,args){
		var [,t]=cX.checkTypes(['string',['array','string','number']],arguments);

		if(t!='array')
			args=Array(args);

		log.debug(`About to spawn: "${bin} ${args.join(' ')}"`)
		let child = cp.spawn(bin, args);

		log.makeEntry('info','Spawned:',childProc(child)).addHandling('Turning stdout and stderr into line emitters').exec();

		sX.makeLineEmitter(child.stderr)
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

	function dropPrivs(uid=1000,gid=1000){
		var groups=Array.isArray(gid)?gid:[gid];
		gid=groups[0];
		
		var _uid,_groups,sameUid, sameGroups;
		var checkSame=()=>{
			_uid=process.getuid();
			_groups=process.getgroups();
			sameUid=(uid==_uid);
			sameGroups=(groups.length==_groups.length && groups.every(g=>_groups.includes(g)));
			return sameUid && sameGroups
		}
		
		if(checkSame()){
			log.info(`Already running with uid:${uid}, groups:${groups}`)
			return false;
		}else{
			log.debug(`Trying to drop privs from uid:${_uid}, groups:${_groups}`)
		}
		
		var change=()=>{
			var str='';
			if(!sameUid)
				str+=`uid: ${_uid}=>${uid}`;
			if(!sameGroups)
				str+=`${sameUid?'':', '} groups: ${_groups}=>${groups}`;
			return str;
		}


		if(_uid!=0){
			if(groups.includes(0))
				log.warn("One of your supplementary groups is still root!");
			throw log.error(`Not root, cannot change `+change());
		}


		//For some reason, if we just try to setgid, node just adds the gid and leaves the old one intact, 
		//so we need to set all groups followed by gid
		process.setgroups(groups);
		process.setgid(gid);

		process.setuid(uid);

		//Now just make sure we have it right
		if(checkSame()){
			log.note(`Dropped privs to uid:${uid}, groups:${groups}`)
			return true
		}else{
			throw log.error('Failed to change all: '+change());
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