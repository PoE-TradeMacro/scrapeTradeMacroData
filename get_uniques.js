var request 	= require("request");
var rp 			= require('request-promise');
var jsonfile 	= require('jsonfile');
var fs 			= require('fs');
var sleep 		= require('sleep');
var waitUntil 	= require('wait-until');
const util 		= require('util');

//var regex_hiddenmods = /(<br>)?.*\(Hidden\)(<br>)/i;
var regex_hiddenmods = /.*\(Hidden\).*/i;

var regex_wikilinks = /\[\[([^\]\|]*)\]\]|\[\[[^\]\|]*\|([^\]\|]*)\]\]/;
/*
	matches formats "[[mod]]" or "[[wikipage|mod]] and stores "mod" as capture group 1 or 2, respectively.
	Since only one capture group is filled each time, using both together in a replacement like r'\1\2' turns
	both match variants into "mod".
*/

var regex_wiki_page_disamb = /([^\(]+) \([^\)]+\)/;
var regex_wiki_page_disamb_replace = /\s?\(.*\)$/;
/*
	matches items named "item name (disambiguation)" and stores "item name" as capture group 1.
	this format is used in the wiki to distinguish style variants of items, giving each variant its own page.
	since the style variants ingame all have the same name, we want to filter these out and
	put in a manually prepared version that covers all styles in one overview. 
*/

var regex_single_range = /\+?\(((-?[\d\.]+)-([\d\.]+))\)%?/;
var regex_single_range_replace = /\((-?[\d\.]+-[\d\.]+)\)/;
/*
	matches variants of the wiki's "(num-num)" format including the possibly leading "+" and trailing "%", such as:
	(10-20)
	+(10-20)
	(10-20)%
	(0.6-1)%
	(0.6-0.8)%
	(-40-40)%	format found in ventor's gamble's rarity and some "flask charge used" mods
	+(-25-50)%	ventor's gamble again, now with resistances
	
	The "num-num" part inside the brakets is stored as capture group 1
	
	It intentionally leaves the leading "-" of mods like "-(20-10) Physical Damage Taken from Attacks"
	The initial matching of double range damage mods like "Adds (10-20) to (30-40) Type Damage" is done
	with another expression.
*/

var regex_double_range = /\(?(\d+)(?:-(\d+)\))? to \(?(\d+)(?:-(\d+)\))?/;
var regex_double_range_replace = /\(?(\d+)(?:-(\d+)\))? to \(?(\d+)(?:-(\d+)\))?/;
/*
	matches the relevant variants for double range damage mods
	(10-20) to (30-40)
	15 to (30-40)
	(10-20) to 35
	15 to 35
	Four named capture groups are used: lowmin, lowmax, highmin and highmax (numbers 10, 20, 30 and 40 above)
	lowmax and/or highmax is None if the part is only a number and not a number range (cases 2-4 above; numbers 15 and 35)
*/

getItemClasses();

function getItemClasses() {
	var classes = [];
	var count = 0;
	var urls = [];
	var results = [];
	
	var url_1 = "https://pathofexile.gamepedia.com/api.php?" +
		'action=cargoquery' +
		'&format=json' +
		'&tables=items' +
		'&fields=COUNT(DISTINCT items._pageName)=count, class' +
		'&where=rarity="unique"' +
		'&group_by=items.class' +
		'&formatversion=1';
	var url_2 = "https://pathofexile.gamepedia.com/api.php?" +
		'action=cargoquery' +
		'&format=json' +
		'&tables=items' +
		'&fields=class, tags' +
		'&where=rarity="unique"' +
		'&group_by=items.class' +
		'&formatversion=1';
	
	urls.push(encodeURI(url_1));
	urls.push(encodeURI(url_2));
	
	//console.log(urls);	
	
	urls.forEach(function(url_class) {
		var options_class = {
			uri: url_class,	
			headers: {
				'User-Agent': 'Request-Promise'
			},
			json: true
		};
		
		rp(options_class)
		.then(function (result) {
			//console.log(util.inspect(result.cargoquery[0].title.class, false, null))
			results.push(result.cargoquery);
			count++;
		})
		.catch(function (err) {
			count++;
			console.log(err)
		});		
	});
		
	waitUntil()
	.interval(500)
	.times(Infinity)
	.condition(function() {
		return (urls.length == count ? true : false);
	})
	.done(function(result) {
		
		var classes = mergeClassResults(results);
		//console.log(util.inspect(classes, false, null));
		scrape(classes);
	});
}

function mergeClassResults(results) {
	var merged = {};

	results.forEach(function(result) {
		result.forEach(function(c) {
			if (!merged.hasOwnProperty(c.title.class)) {
				merged[c.title.class] = {};
			}	
			
			for (var key in c.title) {
				if (key != "class") {
					if (key == "tags") {
						merged[c.title.class].type = [];
						if (c.title[key].indexOf("weapon") > 0) {
							merged[c.title.class].type.push("weapons");
						}
						if (c.title[key].indexOf("shield") > 0) {
							merged[c.title.class].type.push("shields");
						}			
						if (c.title[key].indexOf("armour") > 0) {
							merged[c.title.class].type.push("armours");
						}			
					} else {
						merged[c.title.class][key] = c.title[key];	
					}
				}			
			}
		});
	});

	return merged;
}

function scrape(classes) {
	// uniques - relics
	var items = [[],[]];

	var uniques = [];
	var classCount = 0;
	var requestCount = 0;
	
	console.log(classes)
	
	for (var key in classes) {		
		classCount++;
		resultLimit = 500;
		
		var url_class = "https://pathofexile.gamepedia.com/api.php?" +
			'action=cargoquery' +
			'&format=json' +
			'&limit=' + resultLimit +
			'&tables=items';
		
		var isWeapon = classes[key].type.indexOf("weapons") > -1 ? true : false;
		var isArmour = classes[key].type.indexOf("armours") > -1 ? true : false;
		var isShield = classes[key].type.indexOf("shields") > -1 ? true : false;
		
		if (classes[key].type.length >= 1) {
			classes[key].type.forEach(function(e) {
				url_class += ',' + e;
			});
		}
		
		url_class += '&fields=' +
				'items.name, items.base_item, items.class, items.explicit_stat_text, items.implicit_stat_text';
				
		if (isWeapon) {
			url_class += ', weapons.attack_speed, weapons.attack_speed_range_maximum, weapons.attack_speed_range_minimum, weapons.attack_speed_range_text, ' +
				'weapons.dps_range_maximum, weapons.dps_range_minimum, ' +
				'weapons.physical_dps_range_maximum, weapons.physical_dps_range_minimum, ' +
				'weapons.physical_damage_max_range_maximum, weapons.physical_damage_max_range_minimum, ' +
				'weapons.physical_damage_min_range_maximum, weapons.physical_damage_min_range_minimum, ' +
				'weapons.elemental_dps_range_maximum, weapons.elemental_dps_range_minimum';
		}
		
		if (isArmour) {
			url_class += ', armours.evasion_range_maximum, armours.evasion_range_minimum, armours.energy_shield_range_maximum, armours.energy_shield_range_minimum, ' +
				'armours.armour_range_maximum, armours.armour_range_minimum';
		}
		
		if (isShield) {
			url_class += ', shields.block, shields.block_range_maximum, shields.block_range_minimum';
		}
		
		url_class += '&where=items.rarity="unique" AND items.class="' + key + '"';
		if (key == "Maps") {
			url_class += 'AND items.drop_enabled="1"';
		}
		
		if (classes[key].type.length >= 1) {
			url_class += '&join_on=';
			var i = 0;
			classes[key].type.forEach(function(e) {
				if (i > 0) {
					url_class += ','	
				}
				url_class += 'items._pageName=' + e + '._pageName';
				i++;
			});
		}

		url_class += '&group_by=items._pageName';
		url_class += '&formatversion=1';
		
		url_class = encodeURI(url_class);
		
		var options_class = {
			uri: url_class,	
			headers: {
				'User-Agent': 'Request-Promise'
			},
			json: true
		};		
		
		rp(options_class)
		.then(function (result) {
			//console.log(util.inspect(result.cargoquery[0].title.class, false, null))
			uniques.push(result.cargoquery);
			requestCount++;
		})
		.catch(function (err) {
			requestCount++;
			console.log(err)
		});
	}
	
	waitUntil()
	.interval(500)
	.times(Infinity)
	.condition(function() {
		return (classCount == requestCount ? true : false);
	})
	.done(function(result) {
		uniques = prepareItemObject(uniques);
		uniques = get_item_mods(uniques);
		uniques = get_item_stats(uniques);
		
		uniques = mergeVariants(uniques);
		uniques.sort(compareItemNames);		

		write_data_to_file('uniques', uniques);
	});
}

function compareItemNames(a,b) {
	if (a.name < b.name)
		return -1;
	if (a.name > b.name)
		return 1;
	return 0;
}

function prepareItemObject(result) {
	var uniques = [];

	result.forEach(function(e) {
		e.forEach(function(el) {
			var tmp = {}
			tmp.properties = {};
			
			for (var key in el.title) {
				if (key == "name") {
					tmp.name = el.title.name;				
				} else if (key == "base item") {
					tmp["base"] = el.title["base item"];
				} else if (key == "class") {
					tmp["class"] = el.title["class"];					
				} else {
					tmp.properties[key] = el.title[key];
				}
			}
			
			uniques.push(tmp);	
		});
	});
	
	return uniques
}

function write_data_to_file(file, data) {
	var file_name = 'output/' + file + '.json';
	console.log(file_name);
	try {
		fs.unlinkSync(file_name);
	} catch (err) {}

	var out = {};
	out[file] = data;
	jsonfile.writeFile(file_name, out, function(err) {
		if(err){
			console.error(err)
		}
		else {
			console.log('file ' + file_name + ' saved.');
		}
	})
}

function add_mods_to_item(mods_existing, mods_new) {
	mods_new.forEach(function(e) {
		var mod_exists  = false;

		mods_existing.forEach(function(n) {
			if (e.name == n.name) {
				mod_exists  = true;
			}
		});

		if (!mod_exists) {
			mods_existing.push(e);
		}
	});

	return mods_existing
}

function mergeVariants(uniques) {
	//console.log()
	//console.log("------------------------------")
	var mergedUniques = [];

	var found;
	var mod_found;
	
	uniques.forEach(function(e) {
		found = false;
		mergedUniques.forEach(function(u) {
			if (e.name == u.name) {				
				found = true;
				u.hasVariant = true;
				
				e.mods.forEach(function(em) {
					mod_found = false;					
					u.mods.forEach(function(um) {
						if (em.name_orig == um.name_orig) {
							mod_found = true;
						}
					});
					
					if (!mod_found) {
						u.mods.push(em);						
					}
				});
			}
		});
		
		if (!found) {
			mergedUniques.push(e);
		}
	});
	
	return mergedUniques
}

function get_item_stats(uniques) {
	uniques.forEach(function(e) {
		var stats   = [];
		var tmp     = {};
		var value;

		/* defense */
			// evasion
		value = e.properties["evasion range maximum"];
		if (typeof value !== "undefined" && value) {
			tmp = {};
			tmp.name = "Evasion Rating";
			tmp.ranges = [[parseFloat(e.properties["evasion range minimum"]), parseFloat(e.properties["evasion range maximum"])]];
			if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
				stats.push(tmp);
			}
		}
			// energy shield
		value = e.properties["energy shield range maximum"];
		if (typeof value !== "undefined" && value) {
			tmp = {};
			tmp.name    = "Energy Shield";
			tmp.ranges  = [ [parseFloat(e.properties["energy shield range minimum"]), parseFloat(e.properties["energy shield range maximum"])] ];
			if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
				stats.push(tmp);
			}
		}
			// armour
		value = e.properties["armour range maximum"];
		if (typeof value !== "undefined" && value) {
			tmp = {};
			tmp.name    = "Armour";
			tmp.ranges  = [ [parseFloat(e.properties["armour range minimum"]), parseFloat(e.properties["armour range maximum"])] ];
			if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
				stats.push(tmp);
			}
		}

		/* offense */
			// APS
		minAPS	= typeof e.properties["attack speed range minimum"] !== "undefined" ? e.properties["attack speed range minimum"] : 0;	
		maxAPS	= typeof e.properties["attack speed range maximum"] !== "undefined" ? e.properties["attack speed range maximum"] : 0;
		baseAPS	= typeof e.properties["attack speed"] !== "undefined" ? e.properties["attack speed"] : 0;
		//if (minAPS > 0 && maxAPS > 0 && (minAPS != baseAPS && maxAPS != baseAPS)) {
		if (minAPS > 0 && maxAPS > 0 && (minAPS != maxAPS)) {
			tmp = {};
			tmp.name    = "APS";
			tmp.ranges = [ [ parseFloat(minAPS), parseFloat(maxAPS) ] ];
			stats.push(tmp);
		} else {
			value = e.properties["attack speed range text"];
			if (typeof value !== "undefined" && value.length) {
				var match = (e.properties["attack speed range text"]).match(/([\d.]+) ?to ?([\d.]+)/);				
				tmp = {};
				tmp.name    = "APS";
				
				if (match) {
					tmp.ranges = [ [ parseFloat(match[1]), parseFloat(match[2]) ] ];					
					stats.push(tmp);
				}
			} 
		}	
		
			// physical damage ranges
		value = e.properties["physical damage max range maximum"];
		if (typeof value !== "undefined" && value) {
			tmp = {};
			tmp.name    = "Damage";
			tmp.ranges  = [
				[parseFloat(e.properties["physical damage min range minimum"]), parseFloat(e.properties["physical damage min range maximum"])],
				[parseFloat(e.properties["physical damage max range minimum"]), parseFloat(e.properties["physical damage max range maximum"])]
			];			
			if (tmp.ranges[0][0] != tmp.ranges[0][1] && tmp.ranges[1][0] != tmp.ranges[1][1]) {
				stats.push(tmp);
			}
		}
			// DPS
		value = e.properties["dps range maximum"];
		if (typeof value !== "undefined" && value) {
			tmp = {};
			tmp.name    = "DPS";
			tmp.ranges  = [ [parseFloat(e.properties["dps range minimum"]), parseFloat(e.properties["dps range maximum"])] ];
			if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
				stats.push(tmp);
			}
		}
			// physical dps
		value = e.properties["physical dps range maximum"];
		if (typeof value !== "undefined" && value) {
			tmp = {};
			tmp.name    = "Physical Dps";
			tmp.ranges  = [ [parseFloat(e.properties["physical dps range minimum"]), parseFloat(e.properties["physical dps range maximum"])] ];
			if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
				stats.push(tmp);
			}
		}
			// elemental dps
		value = e.properties["elemental dps range maximum"];
		if (typeof value !== "undefined" && value) {
			tmp = {};
			tmp.name    = "Elemental Dps";
			tmp.ranges  = [ [parseFloat(e.properties["elemental dps range minimum"]), parseFloat(e.properties["elemental dps range maximum"])] ];
			if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
				stats.push(tmp);
			}
		}

		e.stats = stats;
		delete e.properties;
	});
		
	return uniques
}

function get_item_mods(uniques) {
	uniques.forEach(function(e) {
		var mods 		= [];
		var imp 		= [];
		var implicit 	= {};
		
		// split implicit, parse lines to remove hidden mods and join it again
		var t_imp = remove_wiki_formats(e.properties["implicit stat text"]);
		if (typeof t_imp !== "undefined") {
			try {
				t_imp = t_imp.split("&lt;br&gt;");
			} catch (err) {
				console.log(err)
			}			

			t_imp.forEach(function(element, index) {
				var tmp = cleanModString(element);
				if (typeof tmp !== "undefined" && tmp.length) {
					var t_index = mod_to_object(tmp);
					if (t_index) {
						imp.push(t_index);
					}
				}
			});

			implicit = imp.length ? imp : [];
			e.implicit = implicit;
		}

		// split explicit mod block to single mods
		var t_mods  = remove_wiki_formats(e.properties["explicit stat text"]);
		if (typeof t_mods !== "undefined") {		
			t_mods  = t_mods.split("&lt;br&gt;").clean("");
			t_mods.forEach(function(element, index) {
				var tmp = cleanModString(element);
				
				if (typeof tmp !== "undefined" && tmp.length) {
					var t_mod = mod_to_object(tmp);					
					if (t_mod) {
						mods.push(t_mod);
					}
				}
			});
			e.mods = mods;
		}
	});
	
	return uniques
}

function mod_to_object(string) {
	var mod = {};

	mod.name_orig 	= string;
	var match = string.match(regex_double_range);

	if (match) {
		mod.isVariable	= true;
		// double range
		if (match[1] && match[2] && match[3] && match[4]) {
			// (10-20) to (30-40)
			mod.ranges = [];
			mod.ranges.push( [parseFloat(match[1]), parseFloat(match[2])] );
			mod.ranges.push( [parseFloat(match[3]), parseFloat(match[4])] );				
			mod.name = string.replace(regex_double_range_replace, '#');
		} else if (match[1] && match[2] && match[3]) {			
			// (10-20) to 35
			mod.ranges = [];
			mod.ranges.push( [parseFloat(match[1]), parseFloat(match[2])] );
			mod.ranges.push( [parseFloat(match[3])] );			
			mod.name = string.replace(regex_double_range_replace, '#');
		} else if (match[1] && match[3] && match[4]) {
			// 15 to (30-40)			
			mod.ranges = [];
			// 1 to (x -x) lightning damage
			if (parseFloat(match[1] != 1)) {
				mod.ranges.push( [parseFloat(match[1])] );				
				mod.name = string.replace(regex_double_range_replace, '#');
			} else {			
				mod.name = string.replace(regex_double_range_replace, '1 to #');
			}
			mod.ranges.push( [parseFloat(match[3]), parseFloat(match[4])] );
		} else if (match[1] && match[3]) {
			// 15 to 35
			mod.values = [];
			mod.values.push( parseFloat(match[1]), parseFloat(match[3]) );
			mod.isVariable = false;
			mod.name = string.replace(regex_double_range_replace, '#');
		}

	} else  if (match = string.match(regex_single_range)) {
		// single range
		mod.ranges 		= [];
		mod.name 		= string.replace(regex_single_range_replace, '#');
		mod.ranges.push( [parseFloat(match[2]), parseFloat(match[3])] );
		mod.isVariable	= true;

	} else {
		// single value, no range
		var regex_single_value = /([\d\.]+)/g;

		mod.name 	= string.replace(regex_single_value, '#');
		mod.values 	= [];
		if (match =  string.match(regex_single_value)) {
			for (var i = 0; i < match.length; i++) {
				mod.values.push( parseFloat(match[i]) );
			}
		}
		mod.isVariable = false;
	}
	
	mod.name = remove_wiki_formats(mod.name);
	mod.name_orig = remove_wiki_formats(mod.name_orig);
	/*
	console.log("name_orig  :", mod.name_orig);
	console.log("name       :", mod.name);
	console.log("ranges     :", mod.ranges);
	console.log("isVariable :", mod.isVariable);
	console.log("--------------------------------------------------------");
	*/
	return mod
}

function cleanModString(string) {
	string = remove_hidden_mods(string);
	return string;
}

function remove_wiki_formats(text) {
	if (typeof text === "undefined") {
		return
	}

	while (text.match(regex_wikilinks)) {
		text = text.replace(regex_wikilinks, '$1$2');
	}
	text = text.replace('<em class="tc -corrupted">Corrupted</em>', '');
	text = text.replace('&lt;em class=&quot;tc -corrupted&quot;&gt;Corrupted&lt;/em&gt;', '');	
	text = text.replace('<br/>', '');
	
	text = text.replace('&#60;', '<').replace('&#62;', '>');
	text = text.replace('&amp;#60;', '<').replace('&amp;#62;', '>');
	text = text.replace(/^&amp;##;/, '<');
	text = text.replace(/&amp;##;$/, '>');
	text = text.replace(/(<.*)&amp;##;/, '$1>');
	
	text = text.replace('&lt;br /&gt;', '`n');	
	
	return text;
}

function remove_hidden_mods(text) {
	if (typeof text === "undefined") {
		return
	}
	return 	text.replace(regex_hiddenmods, '');
}

function item_exists(name, items) {
	var i = 0;
	items.forEach(function(element, index) {
		if (element.name == name) {
			i = index;
		}
	});
	return i
}

Array.prototype.clean = function(deleteValue) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == deleteValue) {
			this.splice(i, 1);
			i--;
		}
	}
	return this;
};