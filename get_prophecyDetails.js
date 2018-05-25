var request 	= require("request");
var rp 			= require('request-promise');
var jsonfile 	= require('jsonfile');
var fs 			= require('fs');
var sleep 		= require('sleep');
var waitUntil 	= require('wait-until');
const util 		= require('util');
var decode		= require('unescape');
var cheerio 	= require('cheerio');

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

getProphecies();

function getProphecies() {	
	var url = "https://pathofexile.gamepedia.com/index.php?title=Special:CargoExport" +
		'&format=json' +
		'&limit=4000' +
		'&tables=prophecies' +
		'&fields=_pageName, objective, prediction_text, seal_cost, reward';
	
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
		var prophecies = {};
		
		result.forEach(function(prophecy) {
			var temp = {};
			temp["objective"] = remove_wiki_formats(prophecy.objective);			
			temp["reward"] = remove_wiki_formats(prophecy.reward);
			temp["text"] = prophecy["prediction text"];
			temp["seal cost"] = prophecy["seal cost"];
			
			prophecies[prophecy._pageName] = temp;
		});

		write_data_to_file('prophecy_details', prophecies);
	})
	.catch(function (err) {
		console.log(err)
	});	
	
}

function remove_wiki_formats(text) {
	if (typeof text === "undefined") {
		return
	}	
	
	text = remove_wiki_item_preview_formatting(text);
	
	while (text.match(regex_wikilinks)) {
		text = text.replace(regex_wikilinks, '$1$2');
	}
	
	text = text.replace('<em class="tc -corrupted">Corrupted</em>', '');
	text = text.replace('&lt;em class=&quot;tc -corrupted&quot;&gt;Corrupted&lt;/em&gt;', '');	
	text = text.replace('<br/>', '');
	text = text.replace('&#60;', '<').replace('&#62;', '>');
	text = text.replace('&lt;br /&gt;', '`n');
	
	//text = replaceAll(text, "\n", "`n");
	text = replaceAll(text, "; ", "\n");
	
	return text;
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function remove_wiki_item_preview_formatting(text) {
	text = decode(text);
	var unescapedHTML = text.replace(/\\"/g, '"');

	$ = cheerio.load('<html><body><div>' + unescapedHTML + '</div></body></html>');
	
	var container = $('div').first();
	var items = $(container).children('span');
	
	items.each(function(index, el) {
		var item_name = $(el).find('.header').html();
		if (item_name != null) {
			item_name = item_name.replace(/(.*)(<br>|<\/br>)(.*)/g, '$1 ($3)').trim();
			$(el).replaceWith("\"" + item_name + "\"");	
		}		
	});	
	
	var content = $(container).text();
	
	return content
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