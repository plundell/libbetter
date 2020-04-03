//simpleSourceMap=/my_modules/timer.class.js
//simpleSourceMap2=/lib/timer.class.js
/*
* This module exports a constructor. It can be required by nodeJS but is optimized to run 
* in browser by not using nodeJS native EventEmitter
*/

;'use strict';
module.exports=function exportTimer(dep={}){
    
    function missingDependency(which){throw new Error("Missing dependency for timer.class.js: "+which);}
    const BetterLog = dep.BetterLog                || missingDependency('BetterLog');
    const BetterEvents = dep.BetterEvents          || missingDependency('BetterEvents');

    /*
    * Object which keeps track of an interval and timeout timer, allowing for pause and
    * resume, emitting events as it goes
    *
    * @emit interval(number,number) Emits on every interval (arg #1) with elapsed and remaining time.
    * @emit timeout(number)         Emits once when timer ends with arg #2
    * @emit event(evt)              Emits along with both ^^, arg is event name
    *
    * @param number interval    Milliseconds between emiting interval events
    * @param number timeout     Milliseconds to wait before emiting 'timeout' event
    * @param number startFrom   Milliseconds that have already passed. Both _private.elapsed and _private.remaining
    *                             will be adjusted, but when resetting the timer it will start from 0 and last the
    *                             full value of timeout 
    */
    function Timer(interval=null,timeout=null, startFrom){
        

        var self=this;

        //Inheritence step 1
        BetterEvents.call(this);


        this.running=false;

        Object.defineProperty(this,'_log',{value:new BetterLog(this)});

        Object.defineProperty(this,'_private',{value:{
            timeoutIds:[]
        }});



        function getNow(){
            var last=self._private
            var now={
                now:(new Date()).getTime()
            }
            now.timeSinceLastStart=(last.start ? now.now - last.start : 0);
            now.elapsed=Math.max(last.elapsed+now.timeSinceLastStart,0);
            now.remaining=typeof last.remaining!='number' ? null : Math.max(last.remaining-now.timeSinceLastStart,0);
            now.nextInterval=typeof last.nextInterval!='number'? null : Math.max(last.lastInterval||now.now+last.interval-now.now,0); 
            return now;
        }

        /*
        * @return null|number>0
        */
        this.getRemaining=function(){
            if(this.running)
                return getNow().remaining;
            else
                return self._private.remaining;
        }

        /*
        * @return number
        */
        this.getElapsed=function(now){
            if(this.running){
                return getNow().elapsed;
            }else
                return self._private.elapsed;
        }

        


        /*
        * @return bool        True if was previously running, else false
        */
        this.pause = function() {

            if(this.running){

                //Save remaining and elapsed time, then change flag so all future checks (until we resume) returns
                //the values are setting here
                var now=getNow()
                Object.assign(this._private,now);
                // self._log.note('PAUSED and set values:',now);

                this.running=false;
                
                //You can clear timeouts and intervals with the same command
                //      https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/clearInterval)
                var id;
                while(id=this._private.timeoutIds.pop()){
                    // self._log.info("clearing timeout/interval",id);
                    clearTimeout(id)
                }
                
                return true;
            }else{
                // self._log.note("NOT RUNNING, not pausing...")
            }

            return false;
        };

        //Since the next interval may be less than 1 interval increment away (because we may have
        //paused in the middle of an interval), it needs to be fired in a seperate timeout, so we 
        //define the func seperately to use it twice
        function emitInterval(){
            var now=getNow();
            self._private.lastInterval=now.now; 
            self.emit('interval',now.elapsed,now.remaining);
        }


        /*
        * @return bool        True if was previously paused, else false
        */
        this.resume = function() {
            if(!this.running){
                // self._log.note('RESUMING...next interval',this._private.nextInterval,'  remaining',this._private.remaining);

                this._private.start=getNow().now;
                
                this.running=true;


                if(typeof this._private.nextInterval=='number')
                    //We're going to fire the first timeout manually, and then set an interval staring from
                    //that point. This is because we may have paused in between 2 intervals which implies that 
                    //the next interval is less than one interval away. NOTE: that nextInterval also get's adjusted  
                    //by adjustElapsed()
                    this._private.timeoutIds.push(
                        setTimeout(()=>{
                            // 1. Fire first manually, having waited... vv
                            emitInterval(); //Emit right away

                            //2. Start interval that will take over after first
                            this._private.timeoutIds.push(setInterval(emitInterval,self._private.interval));

                        },this._private.nextInterval)//                  ^^ ...this long
                    ); 
                //NOTE: if no timeout is set, interval can go on forever

                if(typeof this._private.remaining=='number') //so it fires right away if remaining is zero
                    this._private.timeoutIds.push(setTimeout(()=>{
                        self.pause();
                        self.emit('timeout',self._private.timeout);
                    }, this._private.remaining));

                return true;
            }else{
                // self._log.note("ALREADY RUNNING, not resuming...");
            }

            return false;

            
        };



        /*
        * Instead of creating a new Timer and having to listen for events again, this method allows resetting
        * the two main parameters (essentially creating a new Timer)
        *
        * NOTE: This pauses timer if running
        *
        * @param number|true|null i    Milliseconds between emiting 'interval' events. True=>use value from creation
        * @param number|true|null t    Milliseconds to wait before emiting 'timeout' event. True=>use value from creation
        *
        * @return boolean   True if reset succeeded, else false
        */
        this.reset=function(i=true,t=true, startFrom){
            this.pause();
            
            //The special-case value 'true' implies we use whatever value was used when the Timer was created
            i=(i===true ? self._private.interval : i);
            t=(t===true ? self._private.timeout : t);

            try{
                self._log.debug("Resetting timer with:",i,t,startFrom);
                resetVars(i,t, startFrom);
                return true;
            }catch(err){
                self._log.error('Failed to reset timer',err);
                return false;
            }
        }

        /*
        * Like .reset() but also starts timer after
        *
        * @return boolean 
        */
        this.restart=function(){
            if(this.reset.apply(this,Object.values(arguments))){
                this.resume();
                return true;
            }else{
                return false;
            }
        }

        /*
        * Adjust the elapsed and remaining time by specifying how much time has actually elapsed
        *
        * @param number actualElapsed
        * return void
        */
        this.adjustElapsed=function(actualElapsed){
            try{
                if(typeof actualElapsed!='number')
                    self._log.throwType("number",actualElapsed);
                if((self._private.timeout && actualElapsed>self._private.timeout) || actualElapsed<0)
                    throw new RangeError("Valid range 0-"+self._private.timeout+', got '+actualElapsed);
            }catch(err){
                self._log.error('Failed to adjust elapsed time',err);
                return;
            }
            
            //Pause it. 
            var resumeAfter=this.pause();
           
            //If we're not changing anything, skip ahead
            if(actualElapsed!=this._private.elapsed){

                //Always set elapsed
                this._private.elapsed=actualElapsed;
                
                //If there's an interval, adjust nextInterval. Here however we have to consider the change^ so
                //the intervals keep fireing at the right time. Eg. elapsed=16, actualElapsed=18, interval=5, meaning
                //nextInterval=4 but it should be 2. Or actualElapsed=14 meaning nextInterval should be 1
                let i=self._private.interval;
                if(i){
                    self._private.nextInterval=(Math.ceil(actualElapsed/i)*i)-actualElapsed
                }

                //Adjust remaining if there's a timeout
                if(self._private.timeout)
                    self._private.remaining=self._private.timeout-actualElapsed;

                self._log.info(`Elapsed time set to: ${this._private.elapsed} of ${self._private.timeout}`);
            }else{
                self._log.debug(`No change, timer is still set at: ${this._private.elapsed}`);
            }

            if(resumeAfter)
                this.resume();
        }


        /*
        * Add or delete timeout without affecting elapsed time.
        *
        * NOTE: If timeout < elapsed
        *
        * @param number|falsey timeout
        * return void
        */
        this.setTimeout=function(timeout){
            if(timeout && typeof timeout!='number')
                self._log.throwType("number|falsey",timeout);


            var resumeAfter=this.pause();

            self._private.timeout=timeout || null;
            self._private.remaining=timeout ? timeout-this._private.elapsed : null;

            if(resumeAfter)
                this.resume();
        }


        /*
        * Type-checks and sets the two main parameters
        *
        * @return void
        */
        function resetVars(i,t,startFrom){
            if(i && typeof i!='number')
                self._log.throwType("arg #1 to be falsey or a number",i);
            if(t && typeof t!='number')
                self._log.throwType("arg #2 to be falsey or a number",t);
            self._private.nextInterval=self._private.interval=i || null;
            self._private.timeout=self._private.remaining=t || null;
            self._private.elapsed=0;
            self._private.lastInterval=0;

            if(startFrom)
                self.adjustElapsed(startFrom);

            return;
        }


        resetVars(interval,timeout,startFrom);
    }
    Timer.prototype=Object.create(BetterEvents.prototype); 
    Object.defineProperty(Timer.prototype, 'constructor', {value: Timer});


    return Timer;
}
//simpleSourceMap=
//simpleSourceMap2=