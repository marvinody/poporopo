const router = require('express').Router()
const {Json} = require('../db/models')
module.exports = router

router.get('/:jsonUUID', async (req, res, next) => {
  try {
    const json = await Json.findByPk(req.params.jsonUUID, {
      attributes: ['data']
    })
    res.json(json.data)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    if (!req.body) {
      throw new Error('Need to pass a JSON body')
    }

    const json = await Json.create({
      data: req.body
    })

    res.json(json)
  } catch (err) {
    next(err)
  }
})
