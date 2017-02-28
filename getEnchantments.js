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
	"Has mod generation type::10",
	"Has level requirement::75"
];

var printouts   = encodeURI(printoutList.join("|"));
var conditions  = encodeURI(conditionList.join("|"));

var url = "https://pathofexile.gamepedia.com/api.php?action=askargs" +
	"&parameters="  + "limit%3D2000" +
	"&conditions="  + conditions +
	"&printouts="   + printouts +
	"&format="      + "json";


scrape();

function scrape() {
	// uniques - relics
	var enchantments	= { "helmet" : [], "boot" : [], "glove" : []};

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
				var stat	= get_enchantment_stat(tmp[prop]["printouts"]["Has stat text"][0]);
				var group	= get_enchantment_group(tmp[prop]["printouts"]["Has mod group"][0]);

				enchantments[group].push(stat);	
			}
			
			write_data_to_file('boot', enchantments["boot"]);
			write_data_to_file('helmet', enchantments["helmet"]);
			write_data_to_file('glove', enchantments["glove"]);
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
		list = list + "\r" + element;
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
	return text;
}