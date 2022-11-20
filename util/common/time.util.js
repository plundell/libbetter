//simpleSourceMap=/my_modules/util/common/time.util.js
//simpleSourceMap2=/lib/util/common/time.util.js
/*
* This module should only be required by util.common.js in NodeJS. If using in browser, please bundle
* util.browser.js with eg. Browserify
*
* This module exports an object with functions on it. 
*
* This is a helper module for time and date related functions
*/
'use strict';
module.exports=function export_tX({vX,_log}){

	//Methods to export
	const _exports={
		BetterDate
		,makeDate

		,formatDate
		,formatDatetime

		,'now':formatDatetime //string, YYYY-MM-DDTHH:MM[:SS.XXX]
		,nowMs:()=>Date.now()//number, ms since epoch


		,today
		,tomorrow
		,todayMs
		,tomorrowMs
		,age
		
		,nanotime
		,'timerStart':nanotime
		,timerStop 
		,bigintToInt

		,timeToDate
		,compareTimes
	};



	var dow_arr=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

	function BetterDate(x){
		//So we don't have to use new...
		if(this.constructor!=BetterDate){
			return new BetterDate(x);
		}

		this.date=makeDate((x && x.date && x.date instanceof Date) ? x.date : x)

		Object.defineProperties(this,{
			format:{enumerable:true,get:()=>formatDate(this.date)}
			,dom:{enumerable:true, get:()=>this.date.getDate()}
			,dow:{enumerable:true, get:()=>this.date.getWeek()}
			,month:{enumerable:true, get:()=>this.date.getMonth()}
			,year:{enumerable:true, get:()=>this.date.getYear()}
			,hour:{enumerable:true, get:()=>this.date.getHours()}
			,minute:{enumerable:true, get:()=>this.date.getMinutes()}
			,time:{enumerable:true, get:()=>this.date.toTimeString().split(' ').unshift()}
			,unix:{enumerable:true, get:()=>this.date.valueOf()}

		})

		this.first={dom:{this:{},last:{},next:{}}};
		Object.defineProperties(this.first.dom.this,'week',{enumerable:true, get:()=>this.date.getDate()-this.date.getDay()});
		Object.defineProperties(this.first.dom.next,'week',{enumerable:true, get:()=>(new Date(this.first.dom.this.week+7)).getDate()});
		Object.defineProperties(this.first.dom.last,'week',{enumerable:true, get:()=>(new Date(this.first.dom.this.week-7)).getDate()});

		this.last={dom:{this:{},last:{},next:{}}};
		Object.defineProperties(this.last.dom.this,'week',{enumerable:true, get:()=>this.first.dom.this.week+6});
		Object.defineProperties(this.last.dom.next,'week',{enumerable:true, get:()=>this.first.dom.next.week+6});
		Object.defineProperties(this.last.dom.last,'week',{enumerable:true, get:()=>this.first.dom.last.week+6});

		this.copy=()=>new BetterDate(this.date);


		this.compare={
			time:(str)=>compareTimes(str,this.time)
			,date:(str)=>{var d=makeDate(str);return d>this.date?1:d<this.date?-1:0;}
		}


		function checkWhat(what){
			//Start by making sure we have a string with first letter capitalized
			vX.checkType('string',what);
			what=what.substr(0,1).toUpperCase()+what.substr(1);

			//Now check if this specific guy wants an 's'
			if(typeof this.date['get'+what]=='function')
				return what
			else if(what.substr(-1)=='s'){
				//We don't know that there is a func when removing the s, but we return anyway
				//for consistency. ie. If we got 'Weeks' we want to return 'Week', that way we
				//don't have to check for both when converting to days (see this.add())
				return what.slice(0,-1);
			}else if(typeof this.date['get'+what+'s']=='function'){
				return what+'s';
			}
		}

		this.set=(what,to)=>{
			what='set'+checkWhat(what);
			this.date=new Date(this.date[what](to));
			return this;
		}
		this.set.dom=this.set.dayofmonth=this.set.bind(this,'date');
		this.set.dow=this.set.dayofweek=(dow)=>this.set('date',this.first.dow.this.week+dow);
		this.set.months=this.set.month=this.set.bind(this,'month');
		this.set.years=this.set.year=this.set.bind(this,'year');
		this.set.hours=this.set.hour=this.set.bind(this,'hours');
		this.set.minutes=this.set.minute=this.set.bind(this,'minutes');
		this.set.time=(str)=>{
			if(typeof str!='string')
				_log.makeTypeError('string time HH:MM',str).throw();

			var m=str.match(/^(\d{2}):(\d{2}):?(\d{2})?$/);
			if(m){
				this.set.hour(m[1]);
				this.set.minute(m[2]);
				this.set.second(m[3]||0);
			}else{
				_log.makeError('Bad time format. Expected HH:MM, got: '+str).setCode('EINVAL').throw();
			}
		}

		this.goto={};
		this.goto.upcoming=(what)=>{
			var dow=what;
			if(vX.checkType(['string','number'],dow)=='string'){
				dow=dow_arr.indexOf(dow.toLowerCase());
			}
			if(dow<0 || dow>6)
				_log.makeError('Expected a string weekday or number between 0-6, got:',what).setCode('EINVAL').throw();
				
			//If the day has passed or is today, to do next week
			if(this.dow>=dow){
				this.add.week(1);
			}
			return this.set.dow(dow);
		}
		

		this.add=(what,much)=>{
			vX.checkType('number',much);
			what=checkWhat(what);
			if(what=='Week'){
				much=much*7
				what='Date'
			}else if(what=='Day'){
				what='Date';
			}
			this.date=new Date(this.date['set'+what](this.date['get'+what]()+much));
			return this;
		}
		this.add.days=this.add.day=this.add.bind(this,'date');
		this.add.weeks=this.add.week=this.add.bind(this,'week');
		this.add.months=this.add.month=this.add.bind(this,'month');
		this.add.years=this.add.year=this.add.bind(this,'year');
		this.add.hours=this.add.hour=this.add.bind(this,'hours');
		this.add.minutes=this.add.minute=this.add.bind(this,'minutes');

		this.sub=(what,much)=>this.add(what,-1*much)
		this.sub.days=this.sub.day=this.sub.bind(this,'date');
		this.sub.weeks=this.sub.week=this.sub.bind(this,'week');
		this.sub.months=this.sub.month=this.sub.bind(this,'month');
		this.sub.years=this.sub.year=this.sub.bind(this,'year');
		this.sub.hours=this.sub.hour=this.sub.bind(this,'hours');
		this.sub.minutes=this.sub.minute=this.sub.bind(this,'minutes');

	}




	/*
	* @opt mixed dateOrDatetime  	Defaults to 'now'. Can contain the time.
	* @opt string time              Used to specify time seperately, overrides time component of $dateOrDatetime
	*
	* @return <Date>
	*/
	function makeDate(dateOrDatetime='now',time=undefined){
		if(typeof dateOrDatetime=='undefined'||dateOrDatetime=='now')
			return new Date();
		else{
			if(time){
				var d=new Date(formatDate(dateOrDatetime)+'T'+formatTime(time))
			}else{
				d=new Date(dateOrDatetime);
			}
			if(d=='Invalid Date'){
				_log.throwCode('EINVAL',"Could not create date from:",dateOrDatetime,time);
			}
			return d;
		}
	}

	/*
	* @opt mixed x  	The date to use. Defaults to 'now'. @see makeDate()
	*
	* @return string 	YYYY-MM-DD
	*/
	function formatDate(x='now'){
		x=makeDate(x);
		var YYYY = x.getFullYear(),
			MM = String(x.getMonth() + 1).padStart(2, '0'), //+1 => january is month 0
			DD = String(x.getDate()).padStart(2, '0')
		;

		return `${YYYY}-${MM}-${DD}`;
	}


	/*
	* @param <Date>|string|number x
	* @opt string precision           Defaults to minutes. Accepted values are 's' or 'ms'
	*
	* @return string 	HH:MM
	*/
	function formatTime(x,precision=undefined){
		switch(vX.checkType(['<Date>','string','number'],x)){
			case 'string':
				//There are a number of options here, we could have eg:
				//    1970-01-01T12:13
				//    12:30
				//    Wed May 06 2020 02:00:00 GMT+0200 (Central European Summer Time)
				//so the easiest thing is to try if Date can recognize it...
				if(new Date(x)=='Invalid Date'){
					//...and otherwise assume it's '17:30' to which we just add a date and vv will do the rest
					x='1970-01-01T'+x;
				}
			case 'number':
				//This will be a timestamp, which can be handled like a Date
				x=new Date(x);
			default:
				var HH=String(x.getHours()).padStart(2, '0')
					,MM=String(x.getMinutes()).padStart(2, '0')
				;
				var time=`${HH}:${MM}`;
				if(typeof precision=='string'){
					if(precision=='ms'||precision=='s')
						time+':'+String(x.getSeconds()).padStart(2, '0')
					if(precision=='ms')
						time+'.'+String(x.getMilliseconds()).padStart(2, '0')

				}
				return time;
		}
	}


	/*
	* @params dateOrDatetime @see makeDate
	* @opt time @see makeDate
	*
	* @opt @last string precision  
	* 
	* @return string YYYY-MM-DDTHH:MM:SS.XXX
	*/
	function formatDatetime(...args){
		//Check if precision is the last arg...
		if(['s','ms'].includes(args[args.length-1])){
			var precision=args.pop();
		}
		
		var dt=makeDate.apply(this,args);
		return formatDate(dt)+'T'+formatTime(dt,precision);
	}








	

	/*
	* @return string 	YYYY-MM-DD today
	*/
	function today(){
		return formatDate();
	}

	/*
	* @return string 	YYYY-MM-DD tomorrow
	*/
	function tomorrow(){
		return formatDate(new Date(Date.now() + (24 * 60 * 60 * 1000)));
	}


	/*
	* @return number 	Milliseconds from epoch to midnight this morning (past)
	*/
	function todayMs(){
		return Date.parse(today()).getTime();
	}

	/*
	* @return number 	Milliseconds from epoch to midnight tonight (future)
	*/
	function tomorrowMs(){
		return Date.parse(tomorrow()).getTime();
	}



	function age(ts, unit='best',short=false){
		var ms=Date.now()-ts;

		switch(unit){
			case 'best':
				if(ms<1000)
					return 'now';
				else if(ms<(1000*60))
					return String(age(ts,'sec'))+(short ? ' sec':' seconds');
				else if(ms<(1000*60*60))
					return String(age(ts,'m'))+(short ? ' min':' minutes');
				else if(ms<(1000*60*60*24))
					return String(age(ts,'h'))+(short ? ' hrs':' hours');
				else
					return String(age(ts,'days'))+(short ? ' days':' days');

			case 'ms':
			case 'millisec':
			case 'millisecond':
			case 'milliseconds':
				return ms;
			case 's':
			case 'sec':
			case 'second':
			case 'seconds':
				return Math.round(ms/1000,1);
			case 'm':
			case 'min':
			case 'minute':
			case 'minutes':
				return Math.round(ms/1000/60,1);
			case 'h':
			case 'hours':
			case 'hour':
				return Math.round(ms/1000/60/60,1);
			case 'd':
			case 'days':
			case 'day':
				return Math.round(ms/1000/60/60/24,1);
		}
	}

	/*
	* Get a "discrete point in time", usually indexed to the start of the process. Ie. this CANNOT be translated into
	* a calendar based point in time
	*
	* @retun BigInt
	*/
	function nanotime(){
		try{
			if(typeof process=='object' && process.hrtime)
				return process.hrtime.bigint();
			else
				return BigInt(Math.round(window.performance.now()*1000000));
	        	//Browsers usually only offer precision down to  5 µs or less to prevent various attacks...
				//	https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
		}catch(err){
			console.error(err);
			return BigInt(Date.now()*1000000)
		}
	}
	//timerStart is alias for nanotime ^

	/*
	* @param <BigInt> nano
	* @param string format   Defaults to milliseconds
	*
	* @return integer        Rounded down     
	*/
	function timerStop(start,format='ms'){
		return bigintToInt(nanotime()-start,format);
	}

	/*
	* @param <BigInt> nano
	* @param string format   No default
	*
	* @throws Error          If @format isn't given
	*
	* @return integer        Rounded down     
	*/
	function bigintToInt(bigint,format){
		var div=1n;
		switch(format){
			case 's':
			case 'sec':
			case 'seconds':
				div=1000000000n; break;
			case 'ms':
			case 'milli':
			case 'milliseconds':
				div=1000000n; break;
			case 'us':
			case 'micro':
			case 'microseconds':
				div=1000n; break;
			case 'ns':
			case 'nano':
			case 'nanoseconds':
				break;
			default:
				throw new Error("Please specify format (arg #2)");
		}
		bigint=bigint/div;
		let max=BigInt(Number.MAX_SAFE_INTEGER)
		if(bigint>max){
			_log.error("Exceeded Number.MAX_SAFE_INTEGER. Returning the max value, but the real value is "+String(max));
			return Number(max);
		}else{
			return Number(bigint);
		}
	}


	function timeToDate(str){
		return new Date('1970-01-01 '+str);
	}


	/*
	* Compare 2 string times
	*
	* @param string a
	* @param string b
	*
	* @return number 	1 if $a is later, 0 if same time, -1 if $a is earlier
	*/
	function compareTimes(a,b){
		if(a==b)
			return 0;

		a=timeToDate(a);
		b=timeToDate(b);

		return a>b?1:a<b?-1:0
	}


	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=