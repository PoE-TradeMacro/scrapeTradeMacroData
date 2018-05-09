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
		currencies.default = {}
		currencies.special = {}
		
		rows.each(function(index, el) {		
			var currency = [];
			var hasImage = false;
			var hasCurrencyLink = false;
			
			cells = $(el).find('td');
			cells.each(function(i, e) {				
				currency[i] = $(e).text();
				if(i = 1) {
					var image = $(e).find("img").attr("src");
					if (typeof image !== "undefined") {
						hasImage = true;						
						if (image.match(/currency\/[^\s]+/i)) {
							hasCurrencyLink = true;
						}
					}					
				}
			});
			
			if (typeof currency[0] !== "undefined") {
				arr = currency[1].split(",");
				reg = /-map|-?essence|-leaguestone|-net/i;
				
				if(currency[1].match(reg) || hasCurrencyLink === false) {
					currencies.special[currency[0].trim()] = arr;
				} 
				else {
					currencies.default[currency[0].trim()] = arr;	
				}
				
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


