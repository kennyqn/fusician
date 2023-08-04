const authRouter = require('./routers/auth')
const musicRouter = require('./routers/music')
const eventsRouter = require('./routers/events')

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json({ limit: '300kb' }));

app.use(authRouter)
app.use(musicRouter)
app.use(eventsRouter)


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

