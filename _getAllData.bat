:: scrape unique items
echo Scraping and combining unique items from wiki.
node get_uniques.js

:: scrape item bases
echo Scraping item bases from wiki.
node get_bases.js

:: scrape affixes
:: echo Scraping and combining affixes.
::node getAffixes.js
::node combineAffixJSON.js

:: scrape poe.trade mods
echo Scraping poe.trade mods.
node get_poeTradeMods.js

:: scrape currency tags
echo Scraping currency tags.
node get_currencyTags.js

:: scrape corrupted mods.
echo Scraping corrupted mods.
node get_corruptions.js

:: scrape corrupted mods.
echo Scraping enchantments.
node get_enchantments.js

:: scrape prophecy details.
echo Prophecy details.
node get_prophecyDetails.js