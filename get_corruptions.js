var request 	= require("request");
var rp 			= require('request-promise');
var fs 			= require('fs');

/* wiki item properties:
 * 
 * */
var regex_wikilinks = /\[\[([^\]\|]*)\]\]|\[\[[^\]\|]*\|([^\]\|]*)\]\]/; 
var regex_single_value = /([\d\.]+)/g;
var regex_double_range = /\(?(\d+)(?:-(\d+)\))? to \(?(\d+)(?:-(\d+)\))?/;
var regex_double_range_replace = /\(?(\d+)(?:-(\d+)\))? to \(?(\d+)(?:-(\d+)\))?/;
var regex_single_range = /\+?\(((-?[\d\.]+)-([\d\.]+))\)%?/;
var regex_single_range_replace = /\((-?[\d\.]+-[\d\.]+)\)/;

requestCorruptions()

function requestCorruptions() {	
	var url = "https://pathofexile.gamepedia.com/api.php?" +
		'action=cargoquery' +
		'&format=json' +
		'&limit=max' +
		'&tables=mods' +
		'&fields=mods.id, mods.stat_text' +
		'&where=mods.generation_type=5' +
		'&formatversion=1';
		
	url = encodeURI(url);
	//console.log(url)

	var options = {
		uri: url,
		headers: {
			'User-Agent': 'Request-Promise'
		},
		json: true
	};

	rp(options)
		.then(function(result) {
			var corruptions = [];
			
			result.cargoquery.forEach(function(corruption) {
				if (corruption.title["stat text"].length != 0) {
					var stat_text = get_corruption_stat(corruption.title["stat text"]);
					
					if (corruptions.indexOf(stat_text) < 0) {
						corruptions.push(stat_text);		
					}					
				}				
			});
			
			write_data_to_file("corrupted", corruptions);
		})
		.catch(function (err) {
			console.log(err)
		});
}

function write_data_to_file(file, data) {
	var file_name = "output/item_" + file + '_mods.txt';
	try {
		fs.unlinkSync(file_name);
	} catch (err) {}
	
	var list = "";
	data.forEach(function(element) {
		if (list.length != 0) {
			list = list + "\n";		
		}	
		list += element;			
	});
	
	fs.writeFile(file_name, list, function(err) {
		if(err) {
			return console.log(err);
		}
		console.log(file_name + " was saved!");
	}); 
}

function get_corruption_stat(stat) {
	stat = remove_wiki_formats(stat);

	var match = stat.match(regex_double_range);

	if (match) {
		// double range
		if (match[1] && match[2] && match[3] && match[4]) {
			// (10-20) to (30-40)
			stat = stat.replace(regex_double_range_replace, '# to #');
		} else if (match[1] && match[2] && match[3]) {			
			// (10-20) to 35
			stat = stat.replace(regex_double_range_replace, '# to #');
		} else if (match[1] && match[3] && match[4]) {
			// 15 to (30-40)			
			stat = stat.replace(regex_double_range_replace, '# to #');
		} else if (match[1] && match[3]) {
			// 15 to 35
			stat = stat.replace(regex_double_range_replace, '# to #');
		}

	} else  if (match = stat.match(regex_single_range)) {
		// single rang
		stat = stat.replace(regex_single_range_replace, '#');

	} else {
		// single value, no range

		stat = stat.replace(regex_single_value, '#');
	}
	
	return stat;
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
	text = text.replace('<br>', ' ');
	text = text.replace('&lt;br&gt;', ' ');
	return text;
}