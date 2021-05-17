const {expect} = require('chai')
const {setWith} = require('./util')

describe('Util File', () => {
  describe('setWith', () => {
    let dummyObj
    beforeEach(() => {
      dummyObj = {
        comments: [],
        posts: [
          {
            id: 1,
            user: 'test-user',
            replies: [
              {
                id: 2,
                user: 'other-test-user'
              }
            ]
          }
        ]
      }
    })

    it('Can overwrite object', () => {
      const actual = setWith(dummyObj, 'posts/1/replies/2'.split('/'), {
        id: 2,
        user: 'different-user'
      })

      expect(actual).to.not.equal(dummyObj)
      expect(actual).to.deep.equal({
        comments: [],
        posts: [
          {
            id: 1,
            user: 'test-user',
            replies: [
              {
                id: 2,
                user: 'different-user'
              }
            ]
          }
        ]
      })
    })

    it('Can overwrite array', () => {
      const actual = setWith(dummyObj, 'posts/1/replies'.split('/'), [])

      expect(actual).to.not.equal(dummyObj)
      expect(actual).to.deep.equal({
        comments: [],
        posts: [
          {
            id: 1,
            user: 'test-user',
            replies: []
          }
        ]
      })
    })
  })
})
