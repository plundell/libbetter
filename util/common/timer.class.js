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
    *
    * @method getRemaining
    * @method getElapsed
    * @method pause
    * @method resume
    * @method reset
    * @method restart
    * @method adjustElapsed
    * @method setTimeout
    */
    function Timer(interval,timeout, startFrom){
        

        var self=this;

        //Inheritence step 1
        BetterEvents.call(this);

        this.running=false;

        Object.defineProperty(this,'_log',{value:new BetterLog(this)});

        Object.defineProperty(this,'_private',{value:{
            timeoutIds:[]
            ,reminders:{}
        }});

        this.reset(startFrom);
        this.setInterval(interval);
        this.setTimeout(timeout);
    }
    Timer.prototype=Object.create(BetterEvents.prototype); 
    Object.defineProperty(Timer.prototype, 'constructor', {value: Timer});




    /*
    * @call(<Timer>)
    */
    function getNow(){
        var last=this._private
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
    Timer.prototype.getRemaining=function(){
        if(this.running)
            return getNow.call(this).remaining;
        else
            return this._private.remaining;
    }

    /*
    * @return number
    */
    Timer.prototype.getElapsed=function(){
        if(this.running){
            return getNow.call(this).elapsed;
        }else
            return this._private.elapsed;
    }



    /*
    * Set a single timeout. This determines what .getRemaining() returns. .pause() will be called when
    * the timeout fires.
    *
    * @opt number interval    Default null => remove interval. Otherwise emit 'interval' event every <-- ms
    *
    * @return this
    */
    Timer.prototype.setInterval=function(interval=null){
        if(this.running)
            this._log.throwCode("ESEQ","Cannot set interval while running");

        if(interval>0||interval==null)
            this._private.interval=interval;
        else 
            this._log.throwType("'interval' to be null or number",interval);

        return this;
    }


    /*
    * Set a single timeout. This determines what .getRemaining() returns. .pause() will be called when
    * the timeout fires.
    *
    * @opt number timeout    Default null => remove timeout. Otherwise emit 'timeout' event after this many ms
    *
    * @return this
    */
    Timer.prototype.setTimeout=function(timeout=null){
        if(this.running)
            this._log.throwCode("ESEQ","Cannot add timeout while running");
        
        if(timeout>0||timeout==null){
            this._private.timeout=timeout;
            this._private.remaining=timeout ? timeout-this._private.elapsed : null;
        }else 
            this._log.throwType("'timeout' to be null or number",timeout);

        this._private.timeout=timeout;
        return this;
    }








    /*
    * Actually create a timeout for a specific reminder, adding it to this._private.timeoutIds
    *
    * NOTE: Call .addReminder() from outside this class
    * 
    * @param number when   This number should exist on this._private.reminders
    * @param object now    The object returned by getNow()
    *
    * @call(<Timer>)
    * @private
    */
    function setReminder(when,now){
        if(when>=now.elapsed){
            this._private.timeoutIds.push(setTimeout(()=>{
                this.emit('reminder',when,this._private.reminders[when]);
            }, when-now.elapsed));
        }
    }

    /*
    * Add a reminder that will emit at a certain elapsed time with some args
    *
    * @param number when
    * @opt any args         Will get passed to emit
    */
    Timer.prototype.addReminder=function(when,args){
        if(!when || typeof when!='number')
            this._log.throwType("a positive number",when);
        
        this._private.reminders[when]=args;

        //If we're already running we may need to add this timeout on the flyyyy
        if(this.running){
            setReminder(when,getNow.call(this));
        }
        
        return this;
    }


    /*
    * Remove a single reminder (this also prevents it from running if it's coming up)
    * @param number when
    * @return this
    */
    Timer.prototype.removeReminder=function(when){
        if(typeof when=='number' && this._private.reminders.hasOwnProperty(when)){
            delete this._private.reminders[when];
            
            //If we're running and this guy is comming up, then just pause and resume and it won't be re-added
            if(this.running && this.getElapsed()<when){
                this.pause().resume();
            }
        }

        return this;
    }



    /*
    * Remove all reminder and prevent any more from running
    * @return this
    */
    Timer.prototype.flushReminders=function(){
        this._private.reminders={}

        //Easiest way to remove all of them
        if(this.running){
            this.pause().resume();
        }
        
        return this;
    }
























    /*
    * Reset everything to zero
    *
    * NOTE: If the timer is running when this is called it'll keep running after
    *
    * @return this
    */
    Timer.prototype.reset=function(){
        if(this.running){
            var startAfter=true;
            this.pause();
        }

        this._private.elapsed=0;
        this._private.lastInterval=0;
        this._private.remaining=this._private.timeout;
        this._private.nextInterval=this._private.interval;

        if(startAfter)
            this.resume();

        return this;

    }




    /*
    * Adjust the elapsed and remaining time by specifying how much time has actually elapsed
    *
    * @param number actualElapsed
    * return this
    */
    Timer.prototype.adjustElapsed=function(actualElapsed){
        if(typeof actualElapsed!='number')
            this._log.throwType("number",actualElapsed);
        if((this._private.timeout && actualElapsed>this._private.timeout) || actualElapsed<0)
            throw new RangeError("Valid range 0-"+this._private.timeout+', got '+actualElapsed);
        
        //Pause it. 
        var resumeAfter=this.running;
        this.pause();
       
        //If we're not changing anything, skip ahead
        if(actualElapsed!=this._private.elapsed){

            //Always set elapsed
            this._private.elapsed=actualElapsed;
            
            //If there's an interval, adjust nextInterval. Here however we have to consider the change^ so
            //the intervals keep fireing at the right time. Eg. elapsed=16, actualElapsed=18, interval=5, meaning
            //nextInterval=4 but it should be 2. Or actualElapsed=14 meaning nextInterval should be 1
            let i=this._private.interval;
            if(i){
                this._private.nextInterval=(Math.ceil(actualElapsed/i)*i)-actualElapsed
            }

            //Adjust remaining if there's a timeout
            if(this._private.timeout)
                this._private.remaining=this._private.timeout-actualElapsed; //can be negative

            this._log.info(`Elapsed time set to: ${this._private.elapsed} of ${this._private.timeout}`);
        }else{
            this._log.debug(`No change, timer is still set at: ${this._private.elapsed}`);
        }

        if(resumeAfter)
            this.resume();

        return this;
    }





















    


    /*
    * @return bool        True if was previously running, else false
    */
    Timer.prototype.pause = function() {

        if(this.running){

            //Save remaining and elapsed time, then change flag so all future checks (until we resume) returns
            //the values are setting here
            var now=getNow.call(this)
            Object.assign(this._private,now);
            // this._log.note('PAUSED and set values:',now);

            this.running=false;
            
            //You can clear timeouts and intervals with the same command
            //      https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/clearInterval)
            var id;
            while(id=this._private.timeoutIds.pop()){
                // this._log.info("clearing timeout/interval",id);
                clearTimeout(id)
            }
        }

        return this;
    };






    //Since the next interval may be less than 1 interval increment away (because we may have
    //paused in the middle of an interval), it needs to be fired in a seperate timeout, so we 
    //define the func seperately to use it twice
    function emitInterval(){
        var now=getNow.call(this);
        this._private.lastInterval=now.now; 
        this.emit('interval',now.elapsed,now.remaining);
    }

    /*
    * @return bool        True if was previously paused, else false
    */
    Timer.prototype.resume = function() {
        if(!this.running){
            // this._log.note('RESUMING...next interval',this._private.nextInterval,'  remaining',this._private.remaining);

            var now=getNow.call(this)
            this._private.start=now.now;
            
            this.running=true;

            //INTERVAL
            if(now.nextInterval=='number')
                //We're going to fire the first timeout manually, and then set an interval staring from
                //that point. This is because we may have paused in between 2 intervals which implies that 
                //the next interval is less than one interval away. NOTE: that nextInterval also get's adjusted  
                //by adjustElapsed()
                this._private.timeoutIds.push(
                    setTimeout(()=>{
                        // 1. Fire first manually, having waited... vv
                        emitInterval.call(this); //Emit right away

                        //2. Start interval that will take over after first
                        this._private.timeoutIds.push(setInterval(emitInterval.bind(this),this._private.interval));

                    },now.nextInterval)//                  ^^ ...this long
                ); 
            //NOTE: this interval goes on until .pause() is called, or 'timeout' fires (which calls pause)

            //TIMEOUT
            if(typeof this._private.remaining=='number' && this._private.remaining>=0){
                this._private.timeoutIds.push(setTimeout(()=>{
                    this.pause();
                    this.emit('timeout',this._private.timeout);
                }, this._private.remaining));
            }


            //REMINDERS
            for(let when in this._private.reminders){
               setReminder.call(this,when,now);
            }

        }

        return this;

        
    };





    return Timer;
}
//simpleSourceMap=
//simpleSourceMap2=