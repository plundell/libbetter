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
	var _exports={
		BetterDate
		,makeDate
		,formatDate
		,formatDatetime
		,today
		,tomorrow
		,todayMs
		,tomorrowMs
		,age
		
		,timerStart
		,timerStop

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





	function makeDate(x){
		if(typeof x=='undefined')
			return Date.now();
		else{
			var d=new Date(x);
			if(d=='Invalid Date'){
				_log.makeError("Invalid Date:",_log.constructor.logVar(x)).setCode('EINVAL').throw();
			}
			return d;
		}
	}

	/*
	* @return string 	YYYY-MM-DD
	*/
	function formatDate(x){
		x=makeDate(x);
		var y = x.getFullYear(),
			m = String(x.getMonth() + 1).padStart(2, '0'), //+1 => january is month 0
			d = String(x.getDate()).padStart(2, '0')
		;

		return `${y}-${m}-${d}`;
	}

	/*
	* @return string 
	*/
	function formatDatetime(x){
		var str=makeDate(x).toString();
		return str.split('(')[0];
	}

	function today(){
		return formatDate();
	}

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


	function timerStart(){
		if(process)
			return process.hrtime();
		else
			return window.performance.now()
	}

	function timerStop(start,format){
		var nano;
		if(process){
			let durr = process.hrtime(start);
			nano=(durr[0]*1000000000)+durr[1];
		}else{
			nano=(window.performance.now()-start)*1000000;
		}
		switch(format){
			case 's':
			case 'sec':
			case 'seconds':
				return round(nano/1000000000);
			case 'ms':
			case 'milli':
			case 'milliseconds':
				return round(nano/1000000);
			case 'us':
			case 'micro':
			case 'microseconds':
				return round(nano/1000); 
			case 'ns':
			case 'nano':
			case 'nanoseconds':
				return nano;
			default:
				throw new Error("Please specify format (arg #2)");
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