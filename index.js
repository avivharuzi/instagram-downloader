const chalk = require('chalk');
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

async function saveMedia(urls, username, subPath) {
	try {
    const basicFolder = `${BASE_PUBLIC_FOLDER}${username}/`;
    const basicFolderWithSubPath = `${basicFolder}${subPath}/`;

		if (!await fse.exists(basicFolder)) {
      await fse.mkdir(basicFolder);
    }

    if (!await fse.exists(basicFolderWithSubPath)) {
      await fse.mkdir(basicFolderWithSubPath);
    }

    const downloadPromises = urls.reverse().map((url, i) => {
      const filename = getFilenameFromUrl(url);
      const fileExtension = filename.substr(filename.lastIndexOf('.'));

      const finaleFilename = `${i + 1}`.padStart(4, '0') + `${fileExtension}`;

      const path = `${basicFolderWithSubPath}${finaleFilename}`;

      return download(url, path);
    });

    console.log(chalk.yellow(`Starting downloading ${subPath} into folder: ${basicFolderWithSubPath}`));

    await Promise.all(downloadPromises);

    console.log(chalk.green(`Finished download ${subPath}`));
	} catch (error) {
		console.log(chalk.red(`There was a problem while downloading into public folder, error: ${error}`));
  }
}

(async () => {
	// noinspection JSUnusedGlobalSymbols
  const question = await prompts({
		type: 'text',
		name: 'username',
		message: 'Please insert instagram username',
		validate: value => !value ? `Instagram username is required` : true
	});

	// noinspection JSUnresolvedVariable
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
    console.log(chalk.yellow(msg.args().join(' ')));
  });

  page.on('error', error => {
    console.log(chalk.red(`Page error: ${error}`));
  });

  try {
    const { allImages, allVideos } = await page.evaluate(() => allMedia());

    console.log(chalk.blue(`Found ${allImages.length} images and ${allVideos.length} videos`));

    await browser.close();

    if (allImages && allImages.length > 0) {
      await saveMedia(allImages, username, 'images');
    }

    if (allVideos && allVideos.length > 0) {
      await saveMedia(allVideos, username, 'videos');
    }
  } catch (error) {
    console.log(chalk.red(`There was a problem while trying to download instagram images and videos, error: ${error}`));

    process.exit();
  }
})();
