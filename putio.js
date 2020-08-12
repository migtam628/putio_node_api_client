const PutioAPI = require("@putdotio/api-client").default;
const express = require("express");
const app = express();
const axios = require("axios");

/* 
  Movies: http://localhost:3000/?type=movies&client_id=1234&token=XXYYZZXXYYZZXXYYZZXX&imdb_id=tt0848228&quality=1080p
  Shows: http://localhost:3000/?type=tv&client_id=1234&token=XXYYZZXXYYZZXXYYZZXX&s=04&e=01&title=game+of+thrones
*/
app.get("/media_stream", (req, res) => {
  // let url = req.query.url;
  let id = req.query.imdb_id;
  let title = req.query.title;
  let quality = req.query.quality;
  let e = req.query.e;
  let s = req.query.s;
  let type = req.query.type;
  let client_id = req.query.client_id;
  let token = req.query.token;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  if (type === "tv") {
    axios(
      `http://185.186.244.195:5000/xtorrent?type=TV&title=${title}&s=${s}&e=${e}`
    )
      .then((r) => {
        let url = String(r.data.data.main_result.magnet).split("&dn=");

        console.log(url[0]);

        API.Transfers.Add({ url: url })
          .then(({ status, body }) => {
            if (status === 200) {
              let id = body.transfer.id;
              API.Transfers.Get(id)
                .then(({ status, body }) => {
                  if (status === 200) {
                    let id = body.transfer.file_id;
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
    axios("http://185.186.244.195:5000/imdb-torrent-search?id=" + id)
      .then((r) => {
        let torrent = r.data.data;
        let movie =
          torrent.movie_count === 1 ? torrent.movies[0] : torrent.movies;
        // let url = ''
        movie?.torrents.forEach((torrent) => {
          if (torrent.quality === quality) {
            let url = torrent.url;
            API.Transfers.Add({ url: url })
              .then(({ status, body }) => {
                if (status === 200) {
                  let id = body.transfer.id;
                  API.Transfers.Get(id)
                    .then(({ status, body }) => {
                      if (status === 200) {
                        let id = body.transfer.file_id;
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
});

// First Step
/* 
    /login?client_id=1234&client_secret=XYZ&token=XYZ&username=user@gmail.com&password=pass123
*/
app.get("/login", (req, res) => {
  let username = req.query.username;
  let client_id = req.query.client_id;
  let client_secret = req.query.client_secret;
  let token = req.query.token;
  let password = req.query.password;
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

// Second Step
/* 
    /add?client_id=1234&token=XYZ&url=magnet:?xt=urn:btih:2565FA368FA317C90B2A3E7925CDE8F58FF99410
*/
app.get("/add", (req, res) => {
  let token = req.query.token;
  let client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  const url = req.query.url;
  API.Transfers.Add({ url: url })
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

// Third Step
/* 
    /transfer-info?client_id=1234&token=XYZ&transfer_id=6544251
*/
app.get("/transfer-info", (req, res) => {
  let id = req.query.transfer_id;
  let token = req.query.token;
  let client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  API.Transfers.Get(id)
    .then(({ status, statusText, body }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(body);
    })
    .catch((err) => res.json(err));
});

// Stream
/* 
    /stream?client_id=1234&token=XYZ&transfer_id=6544251
*/
app.get("/stream", (req, res) => {
  let id = req.query.id;
  let token = req.query.token;
  let client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);
  let stream_url = API.File.GetHLSStreamURL(id);
  res.json({ stream_url });
});

// Download Link
/* 
    Multiple Files: /download?client_id=1234&token=XYZ&ids=75476343,75478993
    Single File: /download?client_id=1234&token=XYZ&ids=75476343
*/
app.get("/download", (req, res, next) => {
  let token = req.query.token;
  let client_id = req.query.client_id;
  const API = new PutioAPI({ clientID: client_id });
  API.setToken(token);

  let ids = req.query.ids;
  API.Files.DownloadLinks({ ids: [ids] })
    .then(({ status, statusText, body, data }) => {
      if (status === 200) res.json(body);
      else if (status === 400) res.json(data);
    })
    .catch((err) => res.json(err));
});

// Optional
/* 
    /logout?client_id=1234&token=XYZ
*/
app.get("/logout", (req, res) => {
  let token = req.query.token;
  let client_id = req.query.client_id;
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
