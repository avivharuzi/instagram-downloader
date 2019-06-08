function getEdgesFromGraphql(graphql) {
	return graphql.user.edge_owner_to_timeline_media.edges;
}

function getImagesFromEdges(edges) {
	let images = [];

	for (let i = 0; i < edges.length; i++) {
		images.push(edges[i].node.display_url);
	}

	return images;
}

function getFirstImages() {
	const graphql = _sharedData.entry_data.ProfilePage[0].graphql;
  const edges = getEdgesFromGraphql(graphql);

	return getImagesFromEdges(edges);
}

function main() {
	return getFirstImages();
}
