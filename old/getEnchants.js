var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');
var cheerio = require('cheerio');

urls = [
	'helmet_enchantment_mods', 'boot_enchantment_mods', 'glove_enchantment_mods'
]

//urls = ['helmet_enchantment_mods']

console.log('- [ ] Begin scraping \x1b[36mpoe wiki\x1b[0m.');
urls.forEach(function(url, index){
	var mods = {};
	var options = {
		method: 'POST',
		url: 'http://pathofexile.gamepedia.com/List_of_' + urls[index],
		
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			'cache-control': 'no-cache'
		}
	};

	console.log('- [ ] Scraping \x1b[35m'+ urls[index] +'\x1b[0m.');
	request(options, function (error, response, body) {
		if (error) throw new Error(error);
		
		console.log('- [x] Scraped \x1b[35m'+ urls[index] +'\x1b[0m.');
		console.log('    - [ ] Begin parsing \x1b[31m'+ urls[index] +'\x1b[0m.');
		var HTML = response.body;

		$ = cheerio.load(HTML);

		var wikitables = $('.wikitable');
	
		wikitables.each(function(i, table){
			var rows = $(this).find('tr');

			rows.each(function(j, row){
				var modRaw = $(this).find('td').last().text();
 
				var mod = modRaw.replace(/((\d+(.\d+)?) to (\d+(.\d+)?))|(\d+(.\d+)?)/gi,"#");
				var mod = modRaw.replace(/([.0-9]+)/gi,"#");
				//var mod = mod.replace(/Word of|Edict of|Decree of|Commandment of/gi,"# of");

				mods[mod] = mod;
			})
		})

		console.log('    - [x] Parsed \x1b[31m'+ urls[index] +'\x1b[0m.');		
		console.log('- [ ] Saving data to \x1b[32m'+urls[index]+'.txts\x1b[0m.');
		var output = ""

		for (var key in mods) {
		 	var output = output + mods[key] + "\r\n"
		}

		try {
			fs.unlinkSync('txt/'+urls[index]+'.txt');	
		} catch (err) {}

		fs.appendFile('txt/'+urls[index]+'.txt', output, function (err) {

		});
	})
})
console.log('- [x] Scraped \x1b[36mpoe wiki\x1b[0m.');