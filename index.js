const express = require('express')
const app = express()
const port = process.env.PORT || 3000
app.use(express.json())
app.use('/api/v0', require('./api/v0/v0'))

// /getCompletionRateOfTasks

app.get('/', async (req, res) => {
  try {
  } catch (err) {
    console.error(err)
    return res.status(400).json(e)
  } finally {
    return res.send('backend serving...')
  }
})

app.listen(port, () => console.log(`Server listening on port ${port}!!`))
