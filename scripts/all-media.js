function allMedia() {
  return new Promise(async (resolve) => {
    const firstImageVideoElements = document.querySelectorAll('img[decoding=\'auto\']');

    let allImages = [];
    let allVideos = [];
    let counter = 0;
    let scrollingInterval = null;

    const userMediaCount = getUserMediaCount();

    console.log(`There is ${userMediaCount} media to be downloaded...`);
    console.log(`Counter: ${counter}`);
    console.log(`All images length: ${allImages.length}`);
    console.log(`All videos length: ${allVideos.length}`);

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
                let videos = [];

                if (response.data.shortcode_media) {
                  console.log('Got response with data, type: shortcode_media');

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

    (async () => {
      await getAllFirstImagesAndVideos();

      console.log(`After getting first images and videos, counter: ${counter}, start getting the other...`);

      scrollingInterval = setInterval(function () {
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
        if (edge.node.display_url) {
          images.push(edge.node.display_url);
        }

        if (edge.node.video_url) {
          videos.push(edge.node.video_url);
        }
      }

      return { images, videos };
    }

    function getImagesAndVideosFromShortCodeMedia(shortCodeMedia) {
      let images = [];
      let videos = [];

      if (shortCodeMedia.edge_sidecar_to_children && shortCodeMedia.edge_sidecar_to_children.edges) {
        const imagesAndVideosFromSidecar = getImagesAndVideosFromSidecar(shortCodeMedia.edge_sidecar_to_children.edges);

        images.push(...imagesAndVideosFromSidecar.images);
        videos.push(...imagesAndVideosFromSidecar.videos)
      } else {
        if (shortCodeMedia.display_url) {
          images.push(shortCodeMedia.display_url);
        }

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
        const node = edge.node;

        if (node.edge_sidecar_to_children && node.edge_sidecar_to_children.edges) {
          const imagesAndVideosFromSidecar = getImagesAndVideosFromSidecar(node.edge_sidecar_to_children.edges);

          images.push(...imagesAndVideosFromSidecar.images);
          videos.push(...imagesAndVideosFromSidecar.videos)
        } else {
          if (node.display_url) {
            images.push(node.display_url);
          }

          if (node.video_url) {
            videos.push(node.video_url);
          }
        }
      }

      return { images, videos };
    }

    function getGraphql() {
      return _sharedData.entry_data.ProfilePage[0].graphql;
    }

    function getUserMediaCount() {
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
