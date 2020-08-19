const PutioAPI = require("@putdotio/api-client").default;

module.exports = (req, res) => {
  // const url = req.query.url;
  const id = req.query.imdb_id;
  const title = req.query.title;
  const quality = req.query.quality;
  const e = req.query.e;
  const s = req.query.s;
  const type = req.query.type;
  const client_id = req.query.client_id;
  const token = req.query.token;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  if (type === "tv") {
    axios(
      `http://185.186.244.195:5000/xtorrent?type=TV&title=${title}&s=${s}&e=${e}`
    )
      .then((r) => {
        const url = String(r.data.data.main_result.magnet).split("&dn=");

        console.log(url[0]);

        API.Transfers.Add({ url: url })
          .then(({ status, body }) => {
            if (status === 200) {
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
            }
          })
          .catch((err) => res.json(err));
      })
      .catch((e) => {
        res.json(e);
      });
  } else if (type === "movies") {
    console.log("movies");
    axios("http://185.186.244.195:5000/imdb-torrent-search?id=" + id)
      .then((r) => {
        const torrent = r.data.data;
        const movie =
          torrent.movie_count === 1 ? torrent.movies[0] : torrent.movies;
        movie?.torrents.forEach((torrent) => {
          if (torrent.quality === quality) {
            const url = torrent.url;
            API.Transfers.Add({ url: url })
              .then(({ status, body }) => {
                if (status === 200) {
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
                }
              })
              .catch((err) => res.json(err));
          }
        });
      })
      .catch((e) => res.json(e));
  } else if (type === "anime") {
  }
};
