var request 	= require("request");
var rp 			= require('request-promise');
var jsonfile 	= require('jsonfile');
var fs 			= require('fs');

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

scrape();

function scrape() {
	// uniques - relics
	var items = [[],[]];

	var options = {
		uri: url,		
		headers: {
			'User-Agent': 'Request-Promise'
		},
		json: true
	};
	
	rp(options)
	.then(function (json) {
		var tmp = json.query["results"];

		for (var prop in tmp) {
			var tmpArr      = get_item_mods(tmp[prop]["printouts"]);
			var tempImp		= tmpArr[0];
			var tmpStats    = get_item_stats(tmp[prop]["printouts"]);
			var isRelicFlag = tmp[prop]["printouts"]["Is Relic"][0];
			var isRelic     = (typeof isRelicFlag !== "undefined" && (isRelicFlag && isRelicFlag != "false")) ? 1 : 0;
			var tmpItem     = {};

			tmpItem.name    = prop.replace(regex_wiki_page_disamb_replace, '');

			tmpItem.mods    = tmpArr[1];
			if (tempImp.length) {
				tmpItem.implicit = tmpArr[0];	
			}
			if (tmpStats.length) {
				tmpItem.stats = tmpStats;
			}

			var found_index = item_exists(tmpItem.name, items[isRelic]);
			if (found_index) {
				items[isRelic][found_index].mods = add_mods_to_item(items[isRelic][found_index].mods, tmpItem.mods);
			} else {
				items[isRelic].push(tmpItem);
			}
		}

		write_data_to_file('uniques', items[0]);
		write_data_to_file('relics', items[1]);
    })
    .catch(function (err) {
        // Crawling failed or Cheerio choked... 
        //console.log(err)
    });	
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