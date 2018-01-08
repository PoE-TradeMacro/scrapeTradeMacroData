var request 	= require("request");
var rp 			= require('request-promise');
var jsonfile 	= require('jsonfile');
var fs 			= require('fs');
var sleep 		= require('sleep');
var waitUntil 	= require('wait-until');
const util 		= require('util');

/* wiki item properties:
* http://pathofexile.gamepedia.com/Special:Browse/Soul_Taker
* http://pathofexile.gamepedia.com/Special:Browse/Abberath%27s_Hooves
* */
var printoutList= [
	"Is Relic",
	"Has implicit stat text",
	"Has explicit stat text",
	
	"Has base item",
	
	"Has attack speed range maximum",
	"Has attack speed range minimum",
	"Has base attack speed",
	"Has attack speed range text",

	"Has evasion range maximum",
	"Has evasion range minimum",

	"Has energy shield range maximum",
	"Has energy shield range minimum",

	"Has armour range maximum",
	"Has armour range minimum",

	"Has damage per second range maximum",
	"Has damage per second range minimum",

	"Has physical damage per second range maximum",
	"Has physical damage per second range minimum",

	"Has maximum physical damage range maximum",
	"Has maximum physical damage range minimum",

	"Has minimum physical damage range maximum",
	"Has minimum physical damage range minimum",

	"Has elemental damage per second range maximum",
	"Has elemental damage per second range minimum"

	//"Has chaos damage per second range maximum",
	//"Has chaos damage per second range minimum",

	//"Has cold damage per second range maximum",
	//"Has cold damage per second range minimum",

	//"Has fire damage per second range maximum",
	//"Has fire damage per second range minimum",

	//"Has lightning damage per second range maximum",
	//"Has lightning damage per second range minimum"
];
var printouts   = encodeURI(printoutList.join("|"));

var url = "https://pathofexile.gamepedia.com/api.php?action=askargs" +
	"&parameters="  + "limit%3D1000" +
	"&conditions="  + "Has%20rarity::Unique" +
	"&printouts="   + printouts +
	"&format="      + "json";


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
		'&having=items.class' +
		'&formatversion=1';
	var url_2 = "https://pathofexile.gamepedia.com/api.php?" +
		'action=cargoquery' +
		'&format=json' +
		'&tables=items' +
		'&fields=class, tags' +
		'&where=rarity="unique"' +
		'&having=items.class' +
		'&formatversion=1';	
	
	urls.push(encodeURI(url_1));
	urls.push(encodeURI(url_2));
	
	console.log(urls);	
	
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
		if (classes[key].type[0] == "weapons") {
			continue
		}
		
		classCount++;
		var url_class = "https://pathofexile.gamepedia.com/api.php?" +
			'action=cargoquery' +
			'&format=json' +
			'&limit=500' +
			'&tables=items' +
			'&fields=' +
				'name, base_item, class, explicit_stat_text, implicit_stat_text' +
			
				
				'&where=rarity="unique" AND class="' + key + '"' +
			//'&having=items.class' +
			'&having=items._pageName' +
			//'&group_by=items._pageName' +
			'&formatversion=1';
		
		
		
		
		var url_class = "https://pathofexile.gamepedia.com/api.php?" +
			'action=cargoquery' +
			'&format=json' +
			'&limit=500' +
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
			url_class += ', weapons.attack_speed_range_maximum, weapons.attack_speed_range_minimum, weapons.attack_speed_range_text, ' +
				'weapons.dps_range_maximum, weapons.dps_range_minimum, ' +
				'weapons.physical_dps_range_maximum, weapons.physical_dps_range_minimum, ' +
				'weapons.physical_damage_max_range_maximum, weapons.physical_damage_max_range_minimum, ' +
				'weapons.physical_damage_min_range_maximum, weapons.physical_damage_min_range_minimum, ' +
				'weapons.elemental_dps_range_maximum, weapons.elemental_dps_range_minimum';
				
				/*
				weapons.base_attack_speed,
				
				*/
		}
		
		if (isArmour) {
			url_class += ', armours.evasion_range_maximum, armours.evasion_range_minimum, armours.energy_shield_range_maximum, armours.energy_shield_range_minimum, ' +
				'armours.armour_range_maximum, armours.armour_range_minimum';
		}
		
		if (isShield) {
			url_class += ', shields.block, shields.block_range_maximum, shields.block_range_minimum';
		}
		
		url_class += '&where=items.rarity="unique" AND items.class="' + key + '"';
		
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

		//url_class += '&group_by=items._pageName';
		url_class += '&having=items._pageName';
		url_class += '&formatversion=1';
		
		url_class = encodeURI(url_class);
		console.log(url_class)
		
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
		// do stuff
		//console.log(util.inspect(uniques, false, null));
		uniques = prepareItemObject(uniques);
		write_data_to_file('uniques', uniques);
	});
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

function get_item_stats(list) {
	var stats   = [];
	var tmp     = {};
	var value;

	/* defense */
		// evasion
	value = list["Has evasion range maximum"][0];
	if (typeof value !== "undefined" && value) {
		tmp = {};
		tmp.name = "Evasion Rating";
		tmp.ranges = [[list["Has evasion range minimum"][0], list["Has evasion range maximum"][0]]];
		if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
			stats.push(tmp);
		}
	}
		// energy shield
	value = list["Has energy shield range maximum"][0];
	if (typeof value !== "undefined" && value) {
		tmp = {};
		tmp.name    = "Energy Shield";
		tmp.ranges  = [ [list["Has energy shield range minimum"][0], list["Has energy shield range maximum"][0]] ];
		if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
			stats.push(tmp);
		}
	}
		// armour
	value = list["Has armour range maximum"][0];
	if (typeof value !== "undefined" && value) {
		tmp = {};
		tmp.name    = "Armour";
		tmp.ranges  = [ [list["Has armour range minimum"][0], list["Has armour range maximum"][0]] ];
		if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
			stats.push(tmp);
		}
	}

	/* offense */
		// APS
	minAPS	= typeof list["Has attack speed range minimum"][0] !== "undefined" ? list["Has attack speed range minimum"][0] : 0;	
	maxAPS	= typeof list["Has attack speed range maximum"][0] !== "undefined" ? list["Has attack speed range maximum"][0] : 0;
	baseAPS	= typeof list["Has base attack speed"][0] !== "undefined" ? list["Has base attack speed"][0] : 0;
	if (minAPS > 0 && maxAPS > 0 && (minAPS != baseAPS && maxAPS != baseAPS)) {
		tmp = {};
		tmp.name    = "APS";
		tmp.ranges = [ [ parseFloat(minAPS), parseFloat(maxAPS) ] ];
		stats.push(tmp);
	} else {
		value = list["Has attack speed range text"][0];
		if (typeof value !== "undefined" && value.length) {
			var match = (list["Has attack speed range text"][0]).match(/([\d.]+) ?to ?([\d.]+)/);
			if (match) {
				tmp = {};
				tmp.name    = "APS";
				tmp.ranges = [ [ parseFloat(match[1]), parseFloat(match[2]) ] ];
				stats.push(tmp);
			}
		} 
	}	
	
		// physical damage ranges
	value = list["Has maximum physical damage range maximum"][0];
	if (typeof value !== "undefined" && value) {
		tmp = {};
		tmp.name    = "Damage";
		tmp.ranges  = [
			[list["Has minimum physical damage range minimum"][0], list["Has minimum physical damage range maximum"][0]],
			[list["Has maximum physical damage range minimum"][0], list["Has maximum physical damage range maximum"][0]]
		];
		if (tmp.ranges[0][0] != tmp.ranges[0][1] && tmp.ranges[1][0] != tmp.ranges[1][1]) {
			stats.push(tmp);
		}
	}
		// DPS
	value = list["Has damage per second range maximum"][0];
	if (typeof value !== "undefined" && value) {
		tmp = {};
		tmp.name    = "DPS";
		tmp.ranges  = [ [list["Has damage per second range minimum"][0], list["Has damage per second range maximum"][0]] ];
		if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
			stats.push(tmp);
		}
	}
		// physical dps
	value = list["Has physical damage per second range maximum"][0];
	if (typeof value !== "undefined" && value) {
		tmp = {};
		tmp.name    = "Physical Dps";
		tmp.ranges  = [ [list["Has physical damage per second range minimum"][0], list["Has physical damage per second range maximum"][0]] ];
		if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
			stats.push(tmp);
		}
	}
		// elemental dps
	value = list["Has elemental damage per second range maximum"][0];
	if (typeof value !== "undefined" && value) {
		tmp = {};
		tmp.name    = "Elemental Dps";
		tmp.ranges  = [ [list["Has elemental damage per second range minimum"][0], list["Has elemental damage per second range maximum"][0]] ];
		if (tmp.ranges[0][0] != tmp.ranges[0][1]) {
			stats.push(tmp);
		}
	}

	return stats
}

function get_item_mods(list) {
	var mods 		= [];
	var imp 		= [];
	var implicit 	= {};

	// split implicit, parse lines to remove hidden mods and join it again
	var t_imp = remove_wiki_formats(list["Has implicit stat text"][0]);
	if (typeof t_imp !== "undefined") {
		try {
			t_imp = t_imp.split("<br>");
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
	}
	
	// split explicit mod block to single mods
	var t_mods  = remove_wiki_formats(list["Has explicit stat text"][0]);
	if (typeof t_mods !== "undefined") {		
		t_mods  = t_mods.split("<br>").clean("");
		t_mods.forEach(function(element, index) {
			var tmp = cleanModString(element);
			if (typeof tmp !== "undefined" && tmp.length) {
				var t_mod = mod_to_object(tmp);
				if (t_mod) {
					mods[index] = t_mod;
				}
			}
		});
	}
	return [implicit, mods]
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
	text = text.replace('&#60;', '<').replace('&#62;', '>');
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