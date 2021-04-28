const router = require('express').Router()
module.exports = router

router.use('/json', require('./json'))

router.use((req, res, next) => {
  const error = new Error('Not Found')
  error.status = 404
  next(error)
})

router.use((err, req, res, next) => {
  res.status(err.status || 400)
  res.json({error: err.message})
})
