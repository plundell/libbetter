//simpleSourceMap=/my_modules/util/common/netmask.polyfil.js
//simpleSourceMap2=/lib/util/common/netmask.polyfil.js
/*
* netmask (Polyfill)
*
* Date: Feb 2020
*
* This module contains the npm module 'netmask' so we don't need to depend on an external package.
* 	https://www.npmjs.com/package/netmask
* 
* The module is origninally written in CoffeScript but has been transpiled using
* 	https://awsm-tools.com/code/coffee2js
*
*/
;'use strict';
module.exports=(function() {
	var Netmask, ip2long, long2ip;

	long2ip = function(long) {
		var a, b, c, d;
		a = (long & (0xff << 24)) >>> 24;
		b = (long & (0xff << 16)) >>> 16;
		c = (long & (0xff << 8)) >>> 8;
		d = long & 0xff;
		return [a, b, c, d].join('.');
	};

	ip2long = function(ip) {
		var b, byte, i, _i, _len;
		b = (ip + '').split('.');
		if (b.length === 0 || b.length > 4) {
			throw new Error('Invalid IP');
		}
		for (i = _i = 0, _len = b.length; _i < _len; i = ++_i) {
			byte = b[i];
			if (isNaN(parseInt(byte, 10))) {
				throw new Error("Invalid byte: " + byte);
			}
			if (byte < 0 || byte > 255) {
				throw new Error("Invalid byte: " + byte);
			}
		}
		return ((b[0] || 0) << 24 | (b[1] || 0) << 16 | (b[2] || 0) << 8 | (b[3] || 0)) >>> 0;
	};

	Netmask = (function() {
		function Netmask(net, mask) {
			var error, i, _i, _ref;
			if (typeof net !== 'string') {
				throw new Error("Missing `net' parameter");
			}
			if (!mask) {
				_ref = net.split('/', 2), net = _ref[0], mask = _ref[1];
			}
			if (!mask) {
				switch (net.split('.').length) {
					case 1:
						mask = 8;
						break;
					case 2:
						mask = 16;
						break;
					case 3:
						mask = 24;
						break;
					case 4:
						mask = 32;
						break;
					default:
						throw new Error("Invalid net address: " + net);
				}
			}
			if (typeof mask === 'string' && mask.indexOf('.') > -1) {
				try {
					this.maskLong = ip2long(mask);
				} catch (_error) {
					error = _error;
					throw new Error("Invalid mask: " + mask);
				}
				for (i = _i = 32; _i >= 0; i = --_i) {
					if (this.maskLong === (0xffffffff << (32 - i)) >>> 0) {
						this.bitmask = i;
						break;
					}
				}
			} else if (mask) {
				this.bitmask = parseInt(mask, 10);
				this.maskLong = 0;
				if (this.bitmask > 0) {
					this.maskLong = (0xffffffff << (32 - this.bitmask)) >>> 0;
				}
			} else {
				throw new Error("Invalid mask: empty");
			}
			try {
				this.netLong = (ip2long(net) & this.maskLong) >>> 0;
			} catch (_error) {
				error = _error;
				throw new Error("Invalid net address: " + net);
			}
			if (!(this.bitmask <= 32)) {
				throw new Error("Invalid mask for ip4: " + mask);
			}
			this.size = Math.pow(2, 32 - this.bitmask);
			this.base = long2ip(this.netLong);
			this.mask = long2ip(this.maskLong);
			this.hostmask = long2ip(~this.maskLong);
			this.first = this.bitmask <= 30 ? long2ip(this.netLong + 1) : this.base;
			this.last = this.bitmask <= 30 ? long2ip(this.netLong + this.size - 2) : long2ip(this.netLong + this.size - 1);
			this.broadcast = this.bitmask <= 30 ? long2ip(this.netLong + this.size - 1) : void 0;
		}

		Netmask.prototype.contains = function(ip) {
			if (typeof ip === 'string' && (ip.indexOf('/') > 0 || ip.split('.').length !== 4)) {
				ip = new Netmask(ip);
			}
			if (ip instanceof Netmask) {
				return this.contains(ip.base) && this.contains(ip.broadcast || ip.last);
			} else {
				return (ip2long(ip) & this.maskLong) >>> 0 === (this.netLong & this.maskLong) >>> 0;
			}
		};

		Netmask.prototype.next = function(count) {
			if (count == null) {
				count = 1;
			}
			return new Netmask(long2ip(this.netLong + (this.size * count)), this.mask);
		};

		Netmask.prototype.forEach = function(fn) {
			var index, lastLong, long;
			long = ip2long(this.first);
			lastLong = ip2long(this.last);
			index = 0;
			while (long <= lastLong) {
				fn(long2ip(long), long, index);
				index++;
				long++;
			}
		};

		Netmask.prototype.toString = function() {
			return this.base + "/" + this.bitmask;
		};

		return Netmask;

	})();

	return {ip2long,long2ip,Netmask};

})()