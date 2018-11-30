function goToBottom() {
    const scrollingElement = (document.scrollingElement || document.body);
	scrollingElement.scrollTop = scrollingElement.scrollHeight;
}

function getEdgesFromGraphql(graphql) {
    return graphql.user.edge_owner_to_timeline_media.edges;
}

function getImagesFromSidecar(edges) {
	let images = [];
	
	for (let i = 0; i < edges.length; i++) {
		images.push(edges[i].node.display_url);
	}
	
	return images;
}

function getImagesFromeEdges(edges) {
    let images = [];

    for (let i = 0; i < edges.length; i++) {
		let node = edges[i].node;
	
		if (node.edge_sidecar_to_children && node.edge_sidecar_to_children.edges) {
			let sidecarImages = getImagesFromSidecar(node.edge_sidecar_to_children.edges);
			images.push(...sidecarImages);
		} else {
			images.push(node.display_url);
		}
    }

    return images;
}

function getFirstImages() {
    const graphql = _sharedData.entry_data.ProfilePage[0].graphql;
    const edges = getEdgesFromGraphql(graphql);
    return getImagesFromeEdges(edges);
}

function downloadAllImages() {
	allImages = allImages.reverse();
	for (let i = 0; i < allImages.length; i++) {
		downloadImage(allImages[i], i + 1);
	}
}

function downloadImage(link, name) {
	let a = document.createElement('a');
	a.href = link;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

let firstImages = getFirstImages();
let allImages = firstImages;

(function () {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
			if (this.readyState === 4) {
				let response = this.responseText;
			
				if (response) {
					response = JSON.parse(response);
					
					if (response.data) {
						let edges = getEdgesFromGraphql(response.data);
						let images = getImagesFromeEdges(edges);
						allImages.push(...images);
					}
				}
			}
        });
        origOpen.apply(this, arguments);
    };
})();

const scrollingInterval = setInterval(function () {
	goToBottom();
}, 1000);
