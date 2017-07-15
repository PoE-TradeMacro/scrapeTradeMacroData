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
	url: 'http://poe.trade/',
	
	headers: {
		'content-type': 'application/x-www-form-urlencoded',
		'cache-control': 'no-cache'
	}
};

request(options, function (error, response, body) {
	if (error) throw new Error(error);

	var HTML = response.body;
	$ = cheerio.load(HTML);
	
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
});


