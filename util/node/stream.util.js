#!/usr/local/bin/node
'use strict'; 
/*
	Extended Stream class

	Author: palun
	Date: Oct 2018

	This module builds upon the built-in "stream" class to create some convenient functions
	and a new CacheReadable stream 

*/

module.exports=function export_sX({cX,stream}){



	/*
	* @prop object s		Native 'stream' module
	* @access public/exported
	*/
	const s = stream || require('stream');



	//Returned at bottom
	const _exports={
		'native':s
		,isReadable
		,addFlowingEvent
		,makeLineEmitter
	}




	/*
	* @method isReadable 	Check if something is a readable stream (or rather, since a readable stream can take many forms, 
	*						we go 'duck typing' to make sure it's at least got an object that can pipe...)
	*
	* @param mixed unknown 	Any variable we want to check
	*
	* @return bool 			
	* @access public/exported
	*/
	function isReadable(unknown, throwOnFalse=false){
		if(unknown instanceof s.Readable )
			return true;
		
		var r= ((typeof unknown!='object' || typeof unknown.on != 'function' || typeof unknown.pipe !='function')?false:true)

		if(r==false && throwOnFalse==true)
			throw new TypeError('Expected readable stream, got: '+cX.logVar(unknown));
		else
			return r;
	}




	/*
	* Adds the event 'flowing' to a stream which fires once together with the first 'data' event
	*
	* @param <Readable> steram
	*
	* @throws TypeError 	If not a readable stream
	*
	* @return @stream 		Passed in object returned for chaining...
	*/
	function addFlowingEvent(stream){
		isReadable(stream,true); //true==throw

		function emitFlowing(){
			//Wait 1 ms so anything potential errors have time to propogate
			setTimeout(()=>{stream.emit('flowing')},1);
		}

	//TODO: don't know if this works since emitFlowing is redefined each time this is called
		var logWho='sX.addFlowingEvent():'
		if(stream.listeners('data').some(func=>func==emitFlowing)){
			console.log(logWho,"Already added 'flowing' event");
			return;
		}
		
		stream.pause(); //so vv doesn't start stream
		stream.once('data',emitFlowing); //emitted on first chunk of data

		return stream
	}


	/**
	 * Turn a readable stream into a "line emiter" which buffers 'data' events and emits a 'line' event when a \n is received
	 * 
	 * @param <EventEmitter> readable   An event emitter which emits 'data' events 
	 * @param boolean        force      Add listener even if _buffer property has already been defined. Default false 
	 * 
	 * @return void
	 */
	function makeLineEmitter(readable,force=false){
		// console.log("LINE EMITTER:",readable);
		if(!readable.hasOwnProperty('_buffer') || force){
			Object.defineProperty(readable,'_buffer',{writable:true,value:''});
		
			readable.on('data',function bufferDataEmitLines(data){
				//Combine buffer with new data and split into lines
				let lines=(readable._buffer+data.toString()).split('\n'); 
				
				//The last item of the array will either be a half-finished line (ie. no trailing \n) or it'll be an empty string
				//because the last character was in fact \n. Either way we remove it from the array and store it back as the buffer
				readable._buffer=lines.pop()||"" 

				//Now loop through the lines, emitting one by one
				for(let line of lines){
					if(line){
						readable.emit('line',line);
					}
				}
			})
		}
	}


	return _exports;

}