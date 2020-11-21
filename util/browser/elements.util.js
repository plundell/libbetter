//simpleSourceMap=/my_modules/util/browser/elements.util.js
//simpleSourceMap2=/lib/util/browser/elements.util.js
'use strict';
/*
* @module bu-browser-elements
* @author plundell
* @license MIT
* @description Helper functions related to the HTMLElements and the DOM
*
* This module is required by bu-browser
*/
module.exports=function export_elemX(bu){

	

	//Methods to export, returned at bottom
	var _exports={
		'_styles':{} //populated vv with name:{cssselector:stylestring,...}
		,'getSubAttributes':getSubAttributes
		,'hasSubAttributes':hasSubAttributes
		,'getLiveElement':getLiveElement
		,'getLiveElements':getLiveElements
		,getElementsArray
		,getAllElements
		
		,stringToFragment
		,stringToNode

		,datasetProxy
		,'subDataset':subDataset
		,'extractDatasetProp':extractDatasetProp
		,'getDatalist':getDatalist
		,'getElementsByRegExp':getElementsByRegExp
		,'getIdsFromNodelist':getIdsFromNodelist
		,'getJsonAttr':getJsonAttr

		,createElement
		,createInput
		,addSubmitChangesToInput
		,addInputOptions
		,replaceInputOptions
		,addInputOption
		,'setValueOnElem':setValueOnElem
		,'getValueFromElem':getValueFromElem
		,'getChildInputs':getChildInputs
		,'getChildInputsData':getChildInputsData
		
		,'setFirstTextNode':setFirstTextNode
		,'countParentNodes':countParentNodes
		,'isDescendantOf':isDescendantOf
		,addClass
		,'removeClass':removeClass
		,'prependChild':prependChild
		,'createTable':createTable
		,'firstParentTagName':firstParentTagName
		,createCustomEventButton
		,'getAllStyles':getAllStyles
		,'isDisplayNone':isDisplayNone
		,'hideElement':hideElement
		,'showElement':showElement
		,getOrigin
		,nodeType
		,multiQuerySelector
		,sortByDepth
	}







	/*
	* Get attribute names that begin with a 
	*
	* @param <htmlElement> elem 	A live element
	* @param string prefix 			Filter attributes to only those that begin with this
	* @param boolean extract 		Default false. If true the attribute will be removed from the element after fetch
	*
	* @return object  				Keys are attribute names (less the prefix), values have been parsed from the 
	*								 string stored on the node to primitives. (empty strings are converted to undefined)
	*/
	function getSubAttributes(elem,prefix,extract=false){
		var l=prefix.length;
		var data={};
		Array.from(elem.attributes).forEach(attr=>{
			if(attr.name.substring(0,l)==prefix){
				let value=bu.stringToPrimitive(elem.getAttribute(attr.name));
				value=value===''?undefined:value;
				data[attr.name.substring(l)]=value;
				
				if(extract)
					elem.removeAttribute(attr.name);
			}
		});
		return data;
	}



	/*
	* Check if a node has any attributes begining with a prefix
	*
	* @param <htmlElement> elem 	A live element
	* @param string prefix 			Filter attributes to only those that begin with this
	*
	* @return bool  				True if any such attributes exist, else false
	*/
	function hasSubAttributes(elem,prefix){
		return !bu.isEmpty(getSubAttributes(elem,prefix));
	}







	/*
		This function matches a regular expression of node classes and returns a live nodelist.

		@regexp*: Regular expression
		
		@return: live nodelist
	*/
	function getElementsByRegExp(re){

		if(!re) return false

		var uniqueList = {}

		var allNodes = document.getElementsByTagName("*");
		Array.prototype.slice.call(allNodes).forEach(function(node){
			Array.prototype.slice.call(node.classList).forEach(function(c){
				if(uniqueList.hasOwnProperty(c)){
					uniqueList[c].push(node)	
				} else {
					uniqueList[c]=Array(node)
				}
			})
		})

		var returnList = Array()
		for(c in uniqueList){
			returnList = (re.test(c) ? returnList.concat(Array.prototype.slice.call(uniqueList[c])) : returnList)
		}
		return returnList
	}



	/*
	* This function returns a live element given an id or a live element. NOTE: for HTML collections, use
	* getLiveElements()
	*
	* @param mixed x 				A string id corresponding to an HMTL id, or a live element
	* @param bool returnNull 		Default false. If true no error will be thrown on fail and null returned instead
	*
	* @throw <ble TypeError> 		If $ was bad type 
	* @throw <ble SyntaxError> 		If poorly formated htmlstring
	* @throw <ble ENOTFOUND> 		If no element was found (either empty nodelist or dom didn't contain)
	*
	* @return <HTMLElement>			The live element. By default an error is thrown on fail, but @see $returnNull
	*/
	function getLiveElement(x,returnNull=false){
		// bu._log.traceFunc(arguments,'getLiveElement');
		var type = bu.varType(x), node,nodes; 
		switch(type){
			case "node":
				return x
			case "string":
				if(x.substring(0,1)=='<'){
					// bu._log.debug("Got html string, turning into live node");
					return stringToNode(x); //throws on bad html //new element is adopted into local DOM
				}else{
					//First check if it starts with '#' since querySelectorAll won't work if the string also
					//contains characters like ':'
					if(x.substr(0,1)=='#'){
						node=document.getElementById(x.substr(1));
						if(node)
							return node
						else if(returnNull)
							return null;
						else
							bu._log.makeError("Found no element with id: "+x.substr(1)).throw();
					}

					//Then try it as an id
					node=document.getElementById(x);
					if(bu.varType(node)=='node')
						return node;

					//then try it as a query selector
					nodes=document.querySelectorAll(x);
					let l=nodes.length;
					if(l){
						if(l>1){
							bu._log.note(`Multiple elements matched css selector '${x}', only returning first:`,nodes);
						}
						return nodes[0];
					}
					if(returnNull)
						return null;
					else
						bu._log.throwCode('ENOTFOUND',"Found no element matching (id or css selector): "+x);
				}
			case "nodelist":
				nodes=Array.from(x);
				let l=nodes.length;
				if(l){
					if(l>1){
						bu._log.note(`Nodelist with ${l} nodes passed in, only returning first:`,nodes);
					}
					return nodes[0];
				}
				if(returnNull)
					return null;
				else
					bu._log.throwCode('ENOTFOUND',"Empty nodelist passed in");
			case 'object':
				//In case it's a MouseEvent from a click
				if(x.target && bu.varType(x.target)=='node')
					return x.target;
			default:
				// bu._log.error('Unsupported varType passed in as node:', Object.prototype.toString.call(x), x)
				// return undefined
				if(returnNull)
					return null;
				else
					bu._log.throwType('html string, id, query selector, node or nodelist',x);
		}
	}

	/*
	* Get a live HTMLcollection
	*	
	* @param string|<HTMLcollection>  A string class or selector, or a live HTMLcollection
	*
	* @return <HTMLcollection> 	      A live collection
	*/
	function getLiveElements(x){
		var type = bu.varType(x) 
		switch(type){
			case "string":
				//First assume it's a class, with or without leading '.'
				var nodes=document.getElementsByClassName(x.substr(0,1)=='.' ? x.substr(1) : x);
				if(nodes.length)
					return nodes;

				//Then try is as a selector
				var nodes=document.querySelectorAll(x);
				if(!nodes.length)
					bu._log.note(`No elements matched class/selector '${x}'`);

				return nodes; //return nodelist, empty or not

			case "nodelist":
				if(!x.length)
					bu._log.note("Empty nodelist");
				return x;

			case "node":
				bu._log.warn("You called getLiveElements() when you probably meant to use getLiveElement()");
			default:
				bu._log.throwType('string (html class or query selector) or a nodelist',type);
		}
	}


	/*
	* Get a static array of live elements
	*
	* @param mixed x    @see getLiveElement() && @see getLiveElements(). NOTE: a single string implies a class name
	*
	* @return array
	*/
	function getElementsArray(x){
		switch(bu.varType(x)){
			case 'array': return x.map(y=>getLiveElement(y));
			case 'node': return [x];
			default: return Array.from(getLiveElements(x));
		}
	}




	/*
	* Get all elements under a $top one, trimming away any under one or more $middle ones
	*
	* @param mixed top     @see getLiveElement()
	* @param mixed middle  @see getElementsArray()
	*
	* @return array   A static list of all nodes between the $top and $middle (inclusive)
	*/
	function getAllElements(top,excludeDescendentsOf){
		top=getLiveElement(top);
		if(excludeDescendentsOf)
			excludeDescendentsOf=getElementsArray(excludeDescendentsOf); 

		//Get all nodes from the top down (inclusive)
		var all=Array.from(top.getElementsByTagName("*"));
		all.push(top);

		if(excludeDescendentsOf){
			//Get all nodes from all the middle-points down (inclusive)
			var nested=middle.map(elem=>Array.from(elem.getElementsByTagName('*'))).flat().concat(middle); 

			//Now loop over those $nested elems and remove them from the list of $all elements
			while(nested.length){
				let i=all.indexOf(nested.shift());
				if(i>-1) //since things may be multi-nested the nested elem may already have been removed
					all.splice(i,1)
			}
		}

		return all;
	}















	/*
	* @param string
	* @throw <ble TypeError> 	Not a string
	* @return <DocumentFragment>
	*/
	function stringToFragment(str){
	    if(typeof str!='string')
	        throw new TypeError("Expected HTML string got "+typeof str);
	    var temp=document.createElement('template');
	    temp.innerHTML=str;
	    return temp.content;
	}


	/*
	* @param string
	* @throw <ble TypeError> 	Not a string
	* @throw <ble SyntaxError> 	Malformated html string
	* @return <HTMLElement>
	*/
	function stringToNode(str){
		var frag=stringToFragment(str);
		if(bu.varType(frag.firstElementChild)!='node')
			this.log.makeError("Bad HTML string, could not create HTMLElement").setCode("SyntaxError").throw();
		return frag.firstElementChild;
	}












	/*
	* Creates a proxy of an object (single level) which is stored on an elements dataset
	*
	* @param <HTMLElement> elem   
	* @param string key           The key to use on the dataset
	* @opt object|array template  The object to use as a template for the proxied object, however this obj will
	*                             not be linked to the proxied object or the element
	*
	* @return <Proxy>
	*/
	function datasetProxy(elem,key,template){
		bu.checkTypes(['node',['string','number']],[elem,key]);

		function read(){return JSON.parse(elem.dataset[key])}
		function write(data){elem.dataset[key]=JSON.stringify(data)}

		var handler={
			set:function(ignore,prop,value){
				//Ignore the proxied object and instead read a copy from the element
				var data=read();

				//Then set on the element
				data[prop]=value;
				write(data);

				//And return as expected so any other methods we're not proxying works
				return value;
			}
			,get:function(ignore,prop){
				//Ignore the proxied object and instead read a copy from the element
				return read()[prop];
			}
			,has:function(ignore,prop){
				return read().hasOwnProperty(prop);
			}
			,deleteProperty:function(ignore,prop){
				//Ignore the proxied object and instead read a copy from the element
				var data=read();

				//Then delete and set back on the element
				let deleted=delete data[prop];
				write(data);

				//And return as expected so any other methods we're not proxying works
				return deleted;
			}
		};

		if(!template || template=='object')
			template={};
		else if(template=='array')
			template=[]
		else{

			template=new template.constructor();
		}

		//Now that we have an empty template, create and return the proxy
		let proxy=new Proxy(template,handler);
		
		//If any existing data exists, write it to the elem before loosing it
		if(!bu.isEmpty(template))
			write(template); 

		return proxy;
	}







	/*
	* Get data from a live html node, optionally deleting it from node.
	*
	* @param <node> node
	* @param string datasetAttr 	String used on html, eg for data-xxx-repeater-title, data-xxx-repeater-artist, it should be repeater-xxx
	* @param bool deleteAfterFetch
	*
	* @return object
	*/
	function subDataset(node, datasetAttr, deleteAfterFetch=false){
		bu._log.trace( 'subDataset() called with args: ', arguments)
		bu.checkTypes(['node','string'],[node,datasetAttr]);

		var data = {} //Return object
		var info = {entireDataset:Object.keys(node.dataset), matchedData:[], nonMatchedData:[]} //Log object to make clear what matched and what didn't
		
		var prefix=fromDatasetAttr(datasetAttr)
		var l = prefix.length

		for(var prop in node.dataset) {
			if(prop.substring(0,l)==prefix){
				info.matchedData.push(prop)

				data[prop.charAt(l).toLowerCase()+prop.substring(l+1)]=node.dataset[prop]; //set first letter to lowercase

				if(deleteAfterFetch) 
					node.removeAttribute(toDatasetAttr(prop));

			} else {
				info.nonMatchedData.push(prop)
			}
		}

		bu._log.trace('subDataset() finished with outcome: ', info)
		
		if(bu.isEmpty(data)) 
			bu._log.debug('No props found on node for data attr: ',datasetAttr)
		else{
			bu._log.debug('Found sub-dataset: ', data)
		}
		
		return data
	}


	function extractDatasetProp(node,key){
		if(node.dataset.hasOwnProperty(key)){
			var data=node.dataset[key];
			delete node.dataset[key];
			return data;
		}
		return undefined;
	}


	function toDatasetAttr(key){ //usefull when removing attribute
		key=key.replace(/([a-z])([A-Z])/g, '$1-$2'); //MyNameIs --> My-Name-Is
		key=key.toLowerCase();//My-Name-Is -->  my-name-is
		return 'data-'+key;

	}

	function fromDatasetAttr(attr){
		if(attr.substring(0,5)=='data-')
			attr=attr.substring(5); //data-my-name-is  -->  my-name-is

		return attr.replace(/-([a-z])/g, (match,$1)=>$1.toUpperCase()); //my-name-is --> myNameIs
	}


	/*
	* Set multiple items on an elements dataset
	*
	* @param <HTMLElement> elem
	* @param object|array data
	*
	* @throw <ble TypeError>
	*
	* @return void
	*/
	function setDataset(elem,data){
		bu.checkTypes(['node',['object','array']],arguments);
		Object.entries(data).forEach(([key,value])=>elem.dataset[key]=(typeof value=='object'?JSON.stringify(value):value))
	}



	/*
		This functions loops through a @nodelist, checking every elements dataset for a property named @datasetProperty

		@nodelist*: a live nodelist of elements
		@datasetProperty*: a string used to lookup a property on each elements dataset

		@return: an object where every property name = element id, and property value = dataset-property value
	*/
	function getDatalist(nodelist, datasetProperty){
		var datalist = {} //return object

		Array.prototype.slice.call(nodelist).forEach(function(elem){  //Loop through nodelist
			datalist[elem.id||Math.floor(Math.random()*10000)] = elem.dataset[datasetProperty]
		})

		return datalist;
	}









	/*
		This function loops through a nodelist and returns a corresponding array of all html id's

		@nodelist - A live nodelist

		@return - An array of strings
	*/
	function getIdsFromNodelist(nodelist){
		if(bu.varType(nodelist)=='nodelist'){

			var idList = [] //return array

			Array.prototype.slice.call(nodelist).forEach(function(elem){
				idList.push(elem.id)
			}) 

			return idList;
		} else {
			bu._log.warn('Unsupported format ('+_vars.varType(nodelist)+') passed to getIdsFromNodelist: ', nodelist)
			return false
		}

	}





	/*
	* Check a node for a json string in an attribute, parsing it, storing it on the node for quicker 
	* future fetching, then returning it
	*
	* @param node 		node 	The node to check
	* @param string 	attr 	The attribute name. Only lowercase and '-'
	*
	* @throw <ble TypeError>  	
	* @throw <ble SyntaxError> 	If parsing fails. NOTE: In this case the the string is saved as $attr-fail on the node for easy debug
	*
	* @return mixed|undefined 	A parsed json string, or undefined if @attr doesn't exist
	*/
	function getJsonAttr(node,attr,extract=false){

		//Validate args
		bu.checkTypes(['node','string'],[node,attr]);

		//...else read them a-new...
		var str=node.getAttribute(attr)
		if(!str){
			return undefined;
		}

		if(extract)
			node.removeAttribute(attr);

		try{
			return JSON.parse(str);
		}catch(err){
			node.setAttribute(attr+'-fail',str);
			if(!extract) node.removeAttribute(attr);
			bu._log.makeEntry('warn',`Attribute '${attr}' contained bad JSON:`,err.message,node).throw('SyntaxError');
		}
	}










	/*
	* Similar to document.createElement(), but it knows about inputs, ie. that 'radio' => <input type='radio'>
	*
	* @param string tagName
	*
	* @return <HTMLElement> 
	*/

	function createElement(tagName){
		bu.checkType('string',tagName);
		tagName=tagName.toLowerCase();
		if(createElement.inputTypes.includes(tagName))
			return createInput('',tagName);
		else
			return document.createElement(tagName);
	}
	createElement.inputTypes=[
		"button","checkbox","color","date","datetime-local","email","file","hidden","image","month","number",
		"password","radio","range","reset","search","submit","tel","text","time","url","week","radioset","checklist",
		"dropdown","toggle","textarea"
	];







	/*
	* Create an input element from instructions.
	*
	* @param string name 		If an empty string is passed then no name will be set
	* @opt string type 			Any valid <input type=xxx>, or 'select'/'dropdown', 'toggle', 'radioset'. Defaults to 'text'
	* @opt array items 			Used to populate certain types of inputs. Values can be a string or {label, value}
	*
	* @throw <ble TypeError>
	*
	* @return <input>|<select>|<fieldset> 		A single element element ready to be appended somewhere. All elements have a .value
	*											prop that can be set directly
	*/
	function createInput(name,type='text',items=null){

		items=items||[]
		bu.checkTypes(['string','string','array'],[name,type,items])
		
		//alias for dropdown...
		type=(type=='select'?'dropdown':type);

		var input;
		if(createInput.hasOwnProperty(type)){
			input=createInput[type](items);
		}else{
			switch(type){
				case 'textarea':
					input=document.createElement('textarea'); break;
				case 'button':
				case 'submit':
				case 'reset':
					input=document.createElement('button'); 
					input.type=type;
					break;
				default:
					input=document.createElement('input');
					input.type=type;
			}
		}

		if(name) //allow for name skipping if an empty string is passed in
			input.name=name;

		return input;
	}


	createInput.optionMap={
		'radioset':'radio'
		,'checklist':'checkbox'
		,'dropdown':'option'
		,'select':'option'
		,'select-one':'option'
	}

	/*
	* Get the type of elements a fieldset can be populated with, based on createInput.optionMap{}
	*
	* @param <HTMLElement> elem 	
	*
	* @throws EMISSING 	If $elem doesn't have type
	* @throws EINVAL    If $elem has invalid type
	*
	* @return string
	*/
	function getInputOptionType(elem){
		let type=elem.type||elem.getAttribute('type');
		if(!type)
			bu._log.throwCode("EMISSING","Elem doesn't have .type property or type= attribute.",elem);
		
		let inputType=createInput.optionMap[type];
		if(!inputType)
			bu._log.throwCode("EINVAL","Elem had an invalid type prop/attribute: "+type,elem);

		return inputType;

	}

	createInput.radioset=function createRadioSet(items){
		let fieldset=createFieldset('radioset');

		//NOTE: the number of inputs within this fieldset CAN CHANGE, that's why we use a query selector...
		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>{
				var radio=fieldset.querySelector('input:checked');
				return radio==null ? undefined : radio.value;
			}
			,set:(val)=>{
				//Get the radio with the corresponding value...
				var radio=fieldset.querySelector(`input[value=${val}]`);
				if(radio){
					//...and select it if it exists (which will unselect all others)
					radio.checked=true;
					return val;
				}else{
					//If the option doesn't exist then we unselect all
					radio=radioset.querySelector('input:checked');
					if(radio)
						radio.checked=false;
					return undefined;
				}
			}
		})

		//Radios need to be grouped (which is how they control that only 1 is selected... so create a random group name)
		fieldset.setAttribute('groupname',bu.randomString(10)) //10 characters should be enough...

		addInputOptions(fieldset,items);

		return fieldset;
	}


	createInput.checklist=function createChecklist(items){
		let fieldset=createFieldset('checklist')

		//The checklist gets and sets an array, ie. the return value is an array
		//NOTE: the number of inputs within this fieldset CAN CHANGE, that's why we use a query selector...
		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>Array.from(fieldset.querySelectorAll('input[type=checkbox]:checked')).map(elem=>elem.value)
			,set:(arr)=>{
				if(bu.checkType(['primitive','array'],arr)!='array'){
					arr=[arr];
				}
				//Set the state of each checkbox according to the array (ie. unselect all not mentioned)
				fieldset.querySelectorAll('input[type=checkbox]').forEach(elem=>elem.checked=arr.includes(elem.value));
				return;
			}
		})

		addInputOptions(fieldset,'checkbox',items);

		return fieldset;
	}



	createInput.dropdown=function createDropdown(options){
		let select=document.createElement('select');
		
		//Populate it...
		select.setAttribute('type','dropdown'); //so addInputOptions() knows whats up
		addInputOptions(select,options);

		return select;
	}


	createInput.toggle=function createToggle(){
		var fieldset=createFieldset('toggle')
		var checkbox=createElement('checkbox');
		fieldset.appendChild(checkbox);
		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>checkbox.checked
			,set:(check)=>{return checkbox.checked=(check?true:false)}
		})
		fieldset.toggle=()=>fieldset.value=!fieldset.value


		//In order to show a nice slider instead of the default checkbox...
		fieldset.classList.add('toggle-wrapper');
		let span=document.createElement('span');
		span.classList.add('toggle-slider');
		span.setAttribute('onclick','javascript:event.stopImmediatePropagation();')
		  //^Only the <input> should emit a click event
		fieldset.appendChild(span);

		//This working as a slider is now dependent on some groovy css, @see toggleSliderCss and
		//use it together with createCSSRule() from styling.util.js
		
		return fieldset;
	}

	_exports._styles['.toggle-wrapper']='position: relative;display: inline-block;width: 2em;height: 1em; border:0 none;padding:0;'
	_exports._styles['.toggle-wrapper input']='opacity: 0;width: 0;height: 0;display:block;' //if 'block' is removed then <span> sits under <input>
	_exports._styles['.toggle-slider']='position: absolute;cursor: pointer;top: 0;left: 0;right: 0;bottom: 0;border-radius: 1em;background-color: #ccc;-webkit-transition: .4s;transition: .4s;'
	_exports._styles['.toggle-slider:before']='position: absolute;content: "";height: 0.8em;width: 0.8em;left: 0.1em;bottom: 0.09em;background-color: white;-webkit-transition: .4s;transition: .4s;border-radius: 50%;'
	_exports._styles['input:checked + .toggle-slider']='background-color: #2196F3;'
	_exports._styles['input:focus + .toggle-slider']='box-shadow: 0 0 1px #2196F3;'
	_exports._styles['input:checked + .toggle-slider:before']='-webkit-transform: translateX(1em);-ms-transform: translateX(1em);transform: translateX(1em);'


	createInput.datetime=function createDateTime(options){
		let fieldset=createFieldset('datetime');

		//Add seperate inputs for date and time
		let date=createElement('date');
		fieldset.appendChild(date);

		let time=createElement('time');
		fieldset.appendChild(time);

		//Create getter/setter on the fieldset
		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>{try{return bu.makeDate(date.value,time.value)}catch(err){return undefined}} //<Date> object
			,set:(datetime)=>{
				let date=bu.formatDate(datetime),time=bu.formatTime(datetime),str=(`${date} ${time}`).trim();
				//Set the values of the child elements
				date.value=date;
				time.value=time;

				//Set the attribute of the fieldset, that way we have easy access to both a <Date> obj via the prop, and
				//a string via this attribute
				fieldset.setAttribute('value',str);
			}
		})

		return fieldset;
	}


	/*
	* Create a <fieldset> with it's .type attribute set. Optionally appending a $child to it and binding the value
	* to that child using setter/getter
	*
	* @param string type 
	* @opt mixed child  	@see getLiveElement
	*
	* @return <HTMLElement> 	A <fieldset>
	*/
	function createFieldset(type,child){
		var fieldset=document.createElement('fieldset');

		fieldset.setAttribute('bu-input',''); //flag so we can identify it easily
		
		//Set the type both as prop and attribute so copying the fieldset won't loose it
		Object.defineProperty(fieldset,'type',{enumerable:true, configurable:true
			,get:()=>fieldset.getAttribute('type')
			,set:(val)=>fieldset.setAttribute('type',val)
		})
		fieldset.type=type; //does not do anything for form-api, but is used by getValueFromElem() and setValueOnElem()


		//Only the fieldset should dispatch events, not the child inputs, so intercept when they bubble past and 
		//change the event.target
		bu.redispatchChildEvents(fieldset,['input','change']);

		//If a child was passed in, pop it inside and link it's value
		if(child){
			child=getLiveElement(child);
			Object.defineProperty(fieldset,'value',{enumerable:true,configurable:true
				,get:()=>child.value
				,set:(val)=>child.value=val
			})
			fieldset.appendChild(child);
		}

		return fieldset;
	}



	/*
	* Wrap an element in a div together with a submit button. Changes to the elem will be intercepted and 
	* the last one emitted when the button is pushed
	*
	* @param <HTMLElement> elem 	Any element where 'input' events bubble past
	* @opt boolean extendValue 		Default false. If true the wrapper will be a <fieldset> and the .value from
	*								 the input will be extended using getters/setters
	*
	* @param <HTMLElement> 			A wrapper containing $elem and <input type='button'>Submit</input>
	*/
	function addSubmitChangesToInput(elem,extendValue=false){

		//Add the elem to a wrapper, what kind depends on if we're extending or not
		if(extendValue){
			var wrapper=createFieldset(elem.getAttribute('type')||elem.type,elem);
		}else{
			wrapper=document.createElement('div')
			wrapper.appendChild(elem);
		}

		//Then intercept changes on the elem, storing the last one. We don't 'capture', so whenever 
		//the event bubbles up to us is when we intercept.
		var lastEvent;
		elem.addEventListener('input',event=>{
			lastEvent=event; //store so we can emit it vv
			event.stopImmediatePropagation();
		});

		//Now create a submit button and add it to the wrapper...
		var button=createElement('button');
		button.innerHTML='Submit';
		
		//...and when it is clicked we emit the lastEvent from the original elem
		button.addEventListener('click',event=>{
			event.stopImmediatePropagation();
			elem.dispatchEvent(evt)
		},{capture:true}); //make sure we run before anyone else

		return wrapper;
	}


	/*
	* Add a list of items to an input elem (or fieldset) AND set method .addOption on it so more items can be added later
	*
	* @param <HTMLElement> input 	A live elem that will be appended
	* @param array items 			Array of strings or of {label,value} used to create <input> children within the $fieldset
	*
	* @return <HTMLElement> $input
	*/
	function addInputOptions(input, items){
		bu.checkType('node',input);

		//Add the "setter" method to the fieldset (so more items can be added later)
		input.addOption=addInputOption.bind(input);

		if(bu.varType(items)!='array' || !items.length){
			bu._log.note(`Creating an empty '${input.type}' input, ie. without actual <input type='${getInputOptionType(input)}'>s. Please add items later...`
				,input);
		}else{
			items.forEach(input.addOption)
		}

		return input;
	}

	/*
	* Replace all options for an input
	*
	* @param <HTMLElement> input 	A live elem that will be appended
	* @param array items 			Array of strings or of {label,value} used to create <input> children within the $fieldset
	*
	* @return <HTMLElement> $input 
	*/
	function replaceInputOptions(input,items){
		bu.checkType('node',input);
		input.innerHTML='';
		return addInputOptions(input,items);
	}

	/*
	* Add an item to a an input element that holds items...
	*
	* @param string|object item
	*
	* @return <HTMLElement> The newly created element
	*
	* @call(<HTMLElement>) The element you want to add the option to
	*/
	function addInputOption(option){
		var elem=createElement(getInputOptionType(this)) //will create <option> or <input type="...">
		
		//We wrap <input>s in a label, whereas <option>s are their own labels
		if(elem.tagName=='OPTION'){
			var label=elem;
		}else{
			label=document.createElement('label');
			label.appendChild(elem);
			
			//Unlike <option>s we need to mark (what's expected to be) <input>s to be ignored, since the "parent input" (expected to be
			//a <fieldset>) is the "actual" input
			elem.setAttribute('bu-ignore','');
		}
		
		//For same handling turn string args into objects
		if(typeof option!='object')
			option={value:option};

		
		elem.value=option.value;
		setFirstTextNode(label,option.label||option.value);
		

		//Finally, some fieldsets (like radiosets) need groupname, so set that here
		if(this.hasAttribute('groupname'))
			elem.name=this.getAttribute('groupname')

		//Then append and return the newly created option
		this.appendChild(label);
		return label;
	}




























	/*
	* Set the value-property (could be 'checked' for checkboxes) on various input-like nodes.
	*
	* @param <HTMLElement> elem 	The elem to set value on
	* @param primitive value  		The value to set
	*
	* @throws <ble TypeError>
	* @throws <ble EINVAL> 		$elem doesn't have .value prop but does have child elements 	
	* @throws <ble> 			If elem.value!=$value after trying to set
	*
	* @return $elem
	*/
	function setValueOnElem(elem, value){
		if(bu.checkTypes(['node',['primitive','undefined']],[elem,value])[1]=='undefined')
			value='';

		try{
			switch(elem.tagName){
				case 'TEXTAREA':
				case 'SELECT':
					break;
				case 'INPUT':
					if(elem.type=='checkbox'||elem.type=='radio'){
						if(typeof value=='boolean'){
							elem.checked=value;
						}else{
							if(elem.type=='radio'){
								//For radios, get all with the same name since that's who we're setting
								let f=firstParentTagName('form'); //form or entire document
								let radio=f.querySelector(`input[value=${value}][name=${elem.name}]`)
								if(radio){
									//If we have a match, select it...
									radio.checked=true;
								}else{
									//If none have the value, throw
									bu._log.throwCode("EINVAL",`No radio with name='${elem.name}' has value='${value}', ie. cannot set.`,elem)
								}

							}else{ //implies checkbox
								elem.checked=(elem.value==value)
							} 
						}
						return;	

					}else if(elem.type=='color'){
						//Make sure we have a hex color
						value=bu.colorToHex(value)
					}
					break;

				case 'FIELDSET':
					if(elem.hasAttribute('bu-input')){
						//2020-03-23: these work like regular inputs with a .value prop that uses getters/setters
						//            to access the inside value
						break;
					}

				default:
					if(!elem.__proto__.hasOwnProperty('value')){
						if(!elem.childElementCount){
							//If no children exist, the value is just set inside the elem... like an empty <span> being populated
							return setFirstTextNode(elem,value);
						}else{
							bu._log.throwCode('EINVAL',`Cannot set value on <${elem.tagName.toLowerCase()}> that doesn't have a `
								+'.value prop AND has children',elem);
								
						}
					}
			}

			//Now set the value and make sure it gets changed
			let before=elem.value;
			elem.value=value
			if(elem.value!=value){
				//Some changes we are not allowed, like setting a range to null/false/undefined
				if(elem.getAttribute('type')=='range' && typeof value!='number'){
					bu._log.makeError(`You cannot set a range input to: ${bu.logVar(value)}`,elem)
						.addHandling(`Default behavior was to set it to middle value, ie:`,elem.value)
						.throw('TypeError');
				}

				//Where there are options or similar, we can't select the value if it doesn't exist
				try{
					let type=getInputOptionType(elem);
					bu._log.throwCode('EINVAL',`This <${elem.tagName}> doesn't have a <${type} value='${value}'>, ie. cannot set.`,elem)
				}catch(e){
					//this is what happens if no options exist, then just continue...
				}

				var str=`Tried to set value of <${elem.tagName}> to '${value}', but for UNKNOWN reaons `;
				str+=(elem.value==before? 'it remains unchanged as':'it was instead set to')+` '${elem.value}'`
				bu._log.makeError(str,elem).addHandling("Native warnings may have been supressed. Try setting it in DevTools...").throw();
			}

		}catch(err){
			if(!err._isBLE)
				err=bu._log.makeError("Failed to set value on elem",{elem,value},err).throw();
			err.throw();
		}
		return;
	}



	/*
	* Get a value from a node, regardless type of node
	*
	* @param <HTMLElement> node 	The node to get value from
	*
	* @throws TypeError
	*
	* @return void
	*/
	function getValueFromElem(node) {
		bu.checkType('node',node);
		var val;
		switch(node.tagName){
			case 'INPUT':
				//For check:able inputs, return either the checked status, or the value if one exists and checked==true
				if(node.type=='checkbox'||node.type=='radio'){
					if(typeof node.value!='undefined'){
						val=(node.checked ? node.value : undefined);
					}else{
						val=node.checked;
					}
					break;
				}
				
				//don't break;
			case 'TEXTAREA':
			case 'SELECT':
				val=node.value;
				break;

			case 'FIELDSET':
				if(node.type=='radioset' || node.type=='checklist'){
					//2020-03-23: these work like regular inputs now...
					val=node.value;
					break;
				}
				//Else just fall through

			default:
				let text=getFirstTextNode(node);
				val=(text?bu.stringToPrimitive(text.data):undefined);
				 //TODO: maybe add json 
		}

		return (val===''?undefined:val);
	}






	/*
	* Get all inputs nested within a parent
	*/
	function getChildInputs(parent){
		return [].concat(
			Array.from(parent.getElementsByTagName("SELECT"))
			,Array.from(parent.getElementsByTagName("TEXTAREA"))
			,Array.from(parent.querySelectorAll("fieldset[bu-input]")) //custom inputs from createInput()
			,Array.from(parent.getElementsByTagName("INPUT")).filter(isInput)
		)
	}

	/*
	* Check if an element is an input (based on what getChildInputs() calls an input)
	* @return boolean
	*/
	function isInput(elem){
		let tag=elem.tagName;
		if(tag=='SELECT'||tag=='TEXTAREA')
			return true;
		if(tag=='BUTTON')
			return false;
		if(tag=='FIELDSET')
			return elem.hasAttribute('bu-input')
		if(tag=='INPUT' ){
			type=elem.type;
			if(type=='button'||type=='submit'||type=='reset'||type=='image')
				return false;
			return !elem.hasAttribute('bu-ignore')
		}
	}



	/*
	* Get data from a bunch of inputs, using the 'name' attribute as key
	*
	* @param <HTMLElement> parent
	*
	* @return object 				An object of data
	*/
	function getChildInputsData(parent){
		var data={};
		getChildInputs(parent).forEach(input=>{
			let key=input.getAttribute('name');
			if(key){
				//Some inputs have 2 props of interest, .value and .checked. ..
				if(input.tagName=='INPUT' && input.type=='radio'){
					//Only a single radio can be selected, so make sure we have a key and set it to null or the value
					//of the only checked option
					if(!data.hasOwnProperty(key))
						data[key]=null;
					if(input.checked)
						data[key]=input.value;
				}else if(input.tagName=='INPUT' && input.type=='checkbox'){
					//Checkboxes aren't linked in the same way radios are, ie. there is not one value for all with the
					//same name. Therefore we grab all the data available and let whoever's using it sort it out... ie 
					//we create an object where keys are .value and values are .checked
					if(!data.hasOwnProperty(key))
						data[key]={};
					data[key][input.value]=input.checked;

				}else{
					//For all other just get the value, this includes the "bu-input" customs from createInput()
					data[key]=input.value;
				}
			}else{
				bu._log.warn("Input missing 'name' attribute, ignoring",input)
			}
		})
		return data;
	}































	/*
	* Set a text node in an element
	*
	* NOTE: If there already is one or more text nodes in the elem, the first one gets changed
	* NOTE2: Any other nodes in the object stay the same
	*
	* @throw <ble TypeError>
	*
	* @return #textnode 	The newly created, or changed existing, text node. 
	*/
	function setFirstTextNode(elem,value){
		
		var node=getFirstTextNode(elem);

		if(bu.checkType(['primitive','undefined'],value)=='undefined')
			value='';

		if(node==undefined){
			//If no text nodes existed, create one at the begining of elem
			node=document.createTextNode(value);
			prependChild(elem,node);
		}else{
			node.data=value;
		}

		return node;
	}


	/*
	* Get the first, if any, text node in an elem
	* @param <HTMLElement> elem
	* @throw <ble TypeError>
	* @return node|undefined
	*/
	function getFirstTextNode(elem){
		bu.checkType('node',elem);


		//If there is an existing text node, set value as first text element so as not to remove any child elements
		let l=elem.childNodes.length
		if(l){
			var i=0;
			for(i;i<l;i++){
				let node=elem.childNodes[i];
				if(node.nodeName=='#text')
					return node;
			}
		}

		return;
	}



	/*
	* Count how deep down the DOM structure an element resides
	*
	* @param <Node> node
	*
	* @return number 			
	*/
	function countParentNodes(node){
		var i=0;
		while(node.parentNode){
			i++;
			node=node.parentNode;
		}
		return i;
	}


	function isDescendantOf(child,parent) {
		parent=getLiveElement(parent);
		child=getLiveElement(child);

			var node = child.parentNode;
			while (node != null) {
				if (node == parent) {
					return true;
				}
				node = node.parentNode;
			}
	     return false;
	}






	/*
	* Get the index of an element within it's parent
	* 
	* @param <HTMLElement> child
	* @opt bool countTextNodes 		By default we only count "element nodes", but set this truthy and we'll also count
	*								 text and comment nodes
	*
	* @return number
	*/
	function childIndex(child,countTextNodes=false){
		var i = 0;
		if(countTextNodes){
			while( (child = child.previousSibling) != null ) 
				i++;
		}else{
			while( (child = child.previousElementSibling) != null ) 
				i++;
		}
		return i;
	}



	/*
	* Add or remove classes from an element
	*
	* @param string method
	* @param <arguments> args
	*
	* @return void
	* @private
	*/
	function _commonClasses(method,args){
		var elem=getLiveElement(args[0]);
		
		var classes=Array.from(args).slice(1).flat().map(str=>str.split(' ')).flat();
		bu.checkTypedArray(classes,'string');
		
		for(let cls of classes){
			elem.classList[method](cls);
		}

		if(!elem.classList.length)
			elem.removeAttribute('class');

		return;
	}

	/*
	* Add one or more classes to an element
	*
	* @param HTMLElement   elem
	* @params string|array classes   A space delimited string, multiple strings, an array of strings
	*
	* @return void
	*/
	function addClass(){
		return _commonClasses('add',arguments);
	}

	/*
	* Remove one or more classes from an element, and if there are no more classes, remove the class attribute as well
	* for a nice and clean html
	*
	* @param HTMLElement   elem
	* @params string|array classes   A space delimited string, multiple strings, an array of strings
	*
	* @return void
	*/
	function removeClass(){
		return _commonClasses('remove',arguments);
	}

	/*
	* Insert a node at the begining of another node
	*
	* @param <node> target 	The existing node to insert into
	* @param <node> node 	The new node we wish to insert
	*
	* @return <node> 		The new node we just inserted
	*/
	function prependChild(target,node){
		return target.insertBefore(node,target.childNodes[0]);
	}


	/*
	* Create a basic table and return an object with shortcuts to header row and body, and methods to easily add/remove stuff
	*
	* @param array columns 		An array of column keys (pretty names can be added later)
	*
	* @return object 	Object with props: table, head, body and methods addRow, addCol and addColClass
							{
								columns : array - kept up to date with columns in table
								_elem:<table>
								head:{colA:<th>, colB:<th>, _elem:<tr>}
								body:[{colA:<td>, colB:<td>, _elem:<tr>},{}...,_elem:<tbody>]
								addRow : method
								removeRow : method - removes a single row
								empty : method - removes all rows
								addCol : method - Adds a column to each row (th in thead, td in tbody)
								addColClass : method - add class to each th and td in a column

							}
	*/
	function createTable(columns){
		var table={columns};
		var colClass={}; 


		table._elem=document.createElement('table');

		//Add head and header row
		let thead=document.createElement('thead');
		table._elem.appendChild(thead);
		let headrow=document.createElement('tr');
		thead.appendChild(headrow);
		
		//Create a th for each column and add to return table.head
		table.head={};
		Object.defineProperty(table.head,'_elem',{value:headrow});
		function addTh(col){
			let th=document.createElement('th');
			th.innerHTML=col;
			headrow.appendChild(th)
			table.head[col]=th
		}
		columns.forEach(addTh);

		//Add body
		const tbody=document.createElement('tbody');
		table._elem.appendChild(tbody)
		table.body=[];
		Object.defineProperty(table.body,'_elem',{value:tbody});


		//Create a <td> with a couple of hidden methods to easily add an input or row-button
		function createCell(row,colName,innerHTML){
			let td=document.createElement('td');
			Object.defineProperties(td,{
				'_addButton':{value:function addButtonToCell(...args){return td.appendChild(createCustomEventButton.apply(td,args));}}
				,'_addInput':{value:function addInputToCell(...args){return td.appendChild(createInput.apply(td,args));}}
				,'_valueTarget':{get:()=>td.firstElementChild||td}
				,'_setValue':{value:function setCellValue(value){setValueOnElem(td._valueTarget,value)}}
				,'_getValue':{value:function getCellValue(){return getValueFromElem(td._valueTarget)}}
			})
			td.innerHTML=bu.isEmpty(innerHTML,null)?'':innerHTML //null is considered empty, but 0 and false are not
			row._elem.appendChild(td);
			row[colName]=td;
			return td;
		}

		/*
		* Add a child <tr> element to the table body
		*
		* @param object|array data 	The data used to populate the cells of the row
		*
		* @return object 	         Object with enumerable props named after each column, 
		*                            and non-enumerable ._elem = live <tr> elem
		*/
		table.addRow=function addRow(data=[]){
			if(typeof data !='object' || !data)
				bu._log.throwType("object or array",data);

			//Create a row...
			let row={};
			let tr=document.createElement('tr');
			Object.defineProperty(row,'_elem',{value:tr});

			//Fill it with cells
			if(Array.isArray(data)){
				var i,l=columns.length;
				for(i=0;i<l;i++){
					//If we get an array, add as many items as there are columns (ie. if there are more
					//here the remainder get discarded, and if there are less we'll end up with empty cells
					//and the end of the row)
					createCell(row,columns[i],data[i]);
				}
			}else{
				//If we got an object, grab props named as the columns we already have
				columns.forEach(col=>createCell(row,col,data[col]))
			}

			//If we have any classes to add...
			for(let col in colClass){
				row[col].classList.add(...colClass[col]);
			}

			//...and add it to the body and the shorcut on our return element
			tbody.appendChild(tr);
			table.body.push(row);
			return row;
		};



		/*
		* Remove a child <tr> element from the body
		*
		* @param number i 	The index of the row in table.body
		*
		* @return <tr>|undefined 	The removed row or undefined nothing was removed
		*/
		table.removeRow=function removeRow(i){
			var row=table.body[i];
			if(row){
				tbody.removeChild(row);
				return row;
			}else{
				return undefined;
			}
		}

		/*
		* Remove all rows in the table body 
		*
		* NOTE: doesn't touch possible footer
		*/
		table.empty=function empty(i){
			while(table.removeRow(0)){}
		}

		/*
		* Add a cell to every row in the table head, body and footer
		*
		* @param string name 	The name of the new column
		*
		* @return array 		Array of newly created <td> elems (with hidden props, @see createCell()) in 
		*						the body (header and footer rows not included)
		*/
		table.addCol=function addCol(name){
			if(columns.includes(name))
				bu._log.throwCode('EALREADY',`A column named '${name}' already exists in the table`);

			//Add to list of columns
			columns.push(name);

			//Add header
			addTh(name);

			//Add to each row of body and foot
			var fn=row=>createCell(row,name);
			var rows=table.body.forEach(fn);
			if(table.foot)
				table.foot.forEach(fn);

			return rows;
		}

		/*
		* Get a "column" of the table
		*
		* NOTE: only includes body, ignores foot
		*
		* @param string name 	The name of the new column
		* @return array 		Array of live <td> elems (with hidden props, @see createCell())
		*/
		table.getCol=function getCol(name){
			if(columns.includes(name))
				return table.body.map(row=>row[name]);
			else
				return undefined;
		}


		
		table.addColClass=function addColClass(col,cls){
			//First store it so any future rows use it
			if(!colClass.hasOwnProperty(col))
				colClass[col]=[];
			colClass[col].push(cls);

			//Then add it to every cell in the column in the head,body,foot
			table.head[col].classList.add(cls);
			table.body.concat(table.foot?table.foot:[]).forEach(row=>row[col].classList.add(cls));
		}





		table.addFooter=function(){
			if(!table.foot){
				let tfoot=document.createElement('tfoot');
				table._elem.appendChild(tfoot);
				table.foot=[];
				Object.defineProperty(table.foot,'_elem',{value:tfoot});
			}else{
				console.warn("A footer has already been created:",table);
			}
		}


		/*
		* Add a child <tr> element to the footer
		*
		* @param object|array data 	@see table.addRow()
		*
		* @return object 	         Object with enumerable props named after each column, 
		*                            and non-enumerable ._elem = live <tr> elem
		*/
		table.addFootRow=function(data){
			if(!table.foot)
				table.addFooter();

			//Then add the row to the regular table, but immediately move it to the <tfoot>
			var row=table.addRow(data);
			table.foot._elem.appendChild(row._elem);
			table.foot.push(table.body.pop());
			
			return row;
		}

		/*
		* Remove a child <tr> element from the footer
		*
		* @param number i 	The index of the row in table.foot
		*
		* @return <tr>|undefined 	The removed row or undefined if nothing was removed
		*/
		table.removeFootRow=function(i){
			if(!table.foot)
				return undefined

			var row=table.foot[i];
			if(row){
				table.foot._elem.removeChild(row);
				return row;
			}else{
				return undefined;
			}
		}


		//Now return the object
		return table;
	}


	/*
	* Create a <button> that emits a custom event when clicked INSTEAD of the 'click' event. 
	*
	* NOTE: This button can be cloned without loosing functionality
	*
	* @param string buttonText  	The caption on the button
	* @opt string eventName 		The name of the event to emit when the button is clicked
	* @opt object|primitive details Any additional details to add to the custom event. 
	*									NOTE 1: objects will be set on the button's dataset, ie. they will not remain live
	*								 	NOTE 2: these will be available via event.details
	*
	* @return <HTMLElement> 	A <button> element
	*/
	function createCustomEventButton(buttonText,eventName=undefined,details=undefined){
		bu.checkTypes(['string',['string','undefined']],[buttonText,eventName]);

		let button=document.createElement('button');
		button.innerHTML=buttonText;
		button.type='button'; //this does the same as event.preventDefault()

		//Optionally add a custom event to be emitted when the button is clicked. This event will remain
		//intact if the button is cloned
		if(eventName){
			var detailStr=',details:';
			switch(typeof details){
				case 'object':
					detailStr+='this.dataset'
					setDataset(button,details);
					break;
				case 'string':
					detailStr+=`'${details}'`;
					break;
				case 'number':
				case 'boolean':
					detailStr+=String(details)
					break;
				default:
					detailStr=''
			}

			button.setAttribute('onclick','javascript: event.stopImmediatePropagation();this.dispatchEvent(new CustomEvent('
					+`'${eventName}',{bubbles:true,cancelable:true${detailStr}))`
			);
		}

		return button;
	}



	/*
	* Get the first parent to an elem (or the elem itself) that has a certain tag
	*
	* @param <HTMLElement> elem
	* @param string tagName
	*
	* @return <HTMLElement>|null
	*/
	function firstParentTagName(elem,tagName){
		tagName=tagName.toUpperCase();
		while(elem && elem.tagName!=tagName){
			elem=elem.parentElement;
		}
		return elem;
	}


	/*
	* Get all styles applied to an element
	*
	* @param mixed elem 	@see getLiveElement()
	*
	* @throws 				@see getLiveElement()
	*
	* @return object 		Keys are style names, values are style values
	*/
	function getAllStyles(elem) {
		elem=getLiveElement(elem);

	    var styles={}
	    
	    //Deal with different browsers
	    var win=document.defaultView||window
	    if(win.getComputedStyle){ // Modern browsers
	        let styleArr=win.getComputedStyle(elem, ''), l=styleArr.length;
	        var i=0;
	        for(i; i<l; i++) {
	            styles[styleArr[i]]=styleArr.getPropertyValue(styleArr[i]);
	        }
	    }else if(elem.currentStyle){ //IE
	        styles=elem.currentStyle;

	    }else{ //Ancient browser..
	        let styleArr=elem.style, l=styleArr.length;
	        var i=0;
	        for(i; i<l; i++) {
	             styles[styleArr[i]]=styleArr[styleArr[i]];
	        }
	    }

	    return styles;
	}


	/*
	* Check if an element has display none set directly on it, or at all
	*
	* @param mixed elem 	@see getLiveElement()
	*
	* @throws 				@see getLiveElement()
	*
	* @return number 		0=not set (ie. elem is not hidden)
	*						1=set directly on element
	*						2=set via css (old browsers will only show 1)
	*/
	function isDisplayNone(elem){
		elem=getLiveElement(elem);
	    
	    if(elem.style.display=='none')
	    	return 1;

	    //Deal with different browsers
	    var win=document.defaultView||window
	    if(win.getComputedStyle){ // Modern browsers
	        return win.getComputedStyle(elem, '').display=='none'?2:0;
	    }else if(elem.currentStyle){ //IE
	    	return elem.currentStyle.display=='none'?2:0;
	    }else{ //Ancient browser..
	    	//these only have elem.style.display, and we've already checked that
	        return 0
	    }
	}

	/*
	* Hide an element by setting display:none AND storing any previous display info
	*
	* NOTE: If already hidden, this will do nothing
	*
	* @param mixed elem 			@see getLiveElem
	* @param @opt string storeAttr 	Attribute to use for storeing existing
	*
	* @return void
	*/
	function hideElement(elem, storeAttr='_display'){
		elem=getLiveElement(elem);
		if(!isDisplayNone(elem)){
			
			//If anything was set directly on elem, store it. 
			if(elem.style.display)
				elem.setAttribute(storeAttr,elem.style.display);
			
			elem.style.display='none';

			//If still not hiding, add the important flag
			if(!isDisplayNone(elem)){
				elem.style.display='none !important';
			}
		}
		return;
	}


	/*
	* Show an element by restoring a previous display setting, or at least removing display:none
	*
	* NOTE: If already showing, this will do nothing
	*
	* @param mixed elem 			@see getLiveElem
	* @param @opt string storeAttr 	Attribute used for storeing existing
	*
	* @return void
	*/
	function showElement(elem, storeAttr='_display'){
		elem=getLiveElement(elem); //do first since we're calling isDisplayNone twice
		if(isDisplayNone(elem)){
			//Start by trying to restore a previous showing state, then check again
			elem.style.display=elem.getAttribute(storeAttr); 
			if(isDisplayNone(elem)){
				//This implies that a css rule has been applied to the elem (or that the 
				//attribute also contained display:none)... in either case we want to unset
				//that value
				elem.style.display="unset !important";

				//Now the element may STILL not be showing if it's inheriting a display:none, 
				//but in that case there's nothing we can/should do here because it's the
				//parent who needs showing...
			}

			//If there are no more style attributes, clean up after yourself
			if(!elem.getAttribute('style'))
				elem.removeAttribute('style');
		}
		return;
	}



	function getOrigin(elem){
		var ref;
		if(elem.href)
			ref=href
		else if(elem.src)
			ref=elem.src
		else
			return undefined

		return (new URL(ref)).origin;
	}



	var nodeTypes={
		1:'element'
		,2:'attribute'
		,3:'text'
		,8:'comment'
	}
	function nodeType(node){
		if(node){
			return nodeTypes[node.nodeType];
		}
	}


	/*
	* Check if a selector matches an elem using either querySelectorAll() or getElementsByClassName instead of .matches() 
	* which doesn't seem to work with all selectors (especially those containing special characters)
	*
	* @param <HTMLElement> elem
	* @param string selectors
	* @opt bool useClassName 	Default false => use querySelectorAll(), if true => use getElementsByClassName()
	*
	* @return <HTMLElement>|undefined 	The passed in $elem or undefined
	*/
	function matchElem(elem,selector,useClassName=false){
		var func=document.body[(useClassName?'getElementsByClassName':'querySelectorAll')];
		return Array.from(func.call(elem.parentNode,selector)).find(child=>elem==child);
	}


	/*
	* Run querySelectorAll() on multiple targets and/or with multiple selectors, optionally including the
	* targets themselves and/or grouping targets by selectors
	*
	* @param <HTMLElement>|<Nodelist> targets
	* @param string|array selectors
	* @flag 'group' 	Group nodes by selector. NOTE: nodes can match multiple selectors
	* @flag 'class' 	Use getElementsByClassName (which is faster) instead of querySelectorAll
	* @flag 'self' 		If also using 'class', remember to seperate multiple classes with '.' NOT whitespace
	*
	* @throws <ble TypeError>
	* @throws other?
	*
	* @return array|object 		And object if flag 'group', else an array. Possibly empty. 
	*/
	function multiQuerySelector(targets,selectors,...flags){
		var types=bu.checkTypes([['node','nodelist'],['string','array'],['array','undefined','string']],arguments);
		try{
			//Handle diff types of args
			targets=(types[0]=='node' ? [targets] : Array.from(targets));
			selectors=(types[1]=='string' ? [selectors] : Array.from(selectors));
			flags=(types[3]=='string' ? [flags] : flags) || [];
			
			//Check which flags are set...
			const group=flags.includes('group')
				,checkSelf=flags.includes('self')
				,useClassName=flags.includes('class')
				
				//...then based on that determine 'func' and results 'holder'
				,func=document.body[(useClassName?'getElementsByClassName':'querySelectorAll')]
				,holder=(group ? {} : [])
			;

			
			//Now loop over all the selectors and run the func on each target to populate the holder
			var selector; //make sure it's defined for whole function so catch() vv can use it
			for(selector of selectors){
				//If we're grouping make sure there is an array for this selector selector
				let arr=holder;
				if(group){
					if(!holder.hasOwnProperty(selector))
						holder[selector]=[];
					arr=holder[selector]
				}
				

				for(let target of targets){
					//Run the func on this target using this selector
					arr.push.apply(arr,Array.from(func.call(target,selector)));
					
					//If we're checking the target itself, run the func on its parent and see if its included
					if(checkSelf && matchElem(target,selector,useClassName)){
						arr.push(target)                  
					}
				}
			}

			//Return all matches
			return holder;
		}catch(err){
			if(err.toString().indexOf('is not a valid selector')>-1){
				bu._log.makeError('Invalid selector:',selector,arguments).setCode("SyntaxError").exec().throw();
			}
			bu._log.warn("BUGBUG. Undocumented error caught. Dev: either prevent or add to func description.");
			bu._log.throw(err,arguments);
		}
	}


	/*
	* Sort a list of nodes based on their depth
	* @return array
	*/
	function sortByDepth(nodes){
		checkTypes(['nodelist','array'],arguments);

		//We want to return an array organized by depth (so eg. gracefullyRemoveElement() can remove them 
		//in the right order), so start by grouping them by such....
		var byDepth={},c=0;
		for(let node of nodes){
			c++;
			let d=countParentNodes(node);
			byDepth[d]=byDepth[d]||[];
			byDepth[d].push(node);
		}

		//...then flatten into an array
		nodes=[];
		var keys=Object.keys(byDepth).sort().reverse().forEach(key=>{
			nodes.push.apply(nodes,byDepth[key])
		})

		return nodes;
	}



	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=