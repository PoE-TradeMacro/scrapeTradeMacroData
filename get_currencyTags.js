var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');
var cheerio = require('cheerio');
const util = require('util');

try {
	fs.unlinkSync('currency_tags.json');	
} catch (err) {}

var options = {
	method: 'GET',
	url: 'https://www.pathofexile.com/api/trade/data/static',
	gzip: true,
	
	headers: {
		'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
		'cache-control': 'no-cache'
	}
};

request(options, function (error, response, body) {
	if (error) throw new Error(error);
	
	var tags = JSON.parse(response.body);
	var cTags = {};
	cTags.tags = tags.result;	
	
	for (var type in cTags.tags) {
		for (var e in cTags.tags[type]) {
			delete cTags.tags[type][e].image;
			
			var reg_whiteSextant = /Apprentice Cartographer's Sextant/i;
			var reg_yellowSextant = /Journeyman Cartographer's Sextant/i;
			var reg_redSextant = /Master Cartographer's Sextant/i;
			
			var text = cTags.tags[type][e].text;
			
			if (text.match(reg_whiteSextant)) {
				cTags.tags[type][e].short = "Apprentice Sextant (white)";
			} else if (text.match(reg_yellowSextant)) {
				cTags.tags[type][e].short = "Journeyman Sextant (yellow)";
			} else if (text.match(reg_redSextant)) {
				cTags.tags[type][e].short = "Master Sextant (red)";
			}
		}
	}	
	//console.log(util.inspect(cTags, false, null));
	
	var file = 'output/currency_tags.json'
	jsonfile.writeFile(file, cTags, function(err) {
		if(err) {
			console.error(err)	
		}
		else {
			console.log('json file saved.');
		}
	})	
});

