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


getItemBases();

function getItemBases() {	
	var url = "https://pathofexile.gamepedia.com/index.php?title=Special:CargoExport" +
		'&format=json' +
		'&limit=4000' +
		'&tables=items, flasks, amulets' +
		'&fields=items.name, items.class, items.size_x, items.size_y, ' +
			'items.required_strength, items.required_intelligence, items.required_dexterity, items.required_level, items.drop_level, items._pageName = item_name, ' + 
			'flasks._pageName = flask_name, amulets._pageName = amulet_name' +
		'&where=(flasks._pageName <> "" or amulets._pageName <> "") and items.rarity="Normal"' +
		'&join_on=items._pageName=flasks._pageName, items._pageName=amulets._pageName';
	
	url = encodeURI(url);
	//console.log(url)
	
	var options = {
		uri: url,	
		headers: {
			'User-Agent': 'Request-Promise'
		},
		json: true
	};
	
	rp(options)
	.then(function (result) {
		var bases = {};
		
		result.forEach(function(base) {
			var tmp = get_item_stats(base);
			bases[base.name] = tmp;
		});
		
		write_data_to_file('item_bases', bases);
	})
	.catch(function (err) {
		console.log(err)
	});	
	
}

function write_data_to_file(file, data) {
	var file_name = 'output/' + file + '.json';
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

function get_item_stats(list) {
	var stats   = {};
	var tmp     = {};
	var value;
	
	/* sub type/class */
	value = list["class"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Item Class"] = value;	
		}		
	}
	
	/* defense */
		// evasion
	value = list["evasion"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Evasion Rating"] = value;	
		}		
	}	
		// energy shield
	value = list["energy shield"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Energy Shield"] = value;	
		}
	}
		// armour
	value = list["armour"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Armour"] = value;	
		}
	}
		// block
	value = list["block"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Block"] = value;	
		}
	}
		// class
	value = list["item class"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {			
			stats["Item Class"] = value.replace(/Thrusting\s?/, '');	
		}
	}
	
	/* requirements */
		// dexterity
	value = list["required dexterity"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Dexterity"] = value;	
		}
	}
		// intelligence
	value = list["required intelligence"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Intelligence"] = value;	
		}
	}
		// strength
	value = list["required strength"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Strength"] = value;	
		}
	}
		// level
	value = list["required level"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Level"] = value;	
		}
	}

	/* offense */
		// attack speed
	value = list["attack speed"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Attack Speed"] = value;	
		}
	}
		// crit chance
	value = list["critical strike chance"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Critical Strike Chance"] = value;	
		}
	}
		// min phys dmg
	value = list["physical damage min"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Minimum Physical Damage"] = value;	
		}
	}
		// max phys dmg
	value = list["physical damage max"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Maximum Physical Damage"] = value;	
		}
	}
		// weapon range
	value = list["range"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Weapon Range"] = value;	
		}
	}
	
	/* others */
		// drop level
	value = list["drop level"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Drop Level"] = value;	
		}
	}
		// width
	value = list["size x"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Width"] = value;	
		}
	}	
		// height
	value = list["size y"];
	if (typeof value !== "undefined" && value) {
		if (value > 0 || value.length) {
			stats["Height"] = value;	
		}
	}
	
	return stats
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