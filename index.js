const phantom = require('phantom');
const prompts = require('prompts');
const fse = require('fs-extra');
const imageDownloader = require('image-downloader');

const BASE_INSTAGRAM_URL = 'https://www.instagram.com/';
const BASE_PUBLIC_FOLDER = './public/';

function getFilenameFromUrl(url) {
	const matches = url.match(/\/([^\/?#]+)[^\/]*$/);
	if (matches.length > 1) {
		return matches[1];
	}
	return false;
}

function download(url, path) {
	const options = {
		url: url,
		dest: path
	};
	
	return imageDownloader.image(options);
}

async function saveImages(urls, username) {
	const basicFolder = `${BASE_PUBLIC_FOLDER}${username}/`;
	const isBasicFolderExist = await fse.exists(basicFolder);
	
	try {
		if (!isBasicFolderExist) {
			await fse.mkdir(basicFolder);
		}
		
		for (let url of urls) {
			const path = `${basicFolder}${getFilenameFromUrl(url)}`;
			
			await download(url, path);
		}
	} catch (error) {
		console.log(`There was a problem while downloading the file: ${error}`);
	}
}

(async function () {
	const question = await prompts({
		type: 'text',
		name: 'username',
		message: 'Please insert instagram username',
		validate: value => !value ? `Instagram username is required` : true
	});
	
	const username = question.username;
	
	const instance = await phantom.create();
	const page = await instance.createPage();
	
	await page.on('onResourceRequested', (data) => {
		console.info('Resource requested: ', data.url);
	});
	
	await page.on('onConsoleMessage', (data) => {
		console.log('Console message', data);
	});
	
	await page.on('onCallback', (data) => {
		console.log('Callback: ', data);
	});
	
	const status = await page.open(`${BASE_INSTAGRAM_URL}${username}`);
	
	if (status === 'success') {
		await page.injectJs('./scripts/first-images.js');
		
		const urls = await page.evaluate(function () {
			return main();
		});
		
		await saveImages(urls, username);
	} else {
		console.log(`Could not load the page properly, status: ${status}`);
	}
	
	await instance.exit();
})();
