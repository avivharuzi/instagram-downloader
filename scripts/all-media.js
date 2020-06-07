function allMedia() {
  return new Promise(async (resolve, reject) => {
    if (isUserPrivate()) {
      return reject('User is private!');
    }

    const allImages = [];
    const allVideos = [];

    let counter = 0;
    let scrollingInterval = null;

    const firstImageVideoElements = document.querySelectorAll('img[decoding=\'auto\']');
    const userMediaCount = getUserMediaCount();

    console.log(`There is ${userMediaCount} media to be downloaded...`);
    console.log(`Counter: ${counter}`);
    console.log(`All images length: ${allImages.length}`);
    console.log(`All videos length: ${allVideos.length}`);

    // Start listen to XHR events...
    (() => {
      const origOpen = XMLHttpRequest.prototype.open;

      XMLHttpRequest.prototype.open = function () {
        this.addEventListener('load', function () {
          if (this.readyState === 4) {
            let response = this.responseText;

            if (response) {
              response = JSON.parse(response);

              if (response.data) {
                let images;
                let videos;

                // noinspection JSUnresolvedVariable
                if (response.data.shortcode_media) {
                  console.log('Got response with data, type: shortcode_media');

                  // noinspection JSUnresolvedVariable
                  const imagesAndVideosFromShortCodeMedia = getImagesAndVideosFromShortCodeMedia(response.data.shortcode_media);
                  images = imagesAndVideosFromShortCodeMedia.images;
                  videos = imagesAndVideosFromShortCodeMedia.videos;
                } else {
                  console.log('Got response with data, type: edges');

                  const edges = getEdgesFromGraphql(response.data);
                  const imagesAndVideosFromEdges = getImagesAndVideosFromEdges(edges);
                  images = imagesAndVideosFromEdges.images;
                  videos = imagesAndVideosFromEdges.videos;

                  counter += edges.length;

                  if (!hasNextPageFromGraphql(response.data)) {
                    finish();
                  }
                }

                allImages.push(...images);
                allVideos.push(...videos);
              }
            }
          }
        });

        origOpen.apply(this, arguments);
      };
    })();

    await (async () => {
      await getAllFirstImagesAndVideos();

      console.log(`After getting first images and videos, counter: ${counter}, start getting the other...`);

      scrollingInterval = setInterval(() => {
        if (counter === userMediaCount) {
          finish();
        } else {
          console.log(`Counter: ${counter}, all images length: ${allImages.length}, all videos length: ${allVideos.length}, getting bottom to get more media...`);

          goToBottom();
        }
      }, 1500);
    })();

    async function getAllFirstImagesAndVideos() {
      counter += firstImageVideoElements.length;

      console.log(`First image, video elements length: ${firstImageVideoElements.length}, counter: ${counter}`);

      for (let [i, firstImageVideoElement] of firstImageVideoElements.entries()) {
        await openImageVideoAndClose(firstImageVideoElement, i + 1);
      }
    }

    async function openImageVideoAndClose(element, i) {
      return new Promise(resolve => {
        setTimeout(() => {
          console.log(`Clicking on image, video element: ${element}, ${i}`);
          element.click();
          console.log(`Clicking out of image, video element: ${element}, ${i}`);
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
      console.log(`Finished getting all images and videos, counter: ${counter}`);

      clearInterval(scrollingInterval);
      resolve({ allImages, allVideos });
    }

    function getImagesAndVideosFromSidecar(edges) {
      let images = [];
      let videos = [];

      for (let edge of edges) {
        // noinspection JSUnresolvedVariable
        if (edge.node.display_url) {
          // noinspection JSUnresolvedVariable
          images.push(edge.node.display_url);
        }

        // noinspection JSUnresolvedVariable
        if (edge.node.video_url) {
          // noinspection JSUnresolvedVariable
          videos.push(edge.node.video_url);
        }
      }

      return { images, videos };
    }

    function getImagesAndVideosFromShortCodeMedia(shortCodeMedia) {
      let images = [];
      let videos = [];

      // noinspection JSUnresolvedVariable,DuplicatedCode
      if (shortCodeMedia.edge_sidecar_to_children && shortCodeMedia.edge_sidecar_to_children.edges) {
        const imagesAndVideosFromSidecar = getImagesAndVideosFromSidecar(shortCodeMedia.edge_sidecar_to_children.edges);

        images.push(...imagesAndVideosFromSidecar.images);
        videos.push(...imagesAndVideosFromSidecar.videos);
      } else {
        // noinspection JSUnresolvedVariable
        if (shortCodeMedia.display_url) {
          images.push(shortCodeMedia.display_url);
        }

        // noinspection JSUnresolvedVariable
        if (shortCodeMedia.video_url) {
          videos.push(shortCodeMedia.video_url);
        }
      }

      return { images, videos };
    }

    function getImagesAndVideosFromEdges(edges) {
      let images = [];
      let videos = [];

      for (let edge of edges) {
        // noinspection JSUnresolvedVariable
        const node = edge.node;

        // noinspection JSUnresolvedVariable,DuplicatedCode
        if (node.edge_sidecar_to_children && node.edge_sidecar_to_children.edges) {
          const imagesAndVideosFromSidecar = getImagesAndVideosFromSidecar(node.edge_sidecar_to_children.edges);

          images.push(...imagesAndVideosFromSidecar.images);
          videos.push(...imagesAndVideosFromSidecar.videos);
        } else {
          // noinspection JSUnresolvedVariable
          if (node.display_url) {
            images.push(node.display_url);
          }

          // noinspection JSUnresolvedVariable
          if (node.video_url) {
            videos.push(node.video_url);
          }
        }
      }

      return { images, videos };
    }

    function getGraphql() {
      // noinspection JSUnresolvedVariable
      return _sharedData.entry_data.ProfilePage[0].graphql;
    }

    function getUserMediaCount() {
      const graphql = getGraphql();

      // noinspection JSUnresolvedVariable
      return graphql.user.edge_owner_to_timeline_media.count;
    }

    function getEdgesFromGraphql(graphql) {
      // noinspection JSUnresolvedVariable
      return graphql.user.edge_owner_to_timeline_media.edges;
    }

    function hasNextPageFromGraphql(graphql) {
      // noinspection JSUnresolvedVariable
      return graphql.user.edge_owner_to_timeline_media.page_info.has_next_page;
    }

    function isUserPrivate() {
      const graphql = getGraphql();

      // noinspection JSUnresolvedVariable
      return graphql.user.is_private;
    }
  });
}
