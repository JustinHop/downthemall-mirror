/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is DownThemAll.
 *
 * The Initial Developer of the Original Code is Nils Maier
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Nils Maier <MaierMan@web.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
const Cc = Components.classes;
const Ci = Components.interfaces;

var dropDowns = {};

function QueueItem(url, num, hash) {
	if (!(url instanceof DTA_URL) || !DTA_AddingFunctions.isLinkOpenable(url)) {
		throw new Components.Exception('invalid url');
	}
	this.url = url;
	this.numIstance = num;
	this.referrer = $('URLref').value,
	this.description = window.arguments ? window.arguments[0] : '';
	this.ultDescription = '';
	this.mask = Dialog.ddRenaming.value;
	this.dirSave = Dialog.ddDirectory.value;
	this.hash = hash;
}

function Literal(str) {
	this.str = str;
	this.length = 1;
}
Literal.prototype = {
	join: function(str) {
		yield str + this.str;
	},
	toString: function() {
		return this.str;
	}
};
function NumericRange(name, start, stop, step, strl) {
	this.name = name;
	this.start = start;
	this.stop = stop + (start > stop ? -1 : 1);
	this.step = step;
	this.length = Math.floor((stop - start) / step + 1);
	this.strl = strl;
};
NumericRange.prototype = {
	_format: function(i) {
		var rv = String(Math.abs(i));
		while (rv.length < this.strl) {
			rv = '0' + rv;
		}
		if (i < 0) {
			rv = '-' + rv;
		}
		return rv;
	},
	join: function(str) {
		for (let i in range(this.start, this.stop, this.step)) {
			yield (str + this._format(i));
		}
	}
};
function CharRange(name, start, stop, step) {
	this.name = name;
	this.start = start;
	this.stop = stop + (start > stop ? -1 : 1);
	this.step = step;
	this.length = Math.floor((stop - start) / step + 1);
};	
CharRange.prototype = {
	join: function(str) {
		for (let i in range(this.start, this.stop, this.step)) {
			yield str + String.fromCharCode(i);
		}
	}
}
function BatchGenerator(link) {
	if (!(link instanceof DTA_URL)) {
		throw new Components.Exception("invalid argument. Type not DTA_URL");
	}
	this.url = link.url;
	var url = this.url;
	this._length = 1;
	this._pats = [];
	var i;
	while ((i = url.search(/\[.*?]/)) != -1) {
		if (i != 0) {
			this._pats.push(new Literal(url.substring(0, i)));
			url = url.slice(i);
		}
		var m;
		if ((m = url.match(/^\[(-?\d+):(-?\d+)(?::(-?\d+))?\]/))) {
			url = url.slice(m[0].length);
			try {
				var start = new Number(m[1]);
				var stop = new Number(m[2]);
				var step = stop > start ? 1 : -1;
				if (m.length > 3 && typeof(m[3]) != 'undefined') {
					step = new Number(m[3]);
				}
				this._checkRange(start, stop, step);
				if (start == stop) {
					this._pats.push(new Literal(m[1]));
					continue;
				}
				var x = m[Math.abs(start) > Math.abs(stop) ? 2 : 1];
				var sl = x.length;
				if (x.slice(0,1) == '-') {
					--sl;
				}
				this._pats.push(new NumericRange(m[0], start, stop, step, sl));
			}
			catch (ex) {
				this._pats.push(new Literal(m[0]));
			}
			continue;
		}
		
		if ((m = url.match(/^\[([a-z]):([a-z])(?::(-?\d))?\]/)) || (m = url.match(/\[([A-Z]):([A-Z])(?::(-?\d))?\]/))) {
			url = url.slice(m[0].length);
			try {
				var start = m[1].charCodeAt(0);
				var stop = m[2].charCodeAt(0);
				var step = stop > start ? 1 : -1;
				if (m.length > 3 && typeof(m[3]) != 'undefined') {
					step = new Number(m[3]);
				}
				this._checkRange(start, stop, step);
				if (start == stop) {
					this._pats.push(new Literal(m[1]));
					continue;
				}
				this._pats.push(new CharRange(m[0], start, stop, step));
			}
			catch (ex) {
				this._pats.push(new Literal(m[0]));
			}
			continue;
		}
		if ((m = url.match(/\[.*?\]/))) {
			url = url.slice(m[0].length);
			this._pats.push(new Literal(m[0]));
		}
	}
	if (url.length) {
		this._pats.push(new Literal(url));
	}
	// join the literals if required!
	for (i = this._pats.length - 2; i >= 0; --i) {
		if ((this._pats[i] instanceof Literal) && (this._pats[i + 1] instanceof Literal)) {
			this._pats[i] = new Literal(this._pats[i].str + this._pats[i + 1].str);
			this._pats = this._pats.slice(i + 1, 1);
		}
	}
	this._pats.forEach(
		function(i) { this._length *= i.length; },
		this
	);
}
BatchGenerator.prototype = {
	_checkRange: function(start, end, step) {
		if (!step || (stop - start) / step < 0) {
			throw 'step invalid!';
		}
	},
	_process: function(pats) {
		if (pats.length == 0) {
			yield '';
		}
		else {
			let pat = pats.pop();
			for (let i in this._process(pats)) {
				for (let j in pat.join(i)) {
					yield j;
				}
			}
		}
	},
	getURLs: function() {
		for (let i in this._process(this._pats)) {
			yield i;
		}
	},
	get length() {
		return this._length;
	},
	get parts() {
		return this._pats
			.filter(function(e) { return !(e instanceof Literal); })
			.map(function(e) { return e.name; })
			.join(", ");
	},
	get first() {
		return this._pats.map(
			function(p) {
				if (!(p instanceof Literal)) {
					return p.start;
				}
				return p;
			}
		).join('');
	},
	get last() {
		return this._pats.map(
			function(p) {
				if (!(p instanceof Literal)) {
					let stop = p.stop;
					stop += (stop - p.start) % p.step;
					stop -= p.step;
					return stop;
				}
				return p;
			}
		).join('');
	}
};


var Dialog = {
	multiHelp: true,
	load: function DTA_load() {
		try {
			this.ddDirectory = $("directory");
			this.ddRenaming = $("renaming");			
			var address = $('URLaddress');
			
			// if we've been called by DTA_AddingFunctions.saveSingleLink()
			var hash = null;
			if (window.arguments) {
				var a = window.arguments[0];
				var url = a.url;
				if (!('url' in a))
					;
				else if (typeof(a.url) == 'string') {
					address.value = a.url;
				}
				else if (typeof(a.url) == 'object' && 'url' in a.url) {
					// we've got a DTA_URL.
					// In this case it is not safe to modify it because of encoding issues.
					address.value = a.url.usable;
					// JS does not preserve types between windows (as each window gets an own sandbox)
					// This hack makes our URL a DTA_URL again ;)
					address._realURL = new DTA_URL(a.url.url, a.url.charset);
					address.readOnly = true;
					$('batcheslabel').style.display = 'none';
					$('batches').collapsed = true;
					this.multiHelp = false;
				}
				var referrer = DTA_AddingFunctions.isLinkOpenable(a.referrer) ? a.referrer : null;
				if (referrer) {
					try {
						referrer = decodeURIComponent(referrer);
					} catch (ex) {}
					$("URLref").value	 = referrer;
				}
				if (a.mask) {
					this.ddRenaming.value = a.mask;
				}
				hash = a.hash;
			}
			// check if there's some URL in clipboard
			else {
				var clip = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);
				var trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
				try {
					trans.addDataFlavor("text/unicode");
					clip.getData(trans, clip.kGlobalClipboard);
					
					var str = {}, length = {};
					trans.getTransferData(
						"text/unicode",
						str,
						length
					);
					if (length.value) {
						str = str.value.QueryInterface(Ci.nsISupportsString);
						str = str.data;
						if (str.length && DTA_AddingFunctions.isLinkOpenable(str)) {
							hash = DTA_getLinkPrintHash(str);
							address.value = str.replace(/#.*$/, '');
							address.select();
						}
					}
				}
				catch (ex) {
					Debug.dump("Not able to gather data from the clipboard!");
				}
			}
			if (hash) {
				$('hash').value = hash;
			}
			
			window.sizeToContent();
		} catch(ex) {
			Debug.dump("load():", ex);
		}		
	},
	help: function DTA_help(event) {
		var topic = event.originalTarget.getAttribute('topic');
		if (!this.multiHelp) {
			topic = 'AddUrl';
		}
		if (topic) {
			openHelp(topic, 'chrome://dta-help/content/help.rdf');	
		}
		else {
			$('popupHelp').showPopup($('DownThemAll').getButton('help'), -1, -1, "popup");
		}
	},
	
	download: function DTA_download(start) {
		
		var errors = [];
		
		// check the directory
		var dir = this.ddDirectory.value.trim();
		if (!dir.length || !Utils.validateDir(dir)) {
			errors.push('directory');
		}
		
		// check mask
		var mask = this.ddRenaming.value;
		if (!mask.length) {
			errors.push('renaming');
		}
		
		var address = $('URLaddress');
		var url = address.value;
		if ('_realURL' in address) {
			url = address._realURL;
		}
		else {
			try {
				let fs = Cc['@mozilla.org/docshell/urifixup;1'].getService(Ci.nsIURIFixup);
				// throws if empty
				let uri = fs.createFixupURI(url, 0);
				url = uri.spec;
			}
			catch (ex) {
				errors.push('URLaddress');
			}
			var hash = DTA_getLinkPrintHash(url);
			if (hash) {
				$('hash').value = hash;
			}
			url = url.replace(/#.*$/, '');
			address.value = url;
			url = new DTA_URL(url);
		}
		
		var hash = null;
		if (!$('hash').isValid) {
			errors.push('hash');
		}
		else {
			hash = $('hash').value;
		}

		$('directory', 'renaming', 'URLaddress', 'hash').forEach(
			function(e) {
				// reset the styles
				var style = e.inputField.style;
				style.backgroundColor = 'transparent';
				style.color = 'windowText';
			}
		);
		
		if (errors.length) {
			errors.forEach(
				function(e) {
					var style = $(e).inputField.style;
					style.backgroundColor = 'red';
					style.color = 'white';
				}
			);
			return false;
		}		

		var num = Preferences.getDTA("counter", 0);
		if (++num > 999) {
			num = 1;
		}			
		
		var batch = new BatchGenerator(url);
	
		var rv = !('_realURL' in address) && batch.length > 1;
		if (rv) {
			var message = _(
				'tasks',
				[batch.length, batch.parts, batch.first, batch.last]
			);
			if (batch.length > 1000) {
				message += _('manytasks');
			}
			rv = DTA_confirm(_('batchtitle'), message, _('batchtitle'), DTA_confirm.CANCEL, _('single'));
			if (rv == 1) {
				return false;
			}
			rv = rv == 0;
		}
		if (rv) {
			var g = batch.getURLs();
			batch = function() {
				for (let i in g) {
					yield new QueueItem(new DTA_URL(i), num);
				}
			}();
		}
		else {
			batch = [new QueueItem(url, num, hash)];
		}
		DTA_AddingFunctions.sendToDown(start, batch);

		Preferences.setDTA("counter", num);
		Preferences.setDTA("lastqueued", !start);
	
		['ddRenaming', 'ddDirectory'].forEach(function(e) { Dialog[e].save(); });
		
		self.close();
		
		return true;
	},
	browseDir: function DTA_browseDir() {
		// let's check and create the directory
		var newDir = Utils.askForDir(
			this.ddDirectory.value,
			_("validdestination")
		);
		if (newDir) {
			this.ddDirectory.value = newDir;
		}
	}
}
