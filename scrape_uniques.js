var request 	= require("request");
var rp 			= require('request-promise');
var jsonfile 	= require('jsonfile');
var fs 			= require('fs');


var url = "https://pathofexile.gamepedia.com/api.php?action=askargs&parameters=limit%3D1000&conditions=Has%20rarity::Unique&printouts=Has%20implicit%20stat%20text|Has%20explicit%20stat%20text&format=json";


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
	var items = [];

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
			var tmpItem     = {};
			tmpItem.name    = prop.replace(regex_wiki_page_disamb_replace, '');
			tmpItem.mods    = tmpArr[1];
			tmpItem.implicit= tmpArr[0];

			var found_index = item_exists(tmpItem.name, items);
			if (found_index) {
				items[found_index].mods = add_mods_to_item(items[found_index].mods, tmpItem.mods);
			} else {
				items.push(tmpItem);
			}
		}

		write_data_to_file('uniques', items);
    })
    .catch(function (err) {
        // Crawling failed or Cheerio choked... 
        //console.log(err)
    });	
}

function write_data_to_file(file, data) {
	var file_name = file + '.json';
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

function get_item_mods(list) {
	var mods 		= [];
	var imp 		= [];
	var implicit 	= {};

	// split implicit, parse lines to remove hidden mods and join it again
	var t_imp = remove_wiki_formats(list["Has implicit stat text"][0]);
	if (typeof t_imp !== "undefined") {
		t_imp = t_imp.split("<br>");
		t_imp.forEach(function(element, index) {
			var tmp = cleanModString(element);
			if (typeof tmp !== "undefined" && tmp.length) {
				imp[index] = mod_to_object(tmp);
			}
		});

		imp = imp.join(" ");
		implicit = imp.length ? imp : {};
	}
	
	// split explicit mod block to single mods
	var t_mods  = remove_wiki_formats(list["Has explicit stat text"][0]);
	t_mods  = t_mods.split("<br>").clean("");
	t_mods.forEach(function(element, index) {
		var tmp = cleanModString(element);
		if (typeof tmp !== "undefined" && tmp.length) {
			mods[index] = mod_to_object(tmp);
		}
	});

	return [implicit, mods]
}

function mod_to_object(string) {
	var mod = {};
	mod.ranges = [];

	mod.name_orig 	= string;
	var match = string.match(regex_double_range);

	if (match) {
		mod.name 		= string.replace(regex_double_range_replace, '# to #');
		// double range
		if (match[1] && match[2] && match[3] && match[4]) {
			// (10-20) to (30-40)
			mod.ranges.push( [parseFloat(match[1]), parseFloat(match[2])] );
			mod.ranges.push( [parseFloat(match[3]), parseFloat(match[4])] );
		} else if (match[1] && match[2] && match[3]) {			
			// (10-20) to 35
			mod.ranges.push( [parseFloat(match[1]), parseFloat(match[2])] );
			mod.ranges.push( [parseFloat(match[3])] );
		} else if (match[1] && match[3] && match[4]) {
			// 15 to (30-40)
			mod.ranges.push( [parseFloat(match[1])] );
			mod.ranges.push( [parseFloat(match[3]), parseFloat(match[4])] );
		} else if (match[1] && match[3]) {
			// 15 to 35
			mod.ranges.push( [parseFloat(match[1])] );
			mod.ranges.push( [parseFloat(match[3])] );
		}
		mod.isVariable	= true;

	} else  if (match = string.match(regex_single_range)) {
		// single range
		mod.name 		= string.replace(regex_single_range_replace, '#');
		mod.ranges.push( [parseFloat(match[1]), parseFloat(match[2])] );
		mod.isVariable	= true;

	} else {
		// single value, no range
		var regex_single_value = /([\d\.]+)/g;

		mod.name 	= string.replace(regex_single_value, '#');
		if (match =  string.match(regex_single_value)) {
			for (var i = 0; i < match.length; i++) {
				mod.ranges.push( parseFloat(match[i]) );
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