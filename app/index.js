const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>Hello from sample-app</h1>\n<p>update from sample app</p>');
});

app.listen(port, () => console.log(`sample-app listening on ${port}`));
