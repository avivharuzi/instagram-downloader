const fse = require('fs-extra');
const imageDownloader = require('image-downloader');
const path = require('path');
const prompts = require('prompts');
const puppeteer = require('puppeteer');

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

    urls = urls.reverse();

    console.log(`Starting downloading images into folder: ${basicFolder}`);

    for (let [i, url] of urls.entries()) {
      const filename = getFilenameFromUrl(url);
      const fileExtension = filename.substr(filename.lastIndexOf('.'));
      const counter = i + 1;

      let finaleFilename = '';

      if (counter < 10) {
        finaleFilename = `0${counter}${fileExtension}`;
      } else {
        finaleFilename = `${counter}${fileExtension}`;
      }

      const path = `${basicFolder}${finaleFilename}`;

      await download(url, path);

      if (((counter % (Math.floor(urls.length * 0.1))) === 0) || counter === urls.length) {
        console.log(`Downloaded ${counter} images...`);
      }
    }
	} catch (error) {
		console.log(`There was a problem while downloading the file: ${error}`);
  }

  console.log('Finished download images');
}

(async () => {
	const question = await prompts({
		type: 'text',
		name: 'username',
		message: 'Please insert instagram username',
		validate: value => !value ? `Instagram username is required` : true
	});

	const username = question.username;

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

  await page.goto(`${BASE_INSTAGRAM_URL}${username}`, {
    timeout: 0
  });

  await page.addScriptTag({
    path: path.join(__dirname, 'scripts/all-images.js')
  });

  page.on('console', msg => {
    console.log(msg.args().join(' '));
  });

  page.on('error', error => {
    console.log('Error:', error);
  });

  const images = await page.evaluate(() => allImages());

  console.log(`Found ${images.length} images`);

  await browser.close();

  await saveImages(images, username);
})();
