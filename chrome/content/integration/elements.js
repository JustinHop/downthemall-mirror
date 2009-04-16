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
 * The Original Code is DownThemAll!
 *
 * The Initial Developers of the Original Code are Stefano Verna and Federico Parodi
 * Portions created by the Initial Developers are Copyright (C) 2004-2007
 * the Initial Developers. All Rights Reserved.
 *
 * Contributor(s):
 *    Stefano Verna
 *    Federico Parodi <f.parodi@tiscali.it>
 *    Nils Maier <MaierMan@web.de>
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
 
var DTA_Prompts = {};
Components.utils.import('resource://dta/prompts.jsm', DTA_Prompts);
 
// DTA context overlay
var DTA_ContextOverlay = {

	_str: Components.classes['@mozilla.org/intl/stringbundle;1']
		.getService(Components.interfaces.nsIStringBundleService)
		.createBundle('chrome://dta/locale/menu.properties'),
	
	getString: function(n) {
		try {
			return this._str.GetStringFromName(n);
		} catch (ex) {
			DTA_debug.log("locale error: " + n, ex);
			return '<error>';
		}
	},
	
	trim: function(t) {
		return t.replace(/^[ \t_]+|[ \t_]+$/gi, '').replace(/(_){2,}/g, "_");
	},
	
	addLinksToArray: function(lnks, urls, doc) {
		if (!lnks || !lnks.length) {
			return;
		}
		
		let ref = DTA_AddingFunctions.getRef(doc);
		
		for (var i = 0; i < lnks.length; ++i) {
			// remove anchor from url
			var link = lnks[i];
			// if it's valid and it's new
			if (!DTA_AddingFunctions.isLinkOpenable(link.href)) {
				continue;
			}
				
			var title = '';
			if (link.hasAttribute('title')) {
				title = this.trim(link.getAttribute('title'));
			}
			if (!title && link.hasAttribute('alt')) {
				title = this.trim(link.getAttribute('alt'));
			}
			let url = DTA_AddingFunctions.ios.newURI(link.href, doc.characterSet, null);
			urls.push({
				'url': new DTA_URL(url),
				'referrer': ref,
				'description': this.extractDescription(link),
				'title': title
			});
			
			var ml = DTA_getLinkPrintMetalink(url.ref);
			if (ml) {
				urls.push({
					'url': new DTA_URL(ml),
					'referrer': ref,
					'description': '[metalink] http://www.metalinker.org/',
					'title': title,
					'metalink': true
				});
			}
		}
	},
	
	addImagesToArray: function(lnks, images, doc)	{
		if (!lnks || !lnks.length) {
			return;
		}
		
		var ref = DTA_AddingFunctions.getRef(doc);

		for (var i = 0; i < lnks.length; ++i) {
			var src = lnks[i].src;
			try {
				src = DTA_AddingFunctions.composeURL(doc, src);
			}
			catch (ex) {
				DTA_debug.log("failed to compose: " + src, ex);
				continue;
			}
			// if it's valid and it's new
			// better double check :p
			if (!DTA_AddingFunctions.isLinkOpenable(src)) {
				continue;
			}
			var desc = '';
			if (lnks[i].hasAttribute('alt')) {
				desc = this.trim(lnks[i].getAttribute('alt'));
			}
			else if (lnks[i].hasAttribute('title')) {
				desc = this.trim(lnks[i].getAttribute('title'));
			}
			images.push({
				'url': new DTA_URL(src),
				'referrer': ref,
				'description': desc
			});
		}
	},
	
	// recursively add stuff.
	addLinks: function(aWin, aURLs, aImages, honorSelection) {

		function filterElements(nodes, set) {
			var filtered = [];
			for (var i = 0, e = nodes.length; i < e; ++i) {
				if (set.containsNode(nodes[i], true)) {
					filtered.push(nodes[i]);
				}
			}
			return filtered;
		}
	
		try {
		 
			var links = aWin.document.links;
			var images = aWin.document.images;
			var embeds = aWin.document.embeds;
			var rawInputs = aWin.document.getElementsByTagName('input');
			var inputs = [];
			for (var i = 0; i < rawInputs.length; ++i) {
				var rit = rawInputs[i].getAttribute('type');
				if (!rit || rit.toLowerCase() != 'image') {
					continue;
				}
				inputs.push(rawInputs[i]);
			}
			
			var sel = aWin.getSelection();
			if (honorSelection && sel && !sel.isCollapsed) {
				DTA_debug.logString("selection only");
				[links, images, embeds, inputs] = [links, images, embeds, inputs].map(
					function(e) {
						return filterElements(e, sel);
					}
				);
			}
			else {
				// we were asked to honor the selection, but we didn't actually have one.
				// so reset this flag so that we can continue processing frames below.
				honorSelection = false;
			}
			
			this.addLinksToArray(links, aURLs, aWin.document);
			[images, embeds, inputs].forEach(
				function(e) {
					this.addImagesToArray(e, aImages, aWin.document);
				},
				this
			);
		}
		catch (ex) {
			DTA_debug.log('addLinks', ex);
		}
		
		// do not process further as we just filtered the selection
		if (honorSelection) {
			return;
		}
		
		// recursively process any frames
		if (aWin.frames) {
			for (var i = 0, e = aWin.frames.length; i < e; ++i) {
				this.addLinks(aWin.frames[i], aURLs, aImages);
			}
		}
	},
	
	findWindowsNavigator: function(all) {
		var windows = [];
		if (!all) {
			var sel = document.commandDispatcher.focusedWindow.getSelection();
			if (sel.isCollapsed) {
				windows.push(gBrowser.selectedBrowser.contentWindow.top);
			}
			else {
				windows.push(document.commandDispatcher.focusedWindow);
			}
		}
		else {
			gBrowser.browsers.forEach(
				function(e) {
					windows.push(e.contentWindow.top);
				}
			);
		}
		return windows;
	},
	findWindowsMail: function(all) {
		var windows = [];
		if (document.documentElement.getAttribute('windowtype') == 'mail:3pane') {
			windows.push(document.getElementById('messagepane').contentWindow);
		}
		else if (!all) {
			windows.push(document.commandDispatcher.focusedWindow);
		}
		else {
			windows = DTA_Mediator
				.getAllByType('mail:messageWindow')
				.map(function(w) {
					return w.content;
				});
		}
		return windows;
	},
	_types: {
		'mail:3pane': 'findWindowsMail',
		'mail:messageWindow': 'findWindowsMail'
	},
	
	findLinks: function(turbo, all) {
		try {
			if (all == undefined && turbo && DTA_preferences.getExt('rememberoneclick', false)) {
				all = DTA_preferences.getExt('lastalltabs', false);
			}
			if (turbo && all != undefined) {
				DTA_preferences.setExt('lastalltabs', all);
			}
			
			function makeUnique(i) {
				var known = {};
				return i.filter(
					function(e) {
						let url = e.url.url.spec;
						if (url in known) {
							return false;
						}
						known[url] = null;
						return true;
					}
				);
			}		
			
			if (turbo) {
				DTA_debug.logString("findLinks(): DtaOneClick request from the user");
			}
			else {
				DTA_debug.logString("findLinks(): DtaStandard request from the user");
			}

			var wt = document.documentElement.getAttribute('windowtype');
			if (wt in this._types) {
				var windows = this[this._types[wt]](all);
			}
			else {
				var windows = this.findWindowsNavigator(all);
			}
			
			var urls = [];
			var images = [];
			for each (let win in windows) {
				this.addLinks(win, urls, images, !all);
			}
			urls = makeUnique(urls);
			images = makeUnique(images);

			if (!urls.length && !images.length) {
				DTA_Prompts.alert(window, this.getString('error'), this.getString('errornolinks'));
				return;
			}
			
			if (turbo) {
				try {
					DTA_AddingFunctions.turboSaveLinkArray(urls, images);
					return;
				}
				catch (ex) {
					DTA_debug.log('findLinks', ex);
					//DTA_Prompts.alert(window, this.getString('error'), );
					DTA_AddingFunctions.saveLinkArray(urls, images, this.getString('errorinformation'));
				}
			}
			else {
				DTA_AddingFunctions.saveLinkArray(urls, images);
			}
		}
		catch(ex) {
			DTA_debug.log('findLinks', ex);
		}
	},
	
	findSingleLink: function(turbo) {
		try {
			var ctx = this.contextMenu;

			var cur = ctx.target;
			
			var tofind = ctx.onLink ? /^a$/i : /^img$/i; 
		
			while (!("tagName" in cur) || !tofind.test(cur.tagName)) {
				cur = cur.parentNode;
			}
			var url = ctx.onLink ? cur.href : cur.src;
			this.saveSingleLink(turbo, url, cur);
		}
		catch (ex) {
			DTA_Prompts.alert(window, this.getString('error'), this.getString('errornodownload'));
			DTA_debug.log('findSingleLink: ', ex);
		}
	},
	saveSingleLink: function(turbo, url, elem) {
		if (!DTA_AddingFunctions.isLinkOpenable(url)) {
			throw Error("not downloadable");
			return;
		}
		
		url = DTA_AddingFunctions.ios.newURI(url, elem.ownerDocument.characterSet, null);
		let ml = DTA_getLinkPrintMetalink(url);
		url = new DTA_URL(ml ? ml : url);
		
		let ref = DTA_AddingFunctions.getRef(elem.ownerDocument);
		let desc = this.extractDescription(elem);
		if (turbo) {
			try {
				DTA_AddingFunctions.saveSingleLink(true, url, ref, desc);
				return;
			}
			catch (ex) {
				DTA_debug.log('saveSingleLink', ex);
				DTA_Prompts.alert(window, this.getString('error'), this.getString('errorinformation'));
			}
		}
		DTA_AddingFunctions.saveSingleLink(false, url, ref, desc);		
	},
	findForm: function(turbo) {
		try {
			var ctx = this.contextMenu;
			if (!('form' in ctx.target)) {
				throw new Components.Exception("No form");
			}
			var form = ctx.target.form;
			
			var action = DTA_AddingFunctions.composeURL(form.ownerDocument, form.action);
			if (!DTA_AddingFunctions.isLinkOpenable(action.spec)) {
				throw new Components.Exception('Unsupported URL');
			}
			action = action.QueryInterface(Components.interfaces.nsIURL);
			
			var charset = form.ownerDocument.characterSet;
			if (form.acceptCharset) {
				charset = form.acceptCharset;
			}
			if (charset.match(/utf-?(?:16|32)/i)) {
				charset = 'utf-8';
			}
						
			var encoder = Components.classes['@mozilla.org/intl/texttosuburi;1']
				.getService(Components.interfaces.nsITextToSubURI);
			
			var values = []; 
			
			for (var i = 0; i < form.elements.length; ++i) {
				if (form.elements[i].name ==  '') {
					continue;
				}
				var v = encoder.ConvertAndEscape(charset, form.elements[i].name) + "=";
				if (form.elements[i].value != '') {
					v += encoder.ConvertAndEscape(charset, form.elements[i].value);
				}
				values.push(v); 
			}
			values = values.join("&");

			if (form.method.toLowerCase() == 'post') {
				var ss = Components.classes['@mozilla.org/io/string-input-stream;1']
					.createInstance(Components.interfaces.nsIStringInputStream);
				ss.setData(values, -1);
				
				var ms = Components.classes['@mozilla.org/network/mime-input-stream;1']
					.createInstance(Components.interfaces.nsIMIMEInputStream);
				ms.addContentLength = true;
				ms.addHeader('Content-Type', 'application/x-www-form-urlencoded');
				ms.setData(ss);
				
				var sis = Components.classes['@mozilla.org/scriptableinputstream;1']
					.createInstance(Components.interfaces.nsIScriptableInputStream);
				sis.init(ms);
				var postData = '';
				var avail = 0;
				while ((avail = sis.available()) != 0) {
					postData += sis.read(avail);
				}
				sis.close();
				ms.close();
				ss.close();
				
				action = new DTA_URL(DTA_AddingFunctions.ios.newURI(action.spec, form.ownerDocument.characterSet, null));
				action.postData = postData;
			}
			else {
				action.query = values;
				action.ref = '';
				action = new DTA_URL(DTA_AddingFunctions.ios.newURI(action.spec, form.ownerDocument.characterSet, null));
			}			

			
			var ref = DTA_AddingFunctions.getRef(document.commandDispatcher.focusedWindow.document);
			var desc = this.extractDescription(form);
			
			if (turbo) {
				try {
					DTA_AddingFunctions.saveSingleLink(true, action, ref, desc);
					return;
				}
				catch (ex) {
					DTA_debug.log('findSingleLink', ex);
					DTA_Prompts.alert(window, this.getString('error'), this.getString('errorinformation'));
				}
			}
			DTA_AddingFunctions.saveSingleLink(false, action, ref, desc);
		}
		catch (ex) {
			DTA_debug.log('findForm', ex);
		}
	},
	
	init: function() {
		try {
			this.direct = {};
			this.compact = {};
			
			var ctxItem = document.getElementById("dtaCtxCompact");
			var ctx = ctxItem.parentNode;
			var cont = document.getElementById('dtaCtxSubmenu');

			['SepBack', 'Pref', 'SepPref', 'TDTA', 'DTA', 'SaveT', 'Save', 'SaveFormT', 'SaveForm', 'SepFront'].forEach(
				function(id) {
					this.compact[id] = document.getElementById('dtaCtx' + id);
					var node = document.getElementById('dtaCtx' + id).cloneNode(true);
					node.setAttribute('id', node.id + "-direct");
					ctx.insertBefore(node, ctxItem.nextSibling);
					this.direct[id] = node;
				},
				this
			);
			// intitalize those to have Menu Editor pick up "good" text
			[this.direct, this.compact].forEach(
				function(m) {
					m.Save.label = this.getString('dtasavelink');
					m.SaveT.label = this.getString('turbosavelink');
				},
				this
			);

			var menu = document.getElementById("dtaToolsMenu").parentNode;
			ctx.addEventListener("popupshowing", function (evt) { DTA_ContextOverlay.onContextShowing(evt); }, false);
			menu.addEventListener("popupshowing", function (evt) { DTA_ContextOverlay.onToolsShowing(evt); }, false);

			this.ctxBase = document.getElementById('dtaCtxCompact');
			
			// prepare tools
			this.tools = {};
			['DTA', 'TDTA', 'Manager'].forEach(
				function (e) {
					this.tools[e] = document.getElementById('dtaTools' + e);
				},
				this
			);
			this.toolsBase = document.getElementById('dtaToolsMenu');
			this.toolsMenu = document.getElementById('dtaToolsPopup');
			this.toolsSep = document.getElementById('dtaToolsSep');
		}
		catch (ex) {
			Components.utils.reportError(ex);
			DTA_debug.log("DCO::init()", ex);
		}
	},
	get selectButton() {
		return document.getElementById('dta-turboselect-button') || {checked: false};
	},
	get contextMenu() {
		if (window.gContextMenu !=  null) {
			return gContextMenu;
		}
		var cm = {
			onLink: false,
			onImage: false,
			target: document.popupNode,
			fake: true
		};
		if (cm.target) {
			var node = cm.target;
			if (node instanceof Components.interfaces.nsIImageLoadingContent && node.currentURI) {
				cm.onImage = true;
			}
			while (node && !cm.onLink) {
				if (node instanceof HTMLAnchorElement && node.href) {
					cm.onLink = true;
				}				
				node = node.parentNode;
			}
		}
		return cm;
	},
	onContextShowing: function(evt) {
		try {
			var ctx = this.contextMenu;
			// get settings
			var items = DTA_preferences.getExt("ctxmenu", "1,1,0").split(",").map(function(e){return parseInt(e);});
			var compact = DTA_preferences.getExt("ctxcompact", false);
			
			var menu;
			if (compact) {
				this.ctxBase.hidden = false;
				menu = this.compact;
				}
			else {
				this.ctxBase.hidden = true;
				menu = this.direct;
			}
			
			// hide all
			for (var i in menu) {
				this.direct[i].hidden = true;
				this.compact[i].hidden = true;
			}
			// show nothing!
			if (items.indexOf(1) == -1) {
				this.ctxBase.hidden = true;
				return;
			} 
			
			// setup menu items
			// show will hold those that will be shown
			var show = [];
			
			// hovering an image or link
			if (ctx && (ctx.onLink || ctx.onImage)) {
				if (items[0]) {
					show.push(menu.Save);
				}
				if (items[1]) {
					show.push(menu.SaveT);
				}
				menu.Save.label = this.getString('dtasave' + (ctx.onLink ? 'link' : 'image'));
				menu.SaveT.label = this.getString('turbosave' + (ctx.onLink ? 'link' : 'image'));
			}
			else if (
				ctx.target
				&& ('form' in ctx.target)
			) {
				if (items[0]) {
					show.push(menu.SaveForm);
				}
				if (items[1]) {
					show.push(menu.SaveFormT);
				}		
			}			
			// regular
			else if (ctx && (ctx.fake || !(ctx.onLink || ctx.onImage))) {
				if (items[0]) {
					show.push(menu.DTA);
				}
				if (items[1]) {
					show.push(menu.TDTA);
				}
				var sel = document.commandDispatcher.focusedWindow.getSelection();
				sel = sel && !sel.isCollapsed;
				menu.DTA.label = this.getString('dta' + (sel ? 'selection' : 'regular'));
				menu.TDTA.label = this.getString('turbo' + (sel ? 'selection' : 'regular'));
			}
			
			// prefs
			if (items[2]) {
				show.push(menu.Pref);
				if (compact && (items[0] || items[1])) {
					show.push(menu.SepPref);
				}
			}
			
			// show the seperators, if required.
			var n = menu.SepFront;
			while ((n = n.previousSibling)) {
				if (n.hidden) {
					continue;
				}
				if (n.nodeName != 'menuseparator') {
					show.push(menu.SepFront);
				}
				break;
				}
			n = menu.SepBack;
			while ((n = n.nextSibling)) {
				if (n.hidden) {
					continue;
			}
				if (n.nodeName != 'menuseparator') {
					show.push(menu.SepBack);
				}
				break;
				}
			
			show.forEach(
				function (node) {
					node.hidden = false;
				}
			);
		}
		catch(ex) {
			DTA_debug.log("DTAContext(): ", ex);
		}		 
	},
	
	onToolsShowing : function(evt) {
		try {
			
			// get settings
			var menu = DTA_preferences.getExt("toolsmenu", "1,1,1").split(",").map(function(e){return parseInt(e);});
			
			// all hidden...
			var hidden = DTA_preferences.getExt("toolshidden", false);
			for (var i in this.tools) {
				this.tools[i].hidden = hidden;
			}
			this.toolsBase.hidden = hidden;
			if (hidden) {
				return;
			}

			var compact = menu.indexOf(0) != -1;
			
			// setup menu items
			// show will hold those that will be shown
			var show = [];
			
			if (menu[0]) {
				show.push('DTA');
			}
			if (menu[1]) {
				show.push('TDTA');
			}
			// prefs
			if (menu[2]) {
				show.push('Manager');
			}
			this.toolsSep.hidden = menu.indexOf(0) == -1;
			this.toolsBase.setAttribute('label', this.getString(menu.indexOf(1) != -1 ? 'moredtatools' : 'simpledtatools'));
		
			// show the items.
			for (var i in this.tools) {
				var cur = this.tools[i];
				if (show.indexOf(i) == -1) {
					this.toolsMenu.insertBefore(cur, this.toolsSep);
				}
				else {
					this.toolsBase.parentNode.insertBefore(cur, this.toolsBase);
				}
			}
		}
		catch(ex) {
			DTA_debug.log("DTATools(): ", ex);
		}
	},
	
	extractDescription: function(child) {
		var rv = "";
		try {
			var fmt = function(s) {
				try {
					return s.replace(/(\n){1,}/gi, " ").replace(/(\s){2,}/gi, " ") + " ";
				} catch (ex) { /* no-op */ }
				return "";
			};
			for (var i = 0, e = child.childNodes.length; i < e; ++i) {
				var c = child.childNodes[i];

				if (c.nodeValue && c.nodeValue != "") {
					rv += fmt(c.nodeValue);
				}

				if (c.nodeType == 1) {
					rv += this.extractDescription(c);
				}

				if (c && 'hasAttribute' in c) { 
					if (c.hasAttribute('title')) {
						rv += fmt(c.getAttribute('title'));	
					}
					else if (c.hasAttribute('alt')) {
						rv += fmt(c.getAttribute('alt'));
					}
				}
			}
		}
		catch(ex) {
			DTA_debug.log('extractDescription', ex);
		}
		return this.trim(rv);
	},
	_keyActive: false,
	onKeyDown: function(evt) {
		if (this._keyActive) {
			return;
		}
		if (evt.shiftKey && evt.ctrlKey) {
			this._keyActive = true;
			this.selectButton.checked = true;
			this.attachOneClick();
		}
	},
	onKeyUp: function(evt) {
		if (!this._keyActive) {
			return;
		}
		if (evt.shiftKey) {
			this._keyActive = false;
			this.selectButton.checked = false;
			this.detachOneClick();
		}
	},
	onBlur: function (evt) {
		// when the window loses focus the keyup might not be received.
		// better toggle back
		if (!this._keyActive) {
			return;
		}
		this._keyActive = false;
		this.selectButton.checked = false;
		this.detachOneClick();
	},
	toggleOneClick: function(evt) {
		if (this.selectButton.checked) {
			this.attachOneClick(evt);
		}
		else {
			this.detachOneClick(evt);
		}
	},
	_selector: null,
	attachOneClick: function(evt) {
		if (!!this._selector) {
			return;
		}
		this._selector = new this.Selector();
	},
	detachOneClick: function(evt) {
		if (!this._selector) {
			return;
		}
		this._selector.dispose();
		delete this._selector;
	},
	
};
DTA_ContextOverlay.Selector = function() {
	let tp = this;
	this._callback = function(evt) tp.onClickOneClick(evt);
	
	window.addEventListener('click', this._callback, false);
	window.addEventListener('mouseup', this._callback, false);
	window.addEventListener('mousemove', this._callback, false);
	
	this._detachObserver = DTA_preferences.addObserver('extensions.dta.selectbgimages', this);
	this.observe();
}
DTA_ContextOverlay.Selector.prototype = {
	dispose: function() {
		window.removeEventListener('click', this._callback, false);
		window.removeEventListener('mouseup', this._callback, false);
		window.removeEventListener('mousemove', this._callback, false);
		this.detachHilight();
		this._detachObserver();
	},
	detachHilight: function () {
		if (this._hilight) {
			this._hilight.hide();
			delete this._hilight;
		}
	},
	getBgImage: function(e) {
		if (!e || !e.ownerDocument) {
			return null;
		}
		let url = e.ownerDocument.defaultView.getComputedStyle(e, "").getPropertyCSSValue('background-image');
		if (url && url.primitiveType == CSSPrimitiveValue.CSS_URI) {
			return {elem: e, url: url.getStringValue()};
		}
		return getBgImage(e.parentNode);
	},
	findElemUnderCursor: function (e, n, a) {
		if (n == 'bgimg') {
			return this.getBgImage(e);
		}
		if (!e) {
			return null;
		}
		if (e.localName == n && e[a]) {
			return {elem: e, url: e[a] };
		}
		return this.findElemUnderCursor(e.parentNode, n, a);
	},
	cancelEvent: function (evt) {
		if (!evt.cancelable) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();
	},	
	onClickOneClick: function(evt) {
		function processRegular(e) {
			let m = this.findElemUnderCursor(target, e[0], e[1]);
			if (!m) {
				return false;
			}
			DTA_debug.logString("searching");
			this.cancelEvent(evt);
			try {
				DTA_ContextOverlay.saveSingleLink(true, m.url, m.elem);
				this.detachHilight();
				new this.Flasher(m.elem).hide();
			}
			catch (ex) {
				DTA_debug.log("failed to process " + e[0], ex);
			}
			return true;
		}
		function highlightElement(e) {
			let m = this.findElemUnderCursor(target, e[0], e[1]);
			if (!m) {
				return false;
			}
			if (this._hilight && this._hilight.elem == m.elem) {
				return true;
			}
			this.detachHilight();
			this._hilight = new this.Highlighter(m.elem);
			return true;
		}		
		
		target = evt.target;
		let doc = target.ownerDocument;
		
		if (evt.type == 'click') {
			if (evt.button == 0 && !!target && target.nodeType == 1 && (!target.namespaceURI || target.namespaceURI == 'http://www.w3.org/1999/xhtml')) {
				this._searchee.some(processRegular, this);
			}			
		}
		else if (evt.type == 'mousemove') {
			if (!this._searchee.some(highlightElement, this)) {
				this.detachHilight();
			}
		}
		else {
			this.cancelEvent(evt);
		}
	},
	observe: function() {
		let searchee = [
			['A', 'href'],
			['IMG', 'src']
		];
		if (DTA_preferences.getExt('selectbgimages', false)) {
			searchee.push(['bgimg', 'bgimg']);
		}
		this._searchee = searchee;
	}
};

DTA_ContextOverlay.Selector.prototype.Flasher = function(elem) {
	this.elem = elem;
	this.doc = elem.ownerDocument;
	this.init();
}
DTA_ContextOverlay.Selector.prototype.Flasher.prototype = {
	BACKGROUND: '#1def39 no-repeat center',
	PADDING: 6,
	OPACITY: 0.6,
	RADIUS: 5,
	FSTEP: 0.05,
	FINTERVAL: 60,
	FWAIT: 350,
	
	calcPosition: function() {
		let parent = this.elem;
		let ow = parent.offsetWidth;
		let oh = parent.offsetHeight;
		let ol = parent.offsetLeft;
		let ot = parent.offsetTop;
		// enlarge the box to include all (overflowing) child elements
		// useful for example for inline <A><IMG></A>
		if (parent.nodeName != 'IMG') {
			let boxen = parent.getElementsByTagName('*');
			for (let i = 0; i < boxen.length; ++i) {
				let box = boxen[i];
				if (!!box.style.float || box.style.position == 'fixed' || box.style.position == 'absolute') {
					continue;
				}
				ow = Math.max(ow, box.offsetWidth);
				oh = Math.max(oh, box.offsetHeight);
				ol = Math.min(ol, box.offsetLeft);
				ot = Math.min(ot, box.offsetTop);
			}
		}
		// calculate the real offset coordinates
		parent = parent.offsetParent;
		let pos = (this.elem.style.position && this.elem.style.position == 'fixed') ? 'fixed' : 'absolute';
		while (parent) {
			ot += parent.offsetTop;
			ol += parent.offsetLeft;
			if (parent.style.position == 'fixed') {
				pos = 'fixed';
			}
			parent = parent.offsetParent;
		}
		return {
			width: ow,
			height: oh,
			left: ol,
			top: ot,
			position: pos
		};
	},	
	
	init: function() {
		let div = this.doc.createElement('div');
		this.doc.documentElement.appendChild(div);
		
		div.style.MozBorderRadius = this.RADIUS + 'px';
		div.style.zIndex = 2147483647;
		div.style.opacity = this.OPACITY;
		div.style.background = this.BACKGROUND;
		div.style.display = 'block';

		// put the div where it belongs
		let pos = this.calcPosition();
		div.style.width = (pos.width + 2 * this.PADDING) + "px";
		div.style.height = (pos.height + 2 * this.PADDING) + "px";
		div.style.top = (pos.top - this.PADDING) + "px";
		div.style.left = (pos.left - this.PADDING) + "px";
		div.style.position = pos.position;
		
		// add the adding icon if the element covers enough space
		if (Math.min(pos.width, pos.height) >= 36) {
			div.style.backgroundImage = 'url(chrome://dta-public/skin/integration/added_large.png)';
		} 
		if (Math.min(pos.width, pos.height) >= 18) {
			div.style.backgroundImage = 'url(chrome://dta-public/skin/integration/added_small.png)';
		}
		
		this._div = div;
	},
	fade: function() {
		let o = (parseFloat(this._div.style.opacity) - this.FSTEP);
		if (o - 0.03 < 0) {
			this._div.parentNode.removeChild(this._div);
			return false;
		}
		this._div.style.opacity = o.toString();
		let tp = this;
		setTimeout(function() tp.fade(), this.FINTERVAL);
		return true;
	},
	hide: function() {
		let tp = this;
		setTimeout(function() tp.fade(), this.FWAIT);
	}
};

DTA_ContextOverlay.Selector.prototype.Highlighter = function(elem) {
	this.elem = elem;
	this.doc = elem.ownerDocument;
	this.init();
}
DTA_ContextOverlay.Selector.prototype.Highlighter.prototype = {
	BACKGROUND: 'red',
	OPACITY: 0.4,
	RADIUS: 9,
	WIDTH: 3,
	
	calcPosition: DTA_ContextOverlay.Selector.prototype.Flasher.prototype.calcPosition, 
	
	init: function() {
		let left = this.doc.createElement('div');
		this.doc.documentElement.appendChild(left);
		let right = this.doc.createElement('div');
		this.doc.documentElement.appendChild(right);
		let top = this.doc.createElement('div');
		this.doc.documentElement.appendChild(top);
		let bottom = this.doc.createElement('div');
		this.doc.documentElement.appendChild(bottom);
		
		let pos = this.calcPosition();
		for each (let div in [left, right, top, bottom]) {
			div.style.zIndex = 2147483647;
			div.style.opacity = this.OPACITY;
			div.style.background = this.BACKGROUND;
			div.style.display = 'block';
			div.style.position = pos.position;
			div.style.width = this.WIDTH + 'px';
			div.style.height = this.WIDTH + 'px';
		}
		
		left.style.MozBorderRadiusTopleft = this.RADIUS + 'px';
		left.style.MozBorderRadiusBottomleft = this.RADIUS + 'px';
		left.style.left = (pos.left - this.WIDTH) + 'px';
		left.style.top = (pos.top - this.WIDTH) + 'px';
		left.style.height = (pos.height + this.WIDTH * 2) + 'px';

		right.style.MozBorderRadiusTopright = this.RADIUS + 'px';
		right.style.MozBorderRadiusBottomright = this.RADIUS + 'px';
		right.style.top = left.style.top;
		right.style.left = (pos.left + pos.width) + 'px';
		right.style.height = left.style.height;
		
		
		top.style.left = pos.left + 'px';
		top.style.top = (pos.top - this.WIDTH) + 'px';
		top.style.width = pos.width + 'px';
		
		bottom.style.left = pos.left + 'px';
		bottom.style.top = (pos.top + pos.height) + 'px';
		bottom.style.width = pos.width + 'px';
		
		this._divs = [left, right, top, bottom];
	},
	hide: function() {
		for each (let div in this._divs) {
			div.parentNode.removeChild(div);
		}
	}
};

addEventListener("load", function() DTA_ContextOverlay.init(), false);
addEventListener("keydown", function(evt) DTA_ContextOverlay.onKeyDown(evt), false);
addEventListener("keyup", function(evt) DTA_ContextOverlay.onKeyUp(evt), false);
addEventListener("blur", function(evt) DTA_ContextOverlay.onBlur(evt), true);