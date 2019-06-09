function allImages() {
  return new Promise(async (resolve) => {
    const firstImageElements = document.querySelectorAll('img[decoding=\'auto\']');

    let allImages = [];
    let counter = 0;
    let scrollingInterval = null;

    const userPostsCount = getUserPostsCount();

    console.log(`There is ${userPostsCount} posts to be downloaded...`);
    console.log(`Counter: ${counter}`);
    console.log(`All images length: ${allImages.length}`);

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
                  console.log('Got response with data, type: shortcode_media');
                  images = getImagesFromShortCodeMedia(response.data.shortcode_media);
                } else {
                  console.log('Got response with data, type: edges');
                  const edges = getEdgesFromGraphql(response.data);
                  images = getImagesFromEdges(edges);
                  counter += edges.length;

                  if (!hasNextPageFromGraphql(response.data)) {
                    finish();
                  }
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

      console.log(`After getting first images, counter: ${counter}, start getting the other...`);

      scrollingInterval = setInterval(function () {
        if (counter === userPostsCount) {
          finish();
        } else {
          console.log(`Counter: ${counter}, all images length: ${allImages.length}, getting bottom to get more media...`);

          goToBottom();
        }
      }, 1500);
    })();

    async function getAllFirstImages() {
      counter += firstImageElements.length;

      console.log(`First images elements length: ${firstImageElements.length}, counter: ${counter}`);

      for (let [i, firstImagesElement] of firstImageElements.entries()) {
        await openImageAndClose(firstImagesElement, i + 1);
      }
    }

    async function openImageAndClose(element, i) {
      return new Promise(resolve => {
        setTimeout(() => {
          console.log(`Clicking on element: ${element}, ${i}`);
          element.click();
          console.log(`Clicking out of element: ${element}, ${i}`);
          document.querySelector('div[role=\'dialog\']').click();
          resolve();
        }, 3000);
      });
    }

    function goToBottom() {
      const scrollingElement = (document.scrollingElement || document.body);

      scrollingElement.scrollTop = scrollingElement.scrollHeight;
    }

    function finish() {
      console.log(`Finished getting all images, counter: ${counter}`);

      clearInterval(scrollingInterval);
      resolve(allImages);
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

    function hasNextPageFromGraphql(graphql) {
      return graphql.user.edge_owner_to_timeline_media.page_info.has_next_page;
    }
  });
}
