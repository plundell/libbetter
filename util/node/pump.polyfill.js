#!/usr/local/bin/node
'use strict'; 
/*
* Pump (Polyfill)
*
* Date: Feb 2020
*
* This module contains the npm module 'pump' and it's dependencies so we don't need to 
* depend on an external package.
*
* https://www.npmjs.com/package/pump
* https://www.npmjs.com/package/once
* https://www.npmjs.com/package/wrappy
* https://www.npmjs.com/package/end-of-stream
*/
module.exports=(function exportPumpPolyfill(){


	/* https://github.com/npm/wrappy/blob/master/wrappy.js */
		function wrappy (fn, cb) {
			if (fn && cb) return wrappy(fn)(cb)

			if (typeof fn !== 'function')
				throw new TypeError('need wrapper function')

			Object.keys(fn).forEach(function (k) {
				wrapper[k] = fn[k]
			})

			return wrapper

			function wrapper() {
				var ret = fn.apply(this, arguments)
				var cb = arguments[arguments.length - 1]
				if (typeof ret === 'function' && ret !== cb) {
					Object.keys(cb).forEach(function (k) {
						ret[k] = cb[k]
					})
				}
				return ret
			}
		}



	/* https://raw.githubusercontent.com/isaacs/once/master/once.js */
		const once=(function(){
			// var wrappy = require('wrappy') //defined above
			
			const _exports = wrappy(once)
			_exports.strict = wrappy(onceStrict)

			_exports.proto = once(function () {
			  Object.defineProperty(Function.prototype, 'once', {
			    value: function () {
			      return once(this)
			    },
			    configurable: true
			  })

			  Object.defineProperty(Function.prototype, 'onceStrict', {
			    value: function () {
			      return onceStrict(this)
			    },
			    configurable: true
			  })
			})

			function once (fn) {
			  var f = function () {
			    if (f.called) return f.value
			    f.called = true
			    return f.value = fn.apply(this, arguments)
			  }
			  f.called = false
			  return f
			}

			function onceStrict (fn) {
			  var f = function () {
			    if (f.called)
			      throw new Error(f.onceError)
			    f.called = true
			    return f.value = fn.apply(this, arguments)
			  }
			  var name = fn.name || 'Function wrapped with `once`'
			  f.onceError = name + " shouldn't be called more than once"
			  f.called = false
			  return f
			}

			return _export;
		})()




	/* https://github.com/mafintosh/end-of-stream/blob/master/index.js */ 
		// var once=dep.once;//defined above

		var noop = function() {};

		var isRequest = function(stream) {
			return stream.setHeader && typeof stream.abort === 'function';
		};

		var isChildProcess = function(stream) {
			return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
		};

		var eos = function(stream, opts, callback) {
			if (typeof opts === 'function') return eos(stream, null, opts);
			if (!opts) opts = {};

			callback = once(callback || noop);

			var ws = stream._writableState;
			var rs = stream._readableState;
			var readable = opts.readable || (opts.readable !== false && stream.readable);
			var writable = opts.writable || (opts.writable !== false && stream.writable);
			var cancelled = false;

			var onlegacyfinish = function() {
				if (!stream.writable) onfinish();
			};

			var onfinish = function() {
				writable = false;
				if (!readable) callback.call(stream);
			};

			var onend = function() {
				readable = false;
				if (!writable) callback.call(stream);
			};

			var onexit = function(exitCode) {
				callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
			};

			var onerror = function(err) {
				callback.call(stream, err);
			};

			var onclose = function() {
				process.nextTick(onclosenexttick);
			};

			var onclosenexttick = function() {
				if (cancelled) return;
				if (readable && !(rs && (rs.ended && !rs.destroyed))) return callback.call(stream, new Error('premature close'));
				if (writable && !(ws && (ws.ended && !ws.destroyed))) return callback.call(stream, new Error('premature close'));
			};

			var onrequest = function() {
				stream.req.on('finish', onfinish);
			};

			if (isRequest(stream)) {
				stream.on('complete', onfinish);
				stream.on('abort', onclose);
				if (stream.req) onrequest();
				else stream.on('request', onrequest);
			} else if (writable && !ws) { // legacy streams
				stream.on('end', onlegacyfinish);
				stream.on('close', onlegacyfinish);
			}

			if (isChildProcess(stream)) stream.on('exit', onexit);

			stream.on('end', onend);
			stream.on('finish', onfinish);
			if (opts.error !== false) stream.on('error', onerror);
			stream.on('close', onclose);

			return function() {
				cancelled = true;
				stream.removeListener('complete', onfinish);
				stream.removeListener('abort', onclose);
				stream.removeListener('request', onrequest);
				if (stream.req) stream.req.removeListener('finish', onfinish);
				stream.removeListener('end', onlegacyfinish);
				stream.removeListener('close', onlegacyfinish);
				stream.removeListener('finish', onfinish);
				stream.removeListener('exit', onexit);
				stream.removeListener('end', onend);
				stream.removeListener('error', onerror);
				stream.removeListener('close', onclose);
			};
		};




/* https://raw.githubusercontent.com/mafintosh/pump/master/index.js */

		// var once = require('once') //defined above
		// var eos = require('end-of-stream') //defined above
		var fs = require('fs') // we only need fs to get the ReadStream and WriteStream prototypes

		var noop = function () {}
		var ancient = /^v?\.0/.test(process.version)

		var isFn = function (fn) {
		  return typeof fn === 'function'
		}

		var isFS = function (stream) {
		  if (!ancient) return false // newer node version do not need to care about fs is a special way
		  if (!fs) return false // browser
		  return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isFn(stream.close)
		}

		var isRequest = function (stream) {
		  return stream.setHeader && isFn(stream.abort)
		}

		var destroyer = function (stream, reading, writing, callback) {
		  callback = once(callback)

		  var closed = false
		  stream.on('close', function () {
		    closed = true
		  })

		  eos(stream, {readable: reading, writable: writing}, function (err) {
		    if (err) return callback(err)
		    closed = true
		    callback()
		  })

		  var destroyed = false
		  return function (err) {
		    if (closed) return
		    if (destroyed) return
		    destroyed = true

		    if (isFS(stream)) return stream.close(noop) // use close for fs streams to avoid fd leaks
		    if (isRequest(stream)) return stream.abort() // request.destroy just do .end - .abort is what we want

		    if (isFn(stream.destroy)) return stream.destroy()

		    callback(err || new Error('stream was destroyed'))
		  }
		}

		var call = function (fn) {
		  fn()
		}

		var pipe = function (from, to) {
		  return from.pipe(to)
		}

		var pump = function () {
		  var streams = Array.prototype.slice.call(arguments)
		  var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop

		  if (Array.isArray(streams[0])) streams = streams[0]
		  if (streams.length < 2) throw new Error('pump requires two streams per minimum')

		  var error
		  var destroys = streams.map(function (stream, i) {
		    var reading = i < streams.length - 1
		    var writing = i > 0
		    return destroyer(stream, reading, writing, function (err) {
		      if (!error) error = err
		      if (err) destroys.forEach(call)
		      if (reading) return
		      destroys.forEach(call)
		      callback(error)
		    })
		  })

		  return streams.reduce(pipe)
		}


	return pump;
})()