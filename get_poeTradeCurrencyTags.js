var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');
var cheerio = require('cheerio');

try {
	fs.unlinkSync('currency_tags.json');	
} catch (err) {}

var options = {
	method: 'GET',
	url: 'http://currency.poe.trade/tags',
	gzip: true,
	
	headers: {
		'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
		'cache-control': 'no-cache'
	}
};

request(options, function (error, response, body) {
	if (error) throw new Error(error);
	
	var HTML = response.body;
	
	request(options, function (error, response, body) {
		var HTML = response.body;		
		
		$ = cheerio.load(HTML);
		var table = $('table.currency-tags').first();
		
		var rows = $(table).find('tr');
		var currencies = {}
		
		rows.each(function(index, el) {			
			cells = $(el).find('td');
			var currency = [];
			cells.each(function(i, e) {
				currency[i] = $(e).text();
			});
			
			if (typeof currency[0] !== undefined) {		
				currencies[currency[0]] = currency[1];	
			}			
		});

		var currencyTags = { "tags" : currencies }
		var file = 'output/currency_tags.json'
		jsonfile.writeFile(file, currencyTags, function(err) {
			if(err){
				console.error(err)	
			}
			else {
				console.log('json file saved.');
			}
		})
	})
});


