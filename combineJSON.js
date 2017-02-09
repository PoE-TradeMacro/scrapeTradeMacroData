var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');

try {
	fs.unlinkSync('uniques.json');	
} catch (err) {}

var dir = 'json/'
var files = fs.readdirSync(dir)
var items = []


files.forEach(function(value, index){
	isJSON = value.match(/.*\.json/g);

	if (isJSON) {
		temp = jsonfile.readFileSync(dir+value)
		temp.uniques.forEach(function(item,j){
			items.push(item)
		})
	}
})

var uniques = { "uniques" : items }
var file = 'uniques.json'
jsonfile.writeFile(file, uniques, function(err) {
		if(err){
			console.error(err)	
		}
	else {
		console.log('json file saved.');
	}
})	

