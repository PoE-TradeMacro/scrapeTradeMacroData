var request 	= require("request");
var rp 			= require('request-promise');
var jsonfile 	= require('jsonfile');
var fs 			= require('fs');

/* wiki item properties:
 * http://pathofexile.gamepedia.com/Special:Browse/List_of_helmet_enchantment_mods
 * */

var printoutList = [
	"Has stat text",
	"Has subobject"
];

var conditionList = [
	"Has mod generation type::10"
];

var printouts   = encodeURI(printoutList.join("|"));
var conditions  = encodeURI(conditionList.join("|"));

var url = "https://pathofexile.gamepedia.com/api.php?action=askargs" +
	"&parameters="  + "limit%3D2000" +
	"&conditions="  + conditions +
	"&printouts="   + printouts +
	"&format="      + "json";

console.log(url);

//scrape();

function scrape() {
	// uniques - relics
	var mods = [];

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
				//var tmpArr      = get_item_mods(tmp[prop]["printouts"]);

			}

			//write_data_to_file('uniques', items[0]);
			//write_data_to_file('relics', items[1]);
		})
		.catch(function (err) {
			// Crawling failed or Cheerio choked...
			//console.log(err)
		});
}