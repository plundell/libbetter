//simpleSourceMap=/my_modules/util/browser/styling.util.js
//simpleSourceMap2=/lib/util/browser/styling.util.js
'use strict';
/*
* @module bu-browser-styling
* @author plundell
* @license MIT
* @description Helper functions related to css styling
*
* This module is required by bu-browser
*/
module.exports=function export_styleX(bu){

	

	//Methods to export
	var _exports={
		'increaseBrightness':increaseBrightness
		,'scrollBarWidth':scrollBarWidth
		,'colorToHex':colorToHex
		,'createCSSRule':createCSSRule
		,appendCSSRule
		,findCSSRule
		,getSameOriginStylesheets
	}
	  


	function increaseBrightness(hex, percent){
		// strip the leading # if it's there
		hex = hex.replace(/^\s*#|\s*$/g, '');

		// convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
		if(hex.length == 3){
			hex = hex.replace(/(.)/g, '$1$1');
		}

		var r = parseInt(hex.substr(0, 2), 16),
			g = parseInt(hex.substr(2, 2), 16),
			b = parseInt(hex.substr(4, 2), 16);

		percent=percent/100
		return '#' +
		   ((0|(1<<8) + r + (256 - r) * percent ).toString(16)).substr(1) +
		   ((0|(1<<8) + g + (256 - g) * percent ).toString(16)).substr(1) +
		   ((0|(1<<8) + b + (256 - b) * percent ).toString(16)).substr(1);
	}


	function scrollBarWidth(){
	  	var scrollDiv = document.createElement("div");
	  	scrollDiv.style = "width: 100px;"
					   +"height: 100px;"
					   +"overflow: scroll;"
					   +"position: absolute;"
					   +"top: -9999px;"
	  	;
	  	document.body.appendChild(scrollDiv);

		// Get the scrollbar width
		var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

		// Delete the DIV 
		document.body.removeChild(scrollDiv);

		return scrollbarWidth;
	}


	/*
	* Turn color name or hex into color hex, preceeded by '#'
	*
	* @param string c
	*
	* @return string 	#rrggbb  in lower case. Defaults to the color for gray
	*/
	function colorToHex(c){
		let m=c.match(/#?([A-Fa-f0-9]{6})/)
		if(m)
			return '#'+m[1].toLowerCase();

		c=c.toUpperCase();
		if(colors.hasOwnProperty(c))
			return colors[c].toLowerCase();
		else
			return colors['GRAY'].toLowerCase();
	}

	var colors={
		"WHITE":"#FFFFFF"
		,"AZURE":"#FFFFFF"
		,"MINTCREAM":"#FFFFFF"
		,"SNOW":"#FFFFFF"
		,"IVORY":"#FFFFFF"
		,"GHOSTWHITE":"#FFFFFF"
		,"FLORALWHITE":"#FFFFFF"
		,"ALICEBLUE":"#FFFFFF"
		,"LIGHTCYAN":"#CCFFFF"
		,"HONEYDEW":"#FFFFFF"
		,"LIGHTYELLOW":"#FFFFFF"
		,"SEASHELL":"#FFFFFF"
		,"LAVENDERBLUSH":"#FFFFFF"
		,"WHITESMOKE":"#FFFFFF"
		,"OLDLACE":"#FFFFFF"
		,"CORNSILK":"#FFFFCC"
		,"LINEN":"#FFFFFF"
		,"LIGHTGOLDENRODYELLOW":"#FFFFCC"
		,"LEMONCHIFFON":"#FFFFCC"
		,"BEIGE":"#FFFFCC"
		,"LAVENDER":"#CCCCFF"
		,"PAPAYAWHIP":"#FFFFCC"
		,"MISTYROSE":"#FFCCCC"
		,"ANTIQUEWHITE":"#FFFFCC"
		,"BLANCHEDALMOND":"#FFFFCC"
		,"BISQUE":"#FFFFCC"
		,"PALETURQUOISE":"#99FFFF"
		,"MOCCASIN":"#FFCCCC"
		,"GAINSBORO":"#CCCCCC"
		,"PEACHPUFF":"#FFCCCC"
		,"NAVAJOWHITE":"#FFCC99"
		,"PALEGOLDENROD":"#FFFF99"
		,"WHEAT":"#FFCCCC"
		,"POWDERBLUE":"#CCCCFF"
		,"AQUAMARINE":"#66FFCC"
		,"LIGHTGREY":"#CCCCCC"
		,"PINK":"#FFCCCC"
		,"LIGHTBLUE":"#99CCFF"
		,"THISTLE":"#CCCCCC"
		,"LIGHTPINK":"#FFCCCC"
		,"LIGHTSKYBLUE":"#99CCFF"
		,"PALEGREEN":"#99FF99"
		,"LIGHTSTEELBLUE":"#99CCCC"
		,"KHAKI":"#FFCC99"
		,"SKYBLUE":"#99CCFF"
		,"AQUA":"#00FFFF"
		,"CYAN":"#00FFFF"
		,"SILVER":"#CCCCCC"
		,"PLUM":"#CC99CC"
		,"GRAY":"#CCCCCC"
		,"LIGHTGREEN":"#99FF99"
		,"VIOLET":"#FF99FF"
		,"YELLOW":"#FFFF00"
		,"TURQUOISE":"#33CCCC"
		,"BURLYWOOD":"#CCCC99"
		,"GREENYELLOW":"#99FF33"
		,"TAN":"#CCCC99"
		,"MEDIUMTURQUOISE":"#33CCCC"
		,"LIGHTSALMON":"#FF9966"
		,"MEDIUMAQUAMARINE":"#66CC99"
		,"DARKGRAY":"#999999"
		,"ORCHID":"#CC66CC"
		,"DARKSEAGREEN":"#99CC99"
		,"DEEPSKYBLUE":"#00CCFF"
		,"SANDYBROWN":"#FF9966"
		,"GOLD":"#FFCC00"
		,"MEDIUMSPRINGGREEN":"#00FF99"
		,"DARKKHAKI":"#CCCC66"
		,"CORNFLOWERBLUE":"#6699FF"
		,"HOTPINK":"#FF66CC"
		,"DARKSALMON":"#FF9966"
		,"DARKTURQUOISE":"#00CCCC"
		,"SPRINGGREEN":"#00FF66"
		,"LIGHTCORAL":"#FF9999"
		,"ROSYBROWN":"#CC9999"
		,"SALMON":"#FF9966"
		,"CHARTREUSE":"#66FF00"
		,"MEDIUMPURPLE":"#9966CC"
		,"LAWNGREEN":"#66FF00"
		,"DODGERBLUE":"#3399FF"
		,"YELLOWGREEN":"#99CC33"
		,"PALEVIOLETRED":"#CC6699"
		,"MEDIUMSLATEBLUE":"#6666FF"
		,"MEDIUMORCHID":"#CC66CC"
		,"CORAL":"#FF6666"
		,"CADETBLUE":"#669999"
		,"LIGHTSEAGREEN":"#339999"
		,"GOLDENROD":"#CC9933"
		,"ORANGE":"#FF9900"
		,"LIGHTSLATEGRAY":"#669999"
		,"FUCHSIA":"#FF00FF"
		,"MAGENTA":"#FF00FF"
		,"MEDIUMSEAGREEN":"#33CC66"
		,"PERU":"#CC9933"
		,"STEELBLUE":"#3399CC"
		,"ROYALBLUE":"#3366CC"
		,"SLATEGRAY":"#669999"
		,"TOMATO":"#FF6633"
		,"DARKORANGE":"#FF9900"
		,"SLATEBLUE":"#6666CC"
		,"LIMEGREEN":"#33CC33"
		,"LIME":"#00FF00"
		,"INDIANRED":"#CC6666"
		,"DARKORCHID":"#9933CC"
		,"BLUEVIOLET":"#9933FF"
		,"DEEPPINK":"#FF0099"
		,"DARKGOLDENROD":"#CC9900"
		,"CHOCOLATE":"#CC6633"
		,"DARKCYAN":"#009999"
		,"DIMGRAY":"#666666"
		,"OLIVEDRAB":"#669933"
		,"SEAGREEN":"#339966"
		,"TEAL":"#009999"
		,"DARKVIOLET":"#9900CC"
		,"MEDIUMVIOLETRED":"#CC0066"
		,"ORANGERED":"#FF3300"
		,"OLIVE":"#999900"
		,"SIENNA":"#996633"
		,"DARKSLATEBLUE":"#333399"
		,"DARKOLIVEGREEN":"#666633"
		,"FORESTGREEN":"#339933"
		,"CRIMSON":"#CC0033"
		,"BLUE":"#0000FF"
		,"DARKMAGENTA":"#990099"
		,"DARKSLATEGRAY":"#336666"
		,"SADDLEBROWN":"#993300"
		,"BROWN":"#993333"
		,"FIREBRICK":"#993333"
		,"PURPLE":"#990099"
		,"GREEN":"#009900"
		,"RED":"#FF0000"
		,"MEDIUMBLUE":"#0000CC"
		,"INDIGO":"#330099"
		,"MIDNIGHTBLUE":"#000066"
		,"DARKGREEN":"#006600"
		,"DARKBLUE":"#000099"
		,"NAVY":"#000099"
		,"DARKRED":"#990000"
		,"MAROON":"#990000"
		,"BLACK":"#000000"
	}

	/*
	* Add a rule to the first viable stylesheet of the document. Based on this answer: 
	*	https://stackoverflow.com/a/8630641
	*
	* NOTE: There crossorigin issues with this, and different browsers handle it differently (eg. firefox
	*		throws and error, while chrome won't let you see those tags to begin with, so you can't
	*		cause an error). Where this error is most likely to occur is with <style> tags as opposed to <link> 
	*		tags which seemingly are treated as a different origin
	* 
	* @param string selector  Any css selector, ie. the part that comes before the {}
	* @param string style 	  Everything that goes between {} in a css file
	* @opt boolean replace    If an identical selector already exists, replace it's contents
	*
	* @throw Error 		If the document is not compatible with creating rules 
	*
	* @return void
	*/
	function createCSSRule (selector, style, replace=false) {
		if(!document.styleSheets || document.getElementsByTagName('head').length == 0) 
			throw new Error("This document/browser doesn't support creating CSS selectors");

		//Get a list of stylesheets that we are allowed to edit and that will affect the screen
		var styleSheets=getSameOriginStylesheets().filter(ss=>{
			//Only include enabled stylesheets
			if(ss.disabled)
				return false;

			//Only include those that affect screens (?? we may not want this behaviour)
			let mediaText=typeof ss.media=='string' ? ss.media : ss.media.mediaText;
			if(!mediaText||mediaText=='all'||mediaText.indexOf('screen')>-1)
				return true
			else
				return false;
		});


		
		try{
			//If we're replacing an existing rule, look through all rules in all stylesheets...
			if(replace){
				let rule=findCSSRule(selector,styleSheets);
				rule.cssText=style;
				bu._log.debug("Replaced existing CSS rule",rule);
				return rule;
			}
		}catch(err){
			bu._log.warn("Failed to replace existing rule, will try to append next...",err);
		}

		//If none was found, try creating one as the last item of the last stylesheet (so it 
		//gets highest priority)
		try{
			let sheet=styleSheets.pop();
			if(!sheet){
				bu._log.note("No style sheet found at all, is that correct?");
			}else{
				return appendCSSRule(sheet,selector,style);
			}
		}catch(err){
			bu._log.warn("Failed to add rule to existing stylesheet, will try creating own stylesheet next...",err);	
		}

			
		//If we're still running, this means we failed to use existing sheets, so create a new one
		//and insert the rule there
		try{
			var styleSheet = document.createElement('style');
			styleSheet.type = 'text/css';
			document.head.appendChild(styleSheet);
			return appendCSSRule(styleSheet,selector,style);
		}catch(err){
			bu._log.throw("Failed to create a CSS rule in an existing or new styleSheet.",err);
		}
	}


	/*
	* Appends a CSS rule to the end of a stylesheet
	*
	* @param <HTMLElement>|<CSSStyleSheet> styleSheet
	* @param string selector
	* @param string style
	*
	* @throw <ble Error> 	If no rule was appended
	*
	* @return <CSSRule>
	*/
	function appendCSSRule(styleSheet, selector, style){
		//If a live style elem is passed, just call this method again with the style sheet
		if(bu.varType(styleSheet)=='node'){
			if(styleSheet.sheet)
				return appendCSSRule(styleSheet.sheet,selector,style);
			else
				bu._log.makeTypeError("a <style> elem",styleSheet).throw();
		}

		bu.checkTypes(['<CSSStyleSheet>','string','string'],arguments);

		var rule;
		if(typeof styleSheet.insertRule=='function'){ //modern version
			var pos=styleSheet.insertRule(`${selector}{${style}}`, styleSheet.cssRules.length); //default to first, so we specify last
			if(pos!=styleSheet.cssRules.length-1)
				bu._log.warn(`A CSS rule was inserted at index ${pos}, which is not the end`,styleSheet.cssRules);
			rule=styleSheet.cssRules[pos];
		}else if(typeof styleSheet.addRule=='function'){ //legacy from Microsoft
			styleSheet.addRule(selector,style); //defaults to last position
			rule=styleSheet.rules[styleSheet.length-1];
		}
		if(rule)
			return rule;
		else
			bu._log.makeError('No rule was created. Dont know why? Called with:',arguments).throw();
	}


	/*
	* @param string selector
	* @opt array-like styleSheets 	The style sheets to look through (remember, they need to be same origin)
	*
	* @return <CSSStyleRule>|undefined
	*/
	function findCSSRule(selector,styleSheets=null){
		styleSheets=Array.from(styleSheets)||getSameOriginStylesheets();
		for(var ss of styleSheets){
			let rules=(typeof ss.media=='string' ? ss.rules : ss.cssRules), l=rules.length;
			for (var i = 0; i < l; i++) {
				if(rules[i].selectorText && rules[i].selectorText.toLowerCase()==selector.toLowerCase()) {
					return rules[i];
				}
			}
		}

	}

	/*
	* @return array[<StyleSheet>]
	*/
	function getSameOriginStylesheets(){
		if(!document.styleSheets || !document.styleSheets.length)
			return [];

		return Array.from(document.styleSheets).filter(ss=>{
			try{
				ss.cssRules||ss.rules
				return true;
			}catch(err){
				return false;
			}
		})
	}
	/*
	* @return array[<StyleSheet>]
	*/
	function getSameOriginStylesheets2(){
		if(!document.styleSheets || !document.styleSheets.length)
			return [];

		//Get the origin of this script
		let origin=bu.getOrigin(document.currentScript);

		return Array.from(document.styleSheets).filter(ss=>origin==bu.getOrigin(ss))
	}




	return _exports;
}
//simpleSourceMap=
//simpleSourceMap2=