#!/usr/local/bin/node
'use strict'; 
/*
	Extended File System

	Author: palun
	Date: July 2018

	This module builds upon built-in classes to create some convenient functions for interacting
	with the filesystem

	NOTE 2018-09-27: seems not to be in use since we stopped using fifo's to play

*/
module.exports=function export_fsX({BetterLog,cpX,cX,...dep}){
	// const BetterLog=require('../../better_log.js');
	const log=new BetterLog('fsX');


	//2019-12-09: Used by resolvePath()
	const cleaned={};

	/*
	* @const object fs 			The native file system class 
	*/
	const fs=dep.fs||require('fs');

	/*
	* @const object p 			The native path class
	*/
	const _p=dep.p||dep.path||dep._p||require('path');
	
	/*
	* @const object cpX
	*/
	// const cpX=require('./child_process.util.js');
	// if(!Object.keys(cpX).length)
	// 	throw new Error('Module "child_process.util.js" loaded an empty object. Have you included fsX there?')
	// /*
	// * @const object cX
	// */
	// const cX=require('../util.common.js');




	//Returned at bottom
	var _exports={
		'native':fs
		,'path':_p
		,'exists':exists
		,'existsSync':exists
		,'existsPromise':existsPromise
		,'which':which
		,'getRandomFileName':getRandomFileName
		,'whoami':whoami
		,'who':whoami
		,'inodeType':inodeType
		,'modeToPerm':modeToPerm
		,'statSync':statSync
		,'stat':stat
		,'findParentSync':findParentSync
		,'findParentPromise':findParentPromise
		,'accessPromise':accessPromise
		,'checkReadWrite':checkReadWrite
		,'accessSync':accessSync
		,'resolvePath':resolvePath
		,'cleanFilename':cleanFilename
		,'flushFifo':flushFifo
		,'createFifo':createFifo
		,'mkdir':mkdir
		,'prepareWritableFile':prepareWritableFile
		,'writeFilePromise':writeFilePromise
		,'readFilePromise':readFilePromise
		,'deleteFilePromise':deleteFilePromise
		,deletePromise
		,'readFile':readFile
		,'getJsonFromFile':getJsonFromFile
		,'ls':ls
		,'lh':lh
		,isFolderEmpty
		,'find':find
		,'fileStatus':fileStatus
		,'deleteIfEmpty':deleteIfEmpty
		,'fileOpen':fileOpen
		,'checkOpenFDs':checkOpenFDs
		,'StoredItem':StoredItem
		,'createStoredSmarty':createStoredSmarty
		,'folderSize':folderSize
		,'fileExtType':fileExtType
		,'touch':touch
		,'touchPromise':touchPromise
		,'chmodPromise':chmodPromise
		,move

	}



	try{
		var fileExtensions=getJsonFromFile(__dirname+'/extensions.json')
	}catch(err){
		log.error("Failed to read file extensions json:",err);
		log.warn("fileExtType() will never find a match now")
		fileExtensions={};
	}
	




	/*
	* Check if an inode exists without throwing error
	*
	* @param string path
	* @param string type 		Expected type of path. @see inodeType()
	* @param bool thrw 			If true this function will throw if path doesn't exist 
	*
	* @throws <ble TypeError> 	if $path not string
	* @throws <ble ENOENT>|<ble EACCESS>|<ble ETYPE>|<ble BUGBUG> 	@see _existsCallback()
	*
	* @return undefined|str 	A normalized path if it exists, else undefined
	* @access public/exported
	* @sync
	* @not_logged
	*/
	function exists(path,type,thrw=false){
		path=resolvePath(path); //throws error on bad value

		var err;
		try{
			fs.accessSync(path); //throws error if not exists 
		}catch(e){
			err=e;
		}
		return _existsCallback(err,type,path,thrw);
	}

	/*
	* @param string path
	* @param string type 		Expected type of path. @see inodeType()
	* @param bool rej 			If true this function will reject if path doesn't exist 
	*
	* @throws <BLE TypeError> 	if $path not string
	* @throws <ble ENOENT>|<ble EACCESS>|<ble ETYPE>|<ble BUGBUG> 	@see _existsCallback()
	*
	* @return Promise(str,BLE) 	Same as exists() but this rejects instead of throwing
	*/
	function existsPromise(path,type,rej=false){
		return new Promise((resolve,reject)=>{
			path=resolvePath(path); //throws error on bad value

			fs.access(path,function existsPromise_accessCallback(err){
				try{
					return resolve(_existsCallback(err,type,path,rej)); 
				}catch(err){
					return reject(err);
				}
			});
		});
	}

	/*
	* @param error err	
	* @param string path
	* @param string type 			Expected type of path. @see inodeType()
	* @param bool thrw 				If true this function will throw if path doesn't exist 
	*
	* @throws <ble ENOENT> 			If WE KNOW the path doesn't exist (and $thrw==true) (could be because ENOTDIR along path)
	* @throws <ble EACCESS>		 	If we CAN'T KNOW if the path exists because we don't have access to the entire path
	* @throws <ble ETYPE>		 	If $type is passed and inode is not the correct type
	* @throws <ble BUGBUG>
	*
	* @return undefined|str 		A normalized path if it exists, else undefined or @see $thrw
	*/
	function _existsCallback(err, type, path,thrw=false){
		try{
			if(err){
				var msg=`Cannot determine if ${type ? type :'path'} exists (${path}),`;
				switch(err.code){
					case 'ENOTDIR':
						if(thrw){
							//Trigger (but don't wait for) a check of where along the path the problem lay, logging when done...
							findParentPromise(path).then(p=>{
								let t=inodeType(p);
								log.highlight(`exists():${path} doesnt exist because ${p} is a ${t}`);
							});
						}
						
						//This entails that the path doesn't exist, so instead of throwing NOTDIR we fall 
						//through and handle like NOENT (but we'll be adding this err... see vv)


					case 'ENOENT': //parent dir exists and is readable, so we know inode doesn't exist
						if(thrw){
							// log.makeError(`${path} doesn't exist.`).throw(err.code);
							var ble=log.makeError('No such file or directory:',path).setCode('ENOENT');
							if(err.code=='ENOTDIR'){
								err=log.makeError(err).addHandling("See seperate entry below for where the path broke");
								ble.extra.push(err);
							}
							ble.throw();
						}else{
							return false;
						}

					case 'EACCES': //something along path is not readable, so we don't know status of inode
						log.makeError(msg,"something along the way is not readable",err).setCode('').throw();

					default:
						log.throw('Please handle code:',err.code,msg,err).setCode('BUGBUG').exec().throw();
				}
			}

			//If arg#2 is passed, make sure the inode is the correct type, else throw
			if(typeof type=='string'){
				let t=inodeType(path);
				if(t!=type)
					log.makeError(path+" is a '"+t+"', not a "+type).setCode('ETYPE').throw();	
			}
			
			return _p.normalize(path);
		
		}catch(err){
			if(thrw){
				//Make sure the 'where' is the individual func that uses this common callback...
				log.makeError(err).changeWhere(1).throw();
			}else{
				return false;
			}
		}
	}


	/*
	* Check if a command is in the path
	*
	* @return string|false 
	* @sync
	*/
	function which(cmd){
		try{
			return {stdout}=cpX.execFileSync('which',cmd);
		}catch(e){
			return false;
		}
	}


	function getRandomFileName(root){
		return Promise(async function _getRandomFileName(resolve,reject){
			try{
				if(await existsPromise(root,'dir')==false)
					throw "Directory doesn't exist";

				root=resolvePath(root);
				var rand=(Math.random()*10000000);
				while(await fsX.existsPromise(`${root}/${rand}`,'file')){
					rand+=1;
				}
				resolve(`${root}/${rand}`);

			}catch(err){
				reject(log.makeError('Failed to get random file name in:',root,err));
			}
		});
	}


	function whoami(){
		var x={
			user:cpX.native.execFileSync('whoami').toString()
			,groups:cpX.native.execFileSync('groups').toString().split(' ').filter(g=>g)
			,uid:process.getuid()
			,gid:process.getgid()
			,gids:process.getgroups()
		};
		x.str=`${x.user}(${x.uid}):${x.groups.join(',')}(${x.gids})`
		return x;
	}

	/*
	* Get type of inode
	* @param mixed statsOrPath 		The object returned from fs.stat or a path string

	* @throws Error 				If arg#1 is a path but it does not exist
	*
	* @return string
	* @access public/exported
	* @sync
	*/
	
	function inodeType(statsOrPath){

		var stats=(typeof statsOrPath=='string' ? fs.statSync(statsOrPath) : statsOrPath);

		if(stats.isFile()) return 'file';
		if(stats.isDirectory()) return 'dir';
		if(stats.isBlockDevice()) return 'block';
		if(stats.isCharacterDevice()) return 'raw'; //https://en.wikipedia.org/wiki/Device_file#Character_devices
		if(stats.isFIFO()) return 'fifo';
		if(stats.isSocket()) return 'socket';
		if(stats.isSymbolicLink()) return 'symlink' //only valid if lstat has been run

		throw new Error("BUGBUG inodeType(): what other types are there??");
	}

	function modeToPerm(mode){
		return (mode & parseInt('777', 8)).toString(8);
	}


	/*
	* @throws
	* @return object
	*/
	function statCommon(path){
		var fullPath=resolvePath(path)  //throws error on fail

		var info={original:path, path:_p.parse(fullPath), exists:null, native:null, type:null}
		info.path.full=fullPath

		return info;
	}


	function statNonexistCommon(info,parent){
		info.exists=false;

		//If 'access' for the target path gave the following code, then dirname returned here is actually 
		//the not-dir inode that caused the error, so its' parent is what we want...
		//2018-10-29: Not sure if its NODIR or NOTDIR...
		info.firstParent= (info.err=='ENODIR'||info.err=='ENOTDIR' ? _p.dirname(parent) : parent);
		
		 
		if(info.err=='ENOENT'){
			//We know for sure this path doesn't exist because we can read the path all 
			//the way until it stops existing...
			return parent;
		}else {
			if(info.err=='EACCES')
				//Something along the path we cannot access, so we don't know if the final path exists or not
				info.exists=null;
			
			info.read = info.write = info.execute = false;
			throw 'SKIP_TO_END';
		}
	}

	function statExistsCommon(info,access,native){
		info.exists=true;
		info.native=native;
		info.perm=modeToPerm(native.mode);
		info.type=inodeType(native);
		info.firstParent=info.type=='dir' ? info.path.full : _p.dirname(info.path.full);
		statAccessAllCommon(info,access);
	}

	function statAccessAllCommon(info,access){
		Object.assign(info,cX.subObj(access,['read','write','execute']));
	}

	function statCommonEmpty(info){
		if(info.exists){
			if(info.type=='dir'){
				info.empty=isFolderEmpty(info.path.full);
			}else if(info.type=='file'){
				info.empty=info.native.size?false:true;
			}
		}
	}

	/*
	*
	*	{
	*		original:passed in path
	*		,path:{
	*			full:/path/to/file.txt
	*			,dir:/path/to
	*			,root:/
	*			,base:file.txt
	*			,name:file
	*			,ext:txt
	*		}
	*		,exists:bool
	*		,type:'file'|'dir'|'block'|'raw'|'fifo'|'socket'|'symlink'
	*		,empty:bool
	*		,perm:755
	*		,firstParent:First existing parent folder (can be same as path.dir)
	*		,read:can current user read this path
	*		,write:can current user write this path
	*		,execute:can current user execute this path
	*		,native:{
	*			dev: 2114
	*			,ino: 48064969
	*			,mode: 33188
	*			,nlink: 1
	*			,uid: 85
	*			,gid: 100
	*			,rdev: 0
	*			,size: 527
	*			,blksize: 4096
	*			,blocks: 8
	*			,atimeMs: 1318289051000.1
	*			,mtimeMs: 1318289051000.1
	*			,ctimeMs: 1318289051000.1
	*			,birthtimeMs: 1318289051000.1
	*			,atime: Mon, 10 Oct 2011 23:24:11 GMT
	*			,mtime: Mon, 10 Oct 2011 23:24:11 GMT
	*			,ctime: Mon, 10 Oct 2011 23:24:11 GMT
	*			,birthtime: Mon, 10 Oct 2011 23:24:11 GMT
	*		}
	*	}
	*
	* @throw @see resolvePath()
	*
	* @return object 	Object with less props than stat() vv
	*/
	
	function statSync(pathOrInfo){
		if(typeof pathOrInfo == 'object' && pathOrInfo.hasOwnProperty('firstParent'))
			return pathOrInfo

		var info=statCommon(pathOrInfo); //this can throw and will not be caught

		//Beyond this point we will always return
		try{
			
			info.err=accessSync(info.path.full)
			if(info.err==null){
				statExistsCommon(info,accessAllSync(info.path.full),fs.statSync(info.path.full));
			}else{
				statNonexistCommon( //can throw 'SKIP_TO_END'
					info
					,findParentSync(info.path.full) //can throw if no parent is found... but that is a weird case
				);
				statAccessAllCommon(info,accessAllSync(info.firstParent))
			}

			statCommonEmpty(info);

		}catch(err){
			if(err!='SKIP_TO_END')
				log.error('Failed to get statSync',err);
		}
// console.log('statSync:',info,(new Error()).stack)
		return info;
	}

	/*
	*
	* @return Promise(object,err) 	Only rejects if path couldn't be parsed, else it resolves with 
	*								as much info as it could get
	* @async
	*/
	async function stat(path){
		try{
			var info = statCommon(path);
		}catch(err){
			return Promise.reject(err);
		}
		
		//Beyond this point we will always resolve
		try{
			info.err=await accessPromise(info.path.full).catch(code=>code);
			if(info.err==null){
				var {promise,callback}=cX.exposedPromise();
				fs.stat(info.path.full,callback);
				statExistsCommon(info,await accessAllPromise(info.path.full),await promise);
			}else{
				statNonexistCommon( //can throw 'SKIP_TO_END'
					info
					,await findParentPromise(info.path.full) //can throw if no parent is found... but that is a weird case
				);	
				statAccessAllCommon(info,await accessAllPromise(info.firstParent))
			}

			statCommonEmpty(info);
		}catch(err){
			if(err!='SKIP_TO_END')
				log.error('Failed to get stat',err);
		}
// console.log('stat:',info,(new Error()).stack)
		return info;
	}
	




	/*
	* Get the first existing inode along a path
	*
	* @throws TypeError 	If @path is bad
	* @return string 		Path of existing inode
	* @sync
	*/
	function findParentSync(path){

		path=resolvePath(path); //throw on bad path

		var tree=path.split(_p.sep); //first item will be empty (ie. nothing before root slash)
		
		while(tree.length){
			tree.pop(); //on first loop, we remove the file itself (or if the path pointed to a dir...)

			let remainingPath=tree.join(_p.sep)+_p.sep;//+_p.sep => always end in '/' AND '/' when tree is empty, ie. root
			
			if(accessSync(remainingPath)==null){
				return remainingPath
			}
		}

		throw new Error("This is weird, found no existing parent to path (not even the root): "+path);
	}

	/*
	* Get the first existing inode along a path
	*
	* @return Promise(str|err) 		Resolves with path of existing inode, rejects with error (most likely if @path is invalid)
	* @async
	*/
	function findParentPromise(path){

		return new Promise(async function(resolve,reject){
			path=resolvePath(path); //throw on bad path

			var tree=path.split(_p.sep); //first item will be empty (ie. nothing before root slash)
			
			while(tree.length){
				tree.pop(); //on first loop, we remove the file itself (or if the path pointed to a dir...)

				let remainingPath=tree.join(_p.sep)+_p.sep;//+_p.sep => always end in '/' AND '/' when tree is empty, ie. root
				
				if(await accessPromise(remainingPath)
					.then(
						function found(){return true;}
						,function notFound(err){return false;}
					)
				){
					resolve(remainingPath); //resolve original promise
					return; //stop loop/function
				}
			}

			reject(new Error("This is weird, found no existing parent to path (not even the root): "+path));
		})

	}


	/*
	* Wrap fs.access in a promise
	*
	* @param string path
	* @param string mode 		One of F(exists), R(readable), W(writable), X(execute)
	*
	* @return Promise(null,string) 		Rejects with error code.
	*/
	function accessPromise(path, mode='F'){
		
		return new Promise((resolve,reject)=>{
			// log.info("Checking "+type+" for: ",resolvePath(path));
			fs.access(resolvePath(path), fs.constants[mode.toUpperCase()+'_OK'], err=>{
				err?reject(err.code):resolve(null);
			});
		});
		
	}


	/*
	* Check the current user's access to a file
	* @param string path
	* @return Promise(obj,bug) 	Only rejects on bug. Resolves with object with boolean props: read,write,execute
	*/
	function accessAllPromise(path){
	
		return cX.groupPromises([
			accessPromise(path,'F')
			,accessPromise(path,'R')
			,accessPromise(path,'W')
			,accessPromise(path,'X')
		]).promise.catch(obj=>obj).then(obj=>{
			try{
				var ret={}
				ret.exists=obj.all[0][0]
				ret.read=obj.all[1][0]
				ret.write=obj.all[2][0]
				ret.execute=obj.all[3][0]
				return ret;
			}catch(err){
				return log.reject("BUGBUG groupPromises() returned something unexpected:",obj,err);
			}
		})
	}


	/*
	* @return Promise(null,err) 	Rejects unless current user can read and write
	*/
	function checkReadWrite(path){
		return accessPromise(path,'R')
			.catch(()=>Promise.reject('read'))
			.then(()=>asscessPromise(path,'W'))
			.catch(x=>{
				var {user}=whoami();
				return log.makeError(`Current user (${user}) cannot ${x=='read'?x:'write'} file:`,path).reject();		
			})
		;
	}

	function getEaccessLogStr(stat){
		console.log(stat)
		var access=[];
		if(!stat.read)access.push('read');
		if(!stat.write)access.push('write');

		var who=whoami()
		return `User ${who.str} cannot ${access.join(' or ')} '${stat.path.full}'.`
			+` uid:${stat.native.uid}, gid:${stat.native.gid}, perm:${stat.perm}`;

	}

	/*
	* Wrap fs.access in try
	*
	* @param string path 	A directory or file path
	* @param string type 	One of:
	*							F - Check if path exists
	*							R - Check if path is readable for current user
	*							W - Check if path is writable for current user
	*							X - Check if path is executable for current user
	*
	* @return null|string 	Null if test succeeds, error code if it fails
	*/
	function accessSync(path, type='F'){
		try{
			fs.accessSync(resolvePath(path), fs.constants[type.toUpperCase()+'_OK']); //throws on fail, undefined on success
			return null;
		}catch(err){
			return err.code
		}
	}



	/*
	* Check the current user's access to a file
	* @param string path
	* @return obj 	 object with boolean props: read,write,execute
	*/
	function accessAllSync(path){
		return {
			exists:accessSync(path,'F')==null
			,read:accessSync(path,'R')==null
			,write:accessSync(path,'W')==null
			,execute:accessSync(path,'X')==null
		}
	}













	/*
	* Make sure a string is a path, and if it's relative, append the working dir or an optionally passed in one
	*
	* @param string path 	    The path to check
	* @opt string cwd 			If passed AND $path is relative, then this will be used as cwd instead of cwd of process
	* @opt flag 'no-undefined'  If passed, if the path includes the STRING 'undefined' ANYWHERE an error will be thrown
	*
	* @throws <BLE TypeError> 	If path is not a string
	* @return string 			The resolved path
	*/
	
	function resolvePath(path,...options){
		cX.checkType('string',path);

		//Get options 
		var noUndefined=cX.extractItem(options,'no-undefined')
			,cwd=cX.getFirstOfType(options,'string')
		;
		
		//If already cleaned, don't do it again;
		// console.log(cleaned);
		if(cleaned.hasOwnProperty(path))
			return path;


		if(path.substring(0,1)!='/')
			path=_p.resolve(cwd||process.cwd(),path);
		

		path= _p.normalize(path)

		//Since there is a larger risk that someone built a filepath without realizing that one of the
		//components was undefined (which turned into the string 'undefined' and got included as a dir 
		//or file), than that something is actually named 'undefined', we throw unless explicitly told not to
		if(noUndefined && path.includes('undefined'))
			log.makeError("The path included substring 'undefined':",path)
				.addHandling("If 'undefined' should be allowed, please call this function with arg #2==true.")
				.throw();

		//2019-12-09: Add to object so we don't clean string again. This will speed things up a little on 
		// 			  expense of memory, but more importantly this allows arg #2 to be enacted once and then
		//			  not ignored in future calls
		cleaned[path]=true;

		return path
	}






	/*
	* Clean a filename from any bad characters so it can be written to filesystem without quotes
	*
	* @param string name 	
	*
	* @throws TypeError 	If name is not a string
	* @return string 		A clean filename
	*/
	
	function cleanFilename(name){
		cX.checkType('string',name); //throws on error
		return name.replace(/[^a-z0-9\-]/gi, '_').replace(/_{2,}/g, '_');
	}


	/*
	* Empty all contents from a fifo (good if we can't re-create it due to some process not allowing that...)
	*/
	function flushFifo(path){
		//First check that the fifo exists...
		if(exists(path,'fifo')){
			//...then write something to it to make sure it's not empty when we attempt to cat it
			cpX.native.execFile("echo",['-n','FOO','>',path],{timeout:100},(err,stdout,stderr)=>{
				if(err){
					//Don't throw since this is run async...
					log.error(stderr);
					log.error("flushFifo(): Something went wrong.",err);
				}
			});
	
			//...finally empty the entire contents 
			cpX.native.execFileSync("cat",[path,">","/dev/null"],{timeout:1000}); //Will throw error on fail or timeout

			return true;
		
		}else{
			return false;
		}

	}
	



	/*
	* Create a fifo
	*
	* @throws Error		If fifo doesn't exist after for any reason.
	* @return number 	1=fifo already existed (not re-creating), 2=created, 3=fifo re-created
	*/
	
	function createFifo(path,reCreate){
		var ret=0;

		//First make sure the parent dir exists...
		var dir=_p.dirname(path);
		if(!exists(dir,'dir')){
			log.throw("Parent dir doesn't exist: "+dir);

		//...if so check if the fifo itself already exists...
		}else if(exists(path,'fifo')){

			//...in which case either remove in preparation for re-create, or return 1
			if(reCreate){
				try{
					log.info("Removing old fifo in order to re-create: ",path);
					cpX.native.execFileSync("rm",[path],{timeout:1000}); //Remove existing fifo 
				}catch(err){
					log.error("Could not remove existing fifo: "+path,err);
				}
				ret=ret+1;
			}else{
				log.info("fifo already exists, leaving it:",path);
				return 1;  //already exists
			}
		}


		try{
			
			cpX.native.execFileSync("mkfifo",[path],{timeout:1000});
			
			if(exists(path,'fifo'))
				return ret+2; //Fifo was created (2)/re-created(3) here
			else
				throw new Error("mkfifo exited with 0 but fifo still doesn't exist");

		} catch(e){
			log.throw(e);
		}


	}


	/*
	* Create a directory (or multiple nested ones)
	*
	* @return void
	* @sync
	*/
	function mkdir(path,mode=null){
		log.traceFunc(arguments, 'mkdir')

		path=resolvePath(path); //throws error on bad value

		//Check if it already exists and if it's a dir
		if(exists(path,'dir')){ //throws if exists but not a dir
			if(mode){
				//TODO: if mode is passed, make sure to set it on existing folder...
				log.note("TODO: Dir already exists, but changing mode to: ",mode);
			}else{
				log.trace("Dir already exists")
			}
			return;
		}

		//Now we have a path to create, eg. '/path/to/thing'

		//Get a list of folder names, eg. ['', 'path', 'to', 'thing']
		var paths=path.split(_p.sep);

		//then turn it into full paths: [/, /path, /path/to, /path/to/thing]
		var acc=''
		for(var i=0;i<paths.length;i++){
			acc+=_p.sep+paths[i];
			paths[i]=acc;
		}

		//Now loop over the paths, eventually finding ones that don't exist, creating them
		var c=0, e=0;
		paths.forEach(function(part){
			if(!exists(part,'dir')){
				c++;
				fs.mkdirSync(part, mode)
			}else
				e++;
		});
		if(!exists(path,'dir'))
			log.throw(`BUG: fs.mkdirSync threw no error but didn't create ${path}. Check if these exist: `,paths)
		else
			log.info(`Created ${path}. First ${e} existed, last ${c} created:`,paths);

		return;
	}




	/*
	* Prepare a path for writing.
	*
	* NOTE: no file is actually created UNLESS you specify @perms
	*
	* @param string filepath
	* @param boolean overwrite
	* @param number|string perms Permissions to set on file
	*
	* @return Promise(true|BLE(unlogged))
	* @access public/exported 				
	*/
	
	function prepareWritableFile(filepath, overwrite,perms){
		if(perms && typeof perms!='string' && typeof perms!='number')
			return log.makeError("Expected arg#3 to be string or number,got:",log.logVar(perms)).reject('TypeError');

		return stat(filepath)
			.then(async function _prepareWritableFile(s){
				try{
					//If we're not allowed to write, bail
					if(!s.write)
						log.makeError(getEaccessLogStr(s)).throw("EWRITE");
					
					//If it exists, make sure it's a fifo/socket, or a file and we're overwriting
					if(s.exists){
						switch(s.type){
							case 'fifo':
							case 'socket':
								break; //these are fine to write to
							case 'file':
								if(!overwrite)
									throw new Error("File already exists (and we're not overwriting (arg#2))");	
								break;
							default:
								throw new Error("You probably shouldn't write to a "+s.type+" inode");
						}

						if(perms && String(perms)!=String(s.perm)) //Don't change if same so we don't effect modified time
							await chmodPromise(s.path.full,perms)


					}
					//If the parent directory doesn't exist, create it and any interediary dirs
					else if(s.firstParent!=s.path.dir){
						mkdir(s.path.dir);

						//If we've specified perms for a non-existent file we have to touch it
						if(perms){
							await touchPromise(s.path.full);
							await chmodPromise(s.path.full,perms)
						}
					}

					return true;
				}catch(err){
					return log.makeError(err).reject();
				}	
			})
		;
	}

	/*
	* Write data to a file
	* 
	* @param string|object opts 	@see docs online. you can append/write using thise
	*/
	function writeFilePromise(path,data,opts='utf8'){
		return existsPromise(path,'file')
			.then(()=>{
				var {promise,callback}=cX.exposedPromise();
				fs.writeFile(path, data, opts, callback);
				return promise;
			})
		;
	}

	/*
	* @return Promise(string,BLE) 	Resolves with content as string, rejects with BLE if file cannot
	*								be found or read
	*/
	function readFilePromise(path,opts='utf8'){
		return existsPromise(path,'file',true)
			.then(()=>{
				var {promise,callback}=cX.exposedPromise();
				fs.readFile(path, opts, callback);
				return promise;
			})
		;
	}

	/*
	* @return Promise(bool|BLE)
	*/
	function deleteFilePromise(path){
		return existsPromise(path)
			.then(exists=>{
				if(exists){
					return deleteFileCommon(path);
				}else{
					return Promise.resolve(false);
				}
			})
	}

	function deleteFileCommon(path){
		return checkReadWrite(newPath)
			.then(()=>cX.promisifyCallback(fs.rename,oldPath,newPath))
			.catch(err=>err.addHandling('Failed to delete existing file.').reject())
			.then(()=>true);
	}


	async function deletePromise(path){
		try{
			let s=await stat(path);
			if(!s.exists)
				return false;

			if(s.type=='dir'){
				await checkReadWrite(path);
				fs.rmdir(path)
			}else{
				return deleteFileCommon(path);
			}


		}catch(err){
			log.makeError("Failed to remove",path,err).reject();
		}

	}


	/*
	* @param string path
	* @param string|object opts
	*
	* @throw <ble TypeError>
	* @throw <ble> 			If the file doesn't exist, we don't have access to is etc (see err.code
	*)
	* @return string 		The contents of the file
	*/
	function readFile(path,opts='utf8'){
		try{
			return cX.trim(fs.readFileSync(path,opts));
		} catch(err){
			try{
				cX.checkTypes(['string',['object','string']],[path,opts]);
				exists(path,'file',true)
			}catch(e){
				err=e;
			}
			log.makeError("Failed to read file.",err).somewhere(path).throw();
		}	
		
	}

	/*
	* Get a json string from a file and parse it
	*
	* @param string path 		The path of the file to read
	* @param bool emptyOnFail 	Default false, ie. throw on fail. If true return empty object on fail
	*
	* @return object 			A javascript object, or on failure @see @emptyOnFail
	*/
	function getJsonFromFile(path, emptyOnFail=false){
		try{
			var str=readFile(path); //typeerror if not string, false if problems reading or no exist
			if(typeof str=='string'){
				if(str==''){
					throw new Error("The file was empty (ie. no json inside): "+path);	
				}else{
					var obj=cX.tryJsonParse(str)
					if(typeof obj=='undefined'){
						throw new Error("Failed to parse json from file: "+path);
					}else{
						cX.checkType(['object','array'],obj); //throw on fail
						return obj;
					}
				}
			}else{
				throw new Error("Failed to read file (see log)."); //path included in log
			}
		}catch(err){
			if(emptyOnFail){
				log.warn(err);
				return {};
			}else
				log.throw(err);
		}
	}


	/*
	* Read and parse a file like:
	*	VAR1=Foo
	*	VAR2=Bar2
	*
	* @param string path 		The path of the file to read
	* @param bool emptyOnFail 	Default false, ie. throw on fail. If true return empty object on fail
	*
	* @return object
	*/
	function getArgsFromFile(str,emptyOnFail=false,commentRegexp=/#.*$/){
		try{
			var str=readFile(path); //typeerror if not string, false if problems reading or no exist
			if(typeof str=='string'){
				if(str==''){
					throw new Error("The file was empty (ie. no json inside): "+path);	
				}else{
					str=cX.trim(str); //removes surrounding spaces, quotes and newlines

					var arr=str.split('\n')
						.filter(line=>!cX.isEmpty(line))
						.map(line=>line.replace(commentRegexp,''))

					return cX.splitArrayItemsToObject(arr,'=');
				}
			}else{
				throw new Error("Failed to read file (see log)."); //path included in log
			}
		}catch(err){
			if(emptyOnFail){
				log.warn(err);
				return {};
			}else
				log.throw(err);
		}


	}




	/*
	* Get contents of dir or search for a pattern
	*
	* NOTE: Only works on unix systems that have 'ls' command
	*
	* @param string path 		Path or search pattern
	* @opt boolean fullPath 	If ==true + $path is search pattern => /path/to/name.txt, else/default name.txt
	*
	* @throw <ble TypeError>
	* @throw <ble ENOENT> 		If the path doesn't exist (does not apply to search patterns)
	* @return array[string]	 	Array of filename/paths (see ^), or an empty array
	* @sync
	*/
	function ls(path,fullPath=false){
		//Make sure we have a full path 
		path=resolvePath(path);
		var isSearchPattern=path.indexOf('*')>-1

		try{
			var obj=cpX.execFileSync('ls',[path]);
			var list=obj.stdout.split('\n');

			//Warn if it seems we've ls'd a file (we probably want to ls dirs)
			if(list.length==1 && path.endsWith(list[0]) && inodeType(path)=='file'){
				log.warn("You called ls on a single file, was that intentional?")
			}

			if(fullPath && !isSearchPattern){
				//if a search pattern is use, 'ls' will naturally return the whole path...
				list=list.map(_p.resolve(path,file));
			}

			return list;
		}catch(obj){
			if(!isSearchPattern){ //don't warn on search patterns
				log.throwCode("ENOENT: The path doesn't exist:",path);
			}
			return [];
		}

	}


	/*
	* Get details contents of dir
	*
	* @throw err 	@see ls
	* @return array[object] 	@see statSync()
	* @not_logged
	* @sync
	*/
	function lh(path){
		var list=ls(path,true),details=[],ipath,i=0;
		// console.log(list);
		for(ipath of list){
			try{
				if(ipath)
					log.makeError("BUGBUG: ls returned empty path, index "+i,list);
				ipath=resolvePath(ipath,true); //true => paths can contain string 'undefined'
				details.push(statSync(ipath));
				i++
			}catch(err){ 
				err=log.makeError('Failed to get stats on ',ipath,err);
				log.makeError(`Failed to get stats for all items in ${path}`,err)
					.throw()
				;
			}
		}
		return details;
	}


	function isFolderEmpty(path){
		return ls(path).length ? false : true
	}

	/*
	* Find inodes recursively (or not), filtering and/or formating each line
	*
	* @param string path
	* @opt string|<RegExp>|object options 	string => options.match, <RegExp> => options.regexp
	* 	@prop string match 		Passed to "find -name" to filter results
	* 	@prop string type 		Passed to "find -type" to filter results
	*	@prop <RegExp> regexp 	Used here (by node) to to filter results
	*	@prop function callback Called with each line. Can format lines. Line is kept if non-empty string is passed
	* 	@prop false recursive 	If false "find -maxdepth 1"
	* 	@prop number maxdepth 	"find -maxdepth ##"
	* @opt <BetterLog> _log
	*
	* @return Promise(arr,<BLE not logged>) 	Resolves with a list of string full filepaths, rejects directly if any 
	*											error occurs during scanning
	* @async
	*/
	async function find(path='.',options={},_log){
		try{		
			var [,t,]=cX.checkTypes(['string',['string','<RegExp>','object'],['<BetterLog>','undefined']],[path,options,_log]);
			if(t=='string')
				options={'match':options}
			else if(t=='<RegExp>')
				options={'regexp':options}

			_log=options.log||_log||log;

			cX.checkProps(options,{callback:['function','undefined'], type:['string','undefined']})
			
			//Normalize the path and make sure it exists
			path=await existsPromise(path,'dir','reject');
			var args=[path];

			//If we don't want to do it recursively
			if(options.recursive===false){
				args.push('-maxdepth',1);
			}else if(typeof options.maxdepth=='number'){
				args.push('-maxdepth',options.maxdepth)
			}

			if(options.match)
				args.push('-name',options.match)

			if(options.type){
				switch(options.type){
					case 'dir':
					case 'folder':
						options.type='d'
					case 'file':
						options.type='f'
				}
				args.push('-type',options.type);
			}

			var {promise,resolve,reject,inspect}=cX.exposedPromise();
			var child=cpX.spawnLineEmitter('find',args); //this will log, no need to do so here
			child.on('error',reject); //error emits on failed start, failed kill or failed message


			
			//Now handle each line as it comes in, keeping track of how many lines get what treatment for logging
			//purposes AND to see when all lines have been processed
			var exited=false, all=0,e=0,r=0,c=0,lines=[],processed=()=>lines.length+e+r+c;
			child.stdout.on('line',async (line)=>{
				try{
					let i=++all;
					if(typeof line!='string' || !line){
						// _log.trace("Dropping empty line",line);
						e++;
						return;
					}
					if(options.regexp && !line.match(options.regexp)){
						// _log.trace("Filtering based on regexp",line);
						r++
						return;
					}
					if(options.callback){
						line=await options.callback(line);
						if(typeof line!='string' || !line){
							// _log.trace("Filtering based on callback",line);
							c++
							return;
						}
					}

					//If we're still running, keep it
					// _log.trace("Keeping:",line);
					lines.push(line);

					//Now check if the process has exited, in which case child.on('exit') will not have resolved
					//the promise so we have to do it here...
					if(exited){
						//...if all lines have been processed (which may not happen in order... async callback etc...)
						let p=processed();
						if(all==p){
							resolve();
						}else{
							_log.debug(`find(): ${p} of ${i} items processed. This is #${i}`)
						}
					}

				}catch(err){
					//Any problems and reject and kill the child
					reject(_log.makeError(err).addHandling("Problems parsing item "+i));
					child.kill('SIGKILL');
				}
			})


			child.on('exit',(code,signal)=>{
				if(code>0){
					reject("Process existed with code "+code);
					return;
				}

				//All lines may have finished before this event...
				let p=processed();
				if(p==all){
					resolve();
					return;
				}else{
					exited=true; //we an explicit flag instead of checking child.killed & child.exitCode
					_log.note(`find(): child has exited, but only ${p} of ${i} have been processed, waiting...`)
					//...or they may not, in which case we add a delayed check just to log/highlight any issues
					setTimeout(()=>{
						if(!inspect.done)
							_log.warn("find(): Possible BUG? The child process exited 1 sec ago but we still havn't resolved...");
					},1000)
					setTimeout(()=>{
						if(!inspect.done)
							_log.error("find(): Possible BUG? The child process exited 5 sec ago but we still havn't resolved...");
					},5000)
				}
			})


			//...and then wait for them all to be processed
			await promise;


			//Log the outcome, and if any errors occured this whole function will reject
			let same=lines.length==all;
			_log[e?'warn':'info'](`Found ${all} items under '${path}', kept ${same?'all':`${lines.length}, dropped based on:`}`
				,same?'':{empty:e, regexp:r, callback:c});
			if(e){

			}

			return lines;

		}catch(err){
			options.path=path;
			return _log.makeError('Failed to find recursively:',options,err).reject();
		}
	}

	


	function fileStatus(infoOrPath){

		var info=statSync(infoOrPath);

		if(!info.exists)
			return 'NO_EXIST';
		else if(info.type!='file')
			return 'NOT_FILE';
		else if(fileOpen(info.path.full))
			if(!info.native.size)
				return 'EMPTY_OPEN'; 
			else
				return 'OPEN';
		else if(!info.native.size)
            return 'EMPTY';
        else
        	return 'NOT_EMPTY';
	}

	/*
	* @return string 	String describing outcome, see func body...
	*/
	
	function deleteIfEmpty(infoOrPath){

		var info=statSync(infoOrPath);
		var status=fileStatus(info);
		if(status=='OPEN_EMPTY')
		if(status!='EMPTY')
			return status;
		
		if(info.write===false || (!info.hasOwnProperty('write') && accessSync(info.path.full,'W')!=null)){
			return 'NO_WRITE';
		}else{
            fs.unlinkSync(info.path.full);
            return 'DELETED';
		}
	}


	/*
	* Check if a file is open and get information about it's file handlers, see @mode for return format.
	*
	* @param string path
	* @param string mode 			'full' - Default. an object with props readonly,writeonly,readwrite containing lines 
	*										 from 'lsof', or false if not open
	*								'lines' - Array of lines from 'lsof', or false if not open
	*								'status' - one of the strings 'u','r','w' if the file exists ('u' if open 'r'+'u', either 
	*										   by the same or by different file descriptors), or '' if not open
	*								'fd' - an array of file descriptors (eg. 13r), or false ir not open
	*
	* @throw <BLE>
	* @return object|false|string|null 	Null if file doesn't exist. Else see @mode ^^
	*
	* @access public
	*/
	function fileOpen(path,mode){
		try{
			[path,mode]=_fileOpenPrepare(path,mode);

			if(!exists(path))
				return null
				
			// var obj=cpX.native.spawnSync("lsof",[path,'|','awk',"'{print $2,$4}'"],{timeout:1000}) //cannot handle |
			var obj=cpX.native.spawnSync("lsof",[path],{timeout:1000}) //2019-07-15: Seems not to throw even on error

			if(obj.stdout)
				return _fileOpenOutputHandler(obj.stdout,mode);
			else
				log.throw("BUGBUG: spawn should always return a buffer for stdout...");			

		}catch(err){
			throw log.makeError(err).addHandling("Failed to determine open file descriptors.");
		}
	}

	/*
	* @see fileOpen(), only diff this returns a promise
	*
	* @return Promise(object|false|string|null,<BLE>)
	* @access public
	*/
	function fileOpenPromise(path,mode){
		return new Promise(async function p_fileOpenPromise(resolve,reject){
			try{
				[path,mode]=_fileOpenPrepare(path,mode);

				if(!await existsPromise(path))
					return null

				cpX.execFileInPromise("lsof",[path],{timeout:1000}) //always rejects with object
					.then(
						function success(obj){
							return _fileOpenOutputHandler(obj.stdout,mode); //throws <BLE>
						}
						,function failed(obj){
							//If no stderr output exists, then this is just 'lsof' saying there are no open files
							if(!obj.stderr)
								return mode=='status' ? '' : false; //same as _fileOpenOutputHandler() vv

							throw log.makeError(obj.error).addHandling("Failed to determine open file descriptors.");
						}
					)
					.then(resolve,reject); //reject here always receives <BLE>

				return;
			}catch(err){
				reject(log.makeError(err).addHandling('Failed to determine open file descriptors.'));
			}
		})
	}

	/*
	* Used by fileOpen() and fileOpenPromise()
	* @throw <BLE>
	* @access private
	*/
	function _fileOpenPrepare(path,mode='full'){
		if(['full','lines','status','fd'].indexOf(mode)==-1)
			log.throw('Bad value for arg #2, expected: full,status,fd, got: ',mode);

		path=resolvePath(path); //throws error on bad value

		return [path,mode];
	}

	/*
	* Used by fileOpen() and fileOpenPromise(). Processes the output from linux 'lsof' command.
	*
	* @throw <BLE>
	*
	* @access private
	*/
	function _fileOpenOutputHandler(stdout,mode){
		try{
			var lines=cX.linuxTableToObjects(stdout)
			if(!lines.length)
				return mode=='status' ? '' : false; //same as fileOpenPromise.failed() ^^
			
			// log.info('fileOpen():',columns);
			if(mode=='lines')
				return lines;
			if(mode=='fd')
				return lines.map(line=>line.FD);
			
			// var arr=stdout.toString('utf8').trim().split('\n').slice(1); //turn into array and remove header line
			// arr=arr.map(line=>line.replace('\S+',' ').)
			//This could be tricky, the value in the 4th column can be 'cwd' or (#=a numerical file descriptor) '#r',
			//'#w' or '#u' (for r/w), but can it be something else as well??
			var ret={
				readonly:lines.filter(line=>['r','u'].includes(line.FD.substring(-1)))
				,writeonly:lines.filter(line=>['w','u'].includes(line.FD.substring(-1)))
				,readwrite:lines.filter(line=>line.FD.substring(-1)=='u')
				,all:lines
			};
			if(mode=='status'){
				if(ret.readwrite.length || (ret.readonly.length || ret.writeonly.length))
					return 'u';
				else if(ret.readonly.length)
					return 'r';
				else if(ret.writeonly.length)
					return 'w';
				else{
					log.info('fileOpen(): Unexpected value',lines);
					return ''
				}
			}else
				return ret;
		}catch(err){
			throw log.makeError(err).addHandling('Could not determine if file is open')
		}
	}


	/*
	* Trigger an async check for multiple open FDs into a local file
	*
	* @param number 	Warn if more than this many FD's are open
	*
	* @return Promise(void,n/a) 	Always resolves. Resolves after check is done.
	*/
	function checkOpenFDs(path, warnLimit=1){ 
		return fileOpenPromise(path,'fd')
			.then(function _checkOpenFDs(arrOrFalse){
				var open=arrOrFalse||[];
				if(open.length>warnLimit)
					log.warn(`${open.length} file descriptor(s) (>${warnLimit}) open for '${path}': ${open.join(',')}`);
				return;
			})
			.catch(log.error.bind(log));

	}

	

	/*
	* Creates a smart obj/arr which, when written to it automatically writes to HDD
	*
	* @param string filepath
	* @param function constructor 	Either SmartObject() or SmartArray()
	* @param object options 		Any additional options used to create smarty
	*
	* @return <SmartArr>|<SmartObject>
	*/
	function createStoredSmarty(filepath,constructor,options={}){
        cX.checkTypes(['string','function','object'],[filepath,constructor,options]);
        var type=(constructor.name=='SmartArray' ? 'array' : 
        	constructor.name=='SmartObject'?'object':log.throwCode('EINVAL','Expected arg#2 to be smart constructor, got:',constructor));

        //Add some options
        var d={delayedSnapshot:1000},c;
        //2020-05-08: ^that we need for storage purposes, but vv we should probably not mess with, just let the defaults rule...
        if(type=='array'){
            options=Object.assign(d,{moveEvent:true},options);
        }else{
            options=Object.assign(d,{children:'complex'},options);
        }


        var smarty=new constructor(options)

        //Store and return smarty
        return storeSmarty(filepath,smarty);
    }



    function storeSmarty(filepath,smarty){
    	var [,name]=cX.checkTypes(['string',['<SmartArray>','<SmartObject>']],[filepath,smarty]);

    	//Make sure there is a snapshot happening so we have somethingn to listen for
    	if(!smarty.hasSnapshot())
    		smarty.setupSnapshot(1000);

        //Create a stored item
        var storage=new StoredItem(
        	filepath
        	,(name=='<SmartArray>' ? 'array':'object')
        	,(smarty._private.options.children!='primitive' ? 'json' : undefined)
        	,smarty._log
        );

        //Define a couple of extra methods on the smarty
        /*
		* Stop storeing changes to smarty on the hdd
		* @return void
        */
        var attached=true;
        Object.defineProperty(smarty,'detach',{value:function detachStoredSmarty(){
        	attached=false;
        }})

        /*
		* Unlink the underlying file (and stop storing changes)
		* @return void
        */
        Object.defineProperty(smarty,'unlink',{value:function unlinkStoredSmarty(){
         	smarty.detach();
         	storage.unlink();
         }});


        //Then start listening or the snapshot and write the whole thing to HDD, as long as we're still attached (see ^^)
        smarty.on('snapshot',()=>{
        	if(attached){
        		if(!storage.stat.exists){
        			log.note("Creating file for stored smarty NOW @",storage.filepath);
        			storage.stat.exists=true;
        		}
        		storage.write(smarty.stupify()).catch(log.error)
        	}
        });


        //Finally...
        if(storage.stat.exists){
	        //...load initial data from storage...
	        var data=storage.read();

	        //...but any data already on smarty takes presidence...
	        var l=smarty.length
	        if(l)
	        	var existing=smarty.stupify();

	        smarty.assign(data);
	        
	        if(l)
	        	smarty.assign(existing);
        }else{
        	log.note("No previous data/file found. It will be created when something is set on this smarty @",storage.filepath);
        }

        return smarty;
    }






/*
	* @constructor 	This item saves and reads primitive/complex object to/from a file
	*
	* @param string 	filepath 		
	* @opt string 		restrictType 	@see varType(). If passed, values will be checked before store/after read so they match this
	* @opt flag     	'json' 			If passed value will be stored as json, else as delimited lines
	* @opt <BetterLog> 	_log 			If omitted the filesystem log will be used
	*/
	function StoredItem(filepath,...options){
		this.filepath=resolvePath(filepath);

		//Get args 2,3 and 4 in any order
		var j=options.indexOf('json')
			,saveAsJson=j>-1?options.splice(j,1):false //first extract 'json'...
			,restrictType=options.find(arg=>typeof arg=='string') //...then the first string should be the type
			,_log=options.find(arg=>arg && arg._isBetterLog)||log 
		;


		//Make sure the path is a reasonable candidate
		this.stat=statSync(this.filepath);
		if(this.stat.exists && this.stat.type!='file')
			_log.makeError(`Path is a ${this.stat.type}, not a file.`).throw('ENOTFILE')

		if(!this.stat.read && !this.stat.write)
			_log.makeError(getEaccessLogStr(this.stat)).throw('EACCES')

		function getEmpty(){
			switch(restrictType){
				case 'string': 
					return '';
				case 'number': 
					return 0;
				case 'array': 
					return [];
				case 'object': 
					return {};
				default:
					return undefined;
			}
		}


		/*
		* Write data to a file
		*
		* @param string|number|bool|array|object 	data
		*
		* @throw TypeError
		*
		* @return Promise(void,err)
		*/
		this.write=function(data){
			try{
				//When writing, throw on type that doesn't match restricted...
				var t=(restrictType ? cX.checkType(restrictType,data) : cX.varType(data));
			}catch(err){
				return _log.makeError("Could not write data:",data,err).reject();
			}

			return prepareWritableFile(this.filepath,true) //true=overwrite
				.then(()=>{
					var str;
					if(saveAsJson){
						str=JSON.stringify(data)
					}else{
						switch(t){
							case 'string':
							case 'number':
								str=cX.trim(String(data));
								break;
							case 'array':
								str=data.join('\n');
								break;
							case 'object':
								str=cX.objectToLines(data,'=');
								break;
							case 'boolean':
								str=(data ? 'true' : 'false');
								break;
							default:
								_log.throwCode('EINVAL','Cannot store vartype: '+t);
						}
					}
					
					//Write async to file, returning a promise that resolves when writing is finished
					var {promise,callback}=cX.exposedPromise()
					fs.writeFile(this.filepath, str,callback);
					return promise;
				})


		}


		/*
		* Read data from a file, parsing it into an object/array/string etc
		*
		* @return mixed
		* @sync
		*/
		this.read=function(){
			var str=readFile(this.filepath); //loggs if not exists

			//If we didn't get anything, return an empty item of the $restrictType 
			if(!str){
				_log.trace("File was empty.",this.filepath);
				return getEmpty();
			}

			//Parse whatever format the data was stored in
			var data;
			if(saveAsJson){
				data=cX.tryJsonParse(str);
			}else{
				switch(restrictType){
					case 'array':
						data=str.split('\n'); break;
					case 'object':
						data=cX.linesToObj(str,'=');break;
					default:
						data=str;
				}
			}

			//Force the restricted type
			try{
				return cX.forceType(restrictType,data);
			}catch(err){
				_log.makeError(`Expected file ${this.filepath} to contain ${restrictType}, but found:`,str);
			}

		}


		/*
		* Delete the underlying file
		* @return void
		* @sync
		*/
		this.unlink=function(){
			if(exists(this.filepath))
				fs.unlinkSync(this.filepath);
			return;
		}
	}













	/*
	* @param string path
	* @return number 		The total size in bytes
	*/
	function folderSize(path){
		if(typeof path!='string')
			log.typeError("string",path)

		try{
			var obj=cpX.native.spawnSync('du',['-s',path],{timeout:1000});
			return Number(obj.stdout.toString('utf8').trim().split(/\s+/)[0]);
		}catch(err){
			log.error("Failed to sum folder size using linux 'du' cmd. ",err);
		}

		//Failover...
		try{
	        return ls(path).reduce((total,filename)=>{
	            try{
	            	var filepath=path+'/'+filename;
	                return total + statSync(filepath).size;
	            }catch(err){
	                this.log.warn('fs.stat('+path+') returned:',stat);
	                return total
	            }
	        },0)
		}catch(err){
			log.error("Failed to sum folder size adding size of each file. ",err);
		}
        
        //If we're still running, throw error
        log.throw("Could not determine size of "+path);
	}



	/*
	* @return array|undefined 	An array of known content types given the extension, or undefined if we don't know
	*							what it is
	*/
	function fileExtType(pathOrExt){
		if(typeof pathOrExt!='string')
			log.typeError("string",pathOrExt);

		var ext=(pathOrExt.substring(0,1)=='.' ? pathOrExt : _p.extname(pathOrExt)).toLowerCase();

		return fileExtensions[ext]
	}



	/*
	* Make sure file exists, and by default update it's modified time
	*
	* @return Promise(void,err)
	* @async
	*/
	function touchPromise(path,setModified=true){
		return existsPromise(path,'file')
			.then(exists=>{
				var {promise,resolve,reject}=cX.exposedPromise();
				if(!exists){
					fs.open(path, 'w', (err, fd) => {
				    	if(err) 
				    		return reject(err);
				      	fs.close(fd, err => {
				        	if(err)
				        		return reject(err);
				        	resolve()
				      	});
				    });
				}else if(setModified){
					fs.utimes(filename, time, time, err => {
						if(err)
				        	return reject(err);
				        resolve()
					})
				}
				return promise;
			})
		;
	}

	/*
	* Make sure file exists, and by default update it's modified time
	*
	* @throws 
	* @return void
	* @sync
	*/
	function touch(path,setModified=true){
		if(!exists(path,'file')){
			fs.closeSync(fs.openSync(path, 'w'));
		}else if(setModified){
			var time = new Date();
			fs.utimesSync(path, time, time);
		}
		return;
	}


	/*
	* Calls native chmod but returns promise instead of requiring callback
	*
	* @param string path
	* @param string perms 	NOTE: numbers will be converted to strings, ie. don't try to send numeric bitmasks, just
	*							  regular old 755 or 600...  
	*
	* @return Promise(void,err)
	*/
	function chmodPromise(path,perms){
		var {callback,promise}=cX.exposedPromise();
		fs.chmod(path,String(perms),callback);
		return promise;
	}


	function move(oldPath,newPath){
		return existsPromise(oldPath)
			.then(()=>checkReadWrite(newPath))
			.then(()=>cX.promisifyCallback(fs.rename,oldPath,newPath))
		;
	}


	return _exports;
}