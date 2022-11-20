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
	
	const inodeTypes=['file','dir','block','raw','fifo','socket','symlink'];
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
	const _exports={
		'native':fs
		,'path':_p

		//Clean and resolve
		,resolvePath
		,cleanFilename
		
		//Exists and Access
		,existsSync
		,existsSync //alias for sync version
		,existsPromise
		,accessPromise
		,accessSync
		,checkReadWrite

		//Status and File descriptors
		,fileStatus
		,fileOpen
		,checkOpenFDs

		//Info
		,whoami
		,whoami //alias ^
		,inodeType
		,modeToPerm
		,statSync
		,stat
		,'statPromise':stat //alias^
		,folderSize
		,fileExtType
		,isSubdirOf

		//Read
		,readFilePromise
		,readFileSync

		
		//Write
		,mkdir
		,prepareWritableFile
		,writeFileSync
		,writeFileSync //alias for sync version
		,writeFilePromise
		,appendFilePromise
		,touchPromise
		,touch
		,chmodPromise
		,move

		//Delete
		,deleteFilePromise
		,deleteFileSync
		,deleteFolderPromise
		,deleteFileSync

		//Fifo
		,flushFifo
		,createFifo

		//List and find
		,ls
		,lh
		,isFolderEmpty
		,find
		,findParentSync
		,findParentPromise
		
		//Misc
		,StoredItem
		,getRandomFileName
		,which


	}



	try{
		var fileExtensions=cX.jsonParse(readFileSync(__dirname+'/extensions.json'),'object');
	}catch(err){
		log.warn("Failed to read file extensions json. fileExtType() will never find a match now.",err);
		fileExtensions={};
	}
	



/************************ CLEAN & RESOLVE ****************************/

	/*
	* Make sure a string is a path, and if it's relative, append the working dir or an optionally passed in one
	*
	* @param string path 	      The path to check
	* @opt string cwd 			  Relative paths are prepended by this. Defaults to process.cwd()
	* @opt flag 'make-relative'   If passed make the resolved path relative to $relativeTo		
	* @opt string relativeTo	  Only used if flag 'make-relative' is passed. Defaults to $cwd which defaults to process.cwd()
	* @opt flag 'allow-undefined' If passed this method WON'T throw an error if $path contains the string 'undefined'
	*
	* @throws <BLE TypeError> 	If $path is not a string
	*
	* @return string 			The resolved path
	*/
	
	function resolvePath(path,...options){
		cX.checkType('string',path);

		//Get options 
		var noUndefined=cX.extractItem(options,'no-undefined')
			,makeRelative=cX.extractItem(options,'make-relative')
			,cwd=cX.getFirstOfType(options,'string')||process.cwd()
			,cwdAlt=cX.getFirstOfType(options,'string')||cwd
		;
		
		//If the path matches an already cleaned one, and no options were passed in, it's already been cleaned...
		if(!options.length && cleaned.hasOwnProperty(path))
			return path;

		//Since there is a larger risk that someone built a filepath without realizing that one of the
		//components was undefined (which turned into the string 'undefined' and got included as a dir 
		//or file), than that something is actually named 'undefined', we throw unless explicitly told not to
		if(noUndefined && path.includes('undefined'))
			log.makeError("The path included substring 'undefined':",path)
				.addHandling("If 'undefined' should be allowed, please call this function with arg #2==true.")
				.throw();

		//Resolve paths if they're relative
		if(!_p.isAbsolute(path))
			path=_p.resolve(cwd,path);
		
		//Normalize...
		path= _p.normalize(path)

		//And if we want relative paths, make them so again (possibly relative to something else)
		if(makeRelative)
			path='./'+_p.relative(cwdAlt,path);

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



/************************** clean & resolve end ****************************/













/********************************** EXISTS / ACCESS *******************************/

	/*
	* Check if an inode exists without throwing error
	*
	* @param string path 		@see _existsPre()
	* @opt string|array type 	@see _existsPre()
	* @opt string throwOn 	    @see _existsCallback(). Controlls if <ble EEXISTS>|<ble ENOTFOUND> can be thrown. Íf not passed @see @return
	*
	* @throws <BLE TypeError> 	Any arg is wrong type
	* @throws <BLE EINVAL> 		$type or $throwOn are bad values
	* @throws <ble EACCESS>|<ble ETYPE>|<ble BUGBUG>|<ble EEXISTS>|<ble ENOTFOUND>	@see _existsCallback()
	*
	* @return undefined|str 	A normalized path if it exists, else undefined
	* @access public/exported
	* @sync
	* @not_logged
	*/
	function existsSync(path,type=undefined,throwOn=undefined){
		var err, args=_existsPre(arguments); //throws TypeError and EINVAL
		try{
			fs.accessSync(path); //throws error if not exists 
		}catch(e){
			err=e;
		}
		return _existsCallback(err,...args);
	}

	/*
	* @param string path 		@see _existsPre()
	* @opt string|array type 	@see _existsPre()
	* @opt string rejOn 	    @see _existsCallback(). Controlls if <ble EEXISTS>|<ble ENOTFOUND> can be rejected. If not passed @see @resolve
	*
	*
	* @return Promise
	* @resolve undefined|str 	A normalized path if it exists, else undefined
	*
	* @reject <BLE TypeError> 	Any arg is wrong type
	* @reject <BLE EINVAL> 		$type or $rejOn are bad values
	* @reject <ble EACCESS>|<ble ETYPE>|<ble BUGBUG>|<ble EEXISTS>|<ble ENOTFOUND>	@see _existsCallback()
	*/
	function existsPromise(){
		try{var args=_existsPre(arguments)}catch(e){return log.makeError(e).reject()}; //throws TypeError and EINVAL
		return new Promise((resolve,reject)=>{
			fs.access(args[0],function existsPromise_accessCallback(err){
				try{
					return resolve(_existsCallback(err,...args)); 
				}catch(err){
					return reject(err);
				}
			});
		});
	}

	/*
	* Common validation func for exists ^
	*
	* @param string path
	* @param string|array type	Expected type of path. @see inodeType()
	*
	* @throws <ble TypeError> 	if $path not string (throws even if $thrw is false)
	*
	* @return string 	The cleaned up path
	*/
	function _existsPre(args){
		var arr=Array.from(args);
		var types=cX.checkTypes(['string',['string','array','undefined'],['string','undefined']],arr);

		arr[0]=resolvePath(arr[0]); //throws error on bad value

		switch(types[1]){
			case 'string':
				arr[1]=[arr[1]];
				//fall through
			case 'array':
				try{arr[1]=arr[1].map(t=>t.toLowerCase());}catch(err){log.throwType("arg#2 to be a list of strings, all weren't:",arr[1])}
				if(!arr[1].every(t=>inodeTypes.includes(t)))
					log.throwCode('EINVAL', `Arg#2, not all are valid inode types: ${arr[1].join(',')}` )
			default:
				arr[1]=undefined
		}

		if(types[2]=='string'){
			arr[2]=arr[2].toUpperCase()
			if(arr[2]!='EEXISTS' && arr[2]!='ENOTFOUND')
				log.throwCode('EINVAL',"Arg #3 should be EEXISTS or ENOTFOUND, got: ",arr[2]);
		}

		return arr
	}

	/*
	* @param error err	
	* @param string path
	* @param string|array type		Expected type of path. @see inodeType(). This can cause ETYPE even if $thrw==false
	* @param string throwOn			In what situation should we throw? If the thing exists or if it doesn not. Íf not passed @see @return
	*
	* @throws <ble EEXISTS>	     	The inode exists. Only if $throwOn==EEXIST
	* @throws <ble ENOTFOUND>		If WE KNOW the path doesn't exist (and $thrw==true) (could be because ENOTDIR along path). Only if $throwOn==ENOTFOUND
	* @throws <ble EACCESS>		 	If we CAN'T KNOW if the path exists because we don't have access to the entire path
	* @throws <ble ETYPE>		 	If $type is passed and inode is not the correct type
	* @throws <ble BUGBUG>
	*
	* @return undefined|str 		A normalized path if it exists, else undefined or @see $thrw
	*/
	function _existsCallback(err, path,type,throwOn){
		try{
			if(err){
				switch(err.code){
					case 'ENOTDIR':
						if(throwOn=='ENOTFOUND'){
							//Trigger (but don't wait for) a check of where along the path the problem lay, logging when done...
							findParentPromise(path).then(p=>{
								let t=inodeType(p), parentIs=`${p} is a ${t}`;
								if(notfound.printed) //created vv
									log.makeEntry('warn',`${path} doesnt exist because ${parentIs}`).addHandling("Pertains to previously logged error").exec();
								else
									notfound.append(parentIs);
							});
						}
						
						//This entails that the path doesn't exist, so instead of throwing NOTDIR we fall 
						//through and handle like NOENT (but we'll be adding this err... see vv)


					case 'ENOENT': //parent dir exists and is readable, so we know inode doesn't exist
						if(throwOn=='ENOTFOUND'){  //<-------------- check if we're throwing when it doesn't exist
							// log.makeError(`${path} doesn't exist.`).throw(err.code);
							var notfound=log.makeError('No such file or directory:',path).setCode('ENOTFOUND');
							if(err.code=='ENOTDIR'){
								notfound.setBubble(err).addHandling("See seperate entry below for where the path broke");
							}
							notfound.throw();
						}else{
							return false;
						}

					case 'EACCES': //something along path is not readable, so we don't know status of inode
						log.throwCode('EACCES',`Cannot determine if ${type ? type :'path'} exists (${path}), something along the way is not readable`,err)
						

					default:
						log.makeError('Please handle code:',err.code,err).setCode('BUGBUG').exec().throw();
				}
			}else if(throwOn=='EEXISTS'){ //<-------------- check if we're throwing when it DOES exist
				log.throwCode("EEXISTS","The inode exists: "+path);
			}

			//If arg#2 is passed, make sure the inode is the correct type, else throw
			if(type){
				let t=inodeType(path);
				if((typeof type=='string' && t!=type)||(Array.isArray(type) && !type.includes(t)))
					log.throwCode('ETYPE',`${path} is a '${t}', not a ${type}`);	
			}
			
			return _p.normalize(path);
		
		}catch(err){
			//If it get's this far we ALWAYS throw (we may have returned false ^)
			
			if(err.isBLE && err.code!='BUGBUG')
				throw err.changeWhere(1); //Point the error to the existsSync or existsPromise
			else
				throw log.makeError(err).setCode('BUGBUG'); //these errors concern this func
		}
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
	* @return Promise(obj,bug) 	Only rejects on bug. Resolves with object with boolean props: read,write,execute
	*/
	function accessAllPromise(path){
	
		return cX.groupPromises({
			'exists':accessPromise(path,'F')
			,'read':accessPromise(path,'R')
			,'write':accessPromise(path,'W')
			,'execute':accessPromise(path,'X')
		}).promise.catch(obj=>obj).then(({results})=>{
			try{
				var ret={}
				ret.exists=results.exists[0];
				ret.read=results.read[0];
				ret.write=results.write[0];
				ret.execute=results.execute[0];
				return ret;
			}catch(err){
				return log.reject("BUGBUG groupPromises() returned something unexpected:",obj,err);
			}
		})
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

	/*
	* Get a log string that explains what access the current user has to a given file. This function
	* doesn't check if access is denied, but it produces a string that says so...
	*
	* @param object stat   The returned object from stat()
	*
	* @return string
	*
	* @private
	*/
	function getAccessDeniedLogStr(stat){
		try{
			var access=[];
			if(!stat.read)access.push('read');
			if(!stat.write)access.push('write');

			var logstr=`User ${whoami().str} cannot ${access.join(' or ')} '${stat.path.full}'. `

			if(stat.exists){
				logstr+=`uid:${stat.native.uid}, gid:${stat.native.gid}, perm:${stat.perm}`;
			}else{
				logstr+="The inode doesn't exist. ";
				try{
					let parent=findParentSync(stat.path.full)
					let {perm,native:{uid,gid}}=statSync(parent);
					logstr+=`The first existing parent is '${parent}' which has uid:${uid}, gid:${gid}, perm:${perm}`;
				}catch(err){
					//This should most likely only be a EINVAL error
					logstr+=err.message
				}
			}

			return logstr;
		}catch(err){
			log.error(err,stat);
			return 'Failed to determine current user and/or access to inode.';
		}
	}





/*********************** exists/access end *********************************/













/************************** STATUS & FILE DESCRIPTORS ********************************/
	/*
	* Get a descriptive code for an inode
	*
	* @param object|string infoOrPath  The string path, or an already created info object, @see statSync()
	*
	* @return string  One of: NO_EXIST, NOT_FILE, EMPTY_OPEN, OPEN, EMPTY, NOT_EMPTY
	*/
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

			if(!existsSync(path))
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

/************************** status and file descriptors end ****************************/


















/********************************** INFO *******************************/



	function whoami(){
		var x={
			user:cpX.native.execFileSync('whoami').toString().trim()
			,groups:cpX.native.execFileSync('groups').toString().trim().split(' ').filter(g=>g)
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

		var info={original:path, path:_p.parse(fullPath), exists:null, native:{}, type:null}
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
		Object.assign(info.native,native);
		info.perm=modeToPerm(native.mode);
		info.type=inodeType(native);
		info.firstParent=info.type=='dir' ? info.path.full : _p.dirname(info.path.full);
		statAccessAllCommon(info,access);
	}

	function statAccessAllCommon(info,access){
		Object.assign(info,cX.subObj(access,['read','write','execute']));
	}

	/*
	* Determines if a file/folder is empty IF it exists, else .empty remains undefined
	*/
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
	*		,empty:bool              //file has any size, folder has any contents, only set if exists==true
	*		,perm:755
	*		,firstParent:string      //First existing parent folder (can be same as path.dir)
	*		,read:bool               //can current user read this path
	*		,write:bool              //can current user write this path
	*		,execute:bool            //can current user execute this path
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






/************************ info end ***********************************/




























/********************** READ *************************/


	/*
	* @param string path
	* @param string|object opts
	*
	* @throw <ble TypeError>
	* @throw various 			If the file doesn't exist, we don't have access to is etc 
	*
	* @return string 		The contents of the file
	*/
	function readFileSync(path,opts='utf8'){
		try{
			var str=fs.readFileSync(path,opts);
			return str.trim(); //throws if not string //DevNote: don't use cX.trim() since that also removes quotes, which we may want...
		}catch(err){
			try{
				//For logging purposes we do extra checks...
				cX.checkTypes(['string',['object','string']],[path,opts]);
				existsSync(path,'file','ENOTFOUND')
			}catch(e){
				err=e;
			}
			log.makeError("Failed to read file.",err).somewhere(path).throw();
		}	
		
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

/************************** end read ********************/


























/********************** WRITE *****************************/


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
		if(existsSync(path,'dir')){ //throws if exists but not a dir
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
			if(!existsSync(part,'dir')){
				log.highlight('green',`existsSync(${part},'dir'):`,existsSync(part,'dir'))
				c++;
				fs.mkdirSync(part, mode)
			}else{
				e++;
			}
		});
		if(!existsSync(path,'dir'))
			log.throw(`BUG: fs.mkdirSync did NOT fail, but neither did it create ${path}. Check if these exist: `,paths)
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
	* @opt boolean mayExist
	* @opt number|string perms Permissions to set on file
	*
	* @return Promise(object|BLE(unlogged))    Resolves with the output from stat(), rejects with BLE
	* @access public/exported 				
	*/
	
	function prepareWritableFile(filepath, mayExist=false,perms=null){
		if(perms && typeof perms!='string' && typeof perms!='number')
			return log.makeError("Expected arg#3 to be string or number,got:",log.logVar(perms)).reject('TypeError');

		return stat(filepath)
			.then(async function _prepareWritableFile(s){
				try{
					//If we're not allowed to write, bail
					if(!s.write)
						log.makeError(getAccessDeniedLogStr(s)).throw("ACCESS");
					
					//If it exists, make sure it's a fifo/socket or a file and we're overwriting
					if(s.exists){
						switch(s.type){
							case 'fifo':
							case 'socket':
								break; //these are fine to write to
							case 'file':
								if(!mayExist)
									throw new Error("File already exists (and we're not overwriting/appending (arg#2))");	
								break;
							default:
								throw new Error("You probably shouldn't write to a "+s.type+" inode");
						}

						if(perms && String(perms)!=String(s.perm)){ //Don't change if same so we don't effect modified time
							await chmodPromise(s.path.full,perms)
							var restat=true;
						}


					}
					//If the parent directory doesn't exist, create it and any interediary dirs
					else if(s.firstParent!=s.path.dir){
						mkdir(s.path.dir);

						//If we've specified perms for a non-existent file we have to touch it
						if(perms){
							await touchPromise(s.path.full);
							await chmodPromise(s.path.full,perms)
							restat=true;
						}
					}
					if(restat)
						return stat(s.path.full);
					else
						return s;
				}catch(err){
					return log.makeError(err).reject();
				}	
			})
		;
	}




	/*
	* Write data to a file. 
	*
	* NOTE: You'll probably want to have run prepareWritableFile() before this
	* NOTE: see docs online: https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback 
	*
	* @param string path
	* @param string|Buffer data 	
	* @param string|object opts
	*
	* @return undefined
	*/
	function writeFileSync(path,data,opts){
		//The files doesn't have to exist, but if it does it shouldn't be an inode not suitable for writing.
		//Also the path must be valid in that halfway through it points to a file...
		existsSync(path,['socket','fifo','file']);

		fs.writeFileSync(path, data, opts);

		return;
	}


	/*
	* Write data to a file. 
	*
	* NOTE: You'll probably want to have run prepareWritableFile() before this
	* NOTE: see docs online: https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback 
	*
	* @param string path
	* @param string|Buffer data 	
	* @param string|object opts
	*
	* @return Promise(undefined,err)
	* @async
	*/
	function writeFilePromise(path,data,opts){
		//The files doesn't have to exist, but if it does it shouldn't be an inode not suitable for writing.
		//Also the path must be valid in that halfway through it points to a file...
		return existsPromise(path,['socket','fifo','file']) 
			.then(()=>{
				var {promise,callback}=cX.exposedPromise();
				fs.writeFile(path, data, opts, callback);
				return promise;
			})
		;
	}

	/*
	* Shorthand for writeFilePromise() with append option set
	* @return Promise 	@see writeFilePromise()
	*/
	function appendFilePromise(path,data,opts){
		if(typeof opts=='string')
			opts={encoding:opts};
		opts=Object.assign({},opts,{flag:'a'});
		return writeFilePromise(path,data,opts);
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
		if(!existsSync(path,'file')){
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

/******************** write end **************************/










/********************* DELETE ***************************/



	/*
	* Delete a file
	* @param string path
	* @return Promise(bool,<ble>) 		@see _common_deletePromise()
	*/
	function deleteFilePromise(path){
		return _common_deletePromise(path,['file','fifo','socket','symlink']);
	}
	/*
	* Delete a file
	* @param string path
	* @return Promise(bool,<ble>) 		@see _common_deleteSync()
	*/
	function deleteFileSync(path){
		return _common_deleteSync(path,['file','fifo','socket','symlink']);
	}



	/*
	* Delete a folder
	* @param string path
	* @return Promise(bool|ble)    @see _common_deletePromise()
	*/
	function deleteFolderPromise(path){
		return _common_deletePromise(path,'dir');
	}
	/*
	* Delete a folder
	* @param string path
	* @throws ble 					@see _common_deleteSync()
	* @return bool
	*/
	function deleteFolderSync(path){
		return _common_deleteSync(path,'dir');
	}




	/*
	* Delete a file or folder
	*
	* @param string path
	* @param string|array types
	*
	* @return Promise 		
	* @resolves bool	                True/false if it was deleted now
	* @reject <ble ETYPE>               If inode is not right type
	* @reject <ble EACCESS>             If current user is not allowed to delete the file
	*
	* @private
	*/
	function _common_deletePromise(path,types){
		return existsPromise(path,types,'ENOTFOUND')
			.then(()=>checkReadWrite(path))
			.then(()=>cX.promisifyCallback(fs[types=='dir'?rmdir:unlink],path))
			.catch(err=>{
				if(err.code=='ENOTFOUND')
					return false;
				else
					return log.makeError(`Failed to delete ${types=='dir'?'dir':'file'}: `,path,err).reject();
			})
		;
	}
	/*
	* @see _common_deletePromise()
	* @private
	*/
	function _common_deleteSync(path,types){
		if(!existsSync(path,types))
			return false;

		try{
			if(types=='dir')
				return fs.rmdirSync(path);
			else
				return fs.unlinkSync(path);
		}catch(err){
			//The most likely error is access, so check that before we egen entertain anything else
			let s=statSync(path);
			if(!s.write)
				log.makeError(getAccessDeniedLogStr(s)).throw("ACCESS");
			else
				log.makeError(`Failed to delete ${types=='dir'?'dir':'file'}: `,path,err).throw();
		}
	}


/********************* delete end ************************/

























/********************* FIND & LIST ************************/

	/*
	* Get contents of dir or search for a pattern
	*
	* NOTE: Only works on unix systems that have 'ls' command
	*
	* @param string path 		Path or search pattern. NOTE: pattern only works on unix systems that have 'find' command
	* @opt string|bool mode		The following are accepted:	
	*		filename,basename,name,file,false 	=> foo.js
	* 		fullpath,full,path,true 			=> /path/to/foo.js
	*   	relative 							=> ./foo.js 			@see $relativeTo
	* @opt string relativeTo    Used if $mode=='relative', defaults to  process.cwd()
	*
	* @throw <ble TypeError>
	* @throw <ble ENOENT> 		If the path doesn't exist (does not apply to search patterns)
	* @return array[string]	 	Array of filename/paths (see ^), or an empty array
	* @sync
	*/
	function ls(path,mode="basename",relativeTo){
		//For clarity and same handling here and in resolvePath()
		relativeTo=relativeTo||process.cwd();

		cX.checkTypes(['string','string','string'],[path,mode,relativeTo]);

		//Normalize the mode
		switch(mode){
			case 'relative':mode='relative'; break;
			case 'fullpath':case 'full':case 'path':case true: mode='fullpath'; break;
			case 'basename':case 'filename':case 'name':case 'file':case false: default:mode='basename';
		}


		//Make sure we have a full path (which could be a pattern)
		let fullpathOrPattern=resolvePath.apply(this,[path,relativeTo]);
			//^here $relativeTo will only have an affect if $path is relative, in which case it's assumed to be
			//relative to $relativeTo 

		var index=fullpathOrPattern.indexOf('*'),list;
		if(index>-1){
			//For "search patterns" we use 'find' 
			let dir=fullpathOrPattern.substr(0,index), pattern=fullpathOrPattern.substr(index); //keep outside try-block so errors aren't mistaken...
			try{
/* DevNote 2020-05-18: Why use unix 'find' instead of 'ls'? 
	'ls' needs a shell feature called 'globbing' which expands '*' to matching files to do this, but when trying to run with 
	a shell we got the files in pwd, it completely ignored the path we were asking for... Also, trying
	to run execSync('find',[path]) will return `find pwd`, while execFileSync('find',[path]) will in fact return `find pwd`
*/
				list=cpX.execFileSync('find',[dir,'-name',pattern],{lines:true}).stdout;
			}catch(err){
				//If find doesn't match any files it'll throw an error, but really we just want to note this and move on
				log.note("No files matched pattern",pattern);
				return [];
			}

			//This will always return the full path name, so if we don't want that we have to remove everything
			//before the first *
			switch(mode){
				case 'fullpath': return list;
				case 'basename': return list.map(fullpath=>_p.basename(fullpath));

				//same handling of 'relative' at bottom
			}
		}else{
			//If we just want the contents we just read the dir
			list=fs.readdirSync(fullpathOrPattern);

			//This will only return the filenames, so if we want the whole path...
			if(mode=='basename')
				return list;

			//For both the other cases we first need the full path
			list=list.map(basename=>_p.resolve(fullpathOrPattern,basename));

			if(mode=='fullpath')
				return list;
		}

		//If we're still running we have fullpaths and want relative paths
		return list.map(fullpath=>resolvePath(fullpath,'make-relative',relativeTo));
	}


	/*
	* Get details contents of dir
	*
	* @throw err 	@see ls
	* @return array[object] 	Array of outputs from @see statSync()
	* @not_logged
	* @sync
	*/
	function lh(path){
		var list=ls(path,'fullpath'),details=[],ipath,i=0;
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

		/*
	* Get the first existing inode along a path
	*
	* @param string path
	*
	* @throws <ble TypeError> 	for $path
	* @throws <ble EINVAL>      If no parent path was found 
	*
	* @return string 		Path of parent inode that exists
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

		log.throwCode("EINVAL","No parent path found (not even /), ie. something is wrong with this path string:",path);
	}

	/*
	* Get the first existing inode along a path
	*
	* @return Promise(str|err) 		Resolves with path of existing inode, rejects with error (most likely if $path is invalid)
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

			reject(log.makeError("No parent path found (not even /), ie. something is wrong with this path string:",path).setCode("EINVAL"));
		})

	}



/***************************** find & list end ***************************/






/******************* FIFO  ******************/

	/*
	* Empty all contents from a fifo (good if we can't re-create it due to some process not allowing that...)
	*/
	function flushFifo(path){
		//First check that the fifo exists...
		if(existsSync(path,'fifo')){
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
		if(!existsSync(dir,'dir')){
			log.throw("Parent dir doesn't exist: "+dir);

		//...if so check if the fifo itself already exists...
		}else if(existsSync(path,'fifo')){

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
			
			if(existsSync(path,'fifo'))
				return ret+2; //Fifo was created (2)/re-created(3) here
			else
				throw new Error("mkfifo exited with 0 but fifo still doesn't exist");

		} catch(e){
			log.throw(e);
		}


	}

/******************* Fifo end ******************/










	













/******************* MISC *****************************/








/*
	* @constructor 	This item saves and reads primitive/complex object to/from a file
	*
	* NOTE: Format is determined by flags first, then ending of filepath, then defaults to key=value
	*
	* @param string 	filepath 		
	* @opt string 		restrictType 	@see varType(). If passed, values will be checked before store/after read so they match this
	* @opt flag     	'json' 			Store as json
	* @opt flag     	'key=value'     Stores objects as key=value\n, throws if restrictType is any primitive
	* @opt flag     	'lines'         Store object values on each line, or split string on \n
	* @opt flag     	'string'        Store as string. Don't need to pass twice if you pass as $restrictedType
	* @opt flag     	'preventEmpty'  If file is not empty, and we try to store empty value, throw
	* @opt <BetterLog> 	_log 			If omitted the filesystem log will be used
	*
	*
	* @prop string filepath
	* @prop <BetterLog> log
	* @prop <fsX.statSync($filepath)> stat
	* @method write
	* @method read
	* @method unlink
	*/
	function StoredItem(filepath,...options){
		if(!this instanceof StoredItem)
			throw new Error("StoredItem() is a constructor and should be new'ed");

		this.filepath=resolvePath(filepath);

		this.log=cX.findExtract(options,arg=>arg && arg._isBetterLog)||log ;

		var preventEmpty=cX.extractItem(options,'preventEmpty');

		//Get specified format...
		var format=cX.extractItems(options,['json','key=value','lines','string'])[0]; //extract all but use first
		
		//...also check file extension for format clues
		if(this.filepath.endsWith('.json')){
			if(format=='json')
				this.log.warn("Did you mean to store key=value format in .json file?",arguments);
			else if(!format)
				format='json';

		}else if(format=='json'){
			this.log.note("Storing in json format, but not using .json file extension:",this.filepath);
		}

		//Finally, the first remaining string will be used to restrict the format of what is saved
		var restrictType=cX.getFirstOfType(options,'string','extract');
		
		//If we don't have a format try do deduce it from here
		switch(restrictType){
			case 'string':
			case 'number':
			case 'boolean':
			case 'primitive':
				if(!format){
					format='string'; 
				}else if(format!='json'){
					//applies to 'lines' and 'key=value'
					this.log.throwCode('EMISMATCH',`Cannot store ${restrictType} as format '${format}'`,arguments);
				}
				format='string'; 
				break;
			case 'object':
				if(!format){
					format='key=value'; 
				}else if(format=='lines'){
					this.log.throwCode('EMISMATCH',`Cannot store an object as 'lines'. Try 'key=value' or 'json'.`,arguments);
				}
				break;
			case 'array':
				if(!format){
					format='lines'; 
				}
				break;
		}

		//Make sure we have a format, default to string
		format=format||'string';


		//Make sure the path is a reasonable candidate
		this.stat=statSync(this.filepath);
		if(this.stat.exists && this.stat.type!='file')
			this.log.makeError(`Path is a ${this.stat.type}, not a file.`).throw('ENOTFILE')

		if(!this.stat.read && !this.stat.write)
			this.log.makeError(getAccessDeniedLogStr(this.stat)).throw('EACCES')


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
				case 'boolean':
					return false;
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
		* @throw EILLEGAL
		* @throw EMISMATCH
		*
		* @return Promise(void,err)
		*/
		this.write=(data)=>{
			try{
				//When writing, throw on type that doesn't match restricted...
				var t=(restrictType ? cX.checkType(restrictType,data) : cX.varType(data));

			}catch(err){
				return this.log.makeError("Could not write data:",data,err).reject();
			}

			return prepareWritableFile(this.filepath,true) //true=overwrite
				.then((stat)=>{
					if(stat.empty===false && cX.isEmpty(data)){
						if(preventEmpty)
							this.log.throwCode('EILLEGAL',`This StoredItem does not allow writing empty data. File size: ${stat.native.size}.`,this.filepath)
						else
							this.log.note(`Emptying ${this.filepath} of existing data. File size: ${stat.native.size}`);
					}
					var str;
					try{
						switch(format){
							case 'json': 
								str=JSON.stringify(data);
								break;
							case 'key=value':
								str=cX.objectToLines(data,'='); //throws if not object/array
								break;
							case 'lines':
								str=data.join('\n'); //throws if this method doesn't exist
								break;
							case 'string':
								str=cX.trim(String(data));
						}
					}catch(err){
						this.log.throwCode("EMISMATCH",`Failed to store ${cX.varType(data)} as ${format}`,data,err);
					}
					
					//Write async to file, returning a promise that resolves when writing is finished
					return writeFilePromise(this.filepath,str);
				})
			;
		}


		/*
		* Read data from a file, parsing it into an object/array/string etc
		*
		* @return mixed
		* @sync
		*/
		this.read=()=>{
			var str=readFileSync(this.filepath); //logs if not exists

			//If we didn't get anything, return an empty item of the $restrictType or undefined
			if(cX.isEmpty(cX.stringToPrimitive(str))){
				this.log.trace("File was empty.",this.filepath);
				return getEmpty();
			}

			//Parse whatever format the data was stored in
			try{
				switch(format){
					case 'json': 
						var data=cX.tryJsonParse(str,restrictType); 
						break;
					case 'key=value':
						data=cX.linesToObj(str,'=');
						break;
					case 'lines':
						data=str.split('\n'); 
						break;
					case 'string':
						data=cX.stringToPrimitive(str);
				}
			}catch(err){
				this.log.throwCode('EFORMAT',`Data in ${this.filepath} could not be parsed as ${format}.`,str,err);
			}
			
			if(restrictType){
				try{
					return cX.forceType(restrictType,data);
				}catch(err){
					this.log.throwCode('EMISMATCH',`Expected ${this.filepath} to contain ${restrictType}, but found:`,data);
				}
			}else{
				return data;
			}

		}


		/*
		* Delete the underlying file
		* @return void
		* @sync
		*/
		this.unlink=()=>{
			if(existsSync(this.filepath))
				fs.unlinkSync(this.filepath);
			return;
		}
	}















	/*
	* Generate a random filename that doesn't exist in a given root folder
	* @param string root
	* @return string      The full path to the proposed file (ie. prepended by $root)
	*/
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


	return _exports;
}