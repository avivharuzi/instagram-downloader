function getEdgesFromGraphql(graphql) {
    return graphql.user.edge_owner_to_timeline_media.edges;
}

function getImagesFromeEdges(edges) {
    var images = [];

    for (var i = 0; i < edges.length; i++) {
        images.push(edges[i].node.display_url);
    }

    return images;
}

function getFirstImages() {
    var graphql = _sharedData.entry_data.ProfilePage[0].graphql;
    var edges = getEdgesFromGraphql(graphql);
    return getImagesFromeEdges(edges);
}

function main() {
    return getFirstImages();
}
