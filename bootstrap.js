/*start - global vars*/
const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm} = Components;
var Cm_QIed = false;
var selfPath; //note: file system on windows uses \ (forward slash)) but firefox browser uses / (backward slash) //do not edit //the jar will have forward slashes but to navigate so if just want a file within the main folder its selfPath + fileName. but if want folder its selfPath + fileName + '\\'fileInFolder //so as u can see must use forward slashes to navigate folders
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/NetUtil.jsm');
var cServ = {};
XPCOMUtils.defineLazyGetter(cServ, 'zw', function () {
	return Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);
});
XPCOMUtils.defineLazyGetter(cServ, 'fp', function () {
	return Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
});
var pr = {PR_RDONLY: 0x01, PR_WRONLY: 0x02, PR_RDWR: 0x04, PR_CREATE_FILE: 0x08, PR_APPEND: 0x10, PR_TRUNCATE: 0x20, PR_SYNC: 0x40, PR_EXCL: 0x80};
//start-globals editable

//end-globals editable
/*end - global vars*/


/*start - about module*/
//start-globals
var AboutModuleUnloaders = [];
//end-globals
function AboutModule() {}

function registerAbout() {
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
			if (!Cm_QIed) {
				Cm.QueryInterface(Ci.nsIComponentRegistrar);
				Cm_QIed = true;
			}
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
//start-globals
var btnBrowse;
var btnCompile;
var fieldBrowse;
var paneXpis;
var paneRecs;
var jsWin;
var xWin;
var xDoc;
var autocompleteBrowse;

//end-globals
function listenPageLoad(event) {
  if (event.originalTarget instanceof Ci.nsIDOMHTMLDocument) {
    var win = event.originalTarget.defaultView;
    if (win.frameElement) {
      return;
    }
	
	if (win.document.location == 'about:xpiler') {
	
		//start - allow only one instance of about:xpiler
		var foundXpilers = []; //holds xpilers as we find them as we loop thru all win and tabs
		let XULWindows = Services.wm.getEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIDOMWindow);
			if (aDOMWindow && aDOMWindow.gBrowser) {
				if (aDOMWindow.gBrowser.tabContainer) {
					//aDOMWindow.alert('has gBrowser tabContainer');
					var numTabs = aDOMWindow.gBrowser.tabContainer.childNodes.length;
					for (var i=0; i<numTabs; i++) {
						var tabBrowser = aDOMWindow.gBrowser.tabContainer.childNodes[i].linkedBrowser;
						if (tabBrowser.contentWindow.location == 'about:xpiler') {
							aDOMWindow.focus();
							aDOMWindow.gBrowser.selectedTab = aDOMWindow.gBrowser.tabContainer.childNodes[i];
							//aDOMWindow.window.alert('about:xpiler found here, just focused')
							
							let firstXpiler = tabBrowser.contentWindow.wrappedJSObject.firstXpiler;
							
							foundXpilers.push({
								aDOMWindow: aDOMWindow,
								tab: aDOMWindow.gBrowser.tabContainer.childNodes[i],
								firstXpiler: firstXpiler
							});
						}
					}
				} else {
					//aDOMWindow.alert('has gBrowser BUT NO tabContainer');
					if (aDOMWindow.gBrowser.contentWindow.location == 'about:xpiler') {
						aDOMWindow.focus();
						//aDOMWindow.window.alert('about:xpiler found here, just focused')
						
						let firstXpiler = aDOMWindow.gBrowser.contentWindow.wrappedJSObject.firstXpiler;
						
						foundXpilers.push({
							aDOMWindow: aDOMWindow,
							firstXpiler: firstXpiler
						});
					}
				}
			} else {
				//aDOMWindow.alert('DOES NOT HAVE gBrowser or tabContainer');
				//do not support because everytime page changes it loses the event handlers i attached to it
			}
		}
		
		Cu.reportError('foundXpilers len = ' + foundXpilers.length);
		var foundXpilerI = -1;
		if (foundXpilers.length == 1) {
			//foundXpilers[0].aDOMWindow.alert('setting this to firstXpiler')
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
				//foundXpilers[foundXpilerI].aDOMWindow.alert('just focused u on the found xpiler');
			} else {
				foundXpilers[foundXpilerI].aDOMWindow.focus();
				//foundXpilers[foundXpilerI].aDOMWindow.alert('just focused u on the found xpiler');
			}
		}

		//end - allow only one instance of about:xpiler
		
		//Services.wm.getMostRecentWindow("navigator:browser").window.alert('about:xpiler loaded');
		btnBrowse = win.document.querySelector('#browse span.browse');
		btnCompile = win.document.querySelector('#browse span.compile');
		fieldBrowse = win.document.querySelector('#browse input');
		paneXpis = win.document.querySelector('#xpis');
		paneRecs = win.document.querySelector('#folders');
		jsWin = win.wrappedJSObject;
		xWin = win;
		xDoc = win.document;
		autocompleteBrowse = win.document.querySelector('#browseac');
		
		btnBrowse.addEventListener('click', btnBrowse_click, false);
		btnCompile.addEventListener('click', btnCompile_click, false);
		fieldBrowse.addEventListener('focus', fieldBrowse_focus, false);
		fieldBrowse.addEventListener('keydown', fieldBrowse_keydown, false);
		fieldBrowse.addEventListener('keyup', fieldBrowse_keyup, false);
		paneXpis.addEventListener('click', paneXpis_click, false);
		paneRecs.addEventListener('click', paneRecs_click, false);
		
		readHistoryFile();
		
	}
  } else {
	//win.alert('is not instance of htmldocument')
  }
}

function createHistoryDom() {
		//do folders
		if (historyJson.recs.length > 0) {
			xDoc.querySelector('#folders div.nohistory').style.display = 'none'; //hide the nohistory div
		} else {
			xDoc.querySelector('#folders div.nohistory').style.display = '';
		}
		for (var i=0; i<historyJson.recs.length; i++) {
			var el = xDoc.createElement('div')
			el.setAttribute('class', 'folder');
			var order = ((historyJson.recs[i][1] - new Date('2014-01-01T02:39:12.537Z').getTime()) / 1000).toFixed(0);
			el.setAttribute('style','order:' + order + ';');
			var content = {};
			content.path = historyJson.recs[i][0].replace(/\\\\/g,'\\');
			content.name = content.path.substr(content.path.lastIndexOf('\\')+1)
			el.innerHTML = '<span xfield="name" content="' + content.name + '"></span><span xfield="path" content="' + content.path + '"></span>';
			paneRecs.appendChild(el);
			//added
		}

		//do xpis
		if (historyJson.xpis.length > 0) {
			xDoc.querySelector('#xpis div.nohistory').style.display = 'none'; //hide the nohistory div
		} else {
			xDoc.querySelector('#xpis div.nohistory').style.display = '';
		}
		for (var i=0; i<historyJson.xpis.length; i++) {
			var el = xDoc.createElement('div')
			el.setAttribute('class', 'xpi');
			var order = ((historyJson.xpis[i][1] - new Date('2014-01-01T02:39:12.537Z').getTime()) / 1000).toFixed(0);
			el.setAttribute('style','order:' + order + ';');
			var content = {};
			content.path = historyJson.xpis[i][0].replace(/\\\\/g,'\\');
			content.name = content.path.substring(content.path.lastIndexOf('\\')+1,content.path.lastIndexOf('.')); //we dont want file extension to show in name so lastIndexOf('.xpi')
			content.lastCompiled = new Date(historyJson.xpis[i][1]).toRelativeTime();
			content.sizecompress = format_bytes(historyJson.xpis[i][2]) + ' - ' + (compressionStr[historyJson.xpis[i][3]]);
			content.compiledDirPath = historyJson.xpis[i][4].replace(/\\\\/g,'\\');
			el.innerHTML = '<span xfield="name" content="' + content.name + '"></span><span xfield="lastCompiled" content="' + content.lastCompiled + '"></span><span xfield="sizecompress" content="' + content.sizecompress + '"></span><span xfield="path" content="' + content.path + '"></span><span xfield="compiledDirPath" content="' + content.compiledDirPath + '"></span>';
			paneXpis.appendChild(el);
			//added
		}

}

function updateHistory(path,lastCompiled,size,compression,compiledDirPath) {
	var order = ((lastCompiled - new Date('2014-01-01T02:39:12.537Z').getTime()) / 1000).toFixed(0);
	if (!compiledDirPath) {
		//its folder
		if (historyJson.recs.length == 0) {
			xDoc.querySelector('#folders div.nohistory').style.display = 'none'; //hide the nohistory div
		}
		for (var i=0; i<historyJson.recs.length; i++) {
			if (historyJson.recs[i][0] == path) {
				historyJson.recs[i][1] = lastCompiled;
				var querySelectorPatt = '#folders > div > span[content="' + path.replace(/\\/g,'\\\\') + '"]';
				Cu.reportError('looking for path where content = ' + querySelectorPatt)
				var el = xDoc.querySelector(querySelectorPatt);
				//el should always exist, because it found path in historyJson
				el = el.parentNode;
				el.setAttribute('style','order:' + order + ';');
				//updated
				updateHistoryFile();
				return;
			}
		}
		historyJson.recs.push([path, lastCompiled]);
		var el = xDoc.createElement('div')
		el.setAttribute('class', 'folder');
		el.setAttribute('style','order:' + order + ';');
		var content = {};
		content.path = path.replace(/\\\\/g,'\\');
		content.name = content.path.substr(content.path.lastIndexOf('\\')+1)
		el.innerHTML = '<span xfield="name" content="' + content.name + '"></span><span xfield="path" content="' + content.path + '"></span>';
		paneRecs.appendChild(el);
		//added
		updateHistoryFile();
	} else {
		//its xpi
		if (historyJson.xpis.length == 0) {
			xDoc.querySelector('#xpis div.nohistory').style.display = 'none'; //hide the nohistory div
		}
		for (var i=0; i<historyJson.xpis.length; i++) {
			if (historyJson.xpis[i][0] == path) {
				historyJson.xpis[i][1] = lastCompiled;
				historyJson.xpis[i][2] = size;
				historyJson.xpis[i][3] = compression;
				historyJson.xpis[i][4] = compiledDirPath;
				var querySelectorPatt = '#xpis > div > span[content="' + path.replace(/\\/g,'\\\\') + '"]';
				Cu.reportError('looking for path where content = ' + querySelectorPatt)
				var el = xDoc.querySelector(querySelectorPatt);
				el = el.parentNode;
				el.setAttribute('style','order:' + order + ';');
				var content = {};
				content.path = path.replace(/\\\\/g,'\\');
				content.name = content.path.substring(content.path.lastIndexOf('\\')+1,content.path.lastIndexOf('.')); //we dont want file extension to show in name so lastIndexOf('.xpi')
				content.lastCompiled = new Date(lastCompiled).toRelativeTime();
				content.sizecompress = format_bytes(size) + ' - ' + compressionStr[compression];
				content.compiledDirPath = compiledDirPath.replace(/\\/g,'\\\\');
				el.innerHTML = '<span xfield="name" content="' + content.name + '"></span><span xfield="lastCompiled" content="' + content.lastCompiled + '"></span><span xfield="sizecompress" content="' + content.sizecompress + '"></span><span xfield="path" content="' + content.path + '"></span><span xfield="compiledDirPath" content="' + content.compiledDirPath + '"></span>';
				//updated
				updateHistoryFile();
				return;
			}
		}
		historyJson.xpis.push([path, lastCompiled, size, compression, compiledDirPath]);
		var el = xDoc.createElement('div')
		el.setAttribute('class', 'xpi');
		el.setAttribute('style','order:' + order + ';');
		var content = {};
		content.path = path.replace(/\\\\/g,'\\');
		content.name = content.path.substring(content.path.lastIndexOf('\\')+1,content.path.lastIndexOf('.')); //we dont want file extension to show in name so lastIndexOf('.xpi')
		content.lastCompiled = new Date(lastCompiled).toRelativeTime();
		content.sizecompress = format_bytes(size) + ' - ' + (compressionStr[compression]);
		content.compiledDirPath = compiledDirPath.replace(/\\\\/g,'\\');
		el.innerHTML = '<span xfield="name" content="' + content.name + '"></span><span xfield="lastCompiled" content="' + content.lastCompiled + '"><span xfield="sizecompress" content="' + content.sizecompress + '"><span xfield="path" content="' + content.path + '"></span><span xfield="compiledDirPath" content="' + content.compiledDirPath + '"></span>';
		paneXpis.appendChild(el);
		updateHistoryFile();
		//added
	}
}
var compressionStr = {
	0: 'No Compression',
	1: 'Fastest Compression',
	2: 'Normal Compression',
	3: 'Best Compression'
}
function updatePane(which) {
	//which == 0 then recs
	//== 1 then xpis
	var pane;
	var whichArr = ['recs', 'xpis'];
	if (which == 0) {
		pane = paneRecs;
	} else if (which == 1) {
		pane = paneXpis;
	}
	
	var sortAscLastCompiled = function(a, b) {
		return a < b;
	}
	
	historyJson[whichArr[which]].sort(sortAscLastCompiled);
	
	
}

function readHistoryFile(){
	var historyFile = FileUtils.getFile('ProfD', ['XPICompiler_history.txt']);
	jsWin.addMsg('Reading History File');
	readFile(historyFile, function (dataReadFromFile, status) {
		Cu.reportError('read status = ' + status);
		Cu.reportError('read status isSucC = ' + Components.isSuccessCode(status));
		if (!Components.isSuccessCode(status)) {
			jsWin.addMsg('No history file found so creating blank object');
			historyJson = {recs:[],xpis:[]};
		} else {
			historyJson = JSON.parse(dataReadFromFile);
		}
		createHistoryDom();
		jsWin.addMsg('History File Read Done');
	});
}

function updateHistoryFile() {
	var historyFile = FileUtils.getFile('ProfD', ['XPICompiler_history.txt']);
	jsWin.addMsg('Upadting History File');
	overwriteFile(historyFile, JSON.stringify(historyJson), function (status) {
		jsWin.addMsg('History file update status: ' + Components.isSuccessCode(status));
		jsWin.addMsg('History File Upadte Done');
	});
}

var historyJson = {recs:[],xpis:[]};
//recs holds [0:folderPath,1:lastCompiled]
//recs holds [0:xpiPath,1:lastCompiled,2:size,3:compression,4:compiledDirPath]
/*start - frontend event listeners*/
function btnBrowse_click(e,startDir) {
	cServ.fp.init(xWin, 'Select Directory to Compile', Ci.nsIFilePicker.modeGetFolder);
	if (startDir) {
		Cu.reportError('startdir = ' + startDir);
		try {
			var startDirNsiFile = FileUtils.File(startDir);
		} catch (ex) {
			jsWin.addMsg('Invalid Path For Start Directory - ' + startDir);
		}
		if (startDirNsiFile) {
			if (!startDirNsiFile.exists()) {
				jsWin.addMsg('Start Directory Does Not Exist - ' + startDirNsiFile.path);
			} else {
				cServ.fp.displayDirectory = startDirNsiFile;
			}
		}
	}
	//cServ.fp.appendFilters(Ci.nsIFilePicker.filterAll | Ci.nsIFilePicker.filterText);
	
	var rv = cServ.fp.show();
	if (rv != Ci.nsIFilePicker.returnOK) {
		return;
	}
	
	var dir = cServ.fp.file;
	fieldBrowse.value = dir.path;
	
	btnCompile.focus();
	if (dir.parent) {
		updateHistory(dir.parent.path, new Date().getTime()); //add parent of selected folder to recent folders list
	}
}

function btnCompile_click(e, overridePath) {	
	if (overridePath) {
		var path = overridePath.replace(/\.xpi$/i,'');
	} else {
		var path = fieldBrowse.value;
	}
	try {
		var dir = FileUtils.File(path);
	} catch (ex) {
		jsWin.addMsg('Browse Field Path is Invalid - "' + path + '"')
		xWin.alert('Browse Field Path is Invalid - "' + path + '"');
		return;
	}
	if (!dir.exists()) {
		jsWin.addMsg('Directory does not exist - ' + dir.path)
		xWin.alert('Directory does not exist!');
		return;
	}
	jsWin.addMsg('Zipping - ' + dir.path)
	
	var xpi = FileUtils.File(dir.path + '\\' + dir.leafName + '.xpi');
	cServ.zw.open(xpi, pr.PR_WRONLY | pr.PR_CREATE_FILE | pr.PR_TRUNCATE); //xpi file is created if not there, if it is there it is truncated/deleted

	//recursviely add all contents of dir
	jsWin.addMsg('Adding to zip - `~`Initiating...`~`',1);
	
	var dirArr = [dir]; //adds dirs to this as it finds it
	for (var i = 0; i < dirArr.length; i++) {
		var dirEntries = dirArr[i].directoryEntries;
		while (dirEntries.hasMoreElements()) {
			var entry = dirEntries.getNext().QueryInterface(Ci.nsIFile);
			//custom check for my purpose, because i put the xpi within the dirs that are to be traversed
			if (i == 0 && entry.leafName == xpi.leafName) {
				//testing i==0 becuase i know before hand that i put the xpi file in dirArr[0] which is parent dir
				//Cu.reportError('skipping entry as this is the xpi itself: "' + xpi.path + '" leafName:"' + xpi.leafName + '"');
				continue;
			}

			//end custom check
			if (entry.isDirectory()) {
				dirArr.push(entry);
			}
			var relPath = entry.path.replace(dirArr[0].path + '\\', '');
			var saveInZipAs = relPath.replace(/\\/g,'/'); //because if use '/' it causes problems in the zip, must use '\'
			jsWin.updateMsg(saveInZipAs);
			cServ.zw.addEntryFile(saveInZipAs, Ci.nsIZipWriter.COMPRESSION_NONE, entry, false);
		}
	}
  //end recursive add
  
	cServ.zw.close()
	jsWin.updateMsg('Complete');
	jsWin.addMsg('Zip File Made: ' + xpi.path);
	updateHistory(xpi.path, new Date().getTime(), xpi.fileSize, 0, dir.path);
	
	jsWin.updateMsg('Installing XPI');
	
	
	
    AddonManager.getInstallForFile(xpi, function(aInstall) {
      // aInstall is an instance of AddonInstall
        aInstall.addListener(installListener);
		aInstall.install(); //does silent install
        //AddonManager.installAddonsFromWebpage('application/x-xpinstall', gBrowser.contentWindow, null, [aInstall]); //does regular popup install
    }, 'application/x-xpinstall');
}

function paneXpis_click(e) {
	var target = e.target;
	if (target.id == 'xpis') {
		Cu.reportError('clicked on main xpis div');
		return;
	}
	
	var parentDiv = target;
	var i = 0;
	while (parentDiv.className != 'xpi') {
		i++;
		Cu.reportError('try i = ' + i);
		parentDiv = parentDiv.parentNode;
	}
	var path = parentDiv.querySelector('[xfield=compiledDirPath]').getAttribute('content');//.replace(/\\(?!\\)/g,'\\\\');;
	
	//target.ownerDocument.defaultView.alert('path = ' + path);
	btnCompile_click(null, path);
}

function paneRecs_click(e) {
	var target = e.target;
	if (target.id == 'folders') {
		Cu.reportError('clicked on main recs div');
		return;
	}
	
	var parentDiv = target;
	var i = 0;
	while (parentDiv.className != 'folder') {
		i++;
		Cu.reportError('try i = ' + i);
		parentDiv = parentDiv.parentNode;
	}
	var path = parentDiv.querySelector('[xfield=path]').getAttribute('content');//.replace(/\\(?!\\)/g,'\\\\');;
	//target.ownerDocument.defaultView.alert('path = ' + path);
	btnBrowse_click(null, path);
}

/*start - autocomplete stuff*/
function fieldBrowse_focus() {
	
}

function fieldBrowse_keyup() {
	
}

function fieldBrowse_keydown() {
	
}
/*end - autocomplete stuff*/

var installListener = {
	onInstallEnded: function(aInstall, aAddon) {
	   var str = [];
	   //str.push('"' + aAddon.name + '" Install Ended!');
	   jsWin.addMsg('"' + aAddon.name + '" Install Ended!');
	   if (aInstall.state != AddonManager.STATE_INSTALLED) {
		   //str.push('aInstall.state: ' + aInstall.state)
		   jsWin.addMsg('aInstall.state: ' + aInstall.state);
	   } else {
		   //str.push('aInstall.state: Succesfully Installed')
		   jsWin.addMsg('aInstall.state: Succesfully Installed')
	   }
	   if (aAddon.appDisabled) {
		   //str.push('appDisabled: ' + aAddon.appDisabled);
		   jsWin.addMsg('appDisabled: ' + aAddon.appDisabled);
	   }
	   if (aAddon.userDisabled) {
		   //str.push('userDisabled: ' + aAddon.userDisabled);
		   jsWin.addMsg('userDisabled: ' + aAddon.userDisabled);
	   }
	   if (aAddon.pendingOperations != AddonManager.PENDING_NONE) {
		   //str.push('NEEDS RESTART: ' + aAddon.pendingOperations);
		   jsWin.addMsg('NEEDS RESTART: ' + aAddon.pendingOperations);
	   }
	   //alert(str.join('\n'));
	   aInstall.removeListener(installListener);
	},
	onInstallStarted: function(aInstall) {
		jsWin.addMsg('"' + aAddon.name + '" Install Started...');
	}
};
/*end - frontend event listeners*/

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = Services.wm.getEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = Services.wm.getEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.addEventListener('DOMContentLoaded', listenPageLoad, false);
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.removeEventListener('DOMContentLoaded', listenPageLoad, false);
		}
	}
};
/*end - windowlistener*/

/*start - read/write file funcs*/
function overwriteFile(nsiFile, data, callback) {
   //data is data you want to write to file
   //if file doesnt exist it is created
   var ostream = FileUtils.openSafeFileOutputStream(nsiFile)
   var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
   converter.charset = "UTF-8";
   var istream = converter.convertToInputStream(data);
   // The last argument (the callback) is optional.
   NetUtil.asyncCopy(istream, ostream, function (status) {
      if (!Components.isSuccessCode(status)) {
         // Handle error!
         //alert('error on write isSuccessCode = ' + status);
		 callback(status);
         return;
      }
      // Data has been written to the file.
      callback(status)
   });
}

function readFile(nsiFile, callback) {
   //you must pass a callback like function(dataReadFromFile, status) { }
   //then within the callback you can work with the contents of the file, it is held in dataReadFromFile
   //callback gets passed the data as string
   NetUtil.asyncFetch(nsiFile, function (inputStream, status) {
      //this function is callback that runs on completion of data reading
      if (!Components.isSuccessCode(status)) {
         //alert('error on file read isSuccessCode = ' + status);
		 callback(null, status);
         return;
      }
      var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
      callback(data, status);
   });
}
/*end - read/write file funcs*/

/*start - library funcs*/
function escapeRegExp(text) {
	if (!arguments.callee.sRE) {
		var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
		arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}
function number_format( number, decimals, dec_point, thousands_sep ) {
	//author: http://snipplr.com/view.php?codeview&id=5945
	//ported from php so can use manual
    // http://kevin.vanzonneveld.net
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     bugfix by: Michael White (http://crestidg.com)
    // +     bugfix by: Benjamin Lupton
    // +     bugfix by: Allan Jensen (http://www.winternet.no)
    // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)    
    // *     example 1: number_format(1234.5678, 2, '.', '');
    // *     returns 1: 1234.57
 
    var n = number, c = isNaN(decimals = Math.abs(decimals)) ? 2 : decimals;
    var d = dec_point == undefined ? "," : dec_point;
    var t = thousands_sep == undefined ? "." : thousands_sep, s = n < 0 ? "-" : "";
    var i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", j = (j = i.length) > 3 ? j % 3 : 0;
    
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
}
function format_bytes(filesize) {
	//author: http://snipplr.com/view.php?codeview&id=5949
	//filesize must be in bytes
	//renamed func from size_format
	if (filesize >= 1073741824) {
	     filesize = number_format(filesize / 1073741824, 2, '.', '') + ' GB';
	} else { 
		if (filesize >= 1048576) {
     		filesize = number_format(filesize / 1048576, 2, '.', '') + ' MB';
   	} else { 
			if (filesize >= 1024) {
    		filesize = number_format(filesize / 1024, 0) + ' KB';
  		} else {
    		filesize = number_format(filesize, 0) + ' Bytes';
			};
 		};
	};
  return filesize;
};/*end - library funcs*/

/*start - relative date extension*/
/**
* Returns a description of this date in relative terms.

* Examples, where new Date().toString() == "Mon Nov 23 2009 17:36:51 GMT-0500 (EST)":
*
* new Date().toRelativeTime()
* --> 'Just now'
*
* new Date("Nov 21, 2009").toRelativeTime()
* --> '2 days ago'
*
* new Date("Nov 25, 2009").toRelativeTime()
* --> '2 days from now'
*
* // One second ago
* new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime()
* --> '1 second ago'
*
* toRelativeTime() takes an optional argument - a configuration object.
* It can have the following properties:
* - now - Date object that defines "now" for the purpose of conversion.
* By default, current date & time is used (i.e. new Date())
* - nowThreshold - Threshold in milliseconds which is considered "Just now"
* for times in the past or "Right now" for now or the immediate future
* - smartDays - If enabled, dates within a week of now will use Today/Yesterday/Tomorrow
* or weekdays along with time, e.g. "Thursday at 15:10:34"
* rather than "4 days ago" or "Tomorrow at 20:12:01"
* instead of "1 day from now"
* - texts - If provided it will be the source of all texts used for creation
* of time difference text, it should also provide pluralization function
* which will be feed up with time units
*
* If a single number is given as argument, it is interpreted as nowThreshold:
*
* // One second ago, now setting a now_threshold to 5 seconds
* new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime(5000)
* --> 'Just now'
*
* // One second in the future, now setting a now_threshold to 5 seconds
* new Date("Nov 23 2009 17:36:52 GMT-0500 (EST)").toRelativeTime(5000)
* --> 'Right now'
*
*/
 Date.prototype.toRelativeTime = (function() {

  var _ = function(options) {
    var opts = processOptions(options);

    var now = opts.now || new Date();
    var texts = opts.texts || TEXTS;
    var delta = now - this;
    var future = (delta <= 0);
    delta = Math.abs(delta);

    // special cases controlled by options
    if (delta <= opts.nowThreshold) {
      return future ? texts.right_now : texts.just_now;
    }
    if (opts.smartDays && delta <= 6 * MS_IN_DAY) {
      return toSmartDays(this, now, texts);
    }

    var units = null;
    for (var key in CONVERSIONS) {
      if (delta < CONVERSIONS[key])
        break;
      units = key; // keeps track of the selected key over the iteration
      delta = delta / CONVERSIONS[key];
    }

    // pluralize a unit when the difference is greater than 1.
    delta = Math.floor(delta);
    units = texts.pluralize(delta, units);
    return [delta, units, future ? texts.from_now : texts.ago].join(" ");
  };

  var processOptions = function(arg) {
    if (!arg) arg = 0;
    if (typeof arg === 'string') {
      arg = parseInt(arg, 10);
    }
    if (typeof arg === 'number') {
      if (isNaN(arg)) arg = 0;
      return {nowThreshold: arg};
    }
    return arg;
  };

  var toSmartDays = function(date, now, texts) {
    var day;
    var weekday = date.getDay(),
        dayDiff = weekday - now.getDay();
    if (dayDiff == 0) day = texts.today;
    else if (dayDiff == -1) day = texts.yesterday;
    else if (dayDiff == 1 && date > now)
                            day = texts.tomorrow;
    else day = texts.days[weekday];
    return day + " " + texts.at + " " + date.toLocaleTimeString();
  };

  var CONVERSIONS = {
    millisecond: 1, // ms -> ms
    second: 1000, // ms -> sec
    minute: 60, // sec -> min
    hour: 60, // min -> hour
    day: 24, // hour -> day
    month: 30, // day -> month (roughly)
    year: 12 // month -> year
  };
  
  var MS_IN_DAY = (CONVERSIONS.millisecond * CONVERSIONS.second * CONVERSIONS.minute * CONVERSIONS.hour * CONVERSIONS.day);

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var TEXTS = {today: 'Today',
               yesterday: 'Yesterday',
               tomorrow: 'Tomorrow',
               at: 'at',
               from_now: 'from now',
               ago: 'ago',
               right_now: 'Right now',
               just_now: 'Just now',
               days: WEEKDAYS,
               pluralize: function(val, text) {
                                if(val > 1)
                                    return text + "s";
                                return text;
                             }
               };
  return _;
})();



/*
* Wraps up a common pattern used with this plugin whereby you take a String
* representation of a Date, and want back a date object.
*/
Date.fromString = function(str) {
  return new Date(Date.parse(str));
};
/*end - relative date extension*/


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