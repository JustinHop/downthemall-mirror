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
 *    Stefano Verna <stefano.verna@gmail.com>
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

var SessionManager = {

	init: function() {
		this._con = Serv('@mozilla.org/storage/service;1', 'mozIStorageService')
			.openDatabase(DTA_profileFile.get('dta_queue.sqlite'));
		try {
			this._con.executeSimpleSQL('CREATE TABLE queue (uuid INTEGER PRIMARY KEY AUTOINCREMENT, pos INTEGER, item TEXT)');
		} catch (ex) {
			// no-op
		}
		try {
			this._saveStmt = this._con.createStatement('INSERT INTO queue (uuid, pos, item) VALUES (?1, ?2, ?3)');
			this._saveItemStmt = this._con.createStatement('UPDATE queue SET pos = ?2, item = ?3 WHERE uuid = ?1');
			this._savePosStmt = this._con.createStatement('UPDATE queue SET pos = ?1 WHERE uuid = ?2');
			this._delStmt = this._con.createStatement('DELETE FROM queue WHERE uuid = ?1');
		}
		catch (ex) {
			Debug.dump("SQLite: " + this._con.lastErrorString);
			alert("SQLite: " + this._con.lastErrorString);
			self.close();
			return;
		}

		this._converter = Components.classes["@mozilla.org/intl/saveascharset;1"]
			.createInstance(Ci.nsISaveAsCharset);
		this._converter.Init('utf-8', 1, 0);

		this.load();
	},

	_saveDownload: function(d, pos) {

		if (
			(Prefs.removeCompleted && d.is(COMPLETE))
			|| (Prefs.removeCanceled && d.is(CANCELED))
			|| (Prefs.removeAborted && d.is(PAUSED))
		) {
			this.deleteDownload(d);
			return false;
		}

		var e = {};
		[
			'fileName',
			'numIstance',
			'description',
			'resumable',
			'mask',
			'pathName',
			'hash',
			'compression',
			'maxChunks',
			'contentType',
			'conflicts',
		].forEach(
			function(u) {
				e[u] = d[u];
			}
		);
		e.state = d.is(COMPLETE, CANCELED, FINISHING) ? d.state : PAUSED;
		if (d.destinationNameOverride) {
			e.destinationName = d.destinationNameOverride;
		}

		if (d.referrer) {
			e.referrer = d.referrer.spec;
		}
		// Store this so we can later resume.
		if (!d.is(CANCELED, COMPLETE) && d.partialSize) {
			e.tmpFile = d.tmpFile.path;
		}
		e.startDate = d.startDate.getTime();

		e.urlManager = d.urlManager.save();
		e.visitors = d.visitors.save();

		if (!d.resumable && !d.is(COMPLETE)) {
			e.totalSize = 0;
		} else {
			e.totalSize = d.totalSize;
		}
		
		e.chunks = [];

		if (d.is(RUNNING, PAUSED, QUEUED) && d.resumable) {
			d.chunks.forEach(
				function(c) {
					e.chunks.push({start: c.start, end: c.end, written: c.written});
				}
			);
		}

		let s;
		Debug.dump("Saving Download: " + d);
		if (d._dbId) {
			s = this._saveItemStmt;
			s.bindInt64Parameter(0, d._dbId);
		}
		else {
			s = this._saveStmt;
			s.bindNullParameter(0);
		}
		if (!isFinite(pos)) {
			if ('position' in d) {
				s.bindInt32Parameter(1, d.position);
			}
			else {
				s.bindNullParameter(1);
			}
		}
		else {
			s.bindInt32Parameter(1, pos);
		}
		s.bindUTF8StringParameter(2, this._converter.Convert(e.toSource()));
		s.execute();
		if (!d._dbId) {
			d._dbId = this._con.lastInsertRowID;
		}
		s.reset();
		return true;
	},

	beginUpdate: function() {
		this._con.beginTransactionAs(this._con.TRANSACTION_DEFERRED);		
	},
	endUpdate: function() {
		this._con.commitTransaction();
	},	
	save: function(download) {

		// just one download.
		if (download) {
			try {
				this._saveDownload(download);
			}
			catch (ex) {
				Debug.dump("SQLite: " + this._con.lastErrorString);
			}
			return;
		}

		this.beginUpdate();
		try {
			let i = 0;
			for (let d in Tree.all) {
				if (this._saveDownload(d, i)) {
					++i;
				}
			};
		}
		catch (ex) {
			Debug.dump("SQLite: " + this._con.lastErrorString);
		}
		this.endUpdate();

	},
	savePositions: function() {
		this.beginUpdate();
		try {
			let s = this._savePosStmt; 
			for (let d in Tree.all) {
				if (!isFinite(d._dbId + d.position)) {
					throw new Error("test");
					continue;
				}
				s.bindInt64Parameter(0, d.position);
				s.bindInt64Parameter(1, d._dbId);
				s.execute();
				s.reset();
			}
		}
		catch (ex) {
			Debug.dump("SQLite: " + this._con.lastErrorString);
		}
		this.endUpdate();
	},
	deleteDownload: function(download) {
		try {
			if (!download._dbId) {
				return;
			}
			Debug.dump("Deleting Download: " + download);
			this._delStmt.bindInt64Parameter(0, download._dbId);
			this._delStmt.execute();
			this._delStmt.reset();
			delete download._dbId;
		}
		catch (ex) {
			Debug.dump("SQLite: " + this._con.lastErrorString);
			throw ex;
		}
	},

	load: function() {
		return Tree.update(this._load, this);
	},
	_load: function() {

		var stmt = this._con.createStatement('SELECT uuid, item FROM queue ORDER BY pos');

		while (stmt.executeStep()) {
			try {
				let _dbId = stmt.getInt64(0);
				let down = eval(stmt.getUTF8String(1));
				let get = function(attr) {
					if (attr in down) {
						return down[attr];
					}
					return null;
				}

				let d = new QueueItem(
					new UrlManager(down.urlManager),
					get("pathName"),
					get("numIstance"),
					get("description"),
					get("mask"),
					get("referrer"),
					get("tmpFile")
				);
				d._dbId = _dbId;
				d.startDate = new Date(get("startDate"));
				d.visitors.load(down.visitors);

				[
					'contentType',
					'conflicts',
					'fileName',
					'destinationName',
					'resumable',
					'totalSize',
					'hash',
					'compression'
				].forEach(
					function(e) {
						d[e] = get(e);
					}
				);
				if ('maxChunks' in down) {
					d._maxChunks = down.maxChunks;
				}

				d.started = d.partialSize != 0;
				if (get('state')) {
					d._state = get('state');
				}
				if (d.is(PAUSED)) {
					down.chunks.forEach(
						function(c) {
							d.chunks.push(new Chunk(d, c.start, c.end, c.written));
						}
					);
					d.refreshPartialSize();
					d.status = _('paused');
				}
				else if (d.is(COMPLETE)) {
					d.partialSize = d.totalSize;
					d.status = _('complete');
				}
				else if (d.is(CANCELED)) {
					d.status = _('canceled');
				}			
				Tree.add(d);
			}
			catch (ex) {
				Debug.dump('failed to init a download from queuefile', ex);
			}
		}
		Tree.invalidate();
	}
};