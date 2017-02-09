var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');
var cheerio = require('cheerio');

urls = [
	'one-handed_axe_', 'two-handed_axe_', 'claw_', 'dagger_', 'sceptre_', 'wand_', 'one-handed_sword_', 'two-handed_sword_', 'one-handed_mace_', 'two-handed_mace_', 
	'bow_', 'fishing_rod_', 'amulet_', 'belt_', 'ring_', 'quiver_', 'life_flask_', 'mana_flask_', 'hybrid_flask_', 'utility_flask_', 'critical_utility_flask_', 
	'int_body_armour_', 'str_body_armour_', 'dex_body_armour_', 'str_dex_body_armour_', 'str_int_body_armour_', 'dex_int_body_armour_',	'str_dex_int_body_armour_',
	'int_boot_', 'str_boot_', 'dex_boot_', 'str_dex_boot_', 'str_int_boot_', 'dex_int_boot_', 
	'int_glove_', 'str_glove_', 'dex_glove_', 'str_dex_glove_', 'str_int_glove_', 'dex_int_glove_', 
	'int_helmet_', 'str_helmet_', 'dex_helmet_', 'str_dex_helmet_', 'str_int_helmet_', 'dex_int_helmet_', 
	'int_shield_', 'str_shield_', 'dex_shield_', 'str_dex_shield_', 'str_int_shield_', 'dex_int_shield_', 
	'cobalt_jewel_', 'crimson_jewel_', 'viridian_jewel_', 'prismatic_jewel_'
]

//urls = ['one-handed_axe_']

console.log('- [ ] Begin scraping \x1b[36mpoe wiki\x1b[0m.');
urls.forEach(function(url, index){
	var options = {
		method: 'POST',
		url: 'http://pathofexile.gamepedia.com/List_of_' + urls[index] + 'modifiers',
		
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			'cache-control': 'no-cache'
		}
	};

	console.log('- [ ] Scraping \x1b[35m'+ urls[index] +'\x1b[0m.');
	request(options, function (error, response, body) {
		if (error) {			
			console.log('Error on: ' + urls[index]);
			//throw new Error(error);
			return
		}
		
		console.log('- [x] Scraped \x1b[35m'+ urls[index] +'\x1b[0m.');
		console.log('    - [ ] Begin parsing \x1b[31m'+ urls[index] +'\x1b[0m.');
		var HTML = response.body;

		$ = cheerio.load(HTML);
		var items = [];


		
		var modsRaw = $('th > em').filter('.-mod');
		affixes = [];

		modsRaw.each(function(i, mod){
			mod = $(mod).text();
			pos = mod.indexOf("Mod group:");
			if (pos < 0) {
				mod = mod.replace(/(<.*?>)/g, "");
				//mod = mod.replace(/(\(-\d+--\d+\))/g, "-#");
				mod = mod.replace(/(\([-.0-9]+\)( to )?\([-.0-9]+\))|\([-.0-9]+\)|([-.0-9]+)/g, "#");
				mod = mod.replace(/(\(#+\))/g, "-#");
				pos2 = mod.indexOf(",");

				if (pos2 > 0) {
					arr = mod.split(",");
					// split mods only when every part has an own value
					// example: #% chance to freeze, #% increased freeze duration
					tempArr = []
					arr.forEach(function(m, j){
						number = m.indexOf("#");
						if(number > -1) {
							tempArr.push(m)
						}
						else if (j == 0) {
							tempArr.push(m)	
						}
						else {
							l = tempArr.length - 1
							tempArr[l] = tempArr[l] + "," + m
						}
					})

					tempArr.forEach(function(m, j){
						if(!InArray(m, affixes)) {
							affixes.push(m.trim());
						}
					})
				}				
				else {					
					if(!InArray(mod, affixes)) {
						affixes.push(mod.trim());
					}	
				}
			}

		});

		var affixes = { "affixes" : affixes }
		console.log('    - [x] Parsed \x1b[31m'+ urls[index] +'\x1b[0m.');		

		var file = 'affix_json/' + urls[index] + '.json'
		console.log('');
		console.log('- [ ] Saving data to \x1b[32m'+urls[index]+'.json\x1b[0m.');
	  	jsonfile.writeFile(file, affixes, function(err) {
	  		if(err){
	  			console.error(err)				  			
	  		}
			else {						
				console.log('- [x] \x1b[32m'+urls[index]+'.json\x1b[0m saved.');
			}
		})		
		
	})		
})	
console.log('- [x] Scraped \x1b[36mpoe wiki\x1b[0m.');

function InArray(value, array) {
	var match
	if (typeof value === "string") {
		array.forEach(function(el, index){
			if (value.toLowerCase() == array[index].toLowerCase()) {
				match = value
			}
		})
		return (match) ? match : false
	}
	else {
		array.forEach(function(el, index){
			if (value == array[index]) {
				match = value
			}
		})
		return (match) ? match : false
	}	
}

String.prototype.matchAll = function(regexp) {
  var matches = [];
  this.replace(regexp, function() {
    var arr = ([]).slice.call(arguments, 0);
    var extras = arr.splice(-3);
    matches.push(parseFloat(arr[0]));
  });
  return matches.length ? matches : null;
};