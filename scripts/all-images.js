function allImages() {
  return new Promise(async (resolve) => {
    const firstImageElements = document.querySelectorAll('img[decoding=\'auto\']');

    let allImages = [];
    let counter = 0;
    let scrollingInterval = null;

    const userPostsCount = getUserPostsCount();

    (() => {
      const origOpen = XMLHttpRequest.prototype.open;

      XMLHttpRequest.prototype.open = function () {
        this.addEventListener('load', function () {
          if (this.readyState === 4) {
            let response = this.responseText;

            if (response) {
              response = JSON.parse(response);

              if (response.data) {
                let images = [];

                if (response.data.shortcode_media) {
                  images = getImagesFromShortCodeMedia(response.data.shortcode_media);
                } else {
                  const edges = getEdgesFromGraphql(response.data);
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

    (async () => {
      await getAllFirstImages();

      scrollingInterval = setInterval(function () {
        if (counter === userPostsCount) {
          clearInterval(scrollingInterval);
          resolve(allImages);
        } else {
          goToBottom();
        }
      }, 1000);
    })();

    async function getAllFirstImages() {
      counter += firstImageElements.length;

      for (let firstImagesElement of firstImageElements) {
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

    function getImagesFromSidecar(edges) {
      let images = [];

      for (let edge of edges) {
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

      counter += 1;

      return images;
    }

    function getImagesFromEdges(edges) {
      let images = [];

      for (let edge of edges) {
        const node = edge.node;

        if (node.edge_sidecar_to_children && node.edge_sidecar_to_children.edges) {
          const sidecarImages = getImagesFromSidecar(node.edge_sidecar_to_children.edges);

          images.push(...sidecarImages);
        } else {
          images.push(node.display_url);
        }

        counter += 1;
      }

      return images;
    }

    function getGraphql() {
      return _sharedData.entry_data.ProfilePage[0].graphql;
    }

    function getUserPostsCount() {
      const graphql = getGraphql();

      return graphql.user.edge_owner_to_timeline_media.count;
    }

    function getEdgesFromGraphql(graphql) {
      return graphql.user.edge_owner_to_timeline_media.edges;
    }
  });
}
