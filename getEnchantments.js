var request 	= require("request");
var rp 			= require('request-promise');
var fs 			= require('fs');

/* wiki item properties:
 * http://pathofexile.gamepedia.com/Special:Browse/List_of_helmet_enchantment_mods
 * */
var regex_wikilinks = /\[\[([^\]\|]*)\]\]|\[\[[^\]\|]*\|([^\]\|]*)\]\]/; 
var regex_single_value = /([\d\.]+)/g; 

var printoutList = [
	"Has stat text",
	"Has mod group"
];

var conditionList = [
	"Has mod generation type::10"
];

var printouts   = encodeURI(printoutList.join("|"));
var conditions  = encodeURI(conditionList.join("|"));

var url_boot	= get_url(true, "ConditionalBuffEnchantment");
var url_helmet	= get_url(false, "SkillEnchantment");
var url_glove	= get_url(false, "TriggerEnchantment");

scrape(url_boot, "boot");
scrape(url_helmet, "helmet");
scrape(url_glove, "glove");

function get_url(level_req, mod_group) {
	level_req = level_req ? encodeURI("|Has level requirement::75") : "";
	mod_group = encodeURI("|has mod group::" + mod_group);
	
	var url = "https://pathofexile.gamepedia.com/api.php?action=askargs" +
		"&parameters="  + "limit%3D2000" +
		"&conditions="  + conditions + level_req + mod_group +
		"&printouts="   + printouts +
		"&format="      + "json";	
	
	return url
}

function scrape(url, group) {
	// uniques - relics
	var enchantments	= [];

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
				var stat_text = tmp[prop]["printouts"]["Has stat text"][0];
				
				if (stat_text) {					
					var stat	= get_enchantment_stat(tmp[prop]["printouts"]["Has stat text"][0]);	
					
					if (enchantments.indexOf(stat) == -1) {  
						// element found
						enchantments.push(stat);	
					}		
				}
			}			
			
			write_data_to_file(group, enchantments);
		})
		.catch(function (err) {
			// Crawling failed or Cheerio choked...
			//console.log(err)
		});
}

function write_data_to_file(file, data) {
	var file_name = "txt/" + file + '_enchantment_mods.txt';
	try {
		fs.unlinkSync(file_name);
	} catch (err) {}
	
	var list = "";
	data.forEach(function(element) {
		list = list + "\n" + element;
	});
	
	fs.writeFile(file_name, list, function(err) {
		if(err) {
			return console.log(err);
		}
		console.log(file_name + " was saved!");
	}); 
}

function get_enchantment_stat(stat) {
	stat = remove_wiki_formats(stat);
	stat = stat.replace(regex_single_value, "#");
	
	return stat;
}

function get_enchantment_group(group) {
	if (group == "ConditionalBuffEnchantment") {
		return "boot"
	} 
	else if (group == "TriggerEnchantment") {
		return "glove"
	}
	else if (group == "SkillEnchantment") {
		return "helmet"
	}
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