const PutioAPI = require("@putdotio/api-client").default;
const express = require("express");
const app = express();

// First Step
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
app.get("/transfer-info", (req, res) => {
  let id = req.query.id;
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
