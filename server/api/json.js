/* eslint-disable max-statements */
/* eslint-disable complexity */
const router = require('express').Router()
const {Json} = require('../db/models')
const _ = require('lodash')

const {addIDs, customTypeof, setWith, mergeWith} = require('./util')

module.exports = router

// setup a var for local var dumps
router.use((req, res, next) => {
  if (_.isUndefined(req.locals)) {
    req.locals = {}
  }
  next()
})

router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apikey')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, DELETE, PUT, PATCH'
  )
  next()
})

const requireBody = () => (req, res, next) => {
  if (_.isEmpty(req.body)) {
    return next(new Error('Need to pass a JSON body'))
  }
  next()
}

const requireApikey = () => (req, res, next) => {
  if (_.isEmpty(req.headers['x-apikey'])) {
    return next(new Error('Need to pass an apikey in header as "x-apikey"'))
  }
  req.locals.apikey = req.headers['x-apikey']
  next()
}

const loadJson = (...attributes) => async (req, res, next) => {
  const json = await Json.findByPk(req.params.jsonUUID, {
    attributes
  })

  if (!json) {
    return next(
      new Error(`Could not find Data with ID of ${req.params.jsonUUID}`)
    )
  }
  req.locals.json = json
  next()
}

const checkApikey = () => (req, res, next) => {
  if (req.locals.json.apikey !== req.locals.apikey) {
    return next(
      new Error(
        'Mismatching apikey for given JSON ID, make sure this is your resource'
      )
    )
  }
  next()
}

// get full resource
router.get('/:jsonUUID', loadJson('data'), (req, res) => {
  res.json(req.locals.json.data)
})

// update full resource
router.put(
  '/:jsonUUID',
  requireBody(),
  requireApikey(),
  loadJson('apikey', 'id'),
  checkApikey(),
  async (req, res, next) => {
    try {
      const {obj, maxId} = addIDs(req.body)

      const newJson = await req.locals.json.update({
        data: obj,
        highestCreatedId: maxId
      })
      res.json(newJson.data)
    } catch (err) {
      next(err)
    }
  }
)

// create new full resource
router.post('/', requireBody(), async (req, res, next) => {
  try {
    const {obj, maxId} = addIDs(req.body)

    const json = await Json.create({
      data: obj,
      highestCreatedId: maxId
    })

    res.status(201).json(json)
  } catch (err) {
    next(err)
  }
})

const parentResourceFetcher = (root, path) => {
  if (path.length === 0) {
    return root
  }
  const rootType = customTypeof(root)
  if (rootType === 'array') {
    // find by id, throw on unfound
    // we want a coercive comparison here because path is string but id may be number or string
    // eslint-disable-next-line eqeqeq
    const child = root.find(el => el.id == path[0])
    if (!child) {
      throw Error(`Unfound array element by id: "${path[0]}"`)
    }
    return parentResourceFetcher(child, path.slice(1))
  } else if (rootType === 'object') {
    // find by key, throw on unfound
    const child = root[path[0]]
    if (!child) {
      throw Error(`Unfound object property by key: "${path[0]}"`)
    }
    return parentResourceFetcher(child, path.slice(1))
  } else {
    throw new Error('Path Access Error!')
  }
}

router.get('/:jsonUUID/*', loadJson('data'), (req, res) => {
  const {json} = req.locals

  // cut off the json id from url
  const path = req.url
    .slice(`/${req.params.jsonUUID}/`.length)
    .split('/')
    .filter(p => p.length > 0)

  const child = parentResourceFetcher(json.data, path)

  res.json(child)
})

// create new sub resource
router.post(
  '/:jsonUUID/*',
  requireBody(),
  requireApikey(),
  loadJson('apikey', 'id', 'data', 'highestCreatedId'),
  checkApikey(),
  async (req, res, next) => {
    try {
      const {json} = req.locals

      // cut off the json id from url
      const path = req.url
        .slice(`/${req.params.jsonUUID}/`.length)
        .split('/')
        .filter(p => p.length > 0)

      const parent = parentResourceFetcher(json.data, path)

      if (customTypeof(parent) !== 'array') {
        throw new Error('Cannot POST to a non-array')
      }

      // add IDs if required...
      const {maxId, obj} = addIDs(req.body, json.highestCreatedId, parent)
      parent.push(obj)
      await json.update({data: json.data, highestCreatedId: maxId})

      res.status(201).json(obj)
    } catch (err) {
      next(err)
    }
  }
)

// delete resource
router.delete(
  '/:jsonUUID/',
  requireApikey(),
  loadJson('apikey', 'id', 'data'),
  checkApikey(),
  async (req, res, next) => {
    try {
      const {json} = req.locals

      await json.destroy()

      res.json({deleted: json.data})
    } catch (err) {
      next(err)
    }
  }
)

// delete subresource
router.delete(
  '/:jsonUUID/*',
  requireApikey(),
  loadJson('apikey', 'id', 'data'),
  checkApikey(),
  async (req, res, next) => {
    try {
      const {json} = req.locals

      // cut off the json id from url
      const path = req.url
        .slice(`/${req.params.jsonUUID}/`.length)
        .split('/')
        .filter(p => p.length > 0)

      const parentPath = path.slice(0, -1)
      const childPath = path[path.length - 1]
      // the last parameter specifies the id/key to delete, so we only want to get parent
      const parent = parentResourceFetcher(json.data, parentPath)

      const parentType = customTypeof(parent)

      if (parentType === 'array') {
        // eslint-disable-next-line eqeqeq
        const child = parent.find(el => el.id == childPath)
        if (!child) {
          throw new Error(`Unfound array element by id: "${childPath}"`)
        }

        const filtered = parent.filter(el => el.id != childPath)

        // overwrite existing array with this new filtered array to remove the element
        const updated = setWith(json.data, parentPath, filtered)

        await json.update({data: updated})

        res.json({deleted: child})
      } else if (parentType === 'object') {
        if (!(childPath in parent)) {
          throw new Error(`Unfound object property by key: "${childPath}"`)
        }

        const child = parent[childPath]

        delete parent[childPath]

        const updated = setWith(json.data, parentPath, parent)

        await json.update({data: updated})
        res.json({deleted: child})
      } else {
        throw new Error('Cannot delete requested path')
      }
    } catch (err) {
      next(err)
    }
  }
)

// PUT (overwrite) subresource
router.put(
  '/:jsonUUID/*',
  requireApikey(),
  loadJson('apikey', 'id', 'data', 'highestCreatedId'),
  checkApikey(),
  async (req, res, next) => {
    try {
      const {json} = req.locals

      // cut off the json id from url
      const path = req.url
        .slice(`/${req.params.jsonUUID}/`.length)
        .split('/')
        .filter(p => p.length > 0)

      const parentPath = path.slice(0, -1)

      const parent = parentResourceFetcher(json.data, parentPath)
      const currentChild = parentResourceFetcher(json.data, path)

      // if user doesn't supply any ID, let's make sure it stays as the last known one
      if (!req.body.id) {
        req.body.id = currentChild.id
      }

      // add IDs if required...
      const {maxId, obj} = addIDs(req.body, json.highestCreatedId, parent)

      const updated = setWith(json.data, path, obj)

      await json.update({data: updated, highestCreatedId: maxId})

      res.json(obj)
    } catch (err) {
      next(err)
    }
  }
)

// PATCH (merge) subresource
router.patch(
  '/:jsonUUID/*',
  requireApikey(),
  loadJson('apikey', 'id', 'data', 'highestCreatedId'),
  checkApikey(),
  async (req, res, next) => {
    try {
      const {json} = req.locals

      // cut off the json id from url
      const path = req.url
        .slice(`/${req.params.jsonUUID}/`.length)
        .split('/')
        .filter(p => p.length > 0)

      const parentPath = path.slice(0, -1)

      const parent = parentResourceFetcher(json.data, parentPath)
      const currentChild = parentResourceFetcher(json.data, path)

      // if user doesn't supply any ID, let's make sure it stays as the last known one
      if (!req.body.id) {
        req.body.id = currentChild.id
      }

      // take current as a base and update any properties
      const merged = mergeWith(currentChild, req.body)

      // add IDs if required...
      const {maxId, obj} = addIDs(merged, json.highestCreatedId, parent)

      // overwrite full child with new set
      const updated = setWith(json.data, path, obj)

      await json.update({data: updated, highestCreatedId: maxId})

      // return full merge back
      res.json(obj)
    } catch (err) {
      next(err)
    }
  }
)
