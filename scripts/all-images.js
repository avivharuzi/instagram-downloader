let allImages = [];
const count = getCount();
let counter = 0;
const firstImageElements = document.querySelectorAll('img[decoding=\'auto\']');
let scrollingInterval;

(function () {
	const origOpen = XMLHttpRequest.prototype.open;
	
	XMLHttpRequest.prototype.open = function () {
		this.addEventListener('load', function () {
			if (this.readyState === 4) {
				let response = this.responseText;
				
				if (response) {
					response = JSON.parse(response);
					
					console.log(response);
					
					if (response.data) {
						let images = [];
						
						if (response.data.shortcode_media) {
							images = getImagesFromShortCodeMedia(response.data.shortcode_media);
						} else {
							const edges = getEdgesFromGraphql(response.data);
							counter += edges.length;
							images = getImagesFromEdges(edges);
						}
						allImages.push(...images);
					}
				}
			}
		});
		
		origOpen.apply(this, arguments);
	};
})();

(async function () {
	await getAllFirstImages();
	
	scrollingInterval = setInterval(function () {
		if (counter === count) {
			clearInterval(scrollingInterval);
			downloadAllImages();
		} else {
			goToBottom();
		}
	}, 1000);
}());

async function getAllFirstImages() {
	counter += firstImageElements.length;
	
	for (const firstImagesElement of firstImageElements) {
		await openImageAndClose(firstImagesElement);
	}
}

async function openImageAndClose(element) {
	return new Promise(resolve => {
		setTimeout(() => {
			element.click();
			document.querySelector('div[role=\'dialog\']').click();
			resolve();
		}, 3000);
	});
}

function goToBottom() {
	const scrollingElement = (document.scrollingElement || document.body);
	scrollingElement.scrollTop = scrollingElement.scrollHeight;
}

function getGraphql() {
	return _sharedData.entry_data.ProfilePage[0].graphql;
}

function getCount() {
	const graphql = getGraphql();
	return graphql.user.edge_owner_to_timeline_media.count;
}

function getEdgesFromGraphql(graphql) {
	return graphql.user.edge_owner_to_timeline_media.edges;
}

function getImagesFromSidecar(edges) {
	let images = [];
	
	for (const edge of edges) {
		images.push(edge.node.display_url);
	}
	
	return images;
}

function getImagesFromShortCodeMedia(shortCodeMedia) {
	let images = [];
	
	if (shortCodeMedia.edge_sidecar_to_children && shortCodeMedia.edge_sidecar_to_children.edges) {
		const sidecarImages = getImagesFromSidecar(shortCodeMedia.edge_sidecar_to_children.edges);
		images.push(...sidecarImages);
	} else {
		images.push(shortCodeMedia.display_url);
	}
	
	return images;
}

function getImagesFromEdges(edges) {
	let images = [];
	
	for (const edge of edges) {
		const node = edge.node;
		
		if (node.edge_sidecar_to_children && node.edge_sidecar_to_children.edges) {
			const sidecarImages = getImagesFromSidecar(node.edge_sidecar_to_children.edges);
			images.push(...sidecarImages);
		} else {
			images.push(node.display_url);
		}
	}
	
	return images;
}

function downloadImage(link, name) {
	const a = document.createElement('a');
	a.href = link;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function downloadAllImages() {
	allImages = allImages.reverse();
	
	for (const [i, allImage] of allImages.entries()) {
		downloadImage(allImage, i + 1);
	}
}
