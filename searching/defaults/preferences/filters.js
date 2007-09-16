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
 * The Original Code is the downTHEMall preferences.
 *
 * The Initial Developer of the Original Code is Nils Maier
 * Portions created by the Initial Developer are Copyright (C) 2006
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
 
// See chrome/locale/filters.properties
pref("extensions.dta.filters.deffilter-all.label", "All files");
pref("extensions.dta.filters.deffilter-all.test", "/.*/i");
pref("extensions.dta.filters.deffilter-all.regex", true);
pref("extensions.dta.filters.deffilter-all.active", false);
pref("extensions.dta.filters.deffilter-all.type", 3);

pref("extensions.dta.filters.deffilter-arch.label", "Archives)");
pref("extensions.dta.filters.deffilter-arch.test", "/\\.(?:z(?:ip|[0-9]{2})|r(?:ar|[0-9]{2})|jar|bz2|gz|tar|rpm)$/i");
pref("extensions.dta.filters.deffilter-arch.regex", true);
pref("extensions.dta.filters.deffilter-arch.active", false);
pref("extensions.dta.filters.deffilter-arch.type", 1);

pref("extensions.dta.filters.deffilter-vid.label", "Videos");
pref("extensions.dta.filters.deffilter-vid.test", "/\\.(?:mpeg|ra?m|avi|mp(?:g|e|4)|mov|divx|asf|qt|wmv|m\dv|rv|vob|asx|ogm)$/i");
pref("extensions.dta.filters.deffilter-vid.regex", true);
pref("extensions.dta.filters.deffilter-vid.active", true);
pref("extensions.dta.filters.deffilter-vid.type", 3);

pref("extensions.dta.filters.deffilter-aud.label", "Audio");
pref("extensions.dta.filters.deffilter-aud.test", "/\\.(?:mp3|wav|og(?:g|a)|flac|midi?|rm|aac|wma|mka|ape)$/i");
pref("extensions.dta.filters.deffilter-aud.regex", true);
pref("extensions.dta.filters.deffilter-aud.active", true);
pref("extensions.dta.filters.deffilter-aud.type", 1);

pref("extensions.dta.filters.deffilter-img.label", "Images");
pref("extensions.dta.filters.deffilter-img.test", "/\\.(?:jp(?:e?g|e|2)|gif|png|tiff?|bmp|ico)$/i");
pref("extensions.dta.filters.deffilter-img.regex", true);
pref("extensions.dta.filters.deffilter-img.active", true);
pref("extensions.dta.filters.deffilter-img.type", 3);

pref("extensions.dta.filters.deffilter-bin.label", "Software");
pref("extensions.dta.filters.deffilter-bin.test", "/\\.(?:exe|msi|dmg|bin|xpi|iso)$/i");
pref("extensions.dta.filters.deffilter-bin.regex", true);
pref("extensions.dta.filters.deffilter-bin.active", true);
pref("extensions.dta.filters.deffilter-bin.type", 1);

pref("extensions.dta.filters.deffilter-imgjpg.label", "JPEG");
pref("extensions.dta.filters.deffilter-imgjpg.test", "/\\.jp(e?g|e|2)$/i");
pref("extensions.dta.filters.deffilter-imgjpg.regex", true);
pref("extensions.dta.filters.deffilter-imgjpg.active", false);
pref("extensions.dta.filters.deffilter-imgjpg.type", 3);

pref("extensions.dta.filters.deffilter-imggif.label", "GIF");
pref("extensions.dta.filters.deffilter-imggif.test", "/\\.gif$/i");
pref("extensions.dta.filters.deffilter-imggif.regex", true);
pref("extensions.dta.filters.deffilter-imggif.active", false);
pref("extensions.dta.filters.deffilter-imggif.type", 2);

pref("extensions.dta.filters.deffilter-imgpng.label", "PNG");
pref("extensions.dta.filters.deffilter-imgpng.test", "/\\.png$/i");
pref("extensions.dta.filters.deffilter-imgpng.regex", true);
pref("extensions.dta.filters.deffilter-imgpng.active", false);
pref("extensions.dta.filters.deffilter-imgpng.type", 2);