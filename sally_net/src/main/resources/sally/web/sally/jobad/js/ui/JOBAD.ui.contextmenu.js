/*
	JOBAD 3 UI Functions - Context Menu
	JOBAD.ui.contextmenu.js
		
	Copyright (C) 2013 KWARC Group <kwarc.info>
	
	This file is part of JOBAD.
	
	JOBAD is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	JOBAD is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the GNU General Public License
	along with JOBAD.  If not, see <http://www.gnu.org/licenses/>.
*/

//Context Menu UI
JOBAD.UI.ContextMenu = {}

JOBAD.UI.ContextMenu.config = {
	'margin': 20, //margin from page borders
	'width': 250, //menu width
	'radiusConst': 50, //Radius spacing constant
	'radius': 20 //small radius size
};

var ContextMenus = JOBAD.refs.$([]);

/*
	Registers a context menu on an element. 
	@param	element jQuery element to register on. 
	@param	demandFunction Function to call to get menu. 
	@param	config	Configuration. 
		config.type Optional. Type of menu to use. 0 => jQuery UI menu, 1 => Pie menu. 
		config.open Optional. Will be called before the context menu is opened. 
		config.close Optional. Will be called after the context menu has been closed. 
		config.callback Optional. Will be called after a menu callback was called. 
		config.parentMenus	Optional. Parent menus not to remove on trigger. 
		config.element	Optional. Force to use this as an element for searching for menus. 
		config.callBackTarget	Optional. Element to use for callback. 
		config.callBackOrg	Optional. Element to use for callback. 
		config.unbindListener	Optional. Element to listen to for unbinds. 
		config.block	Optional. Always block the Browser context menu. 
		config.stopPropagnate	Optional. If set to true, will not propagnate menus (check parents if no menu is available). 
	@return the jquery element. 
*/
JOBAD.UI.ContextMenu.enable = function(element, demandFunction, config){

	var element = JOBAD.refs.$(element);
	var config = JOBAD.util.defined(config);

	if(typeof demandFunction != 'function'){
		JOBAD.console.warn('JOBAD.UI.ContextMenu.enable: demandFunction is not a function. '); //die
		return element;
	}
	
	//Force functions for all of this
	var typeFunction = JOBAD.util.forceFunction(config.type);
	var onCallBack = JOBAD.util.forceFunction(config.callback, true);
	var onOpen = JOBAD.util.forceFunction(config.open, true);
	var onShow = JOBAD.util.forceFunction(config.show, true);
	var onEmpty = JOBAD.util.forceFunction(config.empty, true);
	var onClose = JOBAD.util.forceFunction(config.close, true);
	var parents = JOBAD.refs.$(config.parents); 
	var block = JOBAD.util.forceBool(config.block, false);
	var stop = JOBAD.util.forceBool(config.stopPropagnate, false); 

	element.on('contextmenu.JOBAD.UI.ContextMenu', function(e){
		//control overrides

		if(e.ctrlKey){
			return true;
		}

		//are we hidden => do not trigger
		if(JOBAD.util.isHidden(e.target)){
			return false; //we're hidden
		}

		//get the targetElement
		var targetElement = (config.element instanceof JOBAD.refs.$)?config.element:JOBAD.refs.$(e.target);
		var orgElement = targetElement; 
		
		var result = false;
		while(true){
			result = demandFunction(targetElement, orgElement);
			result = JOBAD.UI.ContextMenu.generateMenuList(result); //generate the menu
			if(result.length > 0 || element.is(this) || stop){
				break;				
			}
			targetElement = targetElement.parent();
		}

		
		JOBAD.UI.ContextMenu.clear(config.parents);
		
		//we are empty => allow browser to handle stuff
		if(result.length == 0 || !result){
			onEmpty(orgElement); 
			return !block; 
		}


		//trigger the open callback
		onOpen(element);

		//get the type of the menu
		var menuType = typeFunction(targetElement, orgElement);
		if(typeof menuType == "undefined"){
			menuType = 0;
		}

		//create the context menu element
		var menuBuild = JOBAD.refs.$("<div>").addClass("ui-front"); //we want to be in front. 


		//a handler for closing
		var closeHandler = function(e){
			menuBuild
			.remove();
			onClose(element);
		};
		

		//switch between menu types
		if(menuType == 0 || JOBAD.util.equalsIgnoreCase(menuType, 'standard')){
			//build the standard menu
			menuBuild
			.append(
				JOBAD.UI.ContextMenu.buildContextMenuList(
					result, 
					JOBAD.util.ifType(config.callBackTarget, JOBAD.refs.$, targetElement), 
					JOBAD.util.ifType(config.callBackOrg, JOBAD.refs.$, orgElement), 
				onCallBack)
				.menu()
			).on('contextmenu', function(e){
				return (e.ctrlKey);
			}).css({
				"left": Math.min(mouseCoords[0], window.innerWidth-menuBuild.outerWidth(true)-JOBAD.UI.ContextMenu.config.margin), 
				"top":  Math.min(mouseCoords[1], window.innerHeight-menuBuild.outerHeight(true)-JOBAD.UI.ContextMenu.config.margin)
			});
		} else if(menuType == 1 || JOBAD.util.equalsIgnoreCase(menuType, 'radial')){

			//build the radial menu

			var eventDispatcher = JOBAD.refs.$("<span>");

			JOBAD.refs.$(document).trigger('JOBAD.UI.ContextMenu.unbind'); //close all other menus

			menuBuild
			.append(
				JOBAD.UI.ContextMenu.buildPieMenuList(result, 
					JOBAD.util.ifType(config.callBackTarget, JOBAD.refs.$, targetElement), 
					JOBAD.util.ifType(config.callBackOrg, JOBAD.refs.$, orgElement), 
					onCallBack,
					mouseCoords[0],
					mouseCoords[1]
				)
				.find("div")
				.click(function(){
					eventDispatcher.trigger('JOBAD.UI.ContextMenu.unbind'); //unbind all the others. 
					JOBAD.refs.$(this).trigger("contextmenu.JOBAD.UI.ContextMenu"); //trigger my context menu. 
					return false;
				}).end()
			)

			JOBAD.UI.ContextMenu.enable(menuBuild, function(e){
				return JOBAD.refs.$(e).closest("div").data("JOBAD.UI.ContextMenu.subMenuData");
			}, {
				"type": 0,
				"parents": parents.add(menuBuild),
				"callBackTarget": targetElement,
				"callBackOrg": orgElement,
				"unbindListener": eventDispatcher,
				"open": function(){
					eventDispatcher.trigger('JOBAD.UI.ContextMenu.unbind'); //unbind all the others.  
				},
				"empty": function(){
					eventDispatcher.trigger('JOBAD.UI.ContextMenu.unbind');
				},
				"callback": closeHandler,
				"block": true,
				"stopPropagnate": stop
			}); 
		} else {
			JOBAD.console.warn("JOBAD.UI.ContextMenu: Can't show Context Menu: Unkown Menu Type '"+menuType+"'. ")
			return true;
		}
		
	
		//set its css and append it to the body

		menuBuild
		.css({
			'width': JOBAD.UI.ContextMenu.config.width,
			'position': 'fixed'
		})
		.on('mousedown', function(e){
			e.stopPropagation();//prevent closemenu from triggering
		})
		.appendTo(JOBAD.refs.$("body"))

		onShow(menuBuild, result); 


		//unbind listener
		JOBAD.refs.$(document).add(config.unbindListener).add(menuBuild)
		.on("JOBAD.UI.ContextMenu.hide", function(){
			menuBuild.hide();
		})
		.on('JOBAD.UI.ContextMenu.unbind', function(e){
				closeHandler();
				JOBAD.refs.$(document).unbind('mousedown.UI.ContextMenu.Unbind JOBAD.UI.ContextMenu.unbind JOBAD.UI.ContextMenu.hide');
				e.stopPropagation();
				ContextMenus = ContextMenus.not(menuBuild);
		});

		JOBAD.refs.$(document)
		.one('mousedown.UI.ContextMenu.Unbind', function(){
			JOBAD.UI.ContextMenu.clear(); 
		})


		//add to all ContextMenus
		ContextMenus = ContextMenus.add(menuBuild);
		
		return false;
	});

	return element;

};

/*
	Disables the Context Menu. 
	@param element jQuery element to remove the context menu from. 
	@return the jquery element. 
*/
JOBAD.UI.ContextMenu.disable = function(element){
	element.off('contextmenu.JOBAD.UI.ContextMenu'); //remove listener
	return element;
};

/*
	Clears all context menus. 
	@param	keep	Menus to keep open. 
*/
JOBAD.UI.ContextMenu.clear = function(keep){
	var keepers = ContextMenus.filter(keep);
	var clearers = ContextMenus.not(keep).trigger("JOBAD.UI.ContextMenu.unbind").remove();
	ContextMenus = keepers;
};


/*
	Builds the menu html element for a standard context menu. 
	@param items The menu to build. 
	@param element The element the context menu has been requested on. 
	@param orgElement The element the context menu call originates from. 
	@returns the menu element. 
*/
JOBAD.UI.ContextMenu.buildContextMenuList = function(items, element, orgElement, callback){

	//get callback
	var cb = JOBAD.util.forceFunction(callback, function(){});

	//create ul
	var $ul = JOBAD.refs.$("<ul class='JOBAD JOBAD_Contextmenu'>");
	
	for(var i=0;i<items.length;i++){
		var item = items[i];
		
		//create current item
		var $li = JOBAD.refs.$("<li>").appendTo($ul);
		
		//create link
		var $a = JOBAD.refs.$("<a href='#'>")
		.appendTo($li)
		.text(item[0])
		.click(function(e){
			return false; //Don't follow link. 
		});

		if(item[2] != "none" ){
			$a.prepend(
				JOBAD.refs.$("<span class='JOBAD JOBAD_InlineIcon'>")
				.css({
					"background-image": "url('"+JOBAD.resources.getIconResource(item[2])+"')"
				})
			)
			
		}

		if(typeof item[3] == "string"){
			$li.attr("id", item[3]); 
		}
		
		(function(){
			if(typeof item[1] == 'function'){
				var callback = item[1];

				$a.on('click', function(e){
					JOBAD.refs.$(document).trigger('JOBAD.UI.ContextMenu.hide');
					callback(element, orgElement);
					cb(element, orgElement);
					JOBAD.refs.$(document).trigger('JOBAD.UI.ContextMenu.unbind');
				});	
			} else if(item[1] === false){
				$a.parent().addClass("ui-state-disabled"); 
			} else {
				$li.append(JOBAD.UI.ContextMenu.buildContextMenuList(item[1], element, orgElement, cb));
			}
		})()
	}
	return $ul;
};

/*
	Builds the menu html element for a pie context menu. 
	@param items The menu to build. 
	@param element The element the context menu has been requested on. 
	@param orgElement The element the context menu call originates from. 
	@returns the menu element. 
*/
JOBAD.UI.ContextMenu.buildPieMenuList = function(items, element, orgElement, callback, mouseX, mouseY){
	//get callback
	var cb = JOBAD.util.forceFunction(callback, function(){});

	//position statics
	
	var r = JOBAD.UI.ContextMenu.config.radius;
	var n = items.length;
	var R = n*(r+JOBAD.UI.ContextMenu.config.radiusConst)/(2*Math.PI);
	

	//minimal border allowed
	var minBorder = R+r+JOBAD.UI.ContextMenu.config.margin;

	//get the reight positions
	var x = mouseX; 
	if(x < minBorder){
		x = minBorder;
	} else if(x > window.innerWidth - minBorder){
		x = window.innerWidth - minBorder; 
	}

	var y = mouseY;
	if(y < minBorder){
		y = minBorder;
	} else if(y > window.innerHeight - minBorder){
		var y = window.innerHeight - minBorder; 
	}



	//create a container
	var $container = JOBAD.refs.$("<div class='JOBAD JOBAD_Contextmenu JOBAD_ContextMenu_Radial'>");
	for(var i=0;i<items.length;i++){
		var item = items[i];
		
		//compute position
		var t = (2*(n-i)*Math.PI) / items.length;
		var X = R*Math.sin(t)-r+x;
		var Y = R*Math.cos(t)-r+y;

		//create item and position
		var $item = JOBAD.refs.$("<div>").appendTo($container)
		.css({
			"top": y-r,
			"left": x-r,
			"height": 2*r,
			"width": 2*r
		}).addClass("JOBAD JOBAD_Contextmenu JOBAD_ContextMenu_Radial JOBAD_ContextMenu_RadialItem")

		$item.animate({
			"top": Y,
			"left": X
		}, 400);

		$item.append(
			JOBAD.refs.$("<img src='"+JOBAD.resources.getIconResource(item[2], {"none": "warning"})+"'>")
			.width(2*r)
			.height(2*r)
		);

		if(typeof item[3] == "string"){
			$item.attr("id", item[3]); 
		}
		
		(function(){
			var text = JOBAD.refs.$("<span>").text(item[0]);
			if(typeof item[1] == 'function'){
				var callback = item[1];

				$item.click(function(e){
					JOBAD.UI.hover.disable();
					JOBAD.refs.$(document).trigger('JOBAD.UI.ContextMenu.hide');
					callback(element, orgElement);
					cb(element, orgElement);
					JOBAD.refs.$(document).trigger('JOBAD.UI.ContextMenu.unbind');
				});		
			} else if(item[1] === false){
				$item.addClass("JOBAD_ContextMenu_Radial_Disabled");
			} else {
				$item.data("JOBAD.UI.ContextMenu.subMenuData", item[1]);
			}

			$item.hover(function(){
				JOBAD.UI.hover.enable(text, "JOBAD_Hover");
			}, function(){
				JOBAD.UI.hover.disable();
			})
		})()
	}

	return $container;
};


/*
	Generates a list menu representation from an object representation. 
	@param menu Menu to generate. 
	@returns the new representation. 
*/
JOBAD.UI.ContextMenu.generateMenuList = function(menu){
	var DEFAULT_ICON = "none";
	if(typeof menu == 'undefined'){
		return [];
	}

	if(menu === false){
		return []; 
	}

	var generateMenuItem = function(v){
		if(typeof v == "function" || v === false){
			return v; 
		} else {
			return JOBAD.UI.ContextMenu.generateMenuList(v);
		}
	};

	var generateMenuConfig = function(a, b){
		var config = {
			"icon": DEFAULT_ICON,
			"id": false
		}; 

		var a = JOBAD.util.defined(a); 
		var b = JOBAD.util.defined(b); 

		if(typeof a == "string"){
			config["icon"] = a; 
		} else if(JOBAD.util.isObject(a)){
			if(typeof a.icon == "string"){
				config["icon"] = a.icon; 
			}
			if(typeof a["id"] == "string"){
				config["id"] = a["id"]; 
			}
			return config; 
		}

		if(typeof b == "string"){
			config["id"] = b; 
		} else if(JOBAD.util.isObject(b)){
			if(typeof b.icon == "string"){
				config["icon"] = b.icon; 
			}
			if(typeof b["id"] == "string"){
				config["id"] = b["id"]; 
			}
		}
			

		return config; 
	}

	var res = [];
	if(JOBAD.util.isArray(menu)){
		//We have an array as the menu
		//=> generate an object style representation
		var newmenu = {}; 

		for(var i=0;i<menu.length;i++){
			var key = menu[i][0];
			var val = menu[i].slice(1); 

			newmenu[key] = val;
		}

		return (JOBAD.UI.ContextMenu.generateMenuList(newmenu)); 
	} else {
		for(var key in menu){
			if(menu.hasOwnProperty(key)){
				var val = menu[key];
				
				if(JOBAD.util.isArray(val)){
					//we have an array
					//check got everything individually 
					if(val.length == 0){
						//nothing here, lets disable it
						res.push([key, false, DEFAULT_ICON, false]);
					} else if(val.length == 1){
						//we have exactly length 1
						//we should act as if we are only that. 
						res.push([key, generateMenuItem(val[0]), DEFAULT_ICON, false]);
					} else if(val.length == 2 || val.length == 3){
						//we are of length 2 or 3 => generate config
						//if we have a string, then treat it as icon, otherwise assume a config style object

						var cfg = generateMenuConfig(val[1], val[2]); //generate the config

						res.push([key, generateMenuItem(val[0]), cfg["icon"], cfg["id"]]);
					} else {
						//overlength
						console.warn("JOBAD.UI.ContextMenu.generateMenuList: menu too long. ")
					}
				} else {
					//we are a single item. 
					res.push([key, generateMenuItem(val), DEFAULT_ICON, false]);
				}
			}
		}
	}
	return res;
};

/*
	Wraps a menu function
	@param menu Menu to generate. 
	@returns the new representation. 
*/
JOBAD.UI.ContextMenu.fullWrap = function(menu, wrapper){
	var menu = JOBAD.UI.ContextMenu.generateMenuList(menu);
	var menu2 = [];
	for(var i=0;i<menu.length;i++){
		if(typeof menu[i][1] == 'function'){
			(function(){
				var org = menu[i][1];
				menu2.push([menu[i][0], function(){
					return wrapper(org, arguments)
				}, menu[i][2]]);
			})();
		} else {
			menu2.push([menu[i][0], JOBAD.UI.ContextMenu.fullWrap(menu[i][1]), menu[i][2]]);
		}
		
	}
	return menu2;
};