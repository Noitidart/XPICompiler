const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

function startup(aData, aReason) { }

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
}

function install() {}

function uninstall() {}