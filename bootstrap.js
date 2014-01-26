/*start - global vars*/
const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm} = Components;
var selfPath; //note: file system on windows uses \ (forward slash)) but firefox browser uses / (backward slash) //do not edit //the jar will have forward slashes but to navigate so if just want a file within the main folder its selfPath + fileName. but if want folder its selfPath + fileName + '\\'fileInFolder //so as u can see must use forward slashes to navigate folders
//start-globals editable

//end-globals editable
/*end - global vars*/


/*start - lazy getter*/
//start-globals
var lgLoaded = {}; //loaded services from lazy getter
var lgPreset = {
	wm: {
		abbr: 'wm',
		format: 0,
		_1: 'classes',
		_2: '@mozilla.org/appshell/window-mediator;1',
		_3: 'getService',
		_4: 'interfaces',
		_5: 'nsIWindowMediator'
	},
	zw: {
		abbr: 'zw',
		format: 0,
		_1: 'classes',
		_2: '@mozilla.org/zipwriter;1',
		_3: 'createInstance',
		_4: 'interfaces',
		_5: 'nsIZipWriter'
	},
	s: {
		abbr: 's',
		format: 1,
		_1:	'resource://gre/modules/Services.jsm'
	},
	xu: {
		abbr: 'XPCOMUtils',
		format: 1,
		_1:	'resource://gre/modules/XPCOMUtils.jsm'
	},
	fu: {
		abbr: 'fu',
		format: 1,
		_1:	'resource://gre/modules/FileUtils.jsm'
	},
	am: {
		abbr: 'am',
		format: 1,
		_1:	'resource://gre/modules/AddonManager.jsm'
	}
}
//end-globals
function lg(obj) { //lazy getter
	//obj properties: abbr, format, _1, _2, _3, _4
	if (obj.format == 0) {//Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
		//_1 = 'classes'
		//_2 = '@mozila.org/alerts-service;1'
		//_3 = 'interfaces';
		//_4 = 'getService'
		//_5 = 'nsIAlertsService'
		if (!(obj.abbr in lgLoaded)) {
			lgLoaded[obj.abbr] = Components[obj._1][obj._2][obj._3](Components[obj._4][obj._5]);
		}
		return lgLoaded[obj.abbr];
	} else if (obj.format == 1) { //jsm
		//_1 = 'resource://gre/modules/XPCOMUtils.jsm'
		if (!(obj.abbr in lgLoaded)) {
			Components.utils.import(obj._1);
			lgLoaded[obj.abbr] = 1;
		}
		return true;
	}
}
/*end - lazy getter*/

/*start - about module*/
//start-globals
var AboutModuleUnloaders = [];
//end-globals
function AboutModule() {}

function registerAbout() {
	lg(lgPreset.xu);
	lg(lgPreset.s);
	AboutModule.prototype = {
		uri: Services.io.newURI(selfPath + 'frontend/frontend.htm', null, null), //EXAMPLE1: uri: Services.io.newURI('http://www.bing.com/', null, null), //EXAMPLE2: uri: Services.io.newURI('chrome://about-addons-memory/content/about.xhtml', null, null)
		classDescription: 'XPICompiler Frontend',
		classID: Components.ID('8be6e840-85fe-11e3-baa7-0800200c9a66'), //EXAMPLE: classID: Components.ID('1704E6F0-8039-11E3-9CE1-C4766188709B'),
		contractID: '@mozilla.org/network/protocol/about;1?what=xpiler', //EXAMPLE: contractID: '@mozilla.org/network/protocol/about;1?what=yabba'
		QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
		newChannel: function (aURI) {
			let chan = Services.io.newChannelFromURI(this.uri);
			chan.originalURI = aURI;
			return chan;
		},
		getURIFlags: function (aURI) 0
	};
	for (let[y, cls] in Iterator([AboutModule])) {
	   //Cu.reportError('y: ' + y);
	   //Cu.reportError('cls: ' + cls);
		try {
			var factory = {
				_cls: cls,
				createInstance: function (outer, iid) {
					if (outer) {
						throw Cr.NS_ERROR_NO_AGGREGATION;
					}
					return new cls();
				}
			};
			Cm.QueryInterface(Ci.nsIComponentRegistrar);
			Cm.registerFactory(cls.prototype.classID, cls.prototype.classDescription, cls.prototype.contractID, factory);
			AboutModuleUnloaders.push(function(){
			 Cm.unregisterFactory(factory._cls.prototype.classID, factory);
			});
		} catch (ex) {
			Cu.reportError('failed to register module: ' + cls.name + '\nexception thrown: ' + ex);
		}
	}
}

function unregisterAbout() {
	for (var i=0; i<AboutModuleUnloaders.length; i++) {
		AboutModuleUnloaders[i]();
	}
}
/*end - about module*/

function listenPageLoad(event) {
  if (event.originalTarget instanceof Ci.nsIDOMHTMLDocument) {
    var win = event.originalTarget.defaultView;
    if (win.frameElement) {
      return;
    }
	
	if (win.document.location == 'about:xpiler') {
	
		//start - allow only one instance of about:xpiler
		var foundXpilers = []; //holds xpilers as we find them as we loop thru all win and tabs
		let XULWindows = lg(lgPreset.wm).getEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIDOMWindow);
			if (aDOMWindow && aDOMWindow.gBrowser) {
				if (aDOMWindow.gBrowser.tabContainer) {
					var numTabs = aDOMWindow.gBrowser.tabContainer.childNodes.length;
					for (var i=0; i<numTabs; i++) {
						var tabBrowser = aDOMWindow.gBrowser.tabContainer.childNodes[i].linkedBrowser;
						if (tabBrowser.contentWindow.location == 'about:xpiler') {
							aDOMWindow.focus();
							aDOMWindow.gBrowser.selectedTab = aDOMWindow.gBrowser.tabContainer.childNodes[i];
							aDOMWindow.window.alert('about:xpiler found here, just focused')
							
							let firstXpiler = tabBrowser.contentWindow.wrappedJSObject.firstXpiler;
							
							foundXpilers.push({
								aDOMWindow: aDOMWindow,
								tab: aDOMWindow.gBrowser.tabContainer.childNodes[i],
								firstXpiler: firstXpiler
							});
						}
					}
				} else {
					if (aDOMWindow.gBrowser.contentWindow.location == 'about:xpiler') {
						aDOMWindow.focus();
						aDOMWindow.window.alert('about:xpiler found here, just focused')
						
						let firstXpiler = tabBrowser.contentWindow.wrappedJSObject.firstXpiler;
						
						foundXpilers.push({
							aDOMWindow: aDOMWindow,
							firstXpiler: firstXpiler
						});
					}
				}
			}
		}
		
		Cu.reportError('foundXpilers len = ' + foundXpilers.length);
		var foundXpilerI = -1;
		if (foundXpilers.length == 1) {
			foundXpilers[0].aDOMWindow.alert('setting this to firstXpiler')
			if (foundXpilers[0].tab) {
				foundXpilers[0].tab.linkedBrowser.contentWindow.wrappedJSObject.firstXpiler = true;
			} else {
				foundXpilers[0].aDOMWindow.gBrowser.contentWindow.wrappedJSObject.firstXpiler = true;
			}
		} else {
			for (var i=0; i<foundXpilers.length; i++) {
				if (!foundXpilers[i].firstXpiler) {
					if (foundXpilers[i].tab) {
						foundXpilers[i].aDOMWindow.focus();
						foundXpilers[i].aDOMWindow.gBrowser.selectedTab = foundXpilers[i].tab;
						foundXpilers[i].aDOMWindow.alert('this is a found xpiler and it is NOT firstXpiler so closing');
						foundXpilers[i].aDOMWindow.gBrowser.removeTab(foundXpilers[i].tab);
					} else {
						foundXpilers[i].aDOMWindow.focus();
						foundXpilers[i].aDOMWindow.alert('this is a found xpiler and it is NOT firstXpiler so closing');
						foundXpilers[i].aDOMWindow.close();
					}
				} else {
					foundXpilerI = i;
				}
			}
			
			//focus firstXpiler note: think about just doing the focus first in above loop when it is found, and when closing stuff no need to focus them first
			if (foundXpilers[foundXpilerI].tab) {
				foundXpilers[foundXpilerI].aDOMWindow.focus();
				foundXpilers[foundXpilerI].aDOMWindow.gBrowser.selectedTab = foundXpilers[foundXpilerI].tab;
				foundXpilers[foundXpilerI].aDOMWindow.alert('just focused u on the found xpiler');
			} else {
				foundXpilers[foundXpilerI].aDOMWindow.focus();
				foundXpilers[foundXpilerI].aDOMWindow.alert('just focused u on the found xpiler');
			}
		}

		//end - allow only one instance of about:xpiler
		
		lg(lgPreset.wm).getMostRecentWindow("navigator:browser").window.alert('about:xpiler loaded');
		
		var btnBrowse = win.document.querySelector('#browse span.browse');
		var btnCompile = win.document.querySelector('#browse span.compile');
		var fieldBrowse = win.document.querySelector('#browse input');
		
		var paneXpis = win.document.querySelector('#xpis');
		var paneRecs = win.document.querySelector('#folders');
		
		
	}
  }
}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = lg(lgPreset.wm).getEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		lg(lgPreset.wm).addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = lg(lgPreset.wm).getEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		lg(lgPreset.wm).removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (aDOMWindow && aDOMWindow.gBrowser) {
			aDOMWindow.addEventListener('DOMContentLoaded', listenPageLoad, false);
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (aDOMWindow && aDOMWindow.gBrowser) {
			aDOMWindow.removeEventListener('DOMContentLoaded', listenPageLoad, false);
		}
	}
};
/*end - windowlistener*/







function startup(aData, aReason) {
	Cu.reportError('startup');
	
	selfPath = aData.resourceURI.spec; //has final slash at end so for use use as: "aData.resourceURI.spec + 'bootstrap.js'" this gets the bootstrap file //note the final slash being a backward "/" is very important
	
	windowListener.register();
	registerAbout();
	
	Cu.reportError('startup finished');
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	Cu.reportError('shutdown start');
	
	unregisterAbout();
	windowListener.unregister();
	
	Cu.reportError('shutdown finished');
}

function install() {}

function uninstall() {}