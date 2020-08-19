const PutioAPI = require("@putdotio/api-client").default;
const express = require("express");
const app = express();
const axios = require("axios");

const allowCrossDomain = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
};

app.use(allowCrossDomain);

/* 
  using TMDB_ID
    TV:     /stream?client_id=1234&token=XXXYYYZZZXXXYYYZZZXX&type=tv&tmdb_id=60735&s=01&e=02
    Movies: /stream?client_id=1234&token=XXXYYYZZZXXXYYYZZZXX&type=movies&tmdb_id=299536&quality=1080p
*/
app.get("/stream", (req, res) => {
  const tmdb_id = req.query.tmdb_id; // 1399
  const e = req.query.e; // 05
  const s = req.query.s; // 01
  const type = req.query.type; // movies | tv
  const quality = req.query.quality; // 720p
  const client_id = req.query.client_id; // 1234
  const token = req.query.token; // XXXYYYZZZXXXYYYZZZXX
  const API = new PutioAPI({ clientID: client_id });
  let tvDetailsUrl = `https://api.themoviedb.org/3/tv/${tmdb_id}?api_key=046fdb0d753c6903e673934705cb553f&language=en`;
  let movieDetailsUrl = `https://api.themoviedb.org/3/movie/${tmdb_id}?api_key=046fdb0d753c6903e673934705cb553f&language=en`;
  API.setToken(token);
  if (type === "tv") {
    axios(tvDetailsUrl)
      .then((r) => {
        let show = r.data;
        let name = show.name;
        API.Files.Search(name, {
          fileType: "VIDEO",
        }).then((r) => {
          var results = {};
          let files = r.data.files;
          let seasons = files.filter((file) => file.name.includes(s));
          let episodes = seasons.filter((file) => file.name.includes(e));
          let file_type = episodes.filter((file) => file.file_type === "VIDEO");
          let file_id = file_type[0]?.id;
          // console.log(files);
          if (file_id) {
            console.log("id available");
            API.Files.DownloadLinks({ ids: [file_id] })
              .then(({ status, body, data }) => {
                // var stream_url = "";
                if (status === 200) {
                  var stream_url = body.mp4_links[0].replace(
                    "download",
                    "stream"
                  );
                  res.json({ stream_url, status: "got it from putio" });
                } else if (status === 400) {
                  res.json(data);
                }
              })
              .catch((err) => res.json(err));
          } else if (!file_id) {
            let url = `http://185.186.244.195:5000/xtorrent?type=TV&title=${name}&s=${s}&e=${e}`
            console.log(url);
            axios(url)
              .then((r) => {
                console.log(r.data);
                const url = String(r.data.data.main_result.magnet); //.split("&dn=");
                setTimeout(() => {
                  API.Transfers.Add({ url: url })
                    .then(({ status, body }) => {
                      if (status === 200) {
                        const id = body.transfer.id;
                        setTimeout(() => {
                          API.Transfers.Get(id)
                            .then(({ status, body }) => {
                              if (status === 200) {
                                const id = body.transfer.file_id;
                                API.Files.DownloadLinks({ ids: [id] })
                                  .then(
                                    ({ status, statusText, body, data }) => {
                                      var stream_url = "";
                                      if (status === 200) {
                                        stream_url = body.mp4_links[0].replace(
                                          "download",
                                          "stream"
                                        );
                                      } else if (status === 400) res.json(data);
                                      res.json({
                                        stream_url,
                                        status: "added to putio",
                                      });
                                    }
                                  )
                                  .catch((err) => res.json(err));
                              }
                            })
                            .catch((err) => res.json(err));
                        }, 400);
                      }
                    })
                    .catch((err) => res.json(err));
                }, 400);
              })
              .catch((e) => {
                res.json(e);
              });
          }
        });
      })
      .catch((e) => {
        res.json(e.response.data);
      });
  } else if (type === "movies") {
    axios(movieDetailsUrl).then((r) => {
      let movie = r.data;
      let name = movie.title;
      let imdb_id = movie.imdb_id;
      API.Files.Search(name, {
        fileType: "VIDEO",
      })
        .then((r) => {
          let files = r.body.files;
          let videos = files.filter((file) => file.file_type === "VIDEO");
          let movie = videos.find((file) => file.name.includes(quality));
          let file_id = movie?.id;
          if (file_id) {
            API.Files.DownloadLinks({ ids: [file_id] })
              .then(({ status, body, data }) => {
                if (status === 200) {
                  var stream_url = body.mp4_links[0].replace(
                    "download",
                    "stream"
                  );
                  res.json({ stream_url, status: "got it from putio" });
                }
              })
              .catch((err) => res.json(err));
          } else if (!file_id) {
            axios(
              `http://185.186.244.195:5000/imdb-torrent-search?id=${imdb_id}`
            ).then((r) => {
              if (r.data.data.movie_count === 0) {
              } else if (r.data.data.movie_count >= 1) {
                let torrents = r.data.data.movies[0].torrents;
                let torrent = torrents.find(
                  (torrent) => torrent.quality === quality
                );
                let url = torrent.url;
                setTimeout(() => {
                  API.Transfers.Add({ url: url })
                    .then(({ status, body }) => {
                      if (status === 200) {
                        const id = body.transfer.id;
                        setTimeout(() => {
                          API.Transfers.Get(id)
                            .then(({ status, body }) => {
                              if (status === 200) {
                                const id = body.transfer.file_id;
                                setTimeout(() => {
                                  API.Files.DownloadLinks({ ids: [id] })
                                    .then(
                                      ({ status, statusText, body, data }) => {
                                        if (status === 200) {
                                          var stream_url = body.mp4_links[0].replace(
                                            "download",
                                            "stream"
                                          );
                                          res.json({
                                            stream_url,
                                            status: "added it to putio",
                                          });
                                        }
                                      }
                                    )
                                    .catch((err) => res.json(err));
                                }, 400);
                              }
                            })
                            .catch((err) => res.json(err));
                        }, 400);
                      }
                    })
                    .catch((err) => res.json(err));
                }, 400);
              }
            });
          }
        })
        .catch((e) => res.json(e));
    });
  }
});

/* 
    Movies: /check-file?type=movies&client_id=1234&token=XXXYYYZZZYYXXZZXXYYZ&query=the avengers&quality=1080p
    TV: /check-file?type=tv&client_id=1234&token=XXXYYYZZZYYXXZZXXYYZ&query=game of thrones&s=01&e=05
*/
app.get("/search-file", (req, res) => {
  const hash = req.query.hash; //
  const imdb_id = req.query.imdb_id; // tt0848228
  const query = req.query.query; // thrones
  const e = req.query.e; // 05
  const s = req.query.s; // 01
  const type = req.query.type; // movies | tv
  const quality = req.query.quality; // 720p
  // const fileType = req.query.file_type; // "FOLDER" | "FILE" | "AUDIO" | "VIDEO" | "IMAGE" | "ARCHIVE" | "PDF" | "TEXT" | "SWF"
  const client_id = req.query.client_id; // 1234
  const token = req.query.token; // XXXYYYZZZXXXYYYZZZXXXYYYZZZ
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  res.set("Accept", "application/json");
  API.Files.Search(query ? query : imdb_id ? imdb_id : hash ? hash : "", {
    fileType: "VIDEO",
  })
    .then((r) => r.data)
    .then((r) => {
      var results = {};
      r.files.forEach((file, i) => {
        setTimeout(() => {
          if (type === "tv") {
            // if (file.name.includes(quality)) {
            if (file.file_type === "VIDEO") {
              if (file.name.includes(s)) {
                if (file.name.includes(e)) {
                  results = {
                    index: i,
                    type: type,
                    statusCode: 200,
                    statusMsg: "OK",
                    file: file,
                    serverTime: new Date().toUTCString(),
                  };
                }
              }
            }
            // }
          } else if (type === "movies") {
            if (file.file_type === "VIDEO") {
              let name = file.name;
              if (name.includes(quality)) {
                results = {
                  index: i,
                  type: type,
                  statusCode: 200,
                  statusMsg: "OK",
                  file: file,
                  serverTime: new Date().toUTCString(),
                };
              }
            }
          }
        }, 100);
      });
      setTimeout(() => {
        res.json(results);
      }, 300);
    })
    .catch((e) => {
      console.log(e);
      res.status(404).json(e);
    });
});

/* 
    All Files: /get-files?client_id=1234&token=XYZ
    Specific File: /get-files?client_id=1234&token=XYZ&id=75634663
*/
app.get("/get-files", (req, res) => {
  const id = req.query.id;
  const token = req.query.token;
  const client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  API.Files.Query(id ? id : undefined)
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

/* 
    /get-transfers?client_id=1234&token=XYZ
*/
app.get("/get-transfers", (req, res) => {
  const id = req.query.id;
  const token = req.query.token;
  const client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  API.Transfers.Query(id ? id : undefined)
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

/* 
    Movies: http://localhost:3000/?type=movies&client_id=1234&token=XXYYZZXXYYZZXXYYZZXX&imdb_id=tt0848228&quality=1080p
    Shows: http://localhost:3000/?type=tv&client_id=1234&token=XXYYZZXXYYZZXXYYZZXX&s=04&e=01&title=game+of+thrones
*/
app.get("/media_stream", (req, res) => {
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
    axios(
      `http://185.186.244.195:5000/xtorrent?type=TV&title=${title}&s=${s}&e=${e}`
    )
      .then((r) => {
        const url = String(r.data.data.main_result.magnet); //.split("&dn=");
        setTimeout(() => {
          API.Transfers.Add({ url: url })
            .then(({ status, body }) => {
              if (status === 200) {
                const id = body.transfer.id;
                setTimeout(() => {
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
                }, 400);
              }
            })
            .catch((err) => res.json(err));
        }, 400);
      })
      .catch((e) => {
        res.json(e);
      });
  } else if (type === "movies") {
    console.log("MOVIES");
    axios("http://185.186.244.195:5000/imdb-torrent-search?id=" + id)
      .then((r) => {
        const torrent = r.data.data;
        const movie = torrent.movies[0];
        movie?.torrents.forEach((torrent) => {
          if (torrent.quality === quality) {
            const url = torrent.url;
            setTimeout(() => {
              API.Transfers.Add({ url: url })
                .then(({ status, body }) => {
                  if (status === 200) {
                    const id = body.transfer.id;
                    setTimeout(() => {
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
                    }, 500);
                  }
                })
                .catch((err) => res.json(err));
            }, 500);
          }
        });
      })
      .catch((e) => res.json(e));
  } else if (type === "anime") {
  }
});

/* 
    /login?client_id=1234&client_secret=XYZ&token=XYZ&username=user@gmail.com&password=pass123
*/
app.get("/login", (req, res) => {
  const username = req.query.username;
  const client_id = req.query.client_id;
  const client_secret = req.query.client_secret;
  const token = req.query.token;
  const password = req.query.password;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  API.Auth.Login({
    username: username,
    password: password,
    app: { client_id: client_id, client_secret: client_secret },
  })
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

/* 
    /add?client_id=1234&token=XYZ&url=magnet:?xt=urn:btih:2565FA368FA317C90B2A3E7925CDE8F58FF99410
*/
app.get("/add", (req, res) => {
  const token = req.query.token;
  const client_id = req.query.client_id;
  const url = req.query.url;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  API.Transfers.Add({ url: url })
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

/* 
    /transfer-info?client_id=1234&token=XYZ&transfer_id=6544251
*/
app.get("/transfer-info", (req, res) => {
  const id = req.query.transfer_id;
  const token = req.query.token;
  const client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  API.Transfers.Get(id)
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

/* 
    /stream?client_id=1234&token=XYZ&transfer_id=6544251
*/
app.get("/m3u8", (req, res) => {
  const id = req.query.id;
  const token = req.query.token;
  const client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  const stream_url = API.File.GetHLSStreamURL(id);
  res.json({ stream_url });
});

/* 
    Multiple Files: /download?client_id=1234&token=XYZ&ids=75476343,75478993
    Single File: /download?client_id=1234&token=XYZ&ids=75476343
*/
app.get("/download", (req, res, next) => {
  const token = req.query.token;
  const client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  const ids = req.query.ids;
  API.Files.DownloadLinks({ ids: [ids] })
    .then(({ status, statusText, body, data }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(data);
    })
    .catch((err) => res.json(err));
});

/* 
    /logout?client_id=1234&token=XYZ
*/
app.get("/logout", (req, res) => {
  const token = req.query.token;
  const client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  API.Auth.Logout()
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

app.listen(3000);
console.log("http://localhost:3000");
