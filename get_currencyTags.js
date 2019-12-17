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
	
	var res = JSON.parse(response.body);
	staticData = res.result;
	
	var currencyTags = {}
	currencyTags.tags = {}

	for (let category in staticData) {
		let categoryId = staticData[category].id
		if (staticData.hasOwnProperty(category)) {
			//console.log(`${category} : ${staticData[category].entries}`)
			for (let entry in staticData[category].entries) {			
				//console.log(util.inspect(staticData[category].entries[entry], {depth: null}));
				try {
					delete staticData[category].entries[entry].image;
				} catch (e) {}
			}

			currencyTags.tags[categoryId] = staticData[category].entries;
		}
	}

	var file = 'output/currency_tags.json'
	jsonfile.writeFile(file, currencyTags, function(err) {
		if(err) {
			console.error(err)	
		}
		else {
			console.log('json file saved.');
		}
	})	
});

