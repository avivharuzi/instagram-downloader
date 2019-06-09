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

async function saveMedia(urls, username, subpath) {
	try {
    const basicFolder = `${BASE_PUBLIC_FOLDER}${username}/`;
    const basicFolderWithSubpath = `${basicFolder}${subpath}/`;
    const totalLength = urls.length.toString().length;

		if (!await fse.exists(basicFolder)) {
      await fse.mkdir(basicFolder);
    }

    if (!await fse.exists(basicFolderWithSubpath)) {
      await fse.mkdir(basicFolderWithSubpath);
    }

    urls = urls.reverse();

    console.log(`Starting downloading ${subpath} into folder: ${basicFolderWithSubpath}`);

    for (let [i, url] of urls.entries()) {
      const filename = getFilenameFromUrl(url);
      const fileExtension = filename.substr(filename.lastIndexOf('.'));
      const counter = i + 1;
      const filenameLength = i.toString().length;

      let finaleFilename = '';

      if (totalLength === filenameLength) {
        finaleFilename = `${counter}${fileExtension}`;
      } else {
        finaleFilename = `${'0'.repeat(totalLength - filenameLength)}${counter}${fileExtension}`;
      }

      const path = `${basicFolderWithSubpath}${finaleFilename}`;

      await download(url, path);

      if (((counter % (Math.floor(urls.length * 0.1))) === 0) || counter === urls.length) {
        console.log(`Downloaded ${counter} ${subpath}...`);
      }
    }

    console.log(`Finished download ${subpath}`);
	} catch (error) {
		console.log(`There was a problem while downloading the file: ${error}`);
  }
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
    path: path.join(__dirname, 'scripts/all-media.js')
  });

  page.on('console', msg => {
    console.log(msg.args().join(' '));
  });

  page.on('error', error => {
    console.log('Error:', error);
  });

  const { allImages, allVideos } = await page.evaluate(() => allMedia());

  console.log(`Found ${allImages.length} images and ${allVideos.length} videos`);

  await browser.close();

  await saveMedia(allImages, username, 'images');
  await saveMedia(allVideos, username, 'videos');
})();
