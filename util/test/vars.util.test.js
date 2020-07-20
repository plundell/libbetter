const betterlog_path='../../log/better_log.js';
const module_path='../common/vars.util.js';

if(require.main === module){
    testVars();
}else{
	module.exports=testVars;
}


async function testVars(dep){
	try{

		//First thing we do is load the module under test, this will show any syntax errors right away
		console.log('----------- TESTING: BetterUtil > common > vars.util.js (vX) ----------');
		const loader=require('../common/vars.util.js');
		if(typeof loader!='function'){
			console.error(loader);
			throw new TypeError("network.util.js should return a loader function, got ^^")
		}

		dep=Object.assign({},dep);

		//First we need a log
		if(!dep._log){
			//No instance exists, we must create one... 

			//Make sure we have a constructor...
			if(!dep.BetterLog){
				console.log("++ Requiring BetterLog and setting syslog to print all...");
				dep.BetterLog=require(betterlog_path);
			}else{
				console.warn("++ NOTE: Using passed-in BetterLog:",dep.BetterLog);
			}

			//...then create instance
			dep._log=new dep.BetterLog('vX_TEST',{
				autoPrintLvl:1
				,lowestLvl:1
				,fileOnly:true
				,printId:true
			});
			delete dep.BetterLog;
		}

		const log=dep._log;
		console.log("++ Making sure we have a working log...");
		log.info("This log will be used to while testing vars.util.js");
		
		
		//In case the two functions expected aren't set...
		if(!dep.varType)dep.varType=log.constructor.varType;
		if(!dep.logVar)dep.logVar=log.constructor.logVar;


		//Instantiate
		var vX=loader(dep);
		if(typeof vX!='object'){
			log.throwType("vars.util.js's loader function to return an object of functions, got:",vX);
		}
		log.info('vX was initiated and contains these methods:\n'+Object.keys(vX).join('\n'));


		//deepCopy
		var Foo=function(x){this.x=x}
		Foo.prototype.onFoo=function(){log.trace(this);}

		var Bar=function(){Foo.apply(this,arguments);/*this.double();*/}
		Bar.prototype=Object.create(Foo.prototype)
		Object.defineProperty(Bar.prototype,'constructor',{value:Bar,configurable:true});
		Bar.prototype.double=function(){this.xx=(this.xx||this.x)+this.x;}

		var Cafe=vX.deepCopy(Bar);
		Cafe.name='Cafe';
		Cafe.prototype.onCafe=function(){log.trace(this);}

		var bar=new Bar(5); bar.who='bar'; log.trace(vX.getPrototypeChain(bar));bar.onFoo(); 
		var cafe=new Cafe(3); cafe.who='cafe'; log.trace(vX.getPrototypeChain(cafe));//cafe.onFoo(); 
		console.log('self:',cafe)
		console.log('own prototype:',Object.getPrototypeOf(cafe))
		console.log('parent prototype:',Object.getPrototypeOf(Object.getPrototypeOf(cafe)))
		console.log('---')
		var bar2=vX.deepCopy(bar); bar2.who='bar2'; log.trace(vX.getPrototypeChain(bar2));bar2.onFoo(); 

		if(bar==bar2)
			log.makeError("deepCopy of an instance does not decouple it from the original.",bar).throw();
		else
			log.info("success - deepCopy of an instance decouples the original from the copy")
		if(bar.constructor==bar2.constructor)
			log.makeError("deepCopy of an instance does not decouple the constructors.",bar).throw();
		else
			log.info("success - deepCopy of an instance decouples constructors as well")

		cafe.onCafe();
		try{
			bar.onCafe();
			throw 'fail'
		}catch(err){
			if(err=='fail')
				throw new Error("Adding a method to a deepCopy's prototype before initiation changed the original's as well!")
			else
				log.info("success - Changing the prototype of a deepCopy before initiation did not affect the original");
		}

		Bar.prototype.onBar=function(){log.trace(this)};
		bar.onBar();
		try{
			bar2.onBar();
			throw 'fail'
		}catch(err){
			if(err=='fail')
				throw new Error("Adding a method to the originals prototype after initiation changed the deepCopy as well!")
			else
				log.info("success -","Changing the prototype of the original after initiation did not affect the deepCopy");
		}


		console.log('----------- TEST COMPLETE ----------')
	}catch(err){
		console.error('------------ TEST FAILED ----------')
		if(dep && dep._log){
			dep._log.makeError(err).prepend('fail - ').exec();
		}else{
			console.error('fail -',err);
		}
		debugger;
	}
}