const {expect} = require('chai')
const {setWith, customTypeof, mergeWith} = require('./util')

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

  describe('customTypeOf', () => {
    describe('can detect arrays', () => {
      it('empty array', () => {
        const actual = customTypeof([])
        expect(actual).to.equal('array')
      })

      it('number array', () => {
        const actual = customTypeof([1, 2, 3])
        expect(actual).to.equal('array')
      })

      it('object array', () => {
        const actual = customTypeof([{}, {}])
        expect(actual).to.equal('array')
      })
    })

    describe('can detect objects', () => {
      it('simple object', () => {
        const actual = customTypeof({})
        expect(actual).to.equal('object')
      })
    })

    describe('can detect number', () => {
      it('integer', () => {
        const actual = customTypeof(1)
        expect(actual).to.equal('number')
      })

      it('decimal', () => {
        const actual = customTypeof(1.0)
        expect(actual).to.equal('number')
      })
    })

    describe('can detect null', () => {
      it('null', () => {
        const actual = customTypeof(null)
        expect(actual).to.equal('null')
      })
    })

    describe('can detect undefined', () => {
      it('undefined', () => {
        const actual = customTypeof(undefined)
        expect(actual).to.equal('undefined')
      })
    })
  })

  describe('mergeWith', () => {
    it('two flat objects - only new keys', () => {
      const emptyObj = {
        one: 1,
        two: 2
      }
      const newObj = {
        yes: 'yup',
        no: 'nope'
      }

      const merged = mergeWith(emptyObj, newObj)
      expect(merged).to.deep.equal({
        one: 1,
        two: 2,
        yes: 'yup',
        no: 'nope'
      })
    })

    it('two flat objects - duplicate keys', () => {
      const emptyObj = {
        one: 1,
        two: 2
      }
      const newObj = {
        yes: 'yup',
        no: 'nope',
        one: 1000
      }

      const merged = mergeWith(emptyObj, newObj)
      expect(merged).to.deep.equal({
        one: 1000,
        two: 2,
        yes: 'yup',
        no: 'nope'
      })
    })

    it('overwrites nested objects', () => {
      const oldObj = {
        should: 'exist',
        nested: {
          yes: 'yup'
        }
      }

      const newObj = {
        nested: 'yep'
      }

      const merged = mergeWith(oldObj, newObj)
      expect(merged).to.deep.equal({
        should: 'exist',
        nested: 'yep'
      })
    })
  })
})
