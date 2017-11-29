var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');
var cheerio = require('cheerio');

try {
	fs.unlinkSync('mods.json');	
} catch (err) {}

var options = {
	method: 'GET',
	url: 'http://poe.trade/',		//http://poe.trade/static/gen/explicit.c3a6fc6b.js
	gzip: true,
	
	headers: {
		'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
		'cache-control': 'no-cache'
	}
};

request(options, function (error, response, body) {
	if (error) throw new Error(error);
	
	if (options.url == "http://poe.trade/") {
		var HTML = response.body;	
		var res = HTML.match(/\/static\/gen\/explicit.*\.js/gi);
		
		if (!res.length) {
			console.log("Couldn't find poe.trade mod js url.")
			return
		} else {
			options.url = "http://poe.trade" + res[0];	
			
			request(options, function (error, response, body) {
				var HTML = response.body;
				
				var res = HTML.match(/(<.*>)/gi);
				if (res.length) {
					var unescapedHTML = res[0].replace(/\\"/g, '"');			
					
					$ = cheerio.load(unescapedHTML);
					var select = $('select[name=mod_name]').first();
					var optgroups = $(select).find('optgroup');
					var groups = {}
					
					optgroups.each(function(index, el){
						groups[$(el).attr('label')] = []
						$(el).find('option').each(function(j, e){
							groups[$(el).attr('label')][j] = $(e).attr('value')
						});						
					});
					
					var mods = { "mods" : groups }
					var file = 'output/mods.json'
					jsonfile.writeFile(file, mods, function(err) {
						if(err){
							console.error(err)	
						}
						else {
							console.log('json file saved.');
						}
					})					
				}				
			})
			
			return
		}
	};
});


