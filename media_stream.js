const axios = require("axios");
const PutioAPI = require("@putdotio/api-client").default;

module.exports = (req, res) => {
  // AUTHENTICATION
  const client_id = req.query.client_id;
  const token = req.query.token;
  // MEDIA TYPE: type=tv || type=movies
  const type = req.query.type;
  // MOVIES
  const id = req.query.imdb_id;
  const quality = req.query.quality;
  // TV
  const title = req.query.title;
  const e = req.query.e;
  const s = req.query.s;
  // PUTIO API CLIENT
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  // LOGIC
  if (type === "tv") {
    console.log("TV");
    getTVLink(title, s, e, API, res);
  } else if (type === "movies") {
    console.log("MOVIES");
    getMoviesLink(id, quality, API, res);
  } else if (type === "anime") {
  }
};

function getMoviesLink(id, quality, API, res) {
    console.log('STARTING')
  axios("http://185.186.244.195:5000/imdb-torrent-search?id=" + id)
    .then((r) => {
        console.log(r)
      const torrent = r.data.data;
      const movie =
        torrent.movie_count === 1 ? torrent.movies[0] : torrent.movies;
      movie?.torrents.forEach((torrent) => {
        if (torrent.quality === quality) {
          const url = torrent.url;

          setTimeout(() => {
            API.Transfers.Add({ url: url })
              .then(({ status, body }) => {
                if (status === 200) {
                  const id = body.transfer.id;
                  API.Transfers.Get(id)
                    .then(({ status, body }) => {
                      if (status === 200) {
                        const id = body.transfer.file_id;
                        setTimeout(() => {
                          API.Files.DownloadLinks({ ids: [id] })
                            .then(({ status, statusText, body, data }) => {
                              if (status === 200) res.json(body);
                              else if (status === 400) res.json(data);
                            })
                            .catch((err) => res.json(err));
                        }, 300);
                      }
                    })
                    .catch((err) => res.json(err));
                }
              })
              .catch((err) => res.json(err));
          }, 300);
        }
      });
    })
    .catch((e) => res.json(e));
}

function getTVLink(title, s, e, API, res) {
  axios(
    `http://185.186.244.195:5000/xtorrent?type=TV&title=${title}&s=${s}&e=${e}`
  )
    .then((r) => {
      const url = String(r.data.data.main_result.magnet); //.split("&dn=");
      setTimeout(() => {
        API.Transfers.Add({ url: url })
          .then(({ status, body }) => {
            if (status === 200) {
              setTimeout(() => {
                const id = body.transfer.id;
                API.Transfers.Get(id)
                  .then(({ status, body }) => {
                    if (status === 200) {
                      const id = body.transfer.file_id;
                      API.Files.DownloadLinks({ ids: [id] })
                        .then(({ status, statusText, body, data }) => {
                          if (status === 200) res.json(body);
                          else if (status === 400) res.json(data);
                        })
                        .catch((err) => res.json(err));
                    }
                  })
                  .catch((err) => res.json(err));
              }, 300);
            }
          })
          .catch((err) => res.json(err));
      }, 300);
    })
    .catch((e) => {
      res.json(e);
    });
}
// exports.media_stream = media_stream;
