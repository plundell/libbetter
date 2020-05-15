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
module.exports=function export_elemX({cX,_log}){

	

	//Methods to export, returned at bottom
	var _exports={
		'getSubAttributes':getSubAttributes
		,'hasSubAttributes':hasSubAttributes
		,'getLiveElement':getLiveElement
		,'getLiveElements':getLiveElements
		,'stringToHtml':stringToHtml
		,'subDataset':subDataset
		,'extractDatasetProp':extractDatasetProp
		,'getDatalist':getDatalist
		,'getElementsByRegExp':getElementsByRegExp
		,'getIdsFromNodelist':getIdsFromNodelist
		,'getJsonAttr':getJsonAttr

		,createInput
		// ,toggleSliderCss //const which is assigned vv after it's created
		,'setValueOnElem':setValueOnElem
		,'getValueFromElem':getValueFromElem
		,'getChildInputs':getChildInputs
		,'getChildInputsData':getChildInputsData
		
		,'setFirstTextNode':setFirstTextNode
		,'countParentNodes':countParentNodes
		,'isDescendantOf':isDescendantOf
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
				let value=elem.getAttribute(attr.name);
				value=(value===''?undefined:cX.stringToPrimitive(value));
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
		return !cX.isEmpty(getSubAttributes(elem,prefix));
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
	* @throw <ble> 					If no element was found
	*
	* @return <HTMLElement>			The live element. By default an error is thrown on fail, but @see $returnNull
	*/
	function getLiveElement(x,returnNull=false){
		// _log.traceFunc(arguments,'getLiveElement');
		var type = cX.varType(x), node,nodes; 
		switch(type){
			case "node":
				return x
			case "string":
				if(x.substring(0,1)=='<'){
					// _log.debug("Got html string, turning into live node");
					return stringToHtml(x); //throws on bad html //new element is adopted into local DOM
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
							_log.makeError("Found no element with id: "+x.substr(1)).throw();
					}

					//Then try it as an id
					node=document.getElementById(x);
					if(cX.varType(node)=='node')
						return node;

					//then try it as a query selector
					nodes=document.querySelectorAll(x), l=nodes.length;
					if(l){
						if(l>1){
							_log.note(`Multiple elements matched css selector '${x}', only returning first:`,nodes);
						}
						return nodes[0];
					}
					if(returnNull)
						return null;
					else
						_log.makeError("Found no element matching (id or css selector): "+x).throw();
				}
			case "nodelist":
				nodes=Array.from(x), l=list.length;
				if(l){
					if(l>1){
						_log.note(`Nodelist with ${l} nodes passed in, only returning first:`,nodes);
					}
					return nodes[0];
				}
				if(returnNull)
					return null;
				else
					_log.makeError("Empty nodelist passed in").throw();
			case 'object':
				//In case it's a MouseEvent from a click
				if(x.target && cX.varType(x.target)=='node')
					return x.target;
			default:
				// _log.error('Unsupported varType passed in as node:', Object.prototype.toString.call(x), x)
				// return undefined
				if(returnNull)
					return null;
				else
					_log.throwType('html string, id, query selector, node or nodelist',x);
		}
	}

	/*
		This function returns a live element given an id or a live element. NOTE: for single element/html id, use
		getLiveElement()

		@x*: A string id corresponding to an HMTL class, or a live HTMLcollection

		@return: A live HTMLcollection
	*/
	function getLiveElements(x){
		var type = cX.varType(x) 
		switch(type){
			case "string":
				//First assume it's a class, with or without leading '.'
				var nodes=document.getElementsByClassName(x.substr(0,1)=='.' ? x.substr(1) : x);
				if(nodes.length)
					return nodes;

				//Then try is as a selector
				var nodes=document.querySelectorAll(x);
				if(!nodes.length)
					_log.note(`No elements matched class/selector '${x}'`);
				return nodes; //return nodelist, empty or not

			case "nodelist":
				if(!x.length)
					_log.note("Empty nodelist");
				return x;
			case "node":
				return Array(x) //return an "HTMLcollection-like" object... ie. can be looped the same way...
			default:
				_log.throw('Unsupported varType passed in as element: '+type);
		}
	}






	/*
	* @param string
	* @throw <ble TypeError> 	Not a string
	* @throw <ble SyntaxError> 	Malformated html string
	* @return <HTMLElement>
	*/
	function stringToHtml(htmlStr){
		cX.checkType('string',htmlStr);
		var wrapper=document.createElement('div');
		wrapper.innerHTML=htmlStr; //NOTE: different browsers will attempt to deal with malformed html differently, so make sure to pass good HTML
		var node=wrapper.children[0];
		var t=cX.varType(node)
		if(t!='node')
			this.log.makeError("Bad HTML string, could not create HTMLElement").setCode("SyntaxError").throw();
		return node;
		
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
		_log.trace( 'subDataset() called with args: ', arguments)
		cX.checkTypes(['node','string'],[node,datasetAttr]);

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

		_log.trace('subDataset() finished with outcome: ', info)
		
		if(cX.isEmpty(data)) 
			_log.debug('No props found on node for data attr: ',datasetAttr)
		else{
			_log.debug('Found sub-dataset: ', data)
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
		vX.checkTypes(['node',['object','array']],arguments);
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
		if(cX.varType(nodelist)=='nodelist'){

			var idList = [] //return array

			Array.prototype.slice.call(nodelist).forEach(function(elem){
				idList.push(elem.id)
			}) 

			return idList;
		} else {
			_log.warn('Unsupported format ('+_vars.varType(nodelist)+') passed to getIdsFromNodelist: ', nodelist)
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
		cX.checkTypes(['node','string'],[node,attr]);

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
			_log.makeEntry('warn',`Attribute '${attr}' contained bad JSON:`,err.message,node).throw('SyntaxError');
		}
	}






















	/*
	* Create an input element from instructions.
	*
	* @param string name
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
		cX.checkTypes(['string','string','array'],[name,type,items])
		
		var input;
		switch(type){
			case 'radioset':
				input=createInput.radioset(items); break;
			case 'checklist':
				input=createInput.checklist(items); break;
			case 'select':
			case 'dropdown':
				input=createInput.dropdown(items); break;
			case 'toggle':
				input=createInput.toggle(); break;
			case 'textarea':
				input=document.createElement('textarea'); break;
			default:
				input=document.createElement('input');
				input.type=type;
		}

		input.name=name;

		return input;
	}



	createInput.radioset=function createRadioSet(items){
		let fieldset=createFieldset('radioset')

		//the checklist gets and sets an array
		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>{
				return Array.from(fieldset.querySelectorAll('input[type=checkbox]:checked')).map(elem=>elem.value)
			}
			,set:(arr)=>{
				if(cX.checkType(['primitive','array'],arr)!='array'){
					arr=[arr];
				}
				//Set the state of each checkbox according to the array (ie. unselect all not mentioned)
				fieldset.querySelectorAll('input[type=checkbox]').forEach(elem=>elem.checked=arr.includes(elem.value));
				return;
			}
		})

		if(cX.varType(items)!='array' || !items.length){
			_log.warn("Creating an empty radioset, ie. without actual <input type='radio'>s",fieldset);
		}else{
			addFieldsetItems(fieldset,'radio',items);
		}

		return fieldset;
	}


	createInput.checklist=function createChecklist(items){
		let fieldset=createFieldset('checklist')

		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>{
				return Array.from(fieldset.querySelectorAll('input[type=checkbox]:checked')).map(elem=>elem.value)
			}
			,set:(arr)=>{
				if(cX.checkType(['primitive','array'],arr)!='array'){
					arr=[arr];
				}
				//Set the state of each checkbox according to the array (ie. unselect all not mentioned)
				fieldset.querySelectorAll('input[type=checkbox]').forEach(elem=>elem.checked=arr.includes(elem.value));
				return;
			}
		})

		if(cX.varType(items)!='array' || !items.length){
			_log.warn("Creating an empty checklist, ie. without actual <input type='checkbox'>s",fieldset);
		}else{
			addFieldsetItems(fieldset,'radio',items);
		}

		return fieldset;
	}



	createInput.dropdown=function createDropdown(options){
		let select=document.createElement('select');
		
		if(cX.varType(options)!='array' || !options.length){
			_log.warn("Creating an empty <select>, ie. the dropdown will not contain any <option>s",select);
		}else{
			//Create all the options
			options.forEach(opt=>{
				let o=document.createElement('option');
				if(typeof opt=='object'){
					o.value=opt.value;
					o.innerHTML=opt.label||opt.value;
				}else{
					o.value=o.innerHTML=opt;
				}
				
				select.appendChild(o);
			})
		}

		return select;
	}

	const toggleSliderCss=Object.freeze({
		'.toggle-wrapper':'position: relative;display: inline-block;width: 2em;height: 1em; border:0 none;padding:0;'
		,'.toggle-wrapper input':'opacity: 0;width: 0;height: 0;display:block;' //if 'block' is removed then <span> sits under <input>
		,'.toggle-slider':'position: absolute;cursor: pointer;top: 0;left: 0;right: 0;bottom: 0;border-radius: 1em;background-color: #ccc;-webkit-transition: .4s;transition: .4s;'
		,'.toggle-slider:before':'position: absolute;content: "";height: 0.8em;width: 0.8em;left: 0.1em;bottom: 0.09em;background-color: white;-webkit-transition: .4s;transition: .4s;border-radius: 50%;'
		,'input:checked + .toggle-slider':'background-color: #2196F3;'
		,'input:focus + .toggle-slider':'box-shadow: 0 0 1px #2196F3;'
		,'input:checked + .toggle-slider:before':'-webkit-transform: translateX(1em);-ms-transform: translateX(1em);transform: translateX(1em);'
	})
	// _exports.toggleSliderCss=toggleSliderCss
	createInput.toggle=function createToggle(){
		//This is another special case where we'll need >1 elem so we wrap it in a fieldset. This also gives
		//us the oppertunity to link the .value to the underlying .checked
		let fieldset=createFieldset('toggle')

		fieldset.classList.add('toggle-wrapper');

		//Allow accessing the checked state of the internal checkbox with a .value prop on the wrapper
		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>fieldset.querySelector('input[type=checkbox]').checked
			,set:(check)=>{fieldset.querySelector('input[type=checkbox]').checked=check?true:false}
		})

		//The actual input will be a checkbox...
		let input=document.createElement('input');
		input.type='checkbox';
		fieldset.appendChild(input);

		//...but we'll show a nice slider created by a span+css
		let span=document.createElement('span');
		span.classList.add('toggle-slider');
		span.setAttribute('onclick','javascript:event.stopImmediatePropagation();')
		  //^Only the <input> should emit a click event
		fieldset.appendChild(span);

		//This working as a slider is now dependent on some groovy css, @see toggleSliderCss and
		//use it together with createCSSRule() from styling.util.js
		
		return fieldset;
	}


	createInput.datetime=function createDateTime(options){
		let fieldset=createFieldset('datetime');

		//Add seperate inputs for date and time
		let date=document.createElement('input');
		date.type='date'
		fieldset.appendChild(date);

		let time=document.createElement('input');
		time.type='time'
		fieldset.appendChild(time);

		//Create getter/setter on the fieldset
		Object.defineProperty(fieldset,'value',{
			enumerable:true
			,get:()=>cX.makeDate(fieldset.querySelector('input[type=date]').value,fieldset.querySelector('input[type=time]').value)
			,set:(datetime)=>{
				fieldset.querySelector('input[type=date]').value=cX.formatDate(datetime);
				fieldset.querySelector('input[type=time]').value=cX.formatTime(datetime);
			}
		})

		return fieldset;
	}



	function createFieldset(type){
		let fieldset=document.createElement('fieldset');
		fieldset.setAttribute('bu-input',''); //flag so we can identify it easily
		fieldset.type=type; //does not do anything for form-api, but is used by getValueFromElem() and setValueOnElem()
		return fieldset;
	}

	/*
	* @param <HTMLElement> fieldset 	A <fieldset> elem 	NOTE: this live object will be appended
	* @param string type 				'radio' or 'checkbox'
	* @param array items 				Array of strings or of {label,value} used to create <input> children within the $fieldset
	*
	* @return void
	*/
	function addFieldsetItems(fieldset, type, items){
		
		//All radio inputs within a radioset need to have the same name, else more than one can be selected
		if(type=='radio')
			var groupname=cX.randomString(10); //10 characters should be enough...

		//Create and all items
		items.forEach(item=>{
			let input=document.createElement('input'), 
				label=document.createElement('label')
			;

			input.type=type;

			if(typeof opt=='object'){
				input.value=opt.value;
				l.innerHTML=opt.label||opt.value;
			}else{
				input.value=l.innerHTML=opt;
			}

			//Mark the input so we know it's a part of the fieldset
			input.setAttribute('bu-ignore','');

			//Radiosets need the groupname, see ^
			if(groupname)
				input.name=groupname

			//the input goes inside the label so you can click the entire label, then the label goes 
			//inside the overall fieldset
			label.appendChild(input);
			fieldset.appendChild(label);
		})

		//Since regard the fieldset as the ONLY input, we intercept the change and input events and 
		//change their target 
		fieldset.addEventListener('input',changeTargetToFieldset,{capture:true})
		fieldset.addEventListener('change',changeTargetToFieldset,{capture:true})

		return;
	}
	function changeTargetToFieldset(event){
		if(event.target!=this){
			event.stopImmediatePropagation();
			setTimeout(()=>this.dispatchEvent(evt))
			 //^a timeout is required, else "DOMException: The event is already being dispatched.""
		}
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
		if(cX.checkTypes(['node',['primitive','undefined']],[elem,value])[1]=='undefined')
			value='';


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
							let i=f.querySelector(`input[value=${value}][name=${elem.name}]`)
							if(i){
								//If we have a match, select it...
								i.checked=true;
							}else{
								//...else unselect all
								f.querySelectorAll(`input[name=${elem.name}]`).forEach(elem=>elem.checked=false);
							}

						}else{
							elem.checked=(elem.value==value)
						} 
					}
					return;				
				}
				break;

			case 'FIELDSET':
				if(node.type=='radioset' || node.type=='checklist'){
					//2020-03-23: these work like regular inputs now...
					break;
				}

			default:
				if(!elem.__proto__.hasOwnProperty('value')){
					if(!elem.childElementCount()){
						//If no children exist, the value is just set inside the elem... like an empty <span> being populated
						return setFirstTextNode(elem,value);
					}else{
						_log.makeError(`This <'${elem.tagName.toLowerCase()}'> does not have a .value prop AND it does have children`,elem)
							.throw('EINVAL');
					}
				}
		}
		
		//Now set the value and make sure it gets changed
		let before=elem.value;
		elem.value=value
		if(elem.value!=value){
			//Some changes we are not allowed, like setting a range to null/false/undefined
			if(elem.getAttribute('type')=='range' && !value && value!==0){
				_log.warn(`You cannot set a range to '${value}'. Default behavior was to set it to:`,elem.value);
				return;
			}
		//TODO 2020-03-27: we may want to throw ^ as well

			var str=`Failed to set value of <${elem.tagName}> to '${value}', `;
			str+=(elem.value==before ? 'it remains unchanged as ':'it was instead set to ')+`'${elem.value}'`
			_log.makeError(str,elem).throw();
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
		cX.checkType('node',node);
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
				val=(text?cX.stringToPrimitive(text.data):undefined);
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
				_log.warn("Input missing 'name' attribute, ignoring",input)
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

		if(cX.checkType(['primitive','undefined'],value)=='undefined')
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
		cX.checkType('node',elem);


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
	* Remove a class from an element, and if there are no more classes, remove the class attribute as well
	* for a nice and clean html
	*/
	function removeClass(elem,cls){
		elem=getLiveElement(elem);
		elem.classList.remove(cls);
		if(!elem.classList.length)
			elem.removeAttribute('class');
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
								_table:<table>
								head:{colA:<th>, colB:<th>, _tr:<tr>}
								body:[{colA:<td>, colB:<td>, _tr:<tr>},{}...,_tbody]
								addRow : method
								removeRow : method
								addCol : method - Adds a column to each row (th in thead, td in tbody)
								addColClass : method - add class to each th and td in a column

							}
	*/
	function createTable(columns){
		var obj={columns};



		obj._table=document.createElement('table');

		//Add head and header row
		let thead=document.createElement('thead');
		obj._table.appendChild(thead);
		let headrow=document.createElement('tr');
		thead.appendChild(headrow);
		
		//To get the real width, check every single row for the largest number of columns
		Object.defineProperty(obj,'width',{enumerable:true, get:()=>
			Array.from(obj._table.querySelectorAll('tr'))
				.reduce((max,tr)=>Math.max(max,tr.childElementCount()),0)
		})

		//Create a th for each column and add to return obj.head
		obj.head={};
		Object.defineProperty(obj.head,'_tr',{value:headrow});
		function addTh(col){
			let th=document.createElement('th');
			th.innerHTML=col;
			headrow.appendChild(th)
			obj.head[col]=th
		}
		columns.forEach(addTh);

		//Add body
		let tbody=document.createElement('tbody');
		obj._table.appendChild(tbody)
		Object.defineProperty(obj,'height',{enumerable:true, get:()=>tbody.childElementCount()})


		obj.body=[];
		Object.defineProperty(obj.body,'_tbody',{value:tbody});

		//Create a <td> with a couple of hidden methods to easily add an input or row-button
		function createCell(row,colName,innerHTML){
			let td=document.createElement('td');
			Object.defineProperties(td,{
				'_addButton':{value:function addButtonToCell(...args){return td.appendChild(createCustomEventButton.apply(this,args));}}
				,'_addInput':{value:function addInputToCell(...args){return td.appendChild(createInput.apply(this,args));}}
				,'_valueTarget':{get:()=>this.firstElementChild||this,value}
				,'_setValue':{value:function setCellValue(value){setValueOnElem(this._valueTarget,value)}}
				,'_getValue':{value:function getCellValue(){return getValueFromElem(this._valueTarget)}}
			})
			td.innerHTML=vX.isEmpty(innerHTML,null)?'':innerHTML //null is considered empty, but 0 and false are not
			row._tr.appendChild(td);
			row[colName]=td;
			return td;
		}

		obj.addRow=function addRow(data=[]){
			if(typeof data !='object' || !data)
				_log.throwType("object or array",data);

			//Create a row...
			let row={};
			let tr=document.createElement('tr');
			Object.defineProperty(row,'_tr',{value:tr});

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
			if(colClass){
				var col;
				for(col in colClass){
					row[col].classList.add(...colClass[col]);
				}
			}

			//...and add it to the body and the shorcut on our return element
			tbody.appendChild(tr);
			obj.body.push(row);
			return row;
		};

		/*
		* Remove a child <tr> element
		*
		* @param number i 	The index of the row in obj.body
		*
		* @return <tr>|undefined 	The removed row or undefined if none are left
		*/
		obj.removeRow=function removeRow(i){
			var row=obj.body[i];
			if(row){
				tbody.removeChild(row);
				return row;
			}else{
				return undefined;
			}
		}

		obj.empty=function empty(i){
			while(obj.body.length){
				obj.removeRow(0);
			}
		}

		obj.addCol=function addCol(name){
			columns.push(name);
			addTh(name);
			obj.body.forEach(row=>{
				let td=document.createElement('td');
				row._tr.appendChild(td);
				row[col]=td;
			})
		}

		var colClass; 
		obj.addColClass=function addColClass(col,cls){
			if(!colClass)
				colClass={};

			if(!colClass.hasOwnProperty(col))
				colClass[col]=[];
			colClass[col].push(cls);
			obj.head[col].classList.add(cls);
			obj.body.forEach(row=>row[col].classList.add(cls));
		}








		//Now return the object
		return obj;
	}


	/*
	* Create a <button> that emits a custom event when clicked INSTEAD of the 'click' event. 
	*
	* NOTE: This button can be cloned without loosing functionality
	*
	* @param string buttonText  	The caption on the button
	* @opt string eventName 		The name of the event to emit when the button is clicked
	* @opt object|primitive details Any additional details to add to the custom event. NOTE: objects will be set
	*								 on the button's dataset, ie. they will not remain live
	*
	* @return <HTMLElement> 	A <button> element
	*/
	function createCustomEventButton(buttonText,eventName=undefined,details=undefined){
		vX.checkTypes(['string',['string','undefined']],[buttonText,eventName]);

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
	* Run querySelectorAll() on multiple targets and/or with multiple selectors, optionally including the
	* targets themselves and/or grouping targets by selectors
	*
	* @param <HTMLElement>|<Nodelist> targets
	* @param string|array selectors
	* @flag 'group' 	Group nodes by selector
	* @flag 'class' 	Use getElementsByClassName instead which is faster. 
	* @flag 'self' 		If also using 'class', remember to seperate multiple classes with '.' NOT whitespace
	*
	* @throws <ble TypeError>
	* @throws other?
	*
	* @return array|object 		And object if flag 'group', else an array. Possibly empty. 
	*/
	function multiQuerySelector(targets,selectors,...flags){
		var types=cX.checkTypes([['node','nodelist'],['string','array'],['array','undefined','string']],arguments);
		targets=(types[0]=='node' ? [targets] : Array.from(targets));
		selectors=(types[1]=='string' ? [selectors] : Array.from(selectors));
		flags=(types[3]=='string' ? [flags] : flags) || [];
		
		let group=flags.includes('group')
			,self=flags.includes('self')
			,cls=flags.includes('class')
		;

		let func=(cls?'getElementsByClassName':'querySelectorAll');
		
		const all=group ? {} : [];
		
		for(let selector of selectors){
			let arr=all;
			if(group){
				if(!all.hasOwnProperty(selector))
					group[selector]=[];
				arr=group[selector]
			}
			
			//For the sake of .matches() we make sure single class names are prepended by a '.'. If
			//the user has supplied something like 'clsA clsB' then it's their own damn fault
			if(cls && self && selector.charAt(0)!='.'){
				selector='.'+selector;
			}

			for(let target of targets){
				arr.push.apply(arr,Array.from(target[func].call(target,selector)));
				
				if(self && target.matches(selector)){
					arr.push(target)
				}
			}
		}

		return all;
	}



	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=