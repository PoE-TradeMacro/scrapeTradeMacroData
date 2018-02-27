var request 	= require("request");
var rp 			= require('request-promise');
var jsonfile 	= require('jsonfile');
var fs 			= require('fs');
var sleep 		= require('sleep');
var waitUntil 	= require('wait-until');
const util 		= require('util');

/* wiki item properties:
 * http://pathofexile.gamepedia.com/Special:Browse/List_of_helmet_enchantment_mods
 * */
var regex_wikilinks = /\[\[([^\]\|]*)\]\]|\[\[[^\]\|]*\|([^\]\|]*)\]\]/; 
var regex_single_value = /([\d\.]+)/g; 


getEnchantmentCount();

function getEnchantmentCount() {	
	var count = 0;
	
	var url = "https://pathofexile.gamepedia.com/api.php?" +
		'action=cargoquery' +
		'&format=json' +
		'&limit=500' +
		'&tables=mods, spawn_weights' +
		'&fields=COUNT(DISTINCT mods.id)=count' +
		'&where=mods.generation_type=10 and spawn_weights.tag != "default"' +
		'&join_on=mods._pageID=spawn_weights._pageID' +
		'&formatversion=1'
	
	url = encodeURI(url);

	var options = {
		uri: url,
		headers: {
			'User-Agent': 'Request-Promise'
		},
		json: true
	};
	
	rp(options)
	.then(function (result) {
		count = result.cargoquery[0].title.count;
		console.log("Enchantments: " + count);
		
		requestEnchantments(count);
	})
	.catch(function (err) {
		console.log(err)
	});
}

function requestEnchantments(count) {
	var url = "https://pathofexile.gamepedia.com/index.php?title=Special:CargoExport" +
		'&format=json' +
		'&limit=' + count + 1 +
		'&tables=mods, spawn_weights' +
		'&fields=mods.id, mods.mod_type, mods.stat_text, spawn_weights.tag' +
		'&where=mods.generation_type=10 and spawn_weights.tag != "default"' +
		'&join_on=mods._pageID=spawn_weights._pageID'	
	
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
		.then(function(result) {		
			var enchants = {};
			enchants.boots = [];
			enchants.gloves = [];
			enchants.helmet = [];
			
			result.forEach(function(enchant) {
				if (enchant["stat text"].length != 0) {
					var stat_text = formatStat(enchant["stat text"]);
					
					if (enchants[enchant.tag].indexOf(stat_text) < 0) {
						enchants[enchant.tag].push(stat_text);		
					}					
				}				
			});
			
			for (type in enchants) {
				var file = type;
				if (type == "gloves" || type == "boots") {
					file = type.slice(0, -1);
				}
				write_data_to_file(file, enchants[type]);
			}
		})
		.catch(function (err) {
			console.log(err)
		});
}

function formatStat(stat) {
	stat = remove_wiki_formats(stat);
	stat = stat.replace(regex_single_value, "#");
	
	return stat;
}

function write_data_to_file(file, data) {
	var file_name = "output/" + file + '_enchantment_mods.txt';
	try {
		fs.unlinkSync(file_name);
	} catch (err) {}
	
	var list = "";
	
	data.forEach(function(element) {
		if (list.length != 0) {
			list = list + "\n";		
		}	
		list += element;			
	});
	
	fs.writeFile(file_name, list, function(err) {
		if(err) {
			return console.log(err);
		}
		console.log(file_name + " was saved!");
	});
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
	text = text.replace('<br>', ' ');
	return text;
}