const customTypeof = thing => {
  if (Array.isArray(thing)) {
    return 'array'
  } else if (thing === null) {
    return 'null'
  } else {
    return typeof thing
  }
}

const traverse = (child, parent, cb) => {
  const childType = customTypeof(child)
  cb(child, parent)
  if (childType === 'array') {
    child.forEach(element => {
      traverse(element, child, cb)
    })

    return cb(child, parent)
  } else if (child === null) {
    return null
  } else if (typeof child === 'object') {
    Object.keys(child).forEach(key => {
      traverse(child[key], child, cb)
    })
    return cb(child, parent)
  } else {
    return null
  }
}

const addIDs = (obj, startingId = 1, startingParent = null) => {
  let id = startingId

  const idGen = () => {
    return id++
  }

  traverse(obj, startingParent, (child, parent) => {
    const childType = customTypeof(child)
    const parentType = customTypeof(parent)

    if (childType === 'object' && parentType === 'array') {
      if (!child.id) {
        child.id = idGen()
      }
    }
  })

  return {obj, maxId: id}
}

const setWith = (obj, path, value) => {
  if (path.length === 0) {
    return value
  }

  const typeOf = customTypeof(obj)

  const curKey = path[0]

  if (typeOf === 'array') {
    return obj.map(el => {
      if (el.id == curKey) {
        return setWith(el, path.slice(1), value)
      }
      return el
    })
  } else if (typeOf === 'object') {
    const kv = Object.entries(obj)
    const newPairs = kv.map(([k, v]) => {
      if (k == curKey) {
        return [k, setWith(v, path.slice(1), value)]
      }
      return [k, v]
    })

    return Object.fromEntries(newPairs)
  }
}

module.exports = {
  addIDs,
  customTypeof,
  setWith
}
